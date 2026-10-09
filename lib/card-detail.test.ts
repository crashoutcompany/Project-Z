import { beforeEach, describe, expect, it, vi } from "vitest";

const { findUnique, findFirst } = vi.hoisted(() => ({
  findUnique: vi.fn(),
  findFirst: vi.fn(),
}));

vi.mock("@/prisma/db", () => ({
  default: {
    card: { findUnique, findFirst },
  },
}));

const {
  mapCardRowToDetail,
  getCardDetailById,
  getCardDetailByRef,
} = await import("./card-detail");

const row = {
  id: 12,
  name: "Pikachu",
  imageUrl: "/pika.webp",
  number: 25,
  cardType: "POKEMON" as const,
  rarity: "C",
  isTradeable: true,
  hp: 60,
  energyType: "lightning",
  stage: "BASIC" as const,
  isEx: false,
  trainerType: null,
  weakness: "fighting",
  retreatCost: 1,
  set: { code: "A1", setName: "Genetic Apex" },
  attacks: [
    {
      position: 0,
      name: "Gnaw",
      damageRaw: "20",
      damageBase: 20,
      damageKind: "FIXED" as const,
      energyCost: 1,
      energyTypes: ["colorless"],
      effectText: "",
    },
  ],
  effects: [],
};

describe("mapCardRowToDetail", () => {
  it("projects a catalog row into the sheet payload", () => {
    expect(mapCardRowToDetail(row)).toMatchObject({
      id: 12,
      name: "Pikachu",
      setCode: "A1",
      setName: "Genetic Apex",
      ref: "A1-25",
      rarity: "C",
      hp: 60,
      attacks: [{ name: "Gnaw", damageRaw: "20" }],
    });
  });
});

describe("getCardDetailById", () => {
  beforeEach(() => {
    findUnique.mockReset();
    findFirst.mockReset();
  });

  it("rejects non-positive ids without querying", async () => {
    await expect(getCardDetailById(0)).resolves.toBeNull();
    await expect(getCardDetailById(1.5)).resolves.toBeNull();
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("returns mapped detail when the row exists", async () => {
    findUnique.mockResolvedValue(row);
    const detail = await getCardDetailById(12);
    expect(detail?.ref).toBe("A1-25");
    expect(findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 12 } }),
    );
  });
});

describe("getCardDetailByRef", () => {
  beforeEach(() => {
    findUnique.mockReset();
    findFirst.mockReset();
  });

  it("returns null for malformed refs", async () => {
    await expect(getCardDetailByRef("nope")).resolves.toBeNull();
    expect(findFirst).not.toHaveBeenCalled();
  });

  it("looks up by set code and number", async () => {
    findFirst.mockResolvedValue(row);
    const detail = await getCardDetailByRef("A1-25");
    expect(detail?.name).toBe("Pikachu");
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { number: 25, set: { code: "A1" } },
      }),
    );
  });
});
