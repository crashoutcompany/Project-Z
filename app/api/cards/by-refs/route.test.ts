import { beforeEach, describe, expect, it, vi } from "vitest";

const findMany = vi.fn();

vi.mock("@/prisma/db", () => ({
  default: {
    card: { findMany },
  },
}));

const { POST } = await import("./route");

function request(body: unknown) {
  return new Request("http://localhost/api/cards/by-refs", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/cards/by-refs", () => {
  beforeEach(() => {
    findMany.mockReset();
  });

  it("rejects invalid JSON, missing refs, and oversized batches", async () => {
    const badJson = await POST(
      new Request("http://localhost/api/cards/by-refs", {
        method: "POST",
        body: "{",
        headers: { "content-type": "application/json" },
      }),
    );
    expect(badJson.status).toBe(400);

    expect((await POST(request({ refs: [1] }))).status).toBe(400);
    expect(
      (await POST(request({ refs: Array.from({ length: 41 }, () => "A1-1") })))
        .status,
    ).toBe(400);
  });

  it("rejects malformed card refs", async () => {
    const res = await POST(request({ refs: ["not-a-ref"] }));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({
      error: expect.stringMatching(/Invalid card ref/),
    });
  });

  it("returns an empty list without querying for empty refs", async () => {
    const res = await POST(request({ refs: [] }));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ cards: [] });
    expect(findMany).not.toHaveBeenCalled();
  });

  it("maps matched cards and reports lookup failures", async () => {
    findMany.mockResolvedValue([
      {
        id: 1,
        name: "Pikachu",
        imageUrl: "/pika.webp",
        number: 25,
        cardType: "POKEMON",
        energyType: "lightning",
        hp: 60,
        rarity: "C",
        isEx: false,
        isTradeable: true,
        set: { code: "A1" },
      },
    ]);
    const ok = await POST(request({ refs: ["A1-25", "P-A-12"] }));
    expect(ok.status).toBe(200);
    const body = await ok.json();
    expect(body.cards).toHaveLength(1);
    expect(body.cards[0]).toMatchObject({
      name: "Pikachu",
      setCode: "A1",
      matchedTags: [],
    });

    findMany.mockRejectedValue(new Error("db down"));
    expect((await POST(request({ refs: ["A1-1"] }))).status).toBe(500);
  });
});
