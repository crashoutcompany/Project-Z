import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

import type { SearchCardResult } from "@/lib/search";
import {
  addCardToDeck,
  refOf,
  removeOneFromDeck,
  toEntries,
  type DeckCard,
} from "./use-builder-state";

const card = (
  over: Partial<SearchCardResult> & Pick<SearchCardResult, "id" | "name">,
): SearchCardResult => ({
  imageUrl: "/x.webp",
  setCode: "A1",
  number: over.id,
  cardType: "POKEMON",
  energyType: "fire",
  hp: 70,
  rarity: "C",
  isEx: false,
  isTradeable: true,
  matchedTags: [],
  ...over,
});

describe("builder deck helpers", () => {
  it("formats refs and entries", () => {
    expect(refOf({ setCode: "P-A", number: 12 })).toBe("P-A-12");
    const deck: DeckCard[] = [{ ...card({ id: 1, name: "Pikachu" }), count: 2 }];
    expect(toEntries(deck)).toEqual([
      { setCode: "A1", number: 1, count: 2, ref: "A1-1" },
    ]);
  });

  it("adds a new card and increments an existing copy", () => {
    const pikachu = card({ id: 1, name: "Pikachu" });
    const once = addCardToDeck([], pikachu);
    expect(once).toEqual([{ ...pikachu, count: 1 }]);
    const twice = addCardToDeck(once!, pikachu);
    expect(twice?.[0]?.count).toBe(2);
    expect(addCardToDeck(twice!, pikachu)).toBeNull();
  });

  it("rejects a third copy of the same name even across refs", () => {
    const a = { ...card({ id: 1, name: "Pikachu" }), count: 2 };
    const b = card({ id: 100, name: "Pikachu", number: 100 });
    expect(addCardToDeck([a], b)).toBeNull();
  });

  it("rejects adds that would exceed 20 cards", () => {
    const full: DeckCard[] = Array.from({ length: 20 }, (_, i) => ({
      ...card({ id: i + 1, name: `Card ${i + 1}` }),
      count: 1,
    }));
    expect(addCardToDeck(full, card({ id: 99, name: "Extra" }))).toBeNull();
  });

  it("removes one copy and drops the row at zero", () => {
    const pikachu = { ...card({ id: 1, name: "Pikachu" }), count: 2 };
    const once = removeOneFromDeck([pikachu], pikachu);
    expect(once[0]?.count).toBe(1);
    expect(removeOneFromDeck(once, once[0]!)).toEqual([]);
  });
});
