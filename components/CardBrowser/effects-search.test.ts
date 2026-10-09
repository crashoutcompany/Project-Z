import { afterEach, describe, expect, it, vi } from "vitest";
import { requestEffectsSearch } from "./effects-search";

function mockFetch(response: Partial<Response> & { json: () => Promise<unknown> }) {
  const fn = vi.fn().mockResolvedValue(response);
  vi.stubGlobal("fetch", fn);
  return fn;
}

afterEach(() => vi.unstubAllGlobals());

describe("requestEffectsSearch", () => {
  it("posts the query with the page size and tradeable flag", async () => {
    const fetchMock = mockFetch({ ok: true, json: async () => ({ cards: [] }) });
    await requestEffectsSearch("bench damage", true);

    expect(fetchMock).toHaveBeenCalledWith("/api/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: "bench damage", limit: 60, tradeableOnly: true }),
    });
  });

  it("returns chips and cards on success", async () => {
    mockFetch({
      ok: true,
      json: async () => ({
        filter: { surface: "any", cardType: "TRAINER" },
        cards: [{ id: 1 }],
      }),
    });
    await expect(requestEffectsSearch("q", false)).resolves.toEqual({
      ok: true,
      chips: ["TRAINER"],
      cards: [{ id: 1 }],
    });
  });

  it("tolerates a response with no filter or cards", async () => {
    mockFetch({ ok: true, json: async () => ({}) });
    await expect(requestEffectsSearch("q", false)).resolves.toEqual({
      ok: true,
      chips: [],
      cards: [],
    });
  });

  it("surfaces the server's error message, or a default", async () => {
    mockFetch({ ok: false, json: async () => ({ error: "Too many search requests." }) });
    await expect(requestEffectsSearch("q", false)).resolves.toEqual({
      ok: false,
      error: "Too many search requests.",
    });

    mockFetch({ ok: false, json: async () => ({}) });
    await expect(requestEffectsSearch("q", false)).resolves.toEqual({
      ok: false,
      error: "Search failed",
    });
  });

  it("reports network and non-JSON failures as a request failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    await expect(requestEffectsSearch("q", false)).resolves.toEqual({
      ok: false,
      error: "Search request failed",
    });

    mockFetch({
      ok: true,
      json: async () => {
        throw new SyntaxError("Unexpected token <");
      },
    });
    await expect(requestEffectsSearch("q", false)).resolves.toEqual({
      ok: false,
      error: "Search request failed",
    });
  });
});
