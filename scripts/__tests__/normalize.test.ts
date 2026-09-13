import { describe, it, expect } from "vitest";
import {
  cleanTrainerEffect,
  parseDamage,
  normalizeAttack,
  normalizeCard,
} from "../lib/normalize";
import { DamageKind, CardType, Stage, TrainerType } from "../../prisma/generated/client/client";
import type { SourceCard, SourceAttack } from "../lib/source-schema";

describe("normalize - damage parsing", () => {
  it("parses empty damage as NONE", () => {
    const res = parseDamage("");
    expect(res).toEqual({
      damageRaw: "",
      damageBase: null,
      damageKind: DamageKind.NONE,
    });
  });

  it("parses fixed damage", () => {
    const res = parseDamage("40");
    expect(res).toEqual({
      damageRaw: "40",
      damageBase: 40,
      damageKind: DamageKind.FIXED,
    });
  });

  it("parses plus damage", () => {
    const res = parseDamage("50+");
    expect(res).toEqual({
      damageRaw: "50+",
      damageBase: 50,
      damageKind: DamageKind.PLUS,
    });
  });

  it("parses scaling damage", () => {
    const res = parseDamage("20x");
    expect(res).toEqual({
      damageRaw: "20x",
      damageBase: 20,
      damageKind: DamageKind.SCALING,
    });
  });

  it("parses minus damage", () => {
    const res = parseDamage("30-");
    expect(res).toEqual({
      damageRaw: "30-",
      damageBase: 30,
      damageKind: DamageKind.MINUS,
    });
  });
});

describe("normalize - attack repair", () => {
  it("repairs damage/name split bug where last word was pushed into damage", () => {
    const brokenAttack: SourceAttack = {
      name: "Find a",
      damage: "Friend",
      cost: ["colorless"],
      effect: "Put a Basic Pokémon from your deck into your hand.",
    };

    const normalized = normalizeAttack(brokenAttack, 0);
    expect(normalized.name).toBe("Find a Friend");
    expect(normalized.damageRaw).toBe("");
    expect(normalized.damageBase).toBe(null);
    expect(normalized.damageKind).toBe(DamageKind.NONE);
    expect(normalized.energyCost).toBe(1);
    expect(normalized.energyTypes).toEqual(["colorless"]);
  });

  it("handles No Cost sentinel", () => {
    const freeAttack: SourceAttack = {
      name: "Toasty",
      damage: "",
      cost: ["No Cost"],
      effect: "No effect",
    };

    const normalized = normalizeAttack(freeAttack, 0);
    expect(normalized.name).toBe("Toasty");
    expect(normalized.energyCost).toBe(0);
    expect(normalized.energyTypes).toEqual([]);
    expect(normalized.effectText).toBe("");
  });
});

describe("normalize - trainer text cleanup", () => {
  it("strips Illustrated by and collapses spaces and fixes punctuation", () => {
    const raw = `Play this card as if it were a 40-HP Basic [C] Pokémon.At any time during your turn, you may discard this card from play.This card can't retreat.

            
                    
    
            Illustrated by 
            
                Toyste Beach`;

    const cleaned = cleanTrainerEffect(raw);
    expect(cleaned).toBe(
      "Play this card as if it were a 40-HP Basic [C] Pokémon. At any time during your turn, you may discard this card from play. This card can't retreat."
    );
    expect(cleaned.includes("Illustrated by")).toBe(false);
  });
});

describe("normalize - full card", () => {
  it("normalizes a Pokemon card with nullables and stage", () => {
    const source: SourceCard = {
      expansion: "A1",
      card_id: "A1-1",
      image: "/images/en-US/A1-1.webp",
      hp: 70,
      energy: "grass",
      name: "Bulbasaur",
      card_type: "pokémon",
      evolution_type: "basic",
      attacks: [
        {
          name: "Vine Whip",
          damage: "40",
          cost: ["grass", "colorless"],
          effect: "No effect",
        },
      ],
      weakness: "fire",
      retreat: 1,
      rarity: "◊",
      ex: false,
      baby: false,
      pack: "mewtwopack",
    };

    const card = normalizeCard(
      source,
      "https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/pocket/A1/A1_001_EN_SM.webp",
      { rarityCode: "C", isTradeable: true },
      1
    );

    expect(card.number).toBe(1);
    expect(card.name).toBe("Bulbasaur");
    expect(card.cardType).toBe(CardType.POKEMON);
    expect(card.stage).toBe(Stage.BASIC);
    expect(card.hp).toBe(70);
    expect(card.weakness).toBe("fire");
    expect(card.retreatCost).toBe(1);
    expect(card.rarity).toBe("C");
    expect(card.isTradeable).toBe(true);
    expect(card.attacks.length).toBe(1);
    expect(card.attacks[0].name).toBe("Vine Whip");
    expect(card.attacks[0].damageBase).toBe(40);
  });

  it("normalizes a Trainer card and sets trainerType and cleans effect", () => {
    const source: SourceCard = {
      expansion: "A1",
      card_id: "A1-216",
      image: "/images/en-US/A1-216.webp",
      hp: 40,
      energy: "trainer",
      name: "Helix Fossil",
      card_type: "trainer",
      evolution_type: "item",
      attacks: [],
      ability: {
        name: "",
        effect: "Play this card as if it were a 40-HP Basic [C] Pokémon.At any time during your turn, you may discard this card from play.\n\n Illustrated by Toyste Beach",
      },
      weakness: "N/A",
      retreat: null,
      rarity: "◊",
      ex: false,
      baby: false,
    };

    const card = normalizeCard(
      source,
      "https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/pocket/A1/A1_216_EN_SM.webp",
      { rarityCode: "C", isTradeable: true },
      216
    );

    expect(card.cardType).toBe(CardType.TRAINER);
    expect(card.trainerType).toBe(TrainerType.ITEM);
    expect(card.stage).toBe(null);
    expect(card.weakness).toBe(null);
    expect(card.energyType).toBe(null);
    expect(card.effects.length).toBe(1);
    expect(card.effects[0].kind).toBe("TRAINER");
    expect(card.effects[0].effectText).toBe(
      "Play this card as if it were a 40-HP Basic [C] Pokémon. At any time during your turn, you may discard this card from play."
    );
  });
});
