import type { Collection } from "./index";

/** Card ID → IDs of every print of that card (itself, alt arts, reprints). */
export type PrintGroups = Record<number, number[]>;

export type DeckOwnershipEntry = { cardId: number; count: number };

export type CardOwnership = { owned: number; needed: number };

export type DeckOwnership = {
  /** Keyed by the deck entry's card ID. */
  byCardId: Record<number, CardOwnership>;
  owned: number;
  needed: number;
};

/** The entry's print group, falling back to the exact print when unknown. */
function groupOf(cardId: number, printGroups: PrintGroups): number[] {
  const ids = printGroups[cardId] ?? [];
  return ids.includes(cardId) ? ids : [...ids, cardId];
}

/**
 * How many copies of each deck card the collection covers. Any print of a
 * card counts (an owned alt art covers the deck's regular print), but each
 * owned copy is spent once: two deck entries that are prints of the same card
 * share one pool. Exact prints are matched first, then the spare copies fill
 * the remaining gaps in deck order.
 */
export function computeDeckOwnership(
  collection: Collection,
  entries: DeckOwnershipEntry[],
  printGroups: PrintGroups,
): DeckOwnership {
  const groups = new Map<
    string,
    { ids: number[]; entries: DeckOwnershipEntry[] }
  >();
  for (const entry of entries) {
    const ids = groupOf(entry.cardId, printGroups).toSorted((a, b) => a - b);
    const key = ids.join(",");
    const group = groups.get(key) ?? { ids, entries: [] };
    group.entries.push(entry);
    groups.set(key, group);
  }

  const byCardId: Record<number, CardOwnership> = {};
  let owned = 0;
  let needed = 0;

  for (const group of groups.values()) {
    const pool = new Map(group.ids.map((id) => [id, collection[id] ?? 0]));
    for (const entry of group.entries) {
      const exact = Math.min(entry.count, pool.get(entry.cardId) ?? 0);
      pool.set(entry.cardId, (pool.get(entry.cardId) ?? 0) - exact);
      byCardId[entry.cardId] = { owned: exact, needed: entry.count };
    }
    let spare = [...pool.values()].reduce((sum, qty) => sum + qty, 0);
    for (const entry of group.entries) {
      const card = byCardId[entry.cardId];
      const take = Math.min(card.needed - card.owned, spare);
      card.owned += take;
      spare -= take;
    }
    for (const entry of group.entries) {
      owned += byCardId[entry.cardId].owned;
      needed += byCardId[entry.cardId].needed;
    }
  }

  return { byCardId, owned, needed };
}
