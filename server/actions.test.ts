import { beforeEach, describe, expect, it, vi } from "vitest";

const { findMany, findUnique, findFirst, signOut, apiGetSession, getSession, redirect } =
  vi.hoisted(() => ({
    findMany: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    signOut: vi.fn(),
    // auth.api.getSession: used by requireSession() in fetchCardDetail.
    apiGetSession: vi.fn(),
    // Module-level getSession(): used by updateAuthStatus.
    getSession: vi.fn(),
    redirect: vi.fn(),
  }));

vi.mock("@/prisma/db", () => ({
  default: {
    card: { findMany, findUnique, findFirst },
  },
}));

vi.mock("@/lib/auth", () => ({
  auth: { api: { signOut, getSession: apiGetSession } },
  getSession,
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers()),
}));

vi.mock("next/navigation", () => ({
  redirect,
}));

const { fetchCards, fetchCardDetail, updateAuthStatus } = await import(
  "./actions"
);

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
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 4,
        where: expect.objectContaining({
          setId: 1,
          name: { contains: "pika", mode: "insensitive" },
        }),
      }),
    );
    expect(result.cards).toHaveLength(3);
    expect(result.nextCursor).toBe(3);
  });

  it("trims the search and drops the name filter when it is blank", async () => {
    findMany.mockResolvedValue([]);
    await fetchCards({ search: "  pika  " });
    expect(findMany.mock.calls[0][0].where.name).toEqual({
      contains: "pika",
      mode: "insensitive",
    });

    await fetchCards({ search: "   " });
    expect(findMany.mock.calls[1][0].where).not.toHaveProperty("name");
  });

  it("applies tradeableOnly and skips the cursor row", async () => {
    findMany.mockResolvedValue([
      { id: 10, name: "Ten", set: { id: 2, code: "A2" } },
    ]);
    const result = await fetchCards({
      cursor: 9,
      tradeableOnly: true,
      limit: 20,
    });
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 1,
        cursor: { id: 9 },
        where: expect.objectContaining({ isTradeable: true }),
      }),
    );
    expect(result.nextCursor).toBeNull();
    expect(result.cards).toHaveLength(1);
  });

  it("rejects page sizes above the cap instead of scanning the table", async () => {
    await expect(fetchCards({ limit: 1_000_000 })).rejects.toThrow();
    expect(findMany).not.toHaveBeenCalled();
  });

  it("rejects malformed params from the client", async () => {
    await expect(
      fetchCards({ setId: "1" } as unknown as { setId: number }),
    ).rejects.toThrow();
    expect(findMany).not.toHaveBeenCalled();
  });

  it("defaults the page size to 20", async () => {
    findMany.mockResolvedValue([]);
    await fetchCards({});
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 21 }),
    );
  });
});

describe("fetchCardDetail", () => {
  beforeEach(() => {
    apiGetSession.mockReset();
    findUnique.mockReset();
    findFirst.mockReset();
  });

  it("rejects unauthenticated callers", async () => {
    apiGetSession.mockResolvedValue(null);
    await expect(fetchCardDetail({ id: 1 })).rejects.toThrow("Unauthorized");
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("loads a card by id for a signed-in user", async () => {
    apiGetSession.mockResolvedValue({ user: { id: "u1" } });
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
    apiGetSession.mockResolvedValue({ user: { id: "u1" } });
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
    apiGetSession.mockResolvedValue({ user: { id: "u1" } });
    await expect(fetchCardDetail({})).resolves.toBeNull();
    expect(findUnique).not.toHaveBeenCalled();
    expect(findFirst).not.toHaveBeenCalled();
  });
});

describe("updateAuthStatus", () => {
  beforeEach(() => {
    signOut.mockReset();
    getSession.mockReset();
    redirect.mockReset();
  });

  it("signs out based on the server session", async () => {
    getSession.mockResolvedValue({ user: { id: "u1" } });
    await updateAuthStatus();
    expect(signOut).toHaveBeenCalledTimes(1);
    expect(redirect).toHaveBeenCalledWith("/");
  });

  it("sends guests to sign-in without calling signOut", async () => {
    getSession.mockResolvedValue(null);
    await updateAuthStatus();
    expect(signOut).not.toHaveBeenCalled();
    expect(redirect).toHaveBeenCalledWith("/signin");
  });
});
