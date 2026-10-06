import { beforeEach, describe, expect, it, vi } from "vitest";

const rateLimit = vi.fn();
const parseQueryToFilter = vi.fn();
const executeSearch = vi.fn();
const validateQuery = vi.fn();

vi.mock("@/lib/rate-limit", () => ({
  clientKeyFromRequest: () => "test-ip",
  rateLimit: (...args: unknown[]) => rateLimit(...args),
}));

vi.mock("@/lib/search", () => ({
  parseQueryToFilter: (...args: unknown[]) => parseQueryToFilter(...args),
  executeSearch: (...args: unknown[]) => executeSearch(...args),
  validateQuery: (...args: unknown[]) => validateQuery(...args),
}));

const { POST } = await import("./route");

function request(body: unknown, json = true) {
  return new Request("http://localhost/api/search", {
    method: "POST",
    headers: json ? { "content-type": "application/json" } : undefined,
    body: json ? JSON.stringify(body) : String(body),
  });
}

describe("POST /api/search", () => {
  beforeEach(() => {
    rateLimit.mockReset();
    parseQueryToFilter.mockReset();
    executeSearch.mockReset();
    validateQuery.mockReset();
    rateLimit.mockReturnValue({ ok: true, remaining: 10, retryAfterSec: 60 });
  });

  it("returns 429 when the rate limit is exceeded", async () => {
    rateLimit.mockReturnValue({ ok: false, remaining: 0, retryAfterSec: 12 });
    const res = await POST(request({ query: "fire" }));
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("12");
  });

  it("rejects invalid JSON and missing query", async () => {
    const badJson = await POST(
      new Request("http://localhost/api/search", {
        method: "POST",
        body: "{",
        headers: { "content-type": "application/json" },
      }),
    );
    expect(badJson.status).toBe(400);

    const missing = await POST(request({ limit: 10 }));
    expect(missing.status).toBe(400);
    await expect(missing.json()).resolves.toMatchObject({
      error: "Missing string field: query",
    });

    const notObject = await POST(request(["fire"]));
    expect(notObject.status).toBe(400);
  });

  it("rejects failed query validation", async () => {
    validateQuery.mockReturnValue({ ok: false, error: "Query is required" });
    const res = await POST(request({ query: "   " }));
    expect(res.status).toBe(400);
  });

  it("clamps limit and forwards tradeableOnly", async () => {
    validateQuery.mockReturnValue({ ok: true, normalized: "fire" });
    parseQueryToFilter.mockResolvedValue({
      filter: { surface: "any" },
      cached: false,
      source: "heuristic",
    });
    executeSearch.mockResolvedValue({
      cards: [{ id: 1, name: "Charmander" }],
      usedFallback: false,
      total: 1,
    });

    const res = await POST(
      request({ query: "fire", limit: 999, tradeableOnly: true }),
    );
    expect(res.status).toBe(200);
    expect(executeSearch).toHaveBeenCalledWith(
      { surface: "any" },
      { limit: 100, tradeableOnly: true },
    );
    await expect(res.json()).resolves.toMatchObject({
      query: "fire",
      source: "heuristic",
      total: 1,
    });
  });

  it("returns 500 when search throws", async () => {
    validateQuery.mockReturnValue({ ok: true, normalized: "fire" });
    parseQueryToFilter.mockRejectedValue(new Error("boom"));
    const res = await POST(request({ query: "fire" }));
    expect(res.status).toBe(500);
  });
});
