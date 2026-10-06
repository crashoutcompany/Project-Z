import { describe, it, expect } from "vitest";
import { sampleCardsPerSet, SEED_CARDS_PER_SET } from "../lib/sample-cards";

describe("sampleCardsPerSet", () => {
  it("keeps up to the limit from each set, lowest numbers first", () => {
    const cards = [
      { card_id: "A1-3" },
      { card_id: "A1-1" },
      { card_id: "A1-12" },
      { card_id: "A1a-2" },
      { card_id: "A1a-1" },
      { card_id: "P-A-20" },
    ];

    const sampled = sampleCardsPerSet(cards, 2);
    expect(sampled.map((c) => c.card_id)).toEqual([
      "A1-1",
      "A1-3",
      "A1a-1",
      "A1a-2",
      "P-A-20",
    ]);
  });

  it("keeps a set in full when it has fewer cards than the limit", () => {
    const cards = [{ card_id: "B4a-1" }, { card_id: "B4a-2" }];
    expect(sampleCardsPerSet(cards, SEED_CARDS_PER_SET)).toHaveLength(2);
  });

  it("returns the original list when the limit is not positive", () => {
    const cards = [{ card_id: "A1-1" }, { card_id: "A1-2" }];
    expect(sampleCardsPerSet(cards, 0)).toBe(cards);
  });
});
