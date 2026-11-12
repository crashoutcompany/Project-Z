import { beforeEach, describe, expect, it, vi } from "vitest";

const setFindMany = vi.fn();
const cardFindMany = vi.fn();

vi.mock("next/cache", () => ({ cacheLife: vi.fn(), cacheTag: vi.fn() }));

vi.mock("@/prisma/db", () => ({
  default: {
    set: { findMany: setFindMany },
    card: { findMany: cardFindMany },
  },
}));

const { loadCardCatalog } = await import("./load-catalog");

const sets = [
  { id: 1, code: "A1", name: "Genetic Apex" },
  { id: 2, code: "A2", name: "Space-Time Smackdown" },
];

describe("loadCardCatalog", () => {
  beforeEach(() => {
    setFindMany.mockReset();
    cardFindMany.mockReset();
    setFindMany.mockResolvedValue(sets);
  });

  it("returns an empty catalog when there are no sets", async () => {
    setFindMany.mockResolvedValue([]);
    await expect(loadCardCatalog()).resolves.toEqual({
      sets: [],
      initialSetIds: [],
      initialCards: [],
      initialCursor: null,
      initialTotal: 0,
    });
    expect(cardFindMany).not.toHaveBeenCalled();
  });

  it("selects a set by code case-insensitively", async () => {
    cardFindMany.mockResolvedValue([
      {
        id: 1,
        name: "Pikachu",
        rarity: "C",
        attacks: [],
        effects: [],
        set: sets[1],
      },
    ]);
    const result = await loadCardCatalog({ setCode: "a2" });
    expect(result.initialSetIds).toEqual([2]);
    expect(result.initialTotal).toBe(1);
    expect(cardFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ setId: { in: [2] } }),
      }),
    );
  });

  it("opens on every set and pages with a cursor", async () => {
    const cards = Array.from({ length: 21 }, (_, i) => ({
      id: i + 1,
      name: `Card ${i + 1}`,
      rarity: "C",
      attacks: [],
      effects: [],
      set: sets[0],
    }));
    cardFindMany.mockResolvedValue(cards);

    const result = await loadCardCatalog({ tradeableOnly: true });
    expect(result.initialSetIds).toEqual([]);
    expect(result.initialCards).toHaveLength(20);
    expect(result.initialCursor).toBe(20);
    expect(result.initialTotal).toBe(21);
    expect(cardFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { isTradeable: true },
      }),
    );
  });
});
