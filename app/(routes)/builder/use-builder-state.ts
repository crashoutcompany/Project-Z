"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  buildBuilderUrl,
  decodeBuilderSearchParams,
  encodeDeck,
  type DeckEntry,
  validateDeck,
} from "@/lib/deck-url";
import type { SearchCardResult } from "@/lib/search";

export type DeckCard = SearchCardResult & { count: number };

const EMPTY_DECK: DeckCard[] = [];

export function refOf(card: { setCode: string; number: number }) {
  return `${card.setCode}-${card.number}`;
}

export function toEntries(cards: DeckCard[]): DeckEntry[] {
  return cards.map((c) => ({
    setCode: c.setCode,
    number: c.number,
    count: c.count,
    ref: refOf(c),
  }));
}

export function useBuilderSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchCardResult[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const searchSeq = useRef(0);

  const runSearch = useCallback((q: string) => {
    const seq = ++searchSeq.current;
    startTransition(async () => {
      if (!q.trim()) {
        if (seq !== searchSeq.current) return;
        setResults([]);
        setSearchError(null);
        return;
      }
      try {
        const res = await fetch("/api/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: q, limit: 40 }),
        });
        const data = await res.json();
        if (seq !== searchSeq.current) return;
        if (!res.ok) {
          setSearchError(data.error ?? "Search failed");
          setResults([]);
          return;
        }
        setSearchError(null);
        setResults(data.cards ?? []);
      } catch {
        if (seq !== searchSeq.current) return;
        setSearchError("Search request failed");
        setResults([]);
      }
    });
  }, []);

  return { query, setQuery, results, searchError, isPending, runSearch };
}

