import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FilterJSON } from "./filter-schema";

const findMany = vi.fn();
const queryRaw = vi.fn();

vi.mock("@/prisma/db", () => ({
  default: {
    card: { findMany },
    $queryRaw: (...args: unknown[]) => queryRaw(...args),
  },
}));

const { executeSearch } = await import("./execute-search");

function row(over: {
  id: number;
  name: string;
  rarity?: string;
  number?: number;
  energyType?: string | null;
  secondaryEnergyType?: string | null;
  isTradeable?: boolean;
  attacks?: Array<{
    tags: string[];
    damageBase: number | null;
    damageKind: string;
    energyCost: number;
    energyTypes: string[];
    effectText?: string;
  }>;
  effects?: Array<{ tags: string[]; kind: string; effectText?: string }>;
}) {
  return {
    id: over.id,
    name: over.name,
    imageUrl: `/img/${over.id}.webp`,
    number: over.number ?? over.id,
    cardType: "POKEMON",
    energyType: over.energyType ?? "fire",
    secondaryEnergyType: over.secondaryEnergyType ?? null,
    hp: 100,
    rarity: over.rarity ?? "C",
    isEx: false,
    isTradeable: over.isTradeable ?? true,
    set: { code: "A1" },
    attacks: over.attacks ?? [
      {
        tags: ["coin_flip"],
        damageBase: 30,
        damageKind: "FIXED",
        energyCost: 1,
        energyTypes: ["fire"],
      },
    ],
    effects: over.effects ?? [],
  };
}

