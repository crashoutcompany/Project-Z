/**
 * Browser-only card collection storage using localStorage.
 *
 * Data shape: `{ [cardId: number]: quantity }` where quantity is 1..MAX_QUANTITY.
 * Zero or missing means not owned. All access goes through getCollection/setCollection.
 */

import { rarityRank } from "@/lib/rarity";

export const COLLECTION_STORAGE_KEY = "pz-collection";
export const MAX_QUANTITY = 99;

/** A map of card IDs to owned quantities. */
export type Collection = Record<number, number>;

/** Empty state for SSR and fresh users. */
export const EMPTY_COLLECTION: Collection = {};

function isServer(): boolean {
  return typeof window === "undefined";
}

/**
 * Parses and validates stored collection data.
 * Returns EMPTY_COLLECTION for invalid/corrupt data.
 */
export function parseCollection(raw: string | null): Collection {
  if (!raw) return EMPTY_COLLECTION;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      return EMPTY_COLLECTION;
    }
    const result: Collection = {};
    for (const [key, value] of Object.entries(parsed)) {
      const cardId = Number(key);
      if (!Number.isInteger(cardId) || cardId <= 0) continue;
      if (typeof value !== "number" || !Number.isInteger(value)) continue;
      if (value < 1 || value > MAX_QUANTITY) continue;
      result[cardId] = value;
    }
    return result;
  } catch {
    return EMPTY_COLLECTION;
  }
}

/**
 * Reads the collection from localStorage.
 * Returns EMPTY_COLLECTION on server or when storage is empty/corrupt.
 */
export function getCollection(): Collection {
  if (isServer()) return EMPTY_COLLECTION;
  try {
    const raw = localStorage.getItem(COLLECTION_STORAGE_KEY);
    return parseCollection(raw);
  } catch {
    return EMPTY_COLLECTION;
  }
}

/**
 * Persists the collection to localStorage.
 * Removes entries with quantity 0 and skips server-side.
 */
export function setCollection(collection: Collection): void {
  if (isServer()) return;
  const cleaned: Collection = {};
  for (const [cardId, qty] of Object.entries(collection)) {
    const id = Number(cardId);
    if (!Number.isInteger(id) || id <= 0) continue;
    const clamped = Math.max(0, Math.min(MAX_QUANTITY, Math.floor(qty)));
    if (clamped > 0) cleaned[id] = clamped;
  }
  try {
    localStorage.setItem(COLLECTION_STORAGE_KEY, JSON.stringify(cleaned));
  } catch {
    // Storage full or unavailable - fail silently
  }
}

/**
 * Sets the quantity for a single card.
 * Use quantity 0 to remove from collection.
 */
export function setCardQuantity(cardId: number, quantity: number): Collection {
  const collection = getCollection();
  const clamped = Math.max(0, Math.min(MAX_QUANTITY, Math.floor(quantity)));
  if (clamped === 0) {
    delete collection[cardId];
  } else {
    collection[cardId] = clamped;
  }
  setCollection(collection);
  return collection;
}

/**
 * Toggles card ownership between 0 and 1.
 * Returns the new collection state.
 */
export function toggleCardOwned(cardId: number): Collection {
  const collection = getCollection();
  const current = collection[cardId] ?? 0;
  if (current > 0) {
    delete collection[cardId];
  } else {
    collection[cardId] = 1;
  }
  setCollection(collection);
  return collection;
}

/**
 * Increments card quantity by delta (can be negative).
 * Clamps to [0, MAX_QUANTITY].
 */
export function adjustCardQuantity(cardId: number, delta: number): Collection {
  const collection = getCollection();
  const current = collection[cardId] ?? 0;
  return setCardQuantity(cardId, current + delta);
}

/**
 * Clears the entire collection.
 */
export function clearCollection(): void {
  if (isServer()) return;
  try {
    localStorage.removeItem(COLLECTION_STORAGE_KEY);
  } catch {
    // fail silently
  }
}

/**
 * Validates card IDs against a set of known valid IDs.
 * Returns a cleaned collection with only valid card IDs.
 */
export function validateCollection(
  collection: Collection,
  validCardIds: Set<number>,
): Collection {
  const result: Collection = {};
  for (const [cardId, qty] of Object.entries(collection)) {
    const id = Number(cardId);
    if (validCardIds.has(id)) {
      result[id] = qty;
    }
  }
  return result;
}

/** A card as the completion math sees it. */
export type CompletionCard = {
  id: number;
  rarity: string;
  /**
   * Shared by every print of the same card (alt arts, reprints). Cards
   * without one only match themselves.
   */
  printGroup?: number;
};

/**
 * IDs of the cards that count as owned: owned directly, or covered by an
 * owned alt art. An alt art is a print of the same card at a higher rarity
 * (an owned Art Rare Pikachu ex covers the Double Rare one), so owning the
 * regular print does not fill the alt art's slot. Promos are reprints, not
 * alt arts, and never cover another print.
 */
