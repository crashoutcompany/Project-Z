import { describe, it, expect } from "vitest";
import { tagAttack, tagEffect } from "../lib/tagger";
import { DamageKind, EffectKind } from "../../prisma/generated/client/client";

describe("tagAttack golden tests", () => {
  it("tags free attacks", () => {
    const tags = tagAttack({
      damageKind: DamageKind.NONE,
      energyCost: 0,
      effectText: "",
    });
    expect(tags).toContain("free_attack");
  });

  it("tags damage kinds", () => {
    const plusTags = tagAttack({
      damageKind: DamageKind.PLUS,
      energyCost: 2,
      effectText: "",
    });
    expect(plusTags).toContain("damage_plus");

    const scalingTags = tagAttack({
      damageKind: DamageKind.SCALING,
      energyCost: 2,
      effectText: "",
    });
    expect(scalingTags).toContain("damage_scaling");
  });

  it("tags coin flips", () => {
    const tags = tagAttack({
      damageKind: DamageKind.FIXED,
      energyCost: 2,
      effectText: "Flip 3 coins. This attack does 20 damage for each heads.",
    });
    expect(tags).toContain("coin_flip");
  });

  it("tags conditions and applies_condition", () => {
    const poison = tagAttack({
      damageKind: DamageKind.FIXED,
      energyCost: 2,
      effectText: "Your opponent's Active Pokémon is now Poisoned.",
    });
    expect(poison).toContain("condition_poison");
    expect(poison).toContain("applies_condition");

    const paralyzed = tagAttack({
      damageKind: DamageKind.FIXED,
      energyCost: 2,
      effectText: "Your opponent's Active Pokémon is now Paralyzed.",
    });
    expect(paralyzed).toContain("condition_paralyzed");
    expect(paralyzed).toContain("applies_condition");

    const asleep = tagAttack({
      damageKind: DamageKind.FIXED,
      energyCost: 1,
      effectText: "Your opponent's Active Pokémon is now Asleep.",
    });
    expect(asleep).toContain("condition_sleep");
    expect(asleep).toContain("applies_condition");
  });

  it("tags bench damage to opponent", () => {
    const tags = tagAttack({
      damageKind: DamageKind.FIXED,
      energyCost: 3,
      effectText: "This attack also does 30 damage to 1 of your opponent's Benched Pokémon.",
    });
    expect(tags).toContain("bench_damage");
  });

  it("tags multi target and random target", () => {
    const multi = tagAttack({
      damageKind: DamageKind.FIXED,
      energyCost: 3,
      effectText: "This attack does 20 damage to each of your opponent's Pokémon.",
    });
    expect(multi).toContain("multi_target");

    const random = tagAttack({
      damageKind: DamageKind.FIXED,
      energyCost: 2,
      effectText: "This attack does 50 damage to 1 of your opponent's Pokémon chosen at random.",
    });
    expect(random).toContain("random_target");
  });

  it("tags draw and heal", () => {
    const draw = tagAttack({
      damageKind: DamageKind.NONE,
      energyCost: 1,
      effectText: "Draw 2 cards.",
    });
    expect(draw).toContain("draw");

    const heal = tagAttack({
      damageKind: DamageKind.FIXED,
      energyCost: 2,
      effectText: "Heal 30 damage from this Pokémon.",
    });
    expect(heal).toContain("heal");
  });

  it("tags energy attach and energy discard", () => {
    const attach = tagAttack({
      damageKind: DamageKind.NONE,
      energyCost: 1,
      effectText: "Attach a Water Energy card from your discard pile to 1 of your Benched Pokémon.",
    });
    expect(attach).toContain("energy_attach");

    const discard = tagAttack({
      damageKind: DamageKind.FIXED,
      energyCost: 3,
      effectText: "Discard 2 Fire Energy from this Pokémon.",
    });
    expect(discard).toContain("energy_discard");
  });
});

describe("tagEffect golden tests", () => {
  it("tags abilities and trainer effects", () => {
    const oncePerTurn = tagEffect("Once during your turn, you may draw a card.", EffectKind.ABILITY);
    expect(oncePerTurn).toContain("once_per_turn");
    expect(oncePerTurn).toContain("draw");

    const switchEffect = tagEffect(
      "Switch in 1 of your opponent's Benched Pokémon to the Active Spot.",
      EffectKind.TRAINER
    );
    expect(switchEffect).toContain("switch");

    const preventEffect = tagEffect(
      "During your opponent's next turn, prevent all damage done to this Pokémon.",
      EffectKind.ABILITY
    );
    expect(preventEffect).toContain("prevent");

    const searchDeck = tagEffect(
      "Search your deck for up to 2 Basic Pokémon and put them onto your Bench.",
      EffectKind.TRAINER
    );
    expect(searchDeck).toContain("search_deck");

    const benchDamage = tagEffect(
      "Put 2 damage counters on each of your opponent's Benched Pokémon.",
      EffectKind.TRAINER
    );
    expect(benchDamage).toContain("bench_damage");
  });
});