export function useBuilderDeck() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const deckParam = searchParams.get("deck") ?? "";
  const versionParam = searchParams.get("v");
  const urlKey = `${versionParam ?? ""}|${deckParam}`;

  const [copied, setCopied] = useState(false);
  const [deck, setDeck] = useState<DeckCard[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // URL <-> deck synchronisation.
  //
  // `syncedKey` is the v+deck pair we last wrote via router.replace, so a
  // URL change equal to it is our own echo. Any other change is an external
  // navigation (a new shared link) and becomes `pendingParam`, which the
  // hydration effect below resolves. `seenKey` is the previous render's
  // URL pair; comparing against it is the documented "adjust state when a
  // prop changes" pattern and keeps setState out of effect bodies.
  // Starts null (not "") so a bare /builder reached by navigation after
  // hydrating from a shared link is treated as external and resets the deck.
  const [syncedKey, setSyncedKey] = useState<string | null>(null);
  const [seenKey, setSeenKey] = useState(urlKey);
  const [pendingParam, setPendingParam] = useState<string | null>(
    deckParam === "" ? null : deckParam,
  );

  if (urlKey !== seenKey) {
    setSeenKey(urlKey);
    // Consume the echo (or any stale echo) so a later external navigation to
    // the same value, e.g. browser forward after back, is treated as external.
    setSyncedKey(null);
    if (urlKey !== syncedKey) setPendingParam(deckParam);
  }

  const pending = useMemo(() => {
    if (pendingParam === null) return null;
    try {
      return {
        entries: decodeBuilderSearchParams({
          v: versionParam,
          deck: pendingParam,
        }).entries,
        error: null as string | null,
      };
    } catch (err) {
      return {
        entries: [] as DeckEntry[],
        error: err instanceof Error ? err.message : "Invalid deck link.",
      };
    }
  }, [pendingParam, versionParam]);

  // A pending param that decodes to nothing (empty or invalid) needs no fetch:
  // the visible deck is simply empty until the user edits it.
  const fetchNeeded =
    pending !== null && pending.error === null && pending.entries.length > 0;
  const hydrated = !fetchNeeded;
  const visibleDeck = pendingParam === null ? deck : EMPTY_DECK;
  const loadError = pending?.error ?? fetchError;

  useEffect(() => {
    if (!fetchNeeded || pending === null) return;
    const { entries } = pending;
    let cancelled = false;

    fetch("/api/cards/by-refs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refs: entries.map((e) => e.ref) }),
    })
      .then(async (res) => {
        if (!res.ok) return null;
        return (await res.json()) as { cards: SearchCardResult[] };
      })
      .then((data) => {
        if (cancelled) return;
        if (data) {
          const byRef = new Map(data.cards.map((c) => [refOf(c), c]));
          const missing = entries.filter((entry) => !byRef.has(entry.ref));
          if (missing.length > 0) {
            setDeck([]);
            setFetchError(
              `Unknown card ref: ${missing.map((entry) => entry.ref).join(", ")}`,
            );
          } else {
            setDeck(
              entries.map((entry) => ({
                ...byRef.get(entry.ref)!,
                count: entry.count,
              })),
            );
            setFetchError(null);
          }
        } else {
          setDeck([]);
          setFetchError("Failed to load deck cards.");
        }
        setPendingParam(null);
      })
      .catch((err) => {
        console.error(err);
        if (cancelled) return;
        setDeck([]);
        setFetchError("Failed to load deck cards.");
        setPendingParam(null);
      });

    return () => {
      cancelled = true;
    };
  }, [fetchNeeded, pending]);

  const nameByRef = useMemo(() => {
    const map: Record<string, string> = {};
    for (const card of visibleDeck) map[refOf(card)] = card.name;
    return map;
  }, [visibleDeck]);

  const entries = useMemo(() => toEntries(visibleDeck), [visibleDeck]);

  const validation = useMemo(
    () => validateDeck(entries, nameByRef),
    [entries, nameByRef],
  );

  /** Commit a deck edit: update state, then mirror it into the URL. */
  const commitDeck = useCallback(
    (next: DeckCard[]) => {
      const nextEntries = toEntries(next);
      setDeck(next);
      setFetchError(null);
      setPendingParam(null);
      setSyncedKey(`1|${encodeDeck(nextEntries)}`);
      router.replace(buildBuilderUrl(nextEntries), { scroll: false });
    },
    [router],
  );

  const addCard = useCallback(
    (card: SearchCardResult) => {
      const prev = visibleDeck;
      const key = refOf(card);
      const existing = prev.find((c) => refOf(c) === key);
      const nameCount = prev
        .filter((c) => c.name === card.name)
        .reduce((sum, c) => sum + c.count, 0);
      if (nameCount >= 2) return;
      const total = prev.reduce((sum, c) => sum + c.count, 0);
      if (total >= 20) return;

      if (existing) {
        if (existing.count >= 2) return;
        commitDeck(
          prev.map((c) =>
            refOf(c) === key ? { ...c, count: c.count + 1 } : c,
          ),
        );
        return;
      }
      commitDeck([...prev, { ...card, count: 1 }]);
    },
    [visibleDeck, commitDeck],
  );

  const removeOne = useCallback(
    (card: DeckCard) => {
      const key = refOf(card);
      commitDeck(
        visibleDeck
          .map((c) => (refOf(c) === key ? { ...c, count: c.count - 1 } : c))
          .filter((c) => c.count > 0),
      );
    },
    [visibleDeck, commitDeck],
  );

  const clearDeck = useCallback(() => {
    commitDeck([]);
  }, [commitDeck]);

  const copyLink = useCallback(async () => {
    const url = `${window.location.origin}${buildBuilderUrl(entries)}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Clipboard write failed", err);
    }
  }, [entries]);

  const grouped = useMemo(() => {
    const pokemon: DeckCard[] = [];
    const trainers: DeckCard[] = [];
    for (const c of visibleDeck) {
      (c.cardType === "POKEMON" ? pokemon : trainers).push(c);
    }
    return { pokemon, trainers };
  }, [visibleDeck]);

  return {
    copied,
    visibleDeck,
    hydrated,
    loadError,
    validation,
    grouped,
    addCard,
    removeOne,
    clearDeck,
    copyLink,
  };
}
