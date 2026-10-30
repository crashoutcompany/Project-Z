import { describe, expect, it } from "vitest";
import { groupByTags, planRetag } from "../retag";
import { DamageKind, EffectKind } from "../../prisma/generated/client/client";

describe("planRetag", () => {
  it("only plans rows whose tags change", () => {
    const { attackUpdates, effectUpdates } = planRetag(
      [
        {
          // Alakazam: the old rule tagged this energy_attach.
          id: 1,
          effectText:
            "This attack does 30 more damage for each Energy attached to your opponent's Active Pokémon.",
          damageKind: DamageKind.PLUS,
          energyCost: 3,
          tags: ["damage_plus", "energy_attach"],
        },
        {
          id: 2,
          effectText: "Draw 1 card.",
          damageKind: DamageKind.FIXED,
          energyCost: 1,
          tags: ["draw"],
        },
      ],
      [
        {
          // Helix Fossil: the old rule tagged this prevent.
          id: 10,
          effectText:
            "Play this card as if it were a 40-HP Basic [C] Pokémon. At any time during your turn, you may discard this card from play. This card can't retreat.",
          kind: EffectKind.TRAINER,
          tags: ["prevent"],
        },
        {
          id: 11,
          effectText: "Once during your turn, you may heal 20 damage from each of your Pokémon.",
          kind: EffectKind.ABILITY,
          tags: ["heal", "once_per_turn"],
        },
      ],
    );

    expect(attackUpdates).toEqual([
      { id: 1, before: ["damage_plus", "energy_attach"], after: ["damage_plus"] },
    ]);
    expect(effectUpdates).toEqual([{ id: 10, before: ["prevent"], after: [] }]);
  });
});

describe("groupByTags", () => {
  it("buckets rows by their new tag list, order-insensitive, and chunks large buckets", () => {
    const groups = groupByTags(
      [
        { id: 1, before: [], after: ["heal", "draw"] },
        { id: 2, before: [], after: ["draw", "heal"] },
        { id: 3, before: ["prevent"], after: [] },
        { id: 4, before: [], after: ["heal", "draw"] },
      ],
      2,
    );
    expect(groups).toEqual([
      { tags: ["draw", "heal"], ids: [1, 2] },
      { tags: ["draw", "heal"], ids: [4] },
      { tags: [], ids: [3] },
    ]);
  });
});
