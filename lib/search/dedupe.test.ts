import { describe, expect, it } from "vitest";
import {
  dedupePrints,
  printGroups,
  printKey,
  type PrintKeyCard,
} from "./dedupe";

function card(
  id: number,
  name: string,
  rarity: string,
  over: Partial<PrintKeyCard> = {},
): PrintKeyCard {
  return {
    id,
    name,
    rarity,
    attacks: [
      {
        position: 0,
        name: "Circle Circuit",
        damageRaw: "30x",
        energyTypes: ["lightning", "lightning"],
        effectText:
          "This attack does 30 damage for each of your Benched Lightning Pokémon.",
      },
    ],
    effects: [],
    ...over,
  };
}

describe("printKey", () => {
  it("matches prints whose text differs only in case and spacing", () => {
    const a = card(1, "Pikachu ex", "RR");
    const b = card(2, "pikachu  ex ", "UR", {
      attacks: [
        {
          ...a.attacks[0]!,
          effectText:
            "  this attack does 30 damage for each of your Benched\nLightning Pokémon.",
        },
      ],
    });
    expect(printKey(a)).toBe(printKey(b));
  });

  it("ignores attack row order but not attack position", () => {
    const first = {
      position: 0,
      name: "A",
      damageRaw: "10",
      energyTypes: [],
      effectText: "",
    };
    const second = {
      position: 1,
      name: "B",
      damageRaw: "20",
      energyTypes: [],
      effectText: "",
    };
    expect(printKey(card(1, "X", "C", { attacks: [first, second] }))).toBe(
      printKey(card(2, "X", "C", { attacks: [second, first] })),
    );
    expect(printKey(card(1, "X", "C", { attacks: [first, second] }))).not.toBe(
      printKey(
        card(2, "X", "C", {
          attacks: [
            { ...first, position: 1 },
            { ...second, position: 0 },
          ],
        }),
      ),
    );
  });
});

describe("dedupePrints", () => {
  it("keeps the lowest-rarity print of each card, in input order", () => {
    const cards = [
      card(1, "Pikachu ex", "UR"),
      card(2, "Bulbasaur", "C"),
      card(3, "Pikachu ex", "SR"),
      card(4, "Pikachu ex", "RR"),
      card(5, "Pikachu ex", "IM"),
    ];
    expect(dedupePrints(cards).map((c) => c.id)).toEqual([2, 4]);
  });

  it("orders diamonds, stars, shinies, crown, then promo", () => {
    const ladder = [
      "PROMO",
      "UR",
      "IM",
      "SSR",
      "S",
      "SR",
      "AR",
      "RR",
      "R",
      "U",
      "C",
    ];
    for (let i = 0; i < ladder.length; i++) {
      const prints = ladder
        .slice(0, i + 1)
        .map((r, j) => card(j + 1, "Mew", r));
      expect(dedupePrints(prints).map((c) => c.rarity)).toEqual([ladder[i]]);
    }
  });

  it("breaks a rarity tie with the oldest print", () => {
    const cards = [card(9, "Potion", "C"), card(3, "Potion", "C")];
    expect(dedupePrints(cards).map((c) => c.id)).toEqual([3]);
  });

  it("keeps same-named cards with different attacks apart", () => {
    const gnaw = card(1, "Pikachu", "C", {
      attacks: [
        {
          position: 0,
          name: "Gnaw",
          damageRaw: "20",
          energyTypes: ["lightning"],
          effectText: "",
        },
      ],
    });
    const jolt = card(2, "Pikachu", "C", {
      attacks: [
        {
          position: 0,
          name: "Thunder Jolt",
          damageRaw: "40",
          energyTypes: ["lightning"],
          effectText: "",
        },
      ],
    });
    const moreDamage = card(3, "Pikachu", "U", {
      attacks: [{ ...gnaw.attacks[0]!, damageRaw: "30" }],
    });
    const otherCost = card(4, "Pikachu", "U", {
      attacks: [{ ...gnaw.attacks[0]!, energyTypes: ["colorless"] }],
    });
    const twoAttacks = card(5, "Pikachu", "U", {
      attacks: [gnaw.attacks[0]!, { ...jolt.attacks[0]!, position: 1 }],
    });
    expect(
      dedupePrints([gnaw, jolt, moreDamage, otherCost, twoAttacks]).map(
        (c) => c.id,
      ),
    ).toEqual([1, 2, 3, 4, 5]);
  });

  it("keeps a same-named card with a different ability apart", () => {
    const plain = card(1, "Greninja", "R");
    const withAbility = card(2, "Greninja", "R", {
      effects: [
        {
          kind: "ABILITY",
          effectText: "Do 20 damage to 1 of your opponent's Pokémon.",
        },
      ],
    });
    expect(dedupePrints([plain, withAbility])).toHaveLength(2);
  });

  it("collapses trainer reprints that share their text", () => {
    const text = "Draw 2 cards.";
    const cards = [
      card(1, "Professor's Research", "PROMO", {
        attacks: [],
        effects: [{ kind: "TRAINER", effectText: text }],
      }),
      card(2, "Professor's Research", "U", {
        attacks: [],
        effects: [{ kind: "TRAINER", effectText: text }],
      }),
    ];
    expect(dedupePrints(cards).map((c) => c.id)).toEqual([2]);
  });
});

describe("printGroups", () => {
  it("groups alt arts with the deck print by name and attacks", () => {
    const regular = card(10, "Pikachu ex", "RR");
    const altArt = card(90, "Pikachu ex", "SAR");
    const otherAttack = card(30, "Pikachu ex", "RR", {
      attacks: [
        {
          position: 0,
          name: "Thunderbolt",
          damageRaw: "150",
          energyTypes: ["lightning"],
          effectText: "",
        },
      ],
    });
    expect(printGroups([regular], [regular, altArt, otherAttack])).toEqual({
      10: [10, 90],
    });
  });

  it("always includes the target itself", () => {
    const lone = card(5, "Misty", "U", { attacks: [] });
    expect(printGroups([lone], [])).toEqual({ 5: [5] });
  });
});
