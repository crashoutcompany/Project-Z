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

  it("runs a tag-only search without parsing a query", async () => {
    executeSearch.mockResolvedValue({
      cards: [],
      usedFallback: false,
      total: 0,
    });

    const res = await POST(request({ tags: ["gust", "gust", "snipe"] }));
    expect(res.status).toBe(200);
    expect(parseQueryToFilter).not.toHaveBeenCalled();
    expect(validateQuery).not.toHaveBeenCalled();
    expect(executeSearch).toHaveBeenCalledWith(
      { surface: "any" },
      {
        limit: 60,
        tradeableOnly: false,
        tags: ["gust", "snipe"],
        tagMode: "all",
      },
    );
    await expect(res.json()).resolves.toMatchObject({
      query: "",
      tags: ["gust", "snipe"],
      source: "tags",
    });
  });

  it("combines typed text with picked tags", async () => {
    validateQuery.mockReturnValue({ ok: true, normalized: "fire" });
    parseQueryToFilter.mockResolvedValue({
      filter: { surface: "any", energyType: ["fire"] },
      cached: false,
      source: "heuristic",
    });
    executeSearch.mockResolvedValue({
      cards: [],
      usedFallback: false,
      total: 0,
    });

    await POST(request({ query: "fire", tags: ["self_damage"] }));
    expect(executeSearch).toHaveBeenCalledWith(
      { surface: "any", energyType: ["fire"] },
      {
        limit: 60,
        tradeableOnly: false,
        tags: ["self_damage"],
        tagMode: "all",
      },
    );
  });

  it("rejects malformed and unknown tags", async () => {
    const notArray = await POST(request({ query: "fire", tags: "gust" }));
    expect(notArray.status).toBe(400);

    const unknown = await POST(request({ tags: ["prevent"] }));
    expect(unknown.status).toBe(400);
    await expect(unknown.json()).resolves.toMatchObject({
      error: "Unknown tag: prevent",
    });

    const emptyTags = await POST(request({ tags: [] }));
    expect(emptyTags.status).toBe(400);
    expect(executeSearch).not.toHaveBeenCalled();
  });

  it("forwards tagMode any and rejects unknown modes", async () => {
    executeSearch.mockResolvedValue({
      cards: [],
      usedFallback: false,
      total: 0,
    });

    const res = await POST(
      request({ tags: ["gust", "snipe"], tagMode: "any" }),
    );
    expect(res.status).toBe(200);
    expect(executeSearch).toHaveBeenCalledWith(
      { surface: "any" },
      {
        limit: 60,
        tradeableOnly: false,
        tags: ["gust", "snipe"],
        tagMode: "any",
      },
    );

    const bad = await POST(request({ tags: ["gust"], tagMode: "some" }));
    expect(bad.status).toBe(400);
  });

  it("drops dismissed parsed tags before searching and echoes the filter", async () => {
    validateQuery.mockReturnValue({
      ok: true,
      normalized: "attach energy coin",
    });
    parseQueryToFilter.mockResolvedValue({
      filter: {
        surface: "any",
        attack: { tags: ["energy_attach", "coin_flip"] },
        effect: { tags: ["energy_attach"] },
      },
      cached: false,
      source: "heuristic",
    });
    executeSearch.mockResolvedValue({
      cards: [],
      usedFallback: false,
      total: 0,
    });

    const res = await POST(
      request({ query: "attach energy coin", excludeTags: ["energy_attach"] }),
    );
    const expected = { surface: "any", attack: { tags: ["coin_flip"] } };
    expect(executeSearch).toHaveBeenCalledWith(expected, {
      limit: 60,
      tradeableOnly: false,
    });
    await expect(res.json()).resolves.toMatchObject({ filter: expected });

    const unknown = await POST(request({ query: "x", excludeTags: ["nope"] }));
    expect(unknown.status).toBe(400);
  });

  it("runs a type-only search and forwards types with offset", async () => {
    executeSearch.mockResolvedValue({
      cards: [],
      usedFallback: false,
      total: 75,
    });

    const res = await POST(
      request({ types: ["grass", "psychic", "grass"], offset: 60 }),
    );
    expect(res.status).toBe(200);
    expect(parseQueryToFilter).not.toHaveBeenCalled();
    expect(executeSearch).toHaveBeenCalledWith(
      { surface: "any" },
      {
        limit: 60,
        tradeableOnly: false,
        offset: 60,
        types: ["grass", "psychic"],
      },
    );
    await expect(res.json()).resolves.toMatchObject({
      types: ["grass", "psychic"],
      total: 75,
      offset: 60,
    });
  });

  it("rejects unknown types and clamps a bad offset", async () => {
    const bad = await POST(request({ types: ["fairy"] }));
    expect(bad.status).toBe(400);
    await expect(bad.json()).resolves.toEqual({ error: "Unknown type: fairy" });

    const notArray = await POST(request({ types: "grass" }));
    expect(notArray.status).toBe(400);

    executeSearch.mockResolvedValue({
      cards: [],
      usedFallback: false,
      total: 0,
    });
    await POST(request({ tags: ["gust"], offset: -5 }));
    expect(executeSearch).toHaveBeenLastCalledWith(
      { surface: "any" },
      { limit: 60, tradeableOnly: false, tags: ["gust"], tagMode: "all" },
    );
  });

  it("runs a rarity-only search and forwards rarities and showDuplicates", async () => {
    executeSearch.mockResolvedValue({
      cards: [],
      usedFallback: false,
      total: 3,
    });

    const res = await POST(
      request({
        rarities: ["SR", "C", "SR"],
        showDuplicates: true,
        types: ["grass"],
      }),
    );
    expect(res.status).toBe(200);
    expect(parseQueryToFilter).not.toHaveBeenCalled();
    expect(executeSearch).toHaveBeenCalledWith(
      { surface: "any" },
      {
        limit: 60,
        tradeableOnly: false,
        types: ["grass"],
        rarities: ["SR", "C"],
        showDuplicates: true,
      },
    );
    await expect(res.json()).resolves.toMatchObject({
      rarities: ["SR", "C"],
      showDuplicates: true,
    });
  });

  it("hides duplicates unless showDuplicates is exactly true", async () => {
    executeSearch.mockResolvedValue({
      cards: [],
      usedFallback: false,
      total: 0,
    });
    await POST(request({ tags: ["gust"], showDuplicates: "yes" }));
    expect(executeSearch.mock.calls[0]?.[1]).not.toHaveProperty(
      "showDuplicates",
    );
  });

  it("forwards picked sets, deduplicated", async () => {
    executeSearch.mockResolvedValue({
      cards: [],
      usedFallback: false,
      total: 0,
    });
    const res = await POST(request({ tags: ["gust"], setIds: [3, 1, 3] }));
    expect(res.status).toBe(200);
    expect(executeSearch).toHaveBeenCalledWith(
      { surface: "any" },
      {
        limit: 60,
        tradeableOnly: false,
        tags: ["gust"],
        tagMode: "all",
        setIds: [3, 1],
      },
    );
    await expect(res.json()).resolves.toMatchObject({ setIds: [3, 1] });
  });

  it("rejects malformed set ids", async () => {
    for (const setIds of ["1", [0], [1.5], ["1"]]) {
      const res = await POST(request({ tags: ["gust"], setIds }));
      expect(res.status).toBe(400);
    }
    expect(executeSearch).not.toHaveBeenCalled();
  });

  it("rejects unknown rarities", async () => {
    const bad = await POST(request({ tags: ["gust"], rarities: ["XYZ"] }));
    expect(bad.status).toBe(400);
    await expect(bad.json()).resolves.toEqual({ error: "Unknown rarity: XYZ" });

    const notArray = await POST(request({ tags: ["gust"], rarities: "C" }));
    expect(notArray.status).toBe(400);
    expect(executeSearch).not.toHaveBeenCalled();
  });

  it("reruns a restored filter without parsing the query", async () => {
    validateQuery.mockReturnValue({ ok: true, normalized: "coin flip" });
    executeSearch.mockResolvedValue({
      cards: [],
      usedFallback: false,
      total: 0,
    });
    const filter = {
      surface: "attack",
      attack: { tags: ["coin_flip", "gust"] },
    };
    const res = await POST(
      request({ query: "coin flip", filter, excludeTags: ["gust"] }),
    );
    expect(res.status).toBe(200);
    expect(parseQueryToFilter).not.toHaveBeenCalled();
    expect(executeSearch).toHaveBeenCalledWith(
      { surface: "attack", attack: { tags: ["coin_flip"] } },
      { limit: 60, tradeableOnly: false },
    );
    await expect(res.json()).resolves.toMatchObject({ source: "client" });
  });

  it("rejects a malformed filter", async () => {
    validateQuery.mockReturnValue({ ok: true, normalized: "coin flip" });
    const res = await POST(
      request({ query: "coin flip", filter: { surface: "everywhere" } }),
    );
    expect(res.status).toBe(400);
    expect(executeSearch).not.toHaveBeenCalled();
  });
});
