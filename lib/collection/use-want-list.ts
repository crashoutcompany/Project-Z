"use client";

import { useCallback, useSyncExternalStore } from "react";
import { adjustCardQuantity } from "./index";
import {
  EMPTY_WANT_LIST,
  WANT_LIST_STORAGE_KEY,
  type WantList,
  getWantList,
  parseWantList,
  setWantedQuantity,
  toggleWanted,
} from "./want-list";
import { notifyCollectionChange } from "./use-collection";

type Listener = () => void;
const listeners = new Set<Listener>();

function emitChange(): void {
  for (const listener of listeners) listener();
}

function onStorage(e: StorageEvent) {
  if (e.key === WANT_LIST_STORAGE_KEY || e.key === null) emitChange();
}

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

// Same snapshot caching as useCollection: return one object per raw string.
let cachedRaw: string | null = null;
let cachedSnapshot: WantList = EMPTY_WANT_LIST;

function getSnapshot(): WantList {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(WANT_LIST_STORAGE_KEY);
  } catch {
    raw = null;
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedSnapshot = parseWantList(raw);
  }
  return cachedSnapshot;
}

function getServerSnapshot(): WantList {
  return EMPTY_WANT_LIST;
}

/**
 * Reactive access to the browser-only want list. Like useCollection, the
 * server and the hydration pass see an empty list.
 */
export function useWantList() {
  const wantList = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const toggle = useCallback((cardId: number, copies?: number) => {
    toggleWanted(cardId, copies);
    emitChange();
  }, []);

  const setQuantity = useCallback((cardId: number, quantity: number) => {
    setWantedQuantity(cardId, quantity);
    emitChange();
  }, []);

  /** Moves a wanted card into the collection and off the want list. */
  const acquire = useCallback((cardId: number) => {
    const wanted = getWantList()[cardId] ?? 0;
    if (wanted === 0) return;
    adjustCardQuantity(cardId, wanted);
    setWantedQuantity(cardId, 0);
    notifyCollectionChange();
    emitChange();
  }, []);

  const getWanted = useCallback(
    (cardId: number): number => wantList[cardId] ?? 0,
    [wantList],
  );

  return { wantList, toggle, setQuantity, acquire, getWanted };
}
