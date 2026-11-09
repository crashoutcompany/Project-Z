"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  EMPTY_HISTORY,
  SEARCH_HISTORY_KEY,
  parseHistory,
  writeHistory,
  type SearchHistory,
} from "@/lib/search-history";

const listeners = new Set<() => void>();
let cache: { raw: string | null; history: SearchHistory } | null = null;

function rawHistory(): string | null {
  try {
    return window.localStorage.getItem(SEARCH_HISTORY_KEY);
  } catch {
    return null;
  }
}

/** Parses only when the stored JSON changed, so the snapshot stays stable. */
function getSnapshot(): SearchHistory {
  const raw = rawHistory();
  if (cache?.raw !== raw) cache = { raw, history: parseHistory(raw) };
  return cache.history;
}

// The server and the hydrating render both see no history, so markup matches;
// the stored history arrives on the next render, inside a closed dropdown.
const getServerSnapshot = () => EMPTY_HISTORY;

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Other tabs' writes arrive as storage events.
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key === SEARCH_HISTORY_KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** Recent and saved searches from localStorage, shared by every browser. */
export function useSearchHistory() {
  const history = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  const update = useCallback(
    (change: (current: SearchHistory) => SearchHistory) => {
      const next = change(getSnapshot());
      try {
        if (!writeHistory(window.localStorage, next)) return;
      } catch {
        return;
      }
      listeners.forEach((listener) => listener());
    },
    [],
  );
  return { history, update };
}
