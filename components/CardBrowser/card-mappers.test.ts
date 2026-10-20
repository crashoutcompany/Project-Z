import { describe, expect, it } from "vitest";
import type { Set } from "@/prisma/generated/client/client";
import {
  filterToChips,
  previewFromCard,
  searchResultToCardWithSet,
  toSearchCardResult,
} from "./card-mappers";
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

describe("filterToChips", () => {
  it("summarizes the structured filter an effects search produced", () => {
    expect(
      filterToChips({
        surface: "any",
        cardType: "POKEMON",
        isEx: true,
        stage: ["BASIC"],
        energyType: ["fire"],
        hpMin: 90,
        attack: { energyCost: 1, damageMin: 50, damageKind: "FIXED", tags: ["coin_flip"] },
        effect: { tags: ["draw"] },
        textFallback: "burn",
      }),
    ).toEqual([
      "POKEMON",
      "EX",
      "BASIC",
      "fire",
      "HP≥90",
      "1 energy",
      "50+ dmg",
      "FIXED",
      "coin_flip",
      "draw",
      "text:burn",
    ]);
  });

  it("keeps zero values and returns nothing for an empty filter", () => {
    expect(filterToChips({ surface: "any", hpMin: 0, attack: { energyCost: 0 } })).toEqual([
      "HP≥0",
      "0 energy",
    ]);
    expect(filterToChips({ surface: "any" })).toEqual([]);
  });
});

describe("searchResultToCardWithSet", () => {
  const result = {
    id: 7,
    name: "Mew",
    imageUrl: "/mew.webp",
    setCode: "A1a",
    number: 151,
    cardType: "POKEMON",
    energyType: "psychic",
    hp: 60,
    rarity: "AR",
    isEx: false,
    isTradeable: true,
    matchedTags: [],
  };

  it("reuses the matching set", () => {
    const set = { id: 3, code: "A1a", setName: "Mythical Island" } as Set;
    const card = searchResultToCardWithSet(result, [set]);
    expect(card.set).toBe(set);
    expect(card.setId).toBe(3);
    expect(card).toMatchObject({ id: 7, name: "Mew", number: 151, stage: null });
  });

  it("falls back to a placeholder set for codes the page did not load", () => {
    const card = searchResultToCardWithSet(result, []);
    expect(card.setId).toBe(-1);
    expect(card.set).toMatchObject({ code: "A1a", setName: "A1a" });
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
