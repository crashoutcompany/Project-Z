import { beforeEach, describe, expect, it, vi } from "vitest";

const getSession = vi.fn();

vi.mock("@/lib/auth", () => ({
  getSession: (...args: unknown[]) => getSession(...args),
}));

const findMany = vi.fn();

vi.mock("@/prisma/db", () => ({
  default: { card: { findMany: (...args: unknown[]) => findMany(...args) } },
}));

const { POST } = await import("./route");

function request(body: unknown) {
  return new Request("http://localhost/api/cards/prints", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

const attack = {
  position: 0,
  name: "Circle Circuit",
  damageRaw: "30x",
  energyTypes: ["lightning"],
  effectText: "",
};

function card(id: number, name: string, rarity: string) {
  return { id, name, rarity, attacks: [attack], effects: [] };
}

describe("POST /api/cards/prints", () => {
  beforeEach(() => {
    findMany.mockReset();
    getSession.mockReset();
    getSession.mockResolvedValue({ user: { id: "u1" } });
  });

  it("returns 401 without a session and queries nothing", async () => {
    getSession.mockResolvedValue(null);
    const res = await POST(request({ ids: [1] }));
    expect(res.status).toBe(401);
    expect(findMany).not.toHaveBeenCalled();
  });

  it("rejects bad bodies", async () => {
    expect((await POST(request("{"))).status).toBe(400);
    expect((await POST(request({ ids: ["1"] }))).status).toBe(400);
    expect((await POST(request({ ids: [0] }))).status).toBe(400);
    expect((await POST(request({ ids: [1.5] }))).status).toBe(400);
    const tooMany = Array.from({ length: 41 }, (_, i) => i + 1);
    expect((await POST(request({ ids: tooMany }))).status).toBe(400);
    expect(findMany).not.toHaveBeenCalled();
  });

  it("returns an empty map for no ids", async () => {
    const res = await POST(request({ ids: [] }));
    await expect(res.json()).resolves.toEqual({ prints: {} });
    expect(findMany).not.toHaveBeenCalled();
  });

  it("groups each card with its alt arts", async () => {
    findMany
      .mockResolvedValueOnce([card(10, "Pikachu ex", "RR")])
      .mockResolvedValueOnce([
        card(10, "Pikachu ex", "RR"),
        card(90, "Pikachu ex", "SAR"),
      ]);
    const res = await POST(request({ ids: [10] }));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ prints: { 10: [10, 90] } });
    expect(findMany.mock.calls[1]![0]).toMatchObject({
      where: { name: { in: ["Pikachu ex"], mode: "insensitive" } },
    });
  });

  it("returns 500 when the lookup fails", async () => {
    findMany.mockRejectedValueOnce(new Error("db down"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await POST(request({ ids: [10] }))).status).toBe(500);
  });
});
