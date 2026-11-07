"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  Collection,
  COLLECTION_STORAGE_KEY,
  EMPTY_COLLECTION,
  parseCollection,
  setCardQuantity,
  toggleCardOwned,
  adjustCardQuantity,
} from "./index";

type Listener = () => void;
const listeners = new Set<Listener>();

function emitChange(): void {
  for (const listener of listeners) {
    listener();
  }
}

function onStorage(e: StorageEvent) {
  if (e.key === COLLECTION_STORAGE_KEY || e.key === null) emitChange();
}

// One window listener for every subscriber, so a grid of badges adds one
// `storage` handler instead of one per card.
function subscribe(listener: Listener): () => void {
  if (listeners.size === 0) window.addEventListener("storage", onStorage);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      window.removeEventListener("storage", onStorage);
    }
  };
}

// useSyncExternalStore needs the same object back until the store changes,
// otherwise it re-renders forever; key the parsed value on the raw string.
let cachedRaw: string | null = null;
let cachedSnapshot: Collection = EMPTY_COLLECTION;

function readRaw(): string | null {
  try {
    return localStorage.getItem(COLLECTION_STORAGE_KEY);
  } catch {
    return null;
  }
}

function getSnapshot(): Collection {
  const raw = readRaw();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedSnapshot = parseCollection(raw);
  }
  return cachedSnapshot;
}

function getServerSnapshot(): Collection {
  return EMPTY_COLLECTION;
}

/**
 * Reactive access to the browser-only card collection. The server and the
 * hydration pass see an empty collection; stored data appears after hydration.
 */
export function useCollection() {
  const collection = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const toggle = useCallback((cardId: number) => {
    toggleCardOwned(cardId);
    emitChange();
  }, []);

  const setQuantity = useCallback((cardId: number, quantity: number) => {
    setCardQuantity(cardId, quantity);
    emitChange();
  }, []);

  const adjust = useCallback((cardId: number, delta: number) => {
    adjustCardQuantity(cardId, delta);
    emitChange();
  }, []);

  const getQuantity = useCallback(
    (cardId: number): number => collection[cardId] ?? 0,
    [collection],
  );

  const isOwned = useCallback(
    (cardId: number): boolean => (collection[cardId] ?? 0) > 0,
    [collection],
  );

  return {
    collection,
    toggle,
    setQuantity,
    adjust,
    getQuantity,
    isOwned,
  };
}