export function ownedCardIds(
  collection: Collection,
  cards: CompletionCard[],
): Set<number> {
  const bestAltRank = new Map<number, number>();
  for (const card of cards) {
    if (card.printGroup === undefined || !collection[card.id]) continue;
    if (card.rarity === "PROMO") continue;
    const rank = rarityRank(card.rarity);
    const best = bestAltRank.get(card.printGroup);
    if (best === undefined || rank > best) {
      bestAltRank.set(card.printGroup, rank);
    }
  }

  const owned = new Set<number>();
  for (const card of cards) {
    if (collection[card.id]) {
      owned.add(card.id);
      continue;
    }
    if (card.printGroup === undefined) continue;
    const best = bestAltRank.get(card.printGroup);
    if (best !== undefined && rarityRank(card.rarity) < best) {
      owned.add(card.id);
    }
  }
  return owned;
}

/**
 * Computes completion stats for a set of cards.
 */
export type CompletionStats = {
  owned: number;
  total: number;
  percent: number;
  byRarity: Record<string, { owned: number; total: number }>;
};

/**
 * Pass `ownedIds` (from `ownedCardIds` over the whole catalog) to count alt
 * arts from other sets; without it only cards in `collection` count.
 */
export function computeCompletion(
  collection: Collection,
  cards: CompletionCard[],
  ownedIds: Set<number> = ownedCardIds(collection, cards),
): CompletionStats {
  const byRarity: Record<string, { owned: number; total: number }> = {};
  let owned = 0;

  for (const card of cards) {
    if (!byRarity[card.rarity]) {
      byRarity[card.rarity] = { owned: 0, total: 0 };
    }
    byRarity[card.rarity].total++;
    if (ownedIds.has(card.id)) {
      owned++;
      byRarity[card.rarity].owned++;
    }
  }

  return {
    owned,
    total: cards.length,
    percent: cards.length > 0 ? Math.round((owned / cards.length) * 100) : 0,
    byRarity,
  };
}

/** True when every card in the set counts as owned. */
export function isSetComplete(stats: CompletionStats): boolean {
  return stats.total > 0 && stats.owned === stats.total;
}

/**
 * The collection as copy/paste text: the same `{ cardId: quantity }` JSON
 * that localStorage holds, with card IDs in ascending order.
 */
export function exportCollection(collection: Collection): string {
  const sorted: Collection = {};
  for (const id of Object.keys(collection)
    .map(Number)
    .sort((a, b) => a - b)) {
    sorted[id] = collection[id];
  }
  return JSON.stringify(sorted);
}

export type CollectionImport =
  | { ok: true; collection: Collection; skipped: number }
  | { ok: false; error: string };

/**
 * Parses pasted export text. Unlike `parseCollection`, bad input is an error
 * the person sees rather than an empty collection. Entries with a bad card ID
 * or quantity are skipped and counted.
 */
export function parseCollectionImport(text: string): CollectionImport {
  const trimmed = text.trim();
  if (!trimmed) return { ok: false, error: "Paste an exported collection." };
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return { ok: false, error: "That isn't valid JSON." };
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return {
      ok: false,
      error: 'Expected an object of card IDs to quantities, like {"12": 1}.',
    };
  }
  const entries = Object.entries(parsed);
  const collection = parseCollection(JSON.stringify(parsed));
  const kept = Object.keys(collection).length;
  if (kept === 0) {
    return { ok: false, error: "No cards found to import." };
  }
  return { ok: true, collection, skipped: entries.length - kept };
}

/**
 * Merges an import into the existing collection. Each card appears once; when
 * both hold it, the larger quantity wins, so importing the same backup twice
 * changes nothing.
 */
export function mergeCollections(
  existing: Collection,
  incoming: Collection,
): Collection {
  const merged: Collection = { ...existing };
  for (const [key, qty] of Object.entries(incoming)) {
    const id = Number(key);
    merged[id] = Math.min(MAX_QUANTITY, Math.max(merged[id] ?? 0, qty));
  }
  return merged;
}

/**
 * Formats collection progress for display. Whole-number rounding hides small
 * collections (2 of 4,547 cards reads as 0%), so values under 1% get two
 * decimals (each card still moves the number) and the rest get one. It floors
 * instead of rounding so only a full collection reads 100%, and shows
 * "<0.01%" rather than "0%" once anything is owned.
 */
export function formatPercent(owned: number, total: number): string {
  if (total <= 0 || owned <= 0) return "0%";
  if (owned >= total) return "100%";
  if (owned * 100 < total) {
    const hundredths = Math.floor((owned * 10000) / total);
    return hundredths === 0 ? "<0.01%" : `${hundredths / 100}%`;
  }
  return `${Math.floor((owned * 1000) / total) / 10}%`;
}
