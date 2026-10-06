import { beforeEach, describe, expect, it, vi } from "vitest";

const findMany = vi.fn();

vi.mock("@/prisma/db", () => ({
  default: {
    card: { findMany },
  },
}));

vi.mock("@/lib/auth", () => ({
  auth: { api: { signOut: vi.fn(), getSession: vi.fn() } },
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers()),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

const { fetchCards } = await import("./actions");

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
});
