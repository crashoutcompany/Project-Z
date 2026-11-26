/**
 * Browser-only want list, stored next to the collection in localStorage.
 *
 * One global list (not one per deck). Same shape as the collection:
 * `{ [cardId: number]: copiesWanted }`, 1..MAX_QUANTITY, so both stores share
 * one parser and the UI can treat a card's owned and wanted counts alike.
 */

import { type Collection, MAX_QUANTITY, parseCollection } from "./index";

export const WANT_LIST_STORAGE_KEY = "pz-want-list";

/** A map of card IDs to how many copies are still wanted. */
export type WantList = Collection;

export const EMPTY_WANT_LIST: WantList = {};

/** Parses stored want-list data; invalid entries are dropped. */
export const parseWantList: (raw: string | null) => WantList = parseCollection;

function clamp(quantity: number): number {
  return Math.max(0, Math.min(MAX_QUANTITY, Math.floor(quantity)));
}

export function getWantList(): WantList {
  if (typeof window === "undefined") return EMPTY_WANT_LIST;
  try {
    return parseWantList(localStorage.getItem(WANT_LIST_STORAGE_KEY));
  } catch {
    return EMPTY_WANT_LIST;
  }
}

export function setWantList(wantList: WantList): void {
  if (typeof window === "undefined") return;
  const cleaned: WantList = {};
  for (const [cardId, qty] of Object.entries(wantList)) {
    const id = Number(cardId);
    if (!Number.isInteger(id) || id <= 0) continue;
    const clamped = clamp(qty);
    if (clamped > 0) cleaned[id] = clamped;
  }
  try {
    localStorage.setItem(WANT_LIST_STORAGE_KEY, JSON.stringify(cleaned));
  } catch {
    // Storage full or unavailable - fail silently
  }
}

/** Sets how many copies of a card are wanted; 0 removes it. */
export function setWantedQuantity(cardId: number, quantity: number): WantList {
  const wantList = { ...getWantList() };
  const clamped = clamp(quantity);
  if (clamped === 0) delete wantList[cardId];
  else wantList[cardId] = clamped;
  setWantList(wantList);
  return wantList;
}

/**
 * Adds a card to the want list (wanting `copies`, at least 1) or removes it
 * if it is already there.
 */
export function toggleWanted(cardId: number, copies = 1): WantList {
  const current = getWantList()[cardId] ?? 0;
  return setWantedQuantity(cardId, current > 0 ? 0 : Math.max(1, copies));
}

export function clearWantList(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(WANT_LIST_STORAGE_KEY);
  } catch {
    // fail silently
  }
}

export type WantListEntry<T extends { id: number }> = {
  card: T;
  wanted: number;
  owned: number;
};

/**
 * Want-list entries for the given cards, in the cards' order, with how many
 * copies the collection already holds. IDs with no matching card are skipped.
 */
export function wantListEntries<T extends { id: number }>(
  wantList: WantList,
  collection: Collection,
  cards: Iterable<T>,
): WantListEntry<T>[] {
  const entries: WantListEntry<T>[] = [];
  for (const card of cards) {
    const wanted = wantList[card.id] ?? 0;
    if (wanted > 0) {
      entries.push({ card, wanted, owned: collection[card.id] ?? 0 });
    }
  }
  return entries;
}
