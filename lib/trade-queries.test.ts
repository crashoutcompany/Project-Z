import { beforeEach, describe, expect, it, vi } from "vitest";

const findMany = vi.fn();

vi.mock("@/prisma/db", () => ({
  default: {
    trade: { findMany },
  },
}));

const { loadPublicListings, PUBLIC_LISTINGS_LIMIT } = await import(
  "./trade-queries"
);

function tradeRow(
  listingId: string,
  isSeeking: boolean,
  createdAt: Date,
  id: number,
) {
  return {
    id,
    tradeCreationId: `${listingId}-${isSeeking ? "w" : "g"}`,
    listingId,
    playerId: "other_player",
    identifier: "other@b.com.GOOGLE",
    provider: "GOOGLE",
    status: "ACTIVE",
    isSeeking,
    isPrivate: false,
    expiresAt: new Date(Date.now() + 60_000),
    createdAt,
    updatedAt: createdAt,
    cards: [
      {
        id: id * 10,
        name: "Card",
        imageUrl: null,
        rarity: null,
        number: 1,
        set: { code: "A1" },
      },
    ],
  };
}

describe("loadPublicListings", () => {
  beforeEach(() => {
    findMany.mockReset();
    findMany.mockResolvedValue([]);
  });

  it("caps the query and uses a stable ordering", async () => {
    await loadPublicListings("me_player");

    expect(findMany).toHaveBeenCalledTimes(1);
    const args = findMany.mock.calls[0][0];
    expect(args.take).toBe(PUBLIC_LISTINGS_LIMIT * 2);
    expect(args.orderBy).toEqual([{ createdAt: "desc" }, { id: "desc" }]);
  });

  it("excludes the caller's own listings by playerId", async () => {
    await loadPublicListings("me_player");

    const where = findMany.mock.calls[0][0].where;
    expect(where.playerId).toEqual({ not: "me_player" });
    expect(where.isPrivate).toBe(false);
    expect(where.status).toBe("ACTIVE");
  });

  it("returns at most PUBLIC_LISTINGS_LIMIT listings", async () => {
    const now = Date.now();
    const rows = [];
    // More listings than the cap, each a want/give pair, newest first.
    for (let i = 0; i < PUBLIC_LISTINGS_LIMIT + 5; i++) {
      const createdAt = new Date(now - i * 1000);
      rows.push(
        tradeRow(`L${i}`, true, createdAt, i * 2 + 2),
        tradeRow(`L${i}`, false, createdAt, i * 2 + 1),
      );
    }
    findMany.mockResolvedValue(rows);

    const listings = await loadPublicListings("me_player");
    expect(listings.length).toBe(PUBLIC_LISTINGS_LIMIT);
  });
});