describe("executeSearch", () => {
  beforeEach(() => {
    findMany.mockReset();
    queryRaw.mockReset();
  });

  it("ranks by matched tags, then damage, then rarity", async () => {
    findMany.mockResolvedValue([
      row({
        id: 1,
        name: "Common Hit",
        rarity: "C",
        attacks: [
          {
            tags: ["coin_flip"],
            damageBase: 10,
            damageKind: "FIXED",
            energyCost: 1,
            energyTypes: ["fire"],
          },
        ],
      }),
      row({
        id: 2,
        name: "Rare Hit",
        rarity: "UR",
        attacks: [
          {
            tags: ["coin_flip"],
            damageBase: 80,
            damageKind: "FIXED",
            energyCost: 1,
            energyTypes: ["fire"],
          },
        ],
      }),
      row({
        id: 3,
        name: "Two Tags",
        rarity: "C",
        attacks: [
          {
            tags: ["coin_flip", "draw"],
            damageBase: 20,
            damageKind: "FIXED",
            energyCost: 1,
            energyTypes: ["fire"],
          },
        ],
      }),
    ]);

    const filter: FilterJSON = {
      surface: "any",
      attack: { tags: ["coin_flip", "draw"] },
    };
    const result = await executeSearch(filter, { limit: 10 });
    expect(result.usedFallback).toBe(false);
    expect(result.cards.map((c) => c.name)).toEqual([
      "Two Tags",
      "Rare Hit",
      "Common Hit",
    ]);
    expect(result.cards[0]?.matchedTags).toEqual(["coin_flip", "draw"]);
  });

  it("ranks a pure tag match above a big hitter whose tag shares an attack with unrelated tags", async () => {
    const attack = (tags: string[], damageBase: number | null) => ({
      tags,
      damageBase,
      damageKind: "FIXED",
      energyCost: 1,
      energyTypes: ["fire"],
    });
    findMany.mockResolvedValue([
      // Rows come back name-ordered; ranking must not depend on that.
      row({
        id: 1,
        name: "Charizard ex",
        rarity: "RR",
        attacks: [
          attack(["energy_discard", "energy_attach"], 200),
          attack([], 60),
        ],
      }),
      row({
        id: 2,
        name: "Moltres ex",
        rarity: "RR",
        attacks: [attack(["energy_attach"], 0), attack([], 150)],
      }),
      row({
        id: 3,
        name: "Zapdos",
        rarity: "C",
        effects: [{ tags: ["energy_attach", "once_per_turn"], kind: "ABILITY" }],
      }),
      row({
        id: 4,
        name: "Blaine",
        rarity: "U",
        attacks: [],
        effects: [{ tags: ["energy_attach"], kind: "SUPPORTER" }],
      }),
    ]);

    const result = await executeSearch(
      {
        surface: "any",
        attack: { tags: ["energy_attach"] },
        effect: { tags: ["energy_attach"] },
      },
      { limit: 10 },
    );

    // Pure attachers first ("once per turn" is not a separate effect), with
    // rarity breaking the tie: the 150 on Moltres's other attack does not
    // count. Charizard's attach shares its attack with an Energy discard, so
    // its 200 damage cannot lift it above them.
    expect(result.cards.map((c) => c.name)).toEqual([
      "Zapdos",
      "Blaine",
      "Moltres ex",
      "Charizard ex",
    ]);
  });

  it("prefers all wanted tags on one attack over tags spread across a card", async () => {
    const attack = (tags: string[]) => ({
      tags,
      damageBase: 30,
      damageKind: "FIXED",
      energyCost: 1,
      energyTypes: ["fire"],
    });
    findMany.mockResolvedValue([
      row({ id: 1, name: "Spread", attacks: [attack(["coin_flip"]), attack(["draw"])] }),
      row({ id: 2, name: "Focused", attacks: [attack(["coin_flip", "draw"])] }),
    ]);

    const result = await executeSearch(
      { surface: "any" },
      { tags: ["coin_flip", "draw"] },
    );
    expect(result.cards.map((c) => c.name)).toEqual(["Focused", "Spread"]);
  });

  it("scans every candidate instead of a name-ordered first page", async () => {
    findMany.mockResolvedValue([]);
    await executeSearch(
      { surface: "any", attack: { tags: ["energy_attach"] } },
      { limit: 10 },
    );
    expect(findMany.mock.calls[0]?.[0]?.take).toBe(2000);

    findMany.mockClear();
    await executeSearch({ surface: "any", cardType: "TRAINER" }, { limit: 10 });
    expect(findMany.mock.calls[0]?.[0]?.take).toBe(2000);
  });

  it("reports every match as the total and pages with offset", async () => {
    findMany.mockResolvedValue(
      Array.from({ length: 75 }, (_, i) =>
        row({
          id: i + 1,
          name: `Poisoner ${String(i + 1).padStart(2, "0")}`,
          effects: [{ tags: ["condition_poison"], kind: "ABILITY" }],
          attacks: [],
        }),
      ),
    );

    const first = await executeSearch(
      { surface: "any" },
      { tags: ["condition_poison"], limit: 60 },
    );
    expect(first.total).toBe(75);
    expect(first.cards).toHaveLength(60);
    expect(first.cards[0]?.name).toBe("Poisoner 01");

    const second = await executeSearch(
      { surface: "any" },
      { tags: ["condition_poison"], limit: 60, offset: 60 },
    );
    expect(second.total).toBe(75);
    expect(second.cards.map((c) => c.name)).toEqual(
      Array.from(
        { length: 15 },
        (_, i) => `Poisoner ${String(i + 61).padStart(2, "0")}`,
      ),
    );
  });

  it("ranks true attachers above a stale tag on an Energy discard attack", async () => {
    const attack = (
      tags: string[],
      damageBase: number,
      effectText: string,
    ) => ({
      tags,
      damageBase,
      damageKind: "FIXED",
      energyCost: 2,
      energyTypes: ["fire"],
      effectText,
    });
    findMany.mockResolvedValue([
      // Tagged before the tagger learned Energy discards: the stored tag says
      // "attaches", the text says "discards".
      row({
        id: 1,
        name: "Charizard ex",
        rarity: "RR",
        attacks: [
          attack([], 60, ""),
          attack(["energy_attach"], 200, "Discard 2 [R] Energy from this Pokémon."),
        ],
      }),
      // Attaches, but its other attack throws Energy away.
      row({
        id: 2,
        name: "Arcanine ex",
        rarity: "RR",
        attacks: [
          attack(
            ["energy_attach", "energy_zone_attach"],
            40,
            "Take a [R] Energy from your Energy Zone and attach it to this Pokémon.",
          ),
          attack(
            ["energy_discard", "self_energy_discard"],
            150,
            "Discard 2 [R] Energy from this Pokémon.",
          ),
        ],
      }),
      row({
        id: 3,
        name: "Moltres",
        rarity: "C",
        attacks: [
          attack(
            ["energy_attach", "energy_zone_attach"],
            20,
            "Take a [R] Energy from your Energy Zone and attach it to this Pokémon.",
          ),
        ],
      }),
      row({
        id: 4,
        name: "Alolan Ninetales ex",
        rarity: "RR",
        attacks: [
          attack(
            ["energy_attach"],
            80,
            "During your opponent's next turn, they can't take any Energy from their Energy Zone.",
          ),
        ],
      }),
    ]);

    const result = await executeSearch(
      { surface: "any" },
      { tags: ["energy_attach"] },
    );

    // Moltres only attaches (the Energy Zone tag is part of attaching, not an
    // unrelated effect). Arcanine attaches but also discards. Neither the
    // Ninetales nor the Charizard text attaches anything, so their damage
    // cannot lift them, and Charizard's discard puts it last. Both still
    // count as matches for the total.
    expect(result.cards.map((c) => c.name)).toEqual([
      "Moltres",
      "Arcanine ex",
      "Alolan Ninetales ex",
      "Charizard ex",
    ]);
    expect(result.total).toBe(4);
    expect(result.cards[3]?.matchedTags).toEqual(["energy_attach"]);
  });

  it("does not count a condition's umbrella tag as an unrelated effect", async () => {
    const attack = (tags: string[], damageBase: number) => ({
      tags,
      damageBase,
      damageKind: "FIXED",
      energyCost: 1,
      energyTypes: ["grass"],
    });
    findMany.mockResolvedValue([
      row({
        id: 1,
        name: "Poison and Draw",
        attacks: [attack(["condition_poison", "applies_condition", "draw"], 90)],
      }),
      row({
        id: 2,
        name: "Just Poison",
        attacks: [attack(["condition_poison", "applies_condition"], 10)],
      }),
    ]);

    const result = await executeSearch(
      { surface: "any" },
      { tags: ["condition_poison"] },
    );
    expect(result.cards.map((c) => c.name)).toEqual([
      "Just Poison",
      "Poison and Draw",
    ]);
  });

  it("narrows by UI-picked types on either type, on top of tags", async () => {
    findMany.mockResolvedValue([]);
    await executeSearch(
      { surface: "any", energyType: ["fire"] },
      { tags: ["gust"], types: ["grass", "water"] },
    );
    const where = findMany.mock.calls[0]?.[0]?.where;
    expect(where.AND).toEqual([
      {
        OR: [
          { attacks: { some: { tags: { has: "gust" } } } },
          { effects: { some: { tags: { has: "gust" } } } },
        ],
      },
      {
        OR: [
          { energyType: { in: ["fire"] } },
          { secondaryEnergyType: { in: ["fire"] } },
        ],
      },
      {
        OR: [
          { energyType: { in: ["grass", "water"] } },
          { secondaryEnergyType: { in: ["grass", "water"] } },
        ],
      },
    ]);
  });

  it("does not fall back to FTS when a parsed tag search is empty", async () => {
    findMany.mockResolvedValue([]);
    const result = await executeSearch({
      surface: "any",
      attack: { tags: ["energy_attach"] },
      textFallback: "attach energy",
    });
    expect(result.cards).toEqual([]);
    expect(result.usedFallback).toBe(false);
    expect(queryRaw).not.toHaveBeenCalled();
  });

  it("post-filters energyTypeCounts so single-fire cards drop out", async () => {
    findMany.mockResolvedValue([
      row({
        id: 1,
        name: "Single Fire",
        attacks: [
          {
            tags: [],
            damageBase: 50,
            damageKind: "FIXED",
            energyCost: 2,
            energyTypes: ["fire", "colorless"],
          },
        ],
      }),
      row({
        id: 2,
        name: "Double Fire",
        attacks: [
          {
            tags: [],
            damageBase: 50,
            damageKind: "FIXED",
            energyCost: 2,
            energyTypes: ["fire", "fire"],
          },
        ],
      }),
    ]);

    const result = await executeSearch({
      surface: "any",
      attack: { energyTypeCounts: { fire: 2 } },
    });
    expect(result.cards.map((c) => c.name)).toEqual(["Double Fire"]);
  });

  it("matches energyType against either type of a dual-type card", async () => {
    findMany.mockResolvedValue([
      row({
        id: 1,
        name: "Mega Greninja ex",
        energyType: "water",
        secondaryEnergyType: "darkness",
      }),
    ]);

    const result = await executeSearch(
      { surface: "any", energyType: ["darkness"] },
      { limit: 10 },
    );

    const where = findMany.mock.calls[0]?.[0]?.where;
    expect(where.energyType).toBeUndefined();
    expect(where.AND).toContainEqual({
      OR: [
        { energyType: { in: ["darkness"] } },
        { secondaryEnergyType: { in: ["darkness"] } },
      ],
    });
    expect(result.cards[0]).toMatchObject({
      energyType: "water",
      secondaryEnergyType: "darkness",
    });
  });

  it("applies the either-type energy filter to FTS fallback rows", async () => {
    findMany.mockResolvedValue([]);
    const ftsRow = (id: number, name: string, secondary: string | null) => ({
      id,
      name,
      imageUrl: `/img/${id}.webp`,
      setCode: "C1",
      number: id,
      cardType: "POKEMON",
      trainerType: null,
      energyType: "water",
      secondaryEnergyType: secondary,
      stage: "STAGE2",
      hp: 200,
      rarity: "RR",
      isEx: true,
      isTradeable: true,
    });
    queryRaw.mockResolvedValue([
      ftsRow(1, "Dual", "darkness"),
      ftsRow(2, "Single", null),
    ]);

    const result = await executeSearch({
      surface: "any",
      energyType: ["darkness"],
      textFallback: "greninja",
    });
    expect(result.usedFallback).toBe(true);
    expect(result.cards.map((c) => c.name)).toEqual(["Dual"]);
  });

  it("applies UI-picked types to FTS fallback rows and pages them", async () => {
    findMany.mockResolvedValue([]);
    const ftsRow = (id: number, energyType: string, secondary: string | null) => ({
      id,
      name: `Mon ${id}`,
      imageUrl: `/img/${id}.webp`,
      setCode: "C1",
      number: id,
      cardType: "POKEMON",
      trainerType: null,
      energyType,
      secondaryEnergyType: secondary,
      stage: "BASIC",
      hp: 70,
      rarity: "C",
      isEx: false,
      isTradeable: true,
    });
    queryRaw.mockResolvedValue([
      ftsRow(1, "grass", null),
      ftsRow(2, "fire", null),
      ftsRow(3, "water", "grass"),
      ftsRow(4, "grass", null),
    ]);

    const result = await executeSearch(
      { surface: "any", textFallback: "mon" },
      { types: ["grass"], limit: 2, offset: 1 },
    );
    expect(result.usedFallback).toBe(true);
    expect(result.total).toBe(3);
    expect(result.cards.map((c) => c.id)).toEqual([3, 4]);
  });

  it("uses FTS fallback when the structured query is empty", async () => {
    findMany.mockResolvedValue([]);
    queryRaw.mockResolvedValue([
      {
        id: 9,
        name: "Fallbackmon",
        imageUrl: "/img/9.webp",
        setCode: "A1",
        number: 9,
        cardType: "POKEMON",
        trainerType: null,
        energyType: "fire",
        secondaryEnergyType: null,
        stage: "BASIC",
        hp: 80,
        rarity: "C",
        isEx: false,
        isTradeable: true,
      },
    ]);

    const result = await executeSearch({
      surface: "any",
      textFallback: "fallbackmon",
    });
    expect(result.usedFallback).toBe(true);
    expect(result.cards).toHaveLength(1);
    expect(result.cards[0]?.name).toBe("Fallbackmon");
  });

  it("requires every UI-picked tag on some attack or effect and skips FTS", async () => {
    findMany.mockResolvedValue([
      row({
        id: 1,
        name: "Gustmon",
        effects: [{ tags: ["gust"], kind: "ABILITY" }],
      }),
    ]);

    const result = await executeSearch(
      { surface: "any" },
      { tags: ["gust", "coin_flip"] },
    );

    const where = findMany.mock.calls[0]?.[0]?.where;
    expect(where.AND).toEqual([
      {
        OR: [
          { attacks: { some: { tags: { has: "gust" } } } },
          { effects: { some: { tags: { has: "gust" } } } },
        ],
      },
      {
        OR: [
          { attacks: { some: { tags: { has: "coin_flip" } } } },
          { effects: { some: { tags: { has: "coin_flip" } } } },
        ],
      },
    ]);
    expect(result.cards[0]?.matchedTags).toEqual(["gust", "coin_flip"]);

    findMany.mockResolvedValue([]);
    const empty = await executeSearch({ surface: "any" }, { tags: ["gust"] });
    expect(empty.cards).toEqual([]);
    expect(queryRaw).not.toHaveBeenCalled();
  });

  it("matches any UI-picked tag in tagMode any, ranking cards with more first", async () => {
    findMany.mockResolvedValue([
      row({
        id: 1,
        name: "One",
        effects: [{ tags: ["gust"], kind: "ABILITY" }],
      }),
      row({
        id: 2,
        name: "Both",
        attacks: [
          {
            tags: ["snipe", "energy_zone_attach"],
            damageBase: 30,
            damageKind: "FIXED",
            energyCost: 1,
            energyTypes: ["fire"],
          },
        ],
      }),
    ]);

    const result = await executeSearch(
      { surface: "any" },
      { tags: ["energy_zone_attach", "snipe"], tagMode: "any" },
    );

    const where = findMany.mock.calls[0]?.[0]?.where;
    expect(where.AND).toEqual([
      {
        OR: [
          { attacks: { some: { tags: { has: "energy_zone_attach" } } } },
          { effects: { some: { tags: { has: "energy_zone_attach" } } } },
          { attacks: { some: { tags: { has: "snipe" } } } },
          { effects: { some: { tags: { has: "snipe" } } } },
        ],
      },
    ]);
    expect(result.cards.map((c) => c.name)).toEqual(["Both", "One"]);
  });
});
