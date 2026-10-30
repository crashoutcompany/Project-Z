import { beforeEach, describe, expect, it, vi } from "vitest";

const updateMany = vi.fn();
const accountFindFirst = vi.fn();
const getSession = vi.fn();
const redirect = vi.fn();

vi.mock("@/prisma/db", () => ({
  default: {
    trade: { updateMany },
    account: { findFirst: accountFindFirst },
  },
}));

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession } },
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers()),
}));

vi.mock("next/navigation", () => ({
  redirect,
}));

const { cancelTrade } = await import("./trades");

function cancelForm(listingId: string) {
  const form = new FormData();
  form.set("listingId", listingId);
  return form;
}

describe("cancelTrade", () => {
  beforeEach(() => {
    updateMany.mockReset();
    accountFindFirst.mockReset();
    getSession.mockReset();
    redirect.mockReset();
    getSession.mockResolvedValue({
      user: { id: "user_1", email: "a@b.com" },
    });
  });

  it("scopes the cancel to the caller's playerId, not the email identifier", async () => {
    updateMany.mockResolvedValue({ count: 2 });

    await cancelTrade(null, cancelForm("listing-abc"));

    expect(updateMany).toHaveBeenCalledWith({
      where: {
        listingId: "listing-abc",
        playerId: "user_1",
        status: "ACTIVE",
      },
      data: { status: "CANCELLED" },
    });
    // Linked-account lookup is not needed for ownership, so it must not run.
    expect(accountFindFirst).not.toHaveBeenCalled();
    expect(redirect).toHaveBeenCalledWith("/trading/t/listing-abc");
  });

  it("rejects a cancel when no active listing matches the caller", async () => {
    updateMany.mockResolvedValue({ count: 0 });

    const result = await cancelTrade(null, cancelForm("someone-else"));

    expect(result).toEqual({
      error: "You can only cancel your own active listing.",
    });
    expect(redirect).not.toHaveBeenCalled();
  });

  it("requires a listing id", async () => {
    const result = await cancelTrade(null, new FormData());

    expect(result).toEqual({ error: "Missing listing." });
    expect(updateMany).not.toHaveBeenCalled();
  });
});
