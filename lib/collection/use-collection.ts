"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import {
  Collection,
  COLLECTION_STORAGE_KEY,
  EMPTY_COLLECTION,
  getCollection,
  setCardQuantity,
  toggleCardOwned,
  adjustCardQuantity,
} from "./index";

type Listener = () => void;
const listeners = new Set<Listener>();

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emitChange(): void {
  for (const listener of listeners) {
    listener();
  }
}

function getSnapshot(): Collection {
  return getCollection();
}

function getServerSnapshot(): Collection {
  return EMPTY_COLLECTION;
}

/**
 * React hook that provides reactive access to the card collection.
 * Handles SSR hydration and cross-tab synchronization.
 */
export function useCollection() {
  const collection = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  useEffect(() => {
    function handleStorage(e: StorageEvent) {
      if (e.key === COLLECTION_STORAGE_KEY) {
        emitChange();
      }
    }
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

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
    (cardId: number): number => {
      return collection[cardId] ?? 0;
    },
    [collection],
  );

  const isOwned = useCallback(
    (cardId: number): boolean => {
      return (collection[cardId] ?? 0) > 0;
    },
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

/**
 * Returns the quantity for a specific card, reactive to changes.
 * Lighter-weight than full useCollection when you only need one card.
 */
export function useCardQuantity(cardId: number): number {
  const collection = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  return collection[cardId] ?? 0;
}
