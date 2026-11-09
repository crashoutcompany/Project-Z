import { describe, expect, it } from "vitest";
import { computeDeckOwnership } from "./deck-ownership";
import { EMPTY_COLLECTION, parseCollection } from "./index";

// Pikachu ex: 10 is the regular print, 90 and 91 are alt arts of it.
// Misty: 20 has no other prints.
const PRINTS = {
  10: [10, 90, 91],
  20: [20],
};

describe("computeDeckOwnership", () => {
  it("counts owned copies against the deck count", () => {
    const result = computeDeckOwnership(
      { 10: 1, 20: 5 },
      [
        { cardId: 10, count: 2 },
        { cardId: 20, count: 2 },
      ],
      PRINTS,
    );
    expect(result.byCardId[10]).toEqual({ owned: 1, needed: 2 });
    expect(result.byCardId[20]).toEqual({ owned: 2, needed: 2 });
    expect(result).toMatchObject({ owned: 3, needed: 4 });
  });

  it("treats every card as missing for an empty collection", () => {
    const result = computeDeckOwnership(
      EMPTY_COLLECTION,
      [
        { cardId: 10, count: 2 },
        { cardId: 20, count: 1 },
      ],
      PRINTS,
    );
    expect(result.byCardId[10]).toEqual({ owned: 0, needed: 2 });
    expect(result.byCardId[20]).toEqual({ owned: 0, needed: 1 });
    expect(result).toMatchObject({ owned: 0, needed: 3 });
  });

  it("treats corrupt stored data as an empty collection", () => {
    const result = computeDeckOwnership(
      parseCollection("{not json"),
      [{ cardId: 10, count: 2 }],
      PRINTS,
    );
    expect(result).toMatchObject({ owned: 0, needed: 2 });
  });

  it("counts an owned alt art as owning the deck's print", () => {
    const result = computeDeckOwnership(
      { 90: 1 },
      [{ cardId: 10, count: 2 }],
      PRINTS,
    );
    expect(result.byCardId[10]).toEqual({ owned: 1, needed: 2 });
  });

  it("adds copies across different alt arts", () => {
    const result = computeDeckOwnership(
      { 90: 1, 91: 1 },
      [{ cardId: 10, count: 2 }],
      PRINTS,
    );
    expect(result.byCardId[10]).toEqual({ owned: 2, needed: 2 });
  });

  it("does not count an owned card that is not a print of the deck card", () => {
    const result = computeDeckOwnership(
      { 20: 3 },
      [{ cardId: 10, count: 1 }],
      PRINTS,
    );
    expect(result.byCardId[10]).toEqual({ owned: 0, needed: 1 });
  });

  it("spends each owned copy once across two prints in one deck", () => {
    // The deck runs one regular and one alt art Pikachu ex; one copy of the
    // regular print covers only one of them.
    const prints = { 10: [10, 90], 90: [10, 90] };
    const result = computeDeckOwnership(
      { 10: 1 },
      [
        { cardId: 10, count: 1 },
        { cardId: 90, count: 1 },
      ],
      prints,
    );
    expect(result.byCardId[10]).toEqual({ owned: 1, needed: 1 });
    expect(result.byCardId[90]).toEqual({ owned: 0, needed: 1 });
    expect(result).toMatchObject({ owned: 1, needed: 2 });
  });

  it("matches exact prints before spare alt arts", () => {
    // Owning the alt art (90) exactly should not be spent on the regular
    // print first and leave the alt art entry short.
    const prints = { 10: [10, 90], 90: [10, 90] };
    const result = computeDeckOwnership(
      { 10: 1, 90: 1 },
      [
        { cardId: 10, count: 1 },
        { cardId: 90, count: 1 },
      ],
      prints,
    );
    expect(result.byCardId[10]).toEqual({ owned: 1, needed: 1 });
    expect(result.byCardId[90]).toEqual({ owned: 1, needed: 1 });
  });

  it("falls back to the exact print when print groups are unknown", () => {
    const result = computeDeckOwnership(
      { 10: 2, 90: 1 },
      [
        { cardId: 10, count: 2 },
        { cardId: 30, count: 1 },
      ],
      {},
    );
    expect(result.byCardId[10]).toEqual({ owned: 2, needed: 2 });
    expect(result.byCardId[30]).toEqual({ owned: 0, needed: 1 });
  });

  it("returns zero totals for an empty deck", () => {
    expect(computeDeckOwnership({ 10: 1 }, [], PRINTS)).toEqual({
      byCardId: {},
      owned: 0,
      needed: 0,
    });
  });
});
