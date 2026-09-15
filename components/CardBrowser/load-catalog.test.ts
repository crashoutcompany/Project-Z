import { beforeEach, describe, expect, it, vi } from "vitest";

const setFindMany = vi.fn();
const cardFindMany = vi.fn();

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
      initialSetId: 0,
      initialCards: [],
      initialCursor: null,
    });
    expect(cardFindMany).not.toHaveBeenCalled();
  });

  it("selects a set by code case-insensitively", async () => {
    cardFindMany.mockResolvedValue([
      { id: 1, name: "Pikachu", set: sets[1] },
    ]);
    const result = await loadCardCatalog({ setCode: "a2" });
    expect(result.initialSetId).toBe(2);
    expect(cardFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ setId: 2 }),
      }),
    );
  });

  it("falls back to the first set and pages with a cursor", async () => {
    const cards = Array.from({ length: 21 }, (_, i) => ({
      id: i + 1,
      name: `Card ${i + 1}`,
      set: sets[0],
    }));
    cardFindMany.mockResolvedValue(cards);

    const result = await loadCardCatalog({ tradeableOnly: true });
    expect(result.initialSetId).toBe(1);
    expect(result.initialCards).toHaveLength(20);
    expect(result.initialCursor).toBe(20);
    expect(cardFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ isTradeable: true, setId: 1 }),
      }),
    );
  });
});
