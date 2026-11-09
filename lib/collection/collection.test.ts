import { describe, it, expect } from "vitest";
import {
  EMPTY_COLLECTION,
  MAX_QUANTITY,
  parseCollection,
  validateCollection,
  computeCompletion,
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
