import { describe, it, expect } from "vitest";
import {
  EMPTY_COLLECTION,
  MAX_QUANTITY,
  parseCollection,
  validateCollection,
  computeCompletion,
  formatPercent,
  ownedCardIds,
  isSetComplete,
  exportCollection,
  parseCollectionImport,
  mergeCollections,
} from "./index";

describe("parseCollection", () => {
  it("returns empty collection for null", () => {
    expect(parseCollection(null)).toEqual(EMPTY_COLLECTION);
  });

  it("returns empty collection for empty string", () => {
    expect(parseCollection("")).toEqual(EMPTY_COLLECTION);
  });

  it("parses valid stored collection", () => {
    expect(parseCollection(JSON.stringify({ 1: 2, 42: 1 }))).toEqual({
      1: 2,
      42: 1,
    });
  });

  it("handles corrupt JSON gracefully", () => {
    expect(parseCollection("not valid json{")).toEqual(EMPTY_COLLECTION);
  });

  it("handles non-object JSON gracefully", () => {
    expect(parseCollection("[1,2,3]")).toEqual(EMPTY_COLLECTION);
  });

  it("handles null JSON gracefully", () => {
    expect(parseCollection("null")).toEqual(EMPTY_COLLECTION);
  });

  it("filters out invalid card IDs", () => {
    const raw = JSON.stringify({ "1": 1, "-5": 2, foo: 3, "0": 1 });
    expect(parseCollection(raw)).toEqual({ 1: 1 });
  });

  it("filters out zero quantities", () => {
    const raw = JSON.stringify({ 1: 1, 2: 0 });
    expect(parseCollection(raw)).toEqual({ 1: 1 });
  });

  it("filters out negative quantities", () => {
    const raw = JSON.stringify({ 1: 1, 2: -5 });
    expect(parseCollection(raw)).toEqual({ 1: 1 });
  });

  it("filters out quantities over MAX_QUANTITY", () => {
    const raw = JSON.stringify({ 1: 1, 2: MAX_QUANTITY + 1 });
    expect(parseCollection(raw)).toEqual({ 1: 1 });
  });

  it("filters out non-integer quantities", () => {
    const raw = JSON.stringify({ 1: 1, 2: 1.5 });
    expect(parseCollection(raw)).toEqual({ 1: 1 });
  });

  it("filters out string quantities", () => {
    const raw = JSON.stringify({ 1: 1, 2: "two" });
    expect(parseCollection(raw)).toEqual({ 1: 1 });
  });

  it("keeps MAX_QUANTITY", () => {
    const raw = JSON.stringify({ 1: MAX_QUANTITY });
    expect(parseCollection(raw)).toEqual({ 1: MAX_QUANTITY });
  });
});

describe("validateCollection", () => {
  it("keeps only valid card IDs", () => {
    const collection = { 1: 2, 42: 1, 999: 3 };
    const validIds = new Set([1, 42, 100]);
    expect(validateCollection(collection, validIds)).toEqual({ 1: 2, 42: 1 });
  });

  it("returns empty for no matching IDs", () => {
    const collection = { 1: 2, 2: 1 };
    const validIds = new Set([100, 200]);
    expect(validateCollection(collection, validIds)).toEqual({});
  });

  it("handles empty collection", () => {
    const validIds = new Set([1, 2, 3]);
    expect(validateCollection({}, validIds)).toEqual({});
  });

  it("handles empty valid IDs set", () => {
    const collection = { 1: 2, 2: 1 };
    expect(validateCollection(collection, new Set())).toEqual({});
  });
});

