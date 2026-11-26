import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  EMPTY_WANT_LIST,
  WANT_LIST_STORAGE_KEY,
  clearWantList,
  getWantList,
  parseWantList,
  setWantList,
  setWantedQuantity,
  toggleWanted,
  wantListEntries,
} from "./want-list";
import { COLLECTION_STORAGE_KEY, MAX_QUANTITY } from "./index";

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
    clear: () => data.clear(),
  };
}

describe("parseWantList", () => {
  it("drops invalid ids and quantities", () => {
    const raw = JSON.stringify({ 1: 2, "-3": 1, foo: 1, 4: 0, 5: 1.5 });
    expect(parseWantList(raw)).toEqual({ 1: 2 });
  });

  it("falls back to empty on corrupt data", () => {
    expect(parseWantList("{nope")).toEqual(EMPTY_WANT_LIST);
    expect(parseWantList(null)).toEqual(EMPTY_WANT_LIST);
  });
});

describe("want list storage", () => {
  let storage: ReturnType<typeof memoryStorage>;

  beforeEach(() => {
    storage = memoryStorage();
    vi.stubGlobal("window", {});
    vi.stubGlobal("localStorage", storage);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("is empty on the server", () => {
    vi.stubGlobal("window", undefined);
    expect(getWantList()).toEqual(EMPTY_WANT_LIST);
  });

  it("stores under its own key, apart from the collection", () => {
    setWantedQuantity(7, 2);
    expect(storage.getItem(WANT_LIST_STORAGE_KEY)).toBe('{"7":2}');
    expect(storage.getItem(COLLECTION_STORAGE_KEY)).toBeNull();
  });

  it("toggles a card on with the requested copies and off again", () => {
    expect(toggleWanted(3, 2)).toEqual({ 3: 2 });
    expect(getWantList()).toEqual({ 3: 2 });
    expect(toggleWanted(3, 2)).toEqual({});
    expect(getWantList()).toEqual({});
  });

  it("wants at least one copy", () => {
    expect(toggleWanted(3, 0)).toEqual({ 3: 1 });
  });

  it("clamps quantities and removes zero", () => {
    setWantedQuantity(1, MAX_QUANTITY + 5);
    expect(getWantList()).toEqual({ 1: MAX_QUANTITY });
    setWantedQuantity(1, 0);
    expect(getWantList()).toEqual({});
  });

  it("cleans invalid entries on write", () => {
    setWantList({ 1: 2, [-1]: 3, 2: 0 });
    expect(getWantList()).toEqual({ 1: 2 });
  });

  it("clears the list", () => {
    setWantedQuantity(1, 1);
    clearWantList();
    expect(storage.getItem(WANT_LIST_STORAGE_KEY)).toBeNull();
  });
});

describe("wantListEntries", () => {
  const cards = [
    { id: 1, name: "A" },
    { id: 2, name: "B" },
    { id: 3, name: "C" },
  ];

  it("lists wanted cards in card order with owned counts", () => {
    expect(wantListEntries({ 3: 1, 1: 2 }, { 1: 1 }, cards)).toEqual([
      { card: cards[0], wanted: 2, owned: 1 },
      { card: cards[2], wanted: 1, owned: 0 },
    ]);
  });

  it("skips wanted ids with no matching card", () => {
    expect(wantListEntries({ 99: 1 }, {}, cards)).toEqual([]);
  });
});
