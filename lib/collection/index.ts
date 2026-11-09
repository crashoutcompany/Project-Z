/**
 * Browser-only card collection storage using localStorage.
 *
 * Data shape: `{ [cardId: number]: quantity }` where quantity is 1..MAX_QUANTITY.
 * Zero or missing means not owned. All access goes through getCollection/setCollection.
 */

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

/**
 * Computes completion stats for a set of cards.
 */
export type CompletionStats = {
  owned: number;
  total: number;
  percent: number;
  byRarity: Record<string, { owned: number; total: number }>;
};

export function computeCompletion(
  collection: Collection,
  cards: Array<{ id: number; rarity: string }>,
): CompletionStats {
  const byRarity: Record<string, { owned: number; total: number }> = {};
  let owned = 0;

  for (const card of cards) {
    if (!byRarity[card.rarity]) {
      byRarity[card.rarity] = { owned: 0, total: 0 };
    }
    byRarity[card.rarity].total++;
    if (collection[card.id]) {
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

/**
 * Formats collection progress for display. Whole-number rounding hides small
 * collections (2 of 2,000 cards reads as 0%), so this keeps one decimal place,
 * floors instead of rounding so only a full collection reads 100%, and shows
 * "<0.1%" rather than "0%" once anything is owned.
 */
export function formatPercent(owned: number, total: number): string {
  if (total <= 0 || owned <= 0) return "0%";
  if (owned >= total) return "100%";
  const tenths = Math.floor((owned * 1000) / total);
  if (tenths === 0) return "<0.1%";
  return `${tenths / 10}%`;
}
