import { describe, expect, it } from "vitest";
import {
  buildTradeUrl,
  createListingId,
  encodeCardIdList,
  groupTradesByListing,
  LISTING_INVALID_MESSAGE,
  listingExpiresAt,
  listingValidity,
  MAX_CARDS_PER_SIDE,
  parseCardIdList,
  TRADE_LISTING_TTL_MS,
  tradeIdentifier,
  toProvider,
} from "./trade";

describe("parseCardIdList", () => {
  it("parses unique positive ids in order", () => {
    expect(parseCardIdList("3,1,3,2")).toEqual([3, 1, 2]);
  });

  it("returns an empty list for blank input", () => {
    expect(parseCardIdList(undefined)).toEqual([]);
    expect(parseCardIdList("")).toEqual([]);
    expect(parseCardIdList("  ")).toEqual([]);
  });

  it("rejects non-integer tokens", () => {
    expect(() => parseCardIdList("1,foo")).toThrow(/Invalid card id/);
    expect(() => parseCardIdList("-1")).toThrow(/Invalid card id/);
    expect(() => parseCardIdList("1.5")).toThrow(/Invalid card id/);
  });

  it("rejects lists over the per-side cap", () => {
    const tooMany = Array.from(
      { length: MAX_CARDS_PER_SIDE + 1 },
      (_, i) => i + 1,
    ).join(",");
    expect(() => parseCardIdList(tooMany)).toThrow(/Too many cards/);
  });
});

describe("trade URLs and identifiers", () => {
  it("builds a share path from a listing id", () => {
    expect(buildTradeUrl("abc123")).toBe("/trading/t/abc123");
    expect(buildTradeUrl("a/b")).toBe("/trading/t/a%2Fb");
  });

  it("round-trips id lists", () => {
    expect(encodeCardIdList(parseCardIdList("10,20"))).toBe("10,20");
  });

  it("builds the existing identifier format", () => {
    expect(tradeIdentifier("a@b.com", "google")).toBe("a@b.com.GOOGLE");
    expect(tradeIdentifier("a@b.com", undefined)).toBe("a@b.com.UNKNOWN");
  });

  it("maps OAuth providers", () => {
    expect(toProvider("github")).toBe("GITHUB");
    expect(toProvider("GOOGLE")).toBe("GOOGLE");
    expect(() => toProvider("discord")).toThrow(/Google or GitHub/);
  });

  it("creates url-safe listing ids", () => {
    const id = createListingId();
    expect(id).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(id.length).toBeGreaterThanOrEqual(8);
  });
});

describe("listingValidity", () => {
  const base = {
    found: true,
    wantCount: 1,
    giveCount: 1,
    status: "ACTIVE" as const,
    expiresAt: new Date("2026-09-22T00:00:00.000Z"),
    now: new Date("2026-09-15T00:00:00.000Z"),
  };

  it("accepts an active unexpired pair", () => {
    expect(listingValidity(base)).toEqual({
      valid: true,
      reason: "ok",
      message: null,
    });
  });

  it("rejects missing, expired, cancelled, and incomplete listings", () => {
    expect(listingValidity({ ...base, found: false }).reason).toBe("missing");
    expect(
      listingValidity({
        ...base,
        expiresAt: new Date("2026-09-14T00:00:00.000Z"),
      }).reason,
    ).toBe("expired");
    expect(listingValidity({ ...base, status: "EXPIRED" }).reason).toBe(
      "expired",
    );
    expect(listingValidity({ ...base, status: "CANCELLED" }).reason).toBe(
      "cancelled",
    );
    expect(listingValidity({ ...base, wantCount: 0 }).reason).toBe(
      "incomplete",
    );
    expect(listingValidity({ ...base, found: false }).message).toBe(
      LISTING_INVALID_MESSAGE,
    );
  });
});

describe("groupTradesByListing", () => {
  it("pairs want and give rows that share a listing id", () => {
    const want = { listingId: "a", isSeeking: true, id: 1 };
    const give = { listingId: "a", isSeeking: false, id: 2 };
    const other = { listingId: "b", isSeeking: true, id: 3 };

    const grouped = groupTradesByListing([want, give, other]);
    expect(grouped).toHaveLength(2);
    expect(grouped[0]).toMatchObject({
      listingId: "a",
      want,
      give,
    });
    expect(grouped[1].give).toBeUndefined();
  });
});

describe("listingExpiresAt", () => {
  it("adds the listing TTL", () => {
    const from = new Date("2026-09-15T00:00:00.000Z");
    expect(listingExpiresAt(from).getTime() - from.getTime()).toBe(
      TRADE_LISTING_TTL_MS,
    );
  });
});
