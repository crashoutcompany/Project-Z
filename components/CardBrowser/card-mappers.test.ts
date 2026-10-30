import { describe, expect, it } from "vitest";
import { previewFromCard, toSearchCardResult } from "./card-mappers";
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
      secondaryEnergyType: "metal",
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
      secondaryEnergyType: "metal",
      hp: 60,
      rarity: "C",
      isEx: false,
      isTradeable: true,
      matchedTags: [],
    });
  });
});

describe("previewFromCard", () => {
  it("builds an instant detail with no attacks or effects yet", () => {
    const card = {
      id: 12,
      name: "Pikachu",
      imageUrl: "/pika.webp",
      number: 25,
      cardType: "POKEMON",
      rarity: "C",
      isTradeable: true,
      hp: 60,
      energyType: "lightning",
      stage: "BASIC",
      isEx: false,
      trainerType: null,
      weakness: "fighting",
      retreatCost: 1,
      set: { code: "A1", setName: "Genetic Apex" },
    } as CardWithSet;

    expect(previewFromCard(card)).toMatchObject({
      id: 12,
      ref: "A1-25",
      setName: "Genetic Apex",
      attacks: [],
      effects: [],
    });
  });
});
