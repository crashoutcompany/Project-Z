import { beforeEach, describe, expect, it, vi } from "vitest";

const findMany = vi.fn();

vi.mock("@/prisma/db", () => ({
  default: {
    card: { findMany },
  },
}));

const signOut = vi.fn();
const getSession = vi.fn();

vi.mock("@/lib/auth", () => ({
  auth: { api: { signOut, getSession: vi.fn() } },
  getSession,
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers()),
}));

const redirect = vi.fn();

vi.mock("next/navigation", () => ({
  redirect,
}));

const { fetchCards, updateAuthStatus } = await import("./actions");

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
