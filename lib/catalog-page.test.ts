import { beforeEach, describe, expect, it, vi } from "vitest";

type Row = {
  id: number;
  name: string;
  rarity: string;
  setId: number;
  attacks: Array<{
    position: number;
    name: string;
    damageRaw: string;
    energyTypes: string[];
    effectText: string;
  }>;
  effects: Array<{ kind: string; effectText: string }>;
  set: { id: number; code: string };
};

let table: Row[] = [];

type Args = {
  where: {
    id?: { in: number[] };
    setId?: number;
    rarity?: { in: string[] };
    name?: { contains: string };
  };
  take?: number;
  skip?: number;
  cursor?: { id: number };
};

// A tiny stand-in for the filters and id paging the page loader uses.
const findMany = vi.fn(async ({ where, take, skip, cursor }: Args) => {
  let rows = table
    .filter((r) => !where.id || where.id.in.includes(r.id))
    .filter((r) => !where.setId || r.setId === where.setId)
    .filter((r) => !where.rarity || where.rarity.in.includes(r.rarity))
    .filter(
      (r) =>
        !where.name ||
        r.name.toLowerCase().includes(where.name.contains.toLowerCase()),
    )
    .sort((a, b) => a.id - b.id);
  if (cursor) rows = rows.filter((r) => r.id >= cursor.id).slice(skip ?? 0);
  return take ? rows.slice(0, take) : rows;
});

vi.mock("@/prisma/db", () => ({ default: { card: { findMany } } }));

const { loadCatalogPage } = await import("./catalog-page");

function card(
  id: number,
  name: string,
  rarity: string,
  attack = "Gnaw",
  setId = 1,
): Row {
  return {
    id,
    name,
    rarity,
    setId,
    attacks: [
      {
        position: 0,
        name: attack,
        damageRaw: "20",
        energyTypes: ["lightning"],
        effectText: "",
      },
    ],
    effects: [],
    set: { id: setId, code: `A${setId}` },
  };
}

async function allPages(params: Parameters<typeof loadCatalogPage>[0]) {
  const ids: number[] = [];
  let cursor: number | undefined;
  for (let i = 0; i < 20; i++) {
    const page = await loadCatalogPage({ ...params, cursor });
    ids.push(...page.cards.map((c) => c.id));
    if (!page.nextCursor) return ids;
    cursor = page.nextCursor;
  }
  throw new Error("paging did not end");
}

describe("loadCatalogPage", () => {
  beforeEach(() => {
    findMany.mockClear();
    table = [
      card(1, "Pikachu ex", "UR"),
      card(2, "Bulbasaur", "C"),
      card(3, "Pikachu ex", "RR"),
      card(4, "Pikachu", "C", "Gnaw"),
      card(5, "Pikachu", "C", "Thunder Jolt"),
      card(6, "Pikachu ex", "SR"),
      card(7, "Bulbasaur", "AR"),
      card(8, "Charmander", "C"),
    ];
  });

  it("shows one card per name + attacks, the lowest-rarity copy", async () => {
    const page = await loadCatalogPage({ limit: 20 });
    expect(page.cards.map((c) => c.id)).toEqual([2, 3, 4, 5, 8]);
    expect(page.nextCursor).toBeNull();
  });

  it("lists every print with showDuplicates", async () => {
    const page = await loadCatalogPage({ limit: 20, showDuplicates: true });
    expect(page.cards.map((c) => c.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it("pages the deduped list without skipping or repeating cards", async () => {
    // The kept Pikachu ex (id 3) comes after a dropped copy (id 1), so
    // deduping each page on its own would show id 1 on page one.
    for (const limit of [1, 2, 3]) {
      expect(await allPages({ limit })).toEqual([2, 3, 4, 5, 8]);
      expect(await allPages({ limit, showDuplicates: true })).toEqual([
        1, 2, 3, 4, 5, 6, 7, 8,
      ]);
    }
  });

  it("dedupes within the rarity filter", async () => {
    const page = await loadCatalogPage({
      limit: 20,
      rarities: ["SR", "UR", "AR"],
    });
    // Pikachu ex's lowest copy among the picked rarities is the SR.
    expect(page.cards.map((c) => c.id)).toEqual([6, 7]);
    expect(findMany.mock.calls[0]?.[0]?.where).toMatchObject({
      rarity: { in: ["SR", "UR", "AR"] },
    });

    const all = await loadCatalogPage({
      limit: 20,
      rarities: ["SR", "UR"],
      showDuplicates: true,
    });
    expect(all.cards.map((c) => c.id)).toEqual([1, 6]);
  });

  it("combines with name search and set", async () => {
    table.push(card(9, "Pikachu ex", "C", "Gnaw", 2));
    const search = await loadCatalogPage({ limit: 20, search: "pikachu ex" });
    expect(search.cards.map((c) => c.id)).toEqual([9]);

    const inSet = await loadCatalogPage({
      limit: 20,
      setId: 1,
      search: "pikachu ex",
    });
    expect(inSet.cards.map((c) => c.id)).toEqual([3]);
  });

  it("skips the second query when nothing matches", async () => {
    const page = await loadCatalogPage({ limit: 20, search: "mewtwo" });
    expect(page).toEqual({ cards: [], nextCursor: null });
    expect(findMany).toHaveBeenCalledTimes(1);
  });
});
