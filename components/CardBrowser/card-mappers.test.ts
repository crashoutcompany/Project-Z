import { describe, expect, it } from "vitest";
import { toSearchCardResult } from "./card-mappers";
import type { CardWithSet } from "./types";

describe("toSearchCardResult", () => {
  it("projects catalog cards into the search result shape", () => {
    const card = {
      id: 12,
      name: "Pikachu",
      imageUrl: "/pika.webp",
      number: 25,
      cardType: "POKEMON",
      energyType: "lightning",
      hp: 60,
      rarity: "C",
      isEx: false,
      isTradeable: true,
      set: { code: "A1" },
    } as CardWithSet;

    expect(toSearchCardResult(card)).toEqual({
      id: 12,
      name: "Pikachu",
      imageUrl: "/pika.webp",
      setCode: "A1",
      number: 25,
      cardType: "POKEMON",
      energyType: "lightning",
      hp: 60,
      rarity: "C",
      isEx: false,
      isTradeable: true,
      matchedTags: [],
    });
  });
});
