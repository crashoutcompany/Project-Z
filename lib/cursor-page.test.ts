import { describe, expect, it } from "vitest";
import { paginateByCursor } from "./cursor-page";

function ids(n: number) {
  return Array.from({ length: n }, (_, i) => ({ id: i + 1 }));
}

describe("paginateByCursor", () => {
  it("returns the full set with a null cursor when there is no extra row", () => {
    const rows = ids(20);
    expect(paginateByCursor(rows, 20)).toEqual({
      items: rows,
      nextCursor: null,
    });
  });

  it("uses the last included id as the cursor, not the extra row", () => {
    const rows = ids(21);
    const page = paginateByCursor(rows, 20);
    expect(page.items.map((r) => r.id)).toEqual(
      Array.from({ length: 20 }, (_, i) => i + 1),
    );
    expect(page.nextCursor).toBe(20);
  });

  it("walks a skip:1 cursor sequence without dropping or duplicating rows", () => {
    const all = ids(45);
    const limit = 20;
    const seen: number[] = [];
    let cursor: number | null = null;

    for (let page = 0; page < 5; page++) {
      const start = cursor ? all.findIndex((r) => r.id === cursor) + 1 : 0;
      const fetched = all.slice(start, start + limit + 1);
      const result = paginateByCursor(fetched, limit);
      seen.push(...result.items.map((r) => r.id));
      cursor = result.nextCursor;
      if (cursor === null) break;
    }

    expect(cursor).toBeNull();
    expect(seen).toEqual(all.map((r) => r.id));
  });
});