describe("computeCompletion", () => {
  const cards = [
    { id: 1, rarity: "C" },
    { id: 2, rarity: "C" },
    { id: 3, rarity: "U" },
    { id: 4, rarity: "R" },
    { id: 5, rarity: "R" },
  ];

  it("computes correct totals for empty collection", () => {
    const stats = computeCompletion({}, cards);
    expect(stats.total).toBe(5);
    expect(stats.owned).toBe(0);
    expect(stats.percent).toBe(0);
  });

  it("computes owned counts correctly", () => {
    const collection = { 1: 1, 3: 2, 4: 1 };
    const stats = computeCompletion(collection, cards);
    expect(stats.owned).toBe(3);
    expect(stats.percent).toBe(60);
  });

  it("rounds percent to integer", () => {
    const collection = { 1: 1 };
    const stats = computeCompletion(collection, cards);
    expect(stats.percent).toBe(20);
  });

  it("breaks down by rarity", () => {
    const collection = { 1: 1, 4: 1 };
    const stats = computeCompletion(collection, cards);
    expect(stats.byRarity).toEqual({
      C: { owned: 1, total: 2 },
      U: { owned: 0, total: 1 },
      R: { owned: 1, total: 2 },
    });
  });

  it("handles empty card list", () => {
    const stats = computeCompletion({ 1: 1 }, []);
    expect(stats.total).toBe(0);
    expect(stats.owned).toBe(0);
    expect(stats.percent).toBe(0);
    expect(stats.byRarity).toEqual({});
  });

  it("handles 100% completion", () => {
    const collection = { 1: 1, 2: 1, 3: 1, 4: 1, 5: 1 };
    const stats = computeCompletion(collection, cards);
    expect(stats.owned).toBe(5);
    expect(stats.percent).toBe(100);
  });

  it("ignores collection entries not in card list", () => {
    const collection = { 1: 1, 99: 5, 100: 3 };
    const stats = computeCompletion(collection, cards);
    expect(stats.owned).toBe(1);
    expect(stats.percent).toBe(20);
  });

  it("counts card as owned regardless of quantity", () => {
    const collection = { 1: 99 };
    const stats = computeCompletion(collection, cards);
    expect(stats.owned).toBe(1);
  });
});

describe("formatPercent", () => {
  it("shows 0% when nothing is owned", () => {
    expect(formatPercent(0, 286)).toBe("0%");
  });

  it("shows 0% for an empty catalog", () => {
    expect(formatPercent(0, 0)).toBe("0%");
    expect(formatPercent(3, 0)).toBe("0%");
  });

  it("uses two decimals under 1% so a single card moves the value", () => {
    expect(formatPercent(1, 4547)).toBe("0.02%");
    expect(formatPercent(2, 4547)).toBe("0.04%");
    expect(formatPercent(3, 4547)).toBe("0.06%");
    expect(formatPercent(1, 286)).toBe("0.34%");
  });

  it("shows <0.01% instead of 0% for a nonzero value under 0.01%", () => {
    expect(formatPercent(1, 50000)).toBe("<0.01%");
  });

  it("uses one decimal from 1% up", () => {
    expect(formatPercent(5, 286)).toBe("1.7%");
    expect(formatPercent(2, 200)).toBe("1%");
    expect(formatPercent(100, 4547)).toBe("2.1%");
  });

  it("drops a trailing .0 on whole percentages", () => {
    expect(formatPercent(1, 5)).toBe("20%");
    expect(formatPercent(3, 5)).toBe("60%");
  });

  it("floors so an almost-complete collection never reads 100%", () => {
    expect(formatPercent(1999, 2000)).toBe("99.9%");
    expect(formatPercent(2999, 3000)).toBe("99.9%");
  });

  it("shows 100% only when complete", () => {
    expect(formatPercent(286, 286)).toBe("100%");
  });
});

