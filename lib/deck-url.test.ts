import { describe, expect, it } from "vitest";
import {
  buildBuilderUrl,
  decodeBuilderSearchParams,
  decodeDeckParam,
  encodeDeck,
  formatCardRef,
  parseCardRef,
  validateDeck,
} from "./deck-url";

describe("deck-url codec", () => {
  it("parses and formats refs including hyphenated set codes", () => {
    expect(parseCardRef("A1-94")).toEqual({ setCode: "A1", number: 94 });
    expect(parseCardRef("P-A-12")).toEqual({ setCode: "P-A", number: 12 });
    expect(formatCardRef("P-A", 12)).toBe("P-A-12");
  });

  it("encodes and decodes deck params with counts", () => {
    const encoded = encodeDeck([
      { setCode: "A1", number: 1 },
      { setCode: "A1", number: 94, count: 2 },
      { setCode: "P-A", number: 12, count: 2 },
    ]);
    expect(encoded).toBe("A1-1,A1-94x2,P-A-12x2");

    const decoded = decodeDeckParam(encoded);
    expect(decoded).toEqual([
      { setCode: "A1", number: 1, count: 1, ref: "A1-1" },
      { setCode: "A1", number: 94, count: 2, ref: "A1-94" },
      { setCode: "P-A", number: 12, count: 2, ref: "P-A-12" },
    ]);
  });

  it("builds and parses builder search params", () => {
    const entries = decodeDeckParam("A1-1,A1-94x2");
    const url = buildBuilderUrl(entries);
    expect(url.startsWith("/builder?")).toBe(true);

    const params = new URLSearchParams(url.split("?")[1]);
    const decoded = decodeBuilderSearchParams({
      v: params.get("v"),
      deck: params.get("deck"),
    });
    expect(decoded.version).toBe(1);
    expect(decoded.entries).toHaveLength(2);
    expect(decoded.entries[0]).toMatchObject({
      setCode: "A1",
      number: 1,
      count: 1,
    });
    expect(decoded.entries[1]).toMatchObject({
      setCode: "A1",
      number: 94,
      count: 2,
    });
  });

  it("rejects unsupported deck URL versions", () => {
    expect(() =>
      decodeBuilderSearchParams({ v: "2", deck: "A1-1" }),
    ).toThrow(/Unsupported deck URL version/);
    expect(() =>
      decodeBuilderSearchParams({ v: "0", deck: "A1-1" }),
    ).toThrow(/Unsupported deck URL version/);
  });

  it("validates 20 cards and max 2 per name", () => {
    const entries = Array.from({ length: 10 }, (_, i) => ({
      setCode: "A1",
      number: i + 1,
      count: 2,
      ref: `A1-${i + 1}`,
    }));
    const names: Record<string, string> = {};
    for (const e of entries) names[e.ref] = `Card${e.number}`;

    expect(validateDeck(entries, names)).toEqual({
      valid: true,
      totalCards: 20,
      errors: [],
    });

    const tooManyName = [
      { setCode: "A1", number: 1, count: 2, ref: "A1-1" },
      { setCode: "A1", number: 100, count: 1, ref: "A1-100" },
    ];
    const names2 = { "A1-1": "Pikachu", "A1-100": "Pikachu" };
    const bad = validateDeck(tooManyName, names2);
    expect(bad.valid).toBe(false);
    expect(bad.errors.some((e) => /Pikachu/.test(e))).toBe(true);
  });
});
