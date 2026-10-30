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
  }>;
  effects?: Array<{ tags: string[]; kind: string }>;
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
});
