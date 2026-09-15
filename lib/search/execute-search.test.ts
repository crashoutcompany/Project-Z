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
});
