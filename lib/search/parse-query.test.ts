import { beforeEach, describe, expect, it, vi } from "vitest";
import { FilterJSONSchema } from "./filter-schema";

const findUnique = vi.fn();
const update = vi.fn();
const upsert = vi.fn();
const generateObject = vi.fn();

vi.mock("@/prisma/db", () => ({
  default: {
    searchQueryCache: { findUnique, update, upsert },
  },
}));

vi.mock("ai", () => ({
  generateObject: (...args: unknown[]) => generateObject(...args),
}));

vi.mock("@ai-sdk/google", () => ({
  createGoogleGenerativeAI: () => (model: string) => model,
}));

const { parseQueryToFilter } = await import("./parse-query");

const fireFilter = FilterJSONSchema.parse({
  energyType: ["fire"],
  cardType: "POKEMON",
});

describe("parseQueryToFilter", () => {
  beforeEach(() => {
    findUnique.mockReset();
    update.mockReset();
    upsert.mockReset();
    generateObject.mockReset();
    update.mockResolvedValue({});
    upsert.mockResolvedValue({});
    vi.unstubAllEnvs();
  });

  it("returns a cached filter and increments hitCount", async () => {
    findUnique.mockResolvedValue({
      filterJson: fireFilter,
    });

    const result = await parseQueryToFilter("fire pokemon");
    expect(result).toEqual({
      filter: fireFilter,
      cached: true,
      source: "cache",
    });
    expect(update).toHaveBeenCalledOnce();
    expect(generateObject).not.toHaveBeenCalled();
  });

  it("ignores invalid cache rows and falls back to the heuristic", async () => {
    findUnique.mockResolvedValue({ filterJson: { energyType: ["fairy"] } });
    vi.stubEnv("GOOGLE_GENERATIVE_AI_API_KEY", "");

    const result = await parseQueryToFilter("fire pokemon");
    expect(result.cached).toBe(false);
    expect(result.source).toBe("heuristic");
    expect(result.filter.energyType).toEqual(["fire"]);
    expect(upsert).not.toHaveBeenCalled();
  });

  it("persists LLM output and does not cache heuristic fallbacks", async () => {
    findUnique.mockResolvedValue(null);
    vi.stubEnv("GOOGLE_GENERATIVE_AI_API_KEY", "test-key");
    generateObject.mockResolvedValue({ object: fireFilter });

    const llm = await parseQueryToFilter("fire pokemon");
    expect(llm.source).toBe("llm");
    expect(upsert).toHaveBeenCalledOnce();

    upsert.mockClear();
    generateObject.mockRejectedValue(new Error("quota"));
    const fallback = await parseQueryToFilter("fire pokemon");
    expect(fallback.source).toBe("heuristic");
    expect(upsert).not.toHaveBeenCalled();
  });
});
