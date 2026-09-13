import { describe, expect, it } from "vitest";
import type { FilterJSON } from "./filter-schema";
import {
  attackMatches,
  cardMatchesClauses,
  effectMatches,
  type AttackRow,
} from "./match";

const attack = (over: Partial<AttackRow> = {}): AttackRow => ({
  tags: [],
  damageBase: 30,
  damageKind: "FIXED",
  energyCost: 2,
  energyTypes: ["fire", "colorless"],
  ...over,
});

describe("attackMatches — tags", () => {
  it("requires every requested tag to be present", () => {
    const row = attack({ tags: ["draw", "discard"] });
    expect(attackMatches({ tags: ["draw"] }, row)).toBe(true);
    expect(attackMatches({ tags: ["draw", "discard"] }, row)).toBe(true);
    expect(attackMatches({ tags: ["draw", "heal"] }, row)).toBe(false);
  });
});

describe("effectMatches — tags", () => {
  it("requires every requested tag to be present", () => {
    const row = { tags: ["draw", "discard"], kind: "ABILITY" };
    expect(effectMatches({ tags: ["draw"] }, row)).toBe(true);
    expect(effectMatches({ tags: ["draw", "heal"] }, row)).toBe(false);
    expect(effectMatches({ kind: "TRAINER" }, row)).toBe(false);
  });
});

describe("attackMatches — energyTypeCounts", () => {
  it("requires the full count, not just membership", () => {
    const oneFire = attack({ energyTypes: ["fire", "colorless"] });
    const twoFire = attack({ energyTypes: ["fire", "fire"] });

    expect(attackMatches({ energyTypeCounts: { fire: 2 } }, oneFire)).toBe(
      false,
    );
    expect(attackMatches({ energyTypeCounts: { fire: 2 } }, twoFire)).toBe(
      true,
    );
    expect(attackMatches({ energyTypeCounts: { fire: 1 } }, oneFire)).toBe(
      true,
    );
  });

  it("combines counts with the other attack constraints", () => {
    const row = attack({ energyTypes: ["fire", "fire"], energyCost: 2 });
    expect(
      attackMatches({ energyTypeCounts: { fire: 2 }, energyCost: 3 }, row),
    ).toBe(false);
    expect(
      attackMatches({ energyTypeCounts: { fire: 2 }, energyCost: 2 }, row),
    ).toBe(true);
  });
});

describe("cardMatchesClauses", () => {
  it("honors surface=any OR semantics between attack and effect", () => {
    const filter: FilterJSON = {
      surface: "any",
      attack: { energyTypeCounts: { fire: 2 } },
      effect: { tags: ["draw"] },
    };
    const viaEffect = {
      attacks: [attack({ energyTypes: ["fire"] })],
      effects: [{ tags: ["draw"], kind: "ABILITY" }],
    };
    const neither = {
      attacks: [attack({ energyTypes: ["fire"] })],
      effects: [{ tags: ["heal"], kind: "ABILITY" }],
    };
    expect(cardMatchesClauses(filter, viaEffect)).toBe(true);
    expect(cardMatchesClauses(filter, neither)).toBe(false);
  });

  it("evaluates anyOf branches", () => {
    const filter: FilterJSON = {
      surface: "any",
      anyOf: [
        { attack: { energyTypeCounts: { water: 2 } } },
        { attack: { energyTypeCounts: { fire: 2 } } },
      ],
    };
    expect(
      cardMatchesClauses(filter, {
        attacks: [attack({ energyTypes: ["fire", "fire"] })],
        effects: [],
      }),
    ).toBe(true);
    expect(
      cardMatchesClauses(filter, {
        attacks: [attack({ energyTypes: ["fire", "water"] })],
        effects: [],
      }),
    ).toBe(false);
  });
});
