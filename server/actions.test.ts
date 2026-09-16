import { beforeEach, describe, expect, it, vi } from "vitest";

const { findMany, findUnique, findFirst, getSession } = vi.hoisted(() => ({
  findMany: vi.fn(),
  findUnique: vi.fn(),
  findFirst: vi.fn(),
  getSession: vi.fn(),
}));

vi.mock("@/prisma/db", () => ({
  default: {
    card: { findMany, findUnique, findFirst },
  },
}));

vi.mock("@/lib/auth", () => ({
  auth: { api: { signOut: vi.fn(), getSession } },
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers()),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

const { fetchCards, fetchCardDetail } = await import("./actions");

describe("fetchCards", () => {
  beforeEach(() => {
    findMany.mockReset();
  });

  it("returns a next cursor when more than `limit` rows exist", async () => {
    const rows = Array.from({ length: 4 }, (_, i) => ({
      id: i + 1,
      name: `Card ${i + 1}`,
      set: { id: 1, code: "A1" },
    }));
    findMany.mockResolvedValue(rows);

    const result = await fetchCards({ setId: 1, limit: 3, search: "pika" });
    expect(result.cards).toHaveLength(3);
    expect(result.nextCursor).toBe(3);
  });
});

describe("fetchCardDetail", () => {
  beforeEach(() => {
    getSession.mockReset();
    findUnique.mockReset();
    findFirst.mockReset();
  });

  it("rejects unauthenticated callers", async () => {
    getSession.mockResolvedValue(null);
    await expect(fetchCardDetail({ id: 1 })).rejects.toThrow("Unauthorized");
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("loads a card by id for a signed-in user", async () => {
    getSession.mockResolvedValue({ user: { id: "u1" } });
    findUnique.mockResolvedValue({
      id: 1,
      name: "Pikachu",
      imageUrl: "/pika.webp",
      number: 25,
      cardType: "POKEMON",
      rarity: "C",
      isTradeable: true,
      hp: 60,
      energyType: "lightning",
      stage: "BASIC",
      isEx: false,
      trainerType: null,
      weakness: "fighting",
      retreatCost: 1,
      set: { code: "A1", setName: "Genetic Apex" },
      attacks: [],
      effects: [],
    });

    const detail = await fetchCardDetail({ id: 1 });
    expect(detail).toMatchObject({ name: "Pikachu", ref: "A1-25" });
  });

  it("loads a card by ref for a signed-in user", async () => {
    getSession.mockResolvedValue({ user: { id: "u1" } });
    findFirst.mockResolvedValue({
      id: 2,
      name: "Mew",
      imageUrl: "/mew.webp",
      number: 151,
      cardType: "POKEMON",
      rarity: "AR",
      isTradeable: true,
      hp: 60,
      energyType: "psychic",
      stage: "BASIC",
      isEx: false,
      trainerType: null,
      weakness: "darkness",
      retreatCost: 1,
      set: { code: "A1a", setName: "Mythical Island" },
      attacks: [],
      effects: [],
    });

    const detail = await fetchCardDetail({ ref: "A1a-151" });
    expect(detail).toMatchObject({ name: "Mew", ref: "A1a-151" });
    expect(findFirst).toHaveBeenCalled();
  });

  it("returns null when neither id nor ref is provided", async () => {
    getSession.mockResolvedValue({ user: { id: "u1" } });
    await expect(fetchCardDetail({})).resolves.toBeNull();
    expect(findUnique).not.toHaveBeenCalled();
    expect(findFirst).not.toHaveBeenCalled();
  });
});