describe("ownedCardIds (alt arts count as owned)", () => {
  // Pikachu ex: 10 is the Double Rare, 11 the Art Rare alt art, 12 a promo
  // reprint. Misty (20) has no other prints.
  const cards = [
    { id: 10, rarity: "RR", printGroup: 10 },
    { id: 11, rarity: "AR", printGroup: 10 },
    { id: 12, rarity: "PROMO", printGroup: 10 },
    { id: 20, rarity: "U", printGroup: 20 },
  ];

  it("counts directly owned cards", () => {
    expect([...ownedCardIds({ 20: 1 }, cards)]).toEqual([20]);
  });

  it("counts an owned alt art as owning the regular print", () => {
    expect([...ownedCardIds({ 11: 1 }, cards)].sort()).toEqual([10, 11]);
  });

  it("does not fill the alt art slot from the regular print", () => {
    expect([...ownedCardIds({ 10: 1 }, cards)]).toEqual([10]);
  });

  it("does not treat a promo reprint as an alt art", () => {
    expect([...ownedCardIds({ 12: 1 }, cards)]).toEqual([12]);
  });

  it("ignores print groups for cards without one", () => {
    const loose = [
      { id: 1, rarity: "C" },
      { id: 2, rarity: "AR" },
    ];
    expect([...ownedCardIds({ 2: 1 }, loose)]).toEqual([2]);
  });

  it("feeds computeCompletion across sets", () => {
    const setA = cards.filter((c) => c.id === 10 || c.id === 20);
    const all = ownedCardIds({ 11: 1, 20: 1 }, cards);
    const stats = computeCompletion({ 11: 1, 20: 1 }, setA, all);
    expect(stats.owned).toBe(2);
    expect(isSetComplete(stats)).toBe(true);
  });
});

describe("isSetComplete", () => {
  it("is false for an empty set", () => {
    expect(isSetComplete(computeCompletion({}, []))).toBe(false);
  });

  it("is false until every card is owned", () => {
    const set = [
      { id: 1, rarity: "C" },
      { id: 2, rarity: "C" },
    ];
    expect(isSetComplete(computeCompletion({ 1: 1 }, set))).toBe(false);
    expect(isSetComplete(computeCompletion({ 1: 1, 2: 3 }, set))).toBe(true);
  });
});

describe("exportCollection", () => {
  it("round-trips through parseCollectionImport", () => {
    const collection = { 42: 2, 3: 1 };
    const text = exportCollection(collection);
    expect(text).toBe('{"3":1,"42":2}');
    expect(parseCollectionImport(text)).toEqual({
      ok: true,
      collection,
      skipped: 0,
    });
  });

  it("exports an empty collection as {}", () => {
    expect(exportCollection({})).toBe("{}");
  });
});

describe("parseCollectionImport", () => {
  it("rejects empty input", () => {
    expect(parseCollectionImport("  ")).toMatchObject({ ok: false });
  });

  it("rejects invalid JSON", () => {
    expect(parseCollectionImport("{nope")).toEqual({
      ok: false,
      error: "That isn't valid JSON.",
    });
  });

  it("rejects arrays and primitives", () => {
    expect(parseCollectionImport("[1,2]")).toMatchObject({ ok: false });
    expect(parseCollectionImport("5")).toMatchObject({ ok: false });
    expect(parseCollectionImport("null")).toMatchObject({ ok: false });
  });

  it("rejects an object with no valid entries", () => {
    expect(parseCollectionImport('{"abc": 1, "2": 0}')).toEqual({
      ok: false,
      error: "No cards found to import.",
    });
  });

  it("keeps valid entries and counts the skipped ones", () => {
    expect(parseCollectionImport('{"1": 2, "-3": 1, "4": 1.5}')).toEqual({
      ok: true,
      collection: { 1: 2 },
      skipped: 2,
    });
  });
});

describe("mergeCollections", () => {
  it("adds new cards and keeps existing ones", () => {
    expect(mergeCollections({ 1: 1 }, { 2: 3 })).toEqual({ 1: 1, 2: 3 });
  });

  it("dedupes by card, keeping the larger quantity", () => {
    expect(mergeCollections({ 1: 4, 2: 1 }, { 1: 2, 2: 3 })).toEqual({
      1: 4,
      2: 3,
    });
  });

  it("is idempotent for the same import", () => {
    const once = mergeCollections({ 1: 1 }, { 1: 2, 5: 1 });
    expect(mergeCollections(once, { 1: 2, 5: 1 })).toEqual(once);
  });

  it("does not mutate the existing collection", () => {
    const existing = { 1: 1 };
    mergeCollections(existing, { 2: 1 });
    expect(existing).toEqual({ 1: 1 });
  });
});
