import { describe, expect, it } from "vitest";
import { toggleCardSelection } from "./selection";
import type { CardWithSet, SelectedCards } from "./types";

const card = (id: number) => ({ id, name: `Card ${id}` }) as CardWithSet;
const empty: SelectedCards = { want: [], give: [] };

describe("toggleCardSelection", () => {
  it("adds a card to the active list", () => {
    const next = toggleCardSelection(empty, "want", card(1));
    expect(next.want.map((c) => c.id)).toEqual([1]);
    expect(next.give).toEqual([]);
  });

  it("removes a card that is already in the active list", () => {
    const start = { want: [card(1), card(2)], give: [] };
    expect(toggleCardSelection(start, "want", card(1)).want.map((c) => c.id)).toEqual([2]);
  });

  it("moves a card from the other list instead of duplicating it", () => {
    const start = { want: [card(1)], give: [card(2)] };
    const next = toggleCardSelection(start, "give", card(1));
    expect(next.want).toEqual([]);
    expect(next.give.map((c) => c.id)).toEqual([2, 1]);
  });

  it("never mutates its input and always returns fresh arrays", () => {
    const start = { want: [card(1)], give: [card(2)] };
    const next = toggleCardSelection(start, "want", card(3));
    expect(start.want.map((c) => c.id)).toEqual([1]);
    expect(next.want).not.toBe(start.want);
    expect(next.give).not.toBe(start.give);
  });
});
