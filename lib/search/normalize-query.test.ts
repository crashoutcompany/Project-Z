import { describe, expect, it } from "vitest";
import {
  hashQuery,
  normalizeQuery,
  validateQuery,
} from "./normalize-query";

describe("normalizeQuery", () => {
  it("lowercases, strips punctuation, and collapses whitespace", () => {
    expect(normalizeQuery("  Fire!!  Pokémon\tEX  ")).toBe("fire pokemon ex");
  });

  it("strips combining marks after NFKD", () => {
    expect(normalizeQuery("Pokémon")).toBe("pokemon");
  });
});

describe("hashQuery", () => {
  it("is stable for the same normalized input", () => {
    expect(hashQuery("fire pokemon")).toBe(hashQuery("fire pokemon"));
    expect(hashQuery("fire pokemon")).not.toBe(hashQuery("water pokemon"));
    expect(hashQuery("fire pokemon")).toMatch(/^[a-f0-9]{64}$/);
  });

  it("is keyed to the tag vocabulary version", async () => {
    const { createHash } = await import("node:crypto");
    const { TAG_VOCAB_VERSION } = await import("./tags");
    const unversioned = createHash("sha256").update("gust").digest("hex");
    expect(hashQuery("gust")).not.toBe(unversioned);
    expect(hashQuery("gust")).toBe(
      createHash("sha256").update(`tags-v${TAG_VOCAB_VERSION}:gust`).digest("hex"),
    );
  });
});

describe("validateQuery", () => {
  it("rejects empty and punctuation-only input", () => {
    expect(validateQuery("")).toEqual({
      ok: false,
      error: "Query is required",
    });
    expect(validateQuery("   !!!   ")).toEqual({
      ok: false,
      error: "Query is empty after normalization",
    });
  });

  it("rejects queries without a letter", () => {
    expect(validateQuery("12345")).toMatchObject({ ok: false });
  });

  it("rejects queries longer than 200 normalized characters", () => {
    const raw = `${"ab ".repeat(80)}ok`;
    expect(validateQuery(raw).ok).toBe(false);
    if (!validateQuery(raw).ok) {
      expect(validateQuery(raw).error).toMatch(/200 characters/);
    }
  });

  it("returns the normalized query", () => {
    expect(validateQuery("Double Fire")).toEqual({
      ok: true,
      normalized: "double fire",
    });
  });
});
