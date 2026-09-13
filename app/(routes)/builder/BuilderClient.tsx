"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  buildBuilderUrl,
  decodeBuilderSearchParams,
  encodeDeck,
  type DeckEntry,
  validateDeck,
} from "@/lib/deck-url";
import type { SearchCardResult } from "@/lib/search";
import { Check, Copy, Minus, Plus, Search, Trash2 } from "lucide-react";

type DeckCard = SearchCardResult & { count: number };

const EMPTY_DECK: DeckCard[] = [];

function refOf(card: { setCode: string; number: number }) {
  return `${card.setCode}-${card.number}`;
}

function toEntries(cards: DeckCard[]): DeckEntry[] {
  return cards.map((c) => ({
    setCode: c.setCode,
    number: c.number,
    count: c.count,
    ref: refOf(c),
  }));
}

export function BuilderClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const deckParam = searchParams.get("deck") ?? "";
  const versionParam = searchParams.get("v");

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchCardResult[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [deck, setDeck] = useState<DeckCard[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // URL <-> deck synchronisation.
  //
  // `syncedParam` is the ?deck= value we last wrote via router.replace, so a
  // URL change equal to it is our own echo. Any other change is an external
  // navigation (a new shared link) and becomes `pendingParam`, which the
  // hydration effect below resolves. `seenParam` is the previous render's
  // deckParam; comparing against it is the documented "adjust state when a
  // prop changes" pattern and keeps setState out of effect bodies.
  // Starts null (not "") so a bare /builder reached by navigation after
  // hydrating from a shared link is treated as external and resets the deck.
  const [syncedParam, setSyncedParam] = useState<string | null>(null);
  const [seenParam, setSeenParam] = useState(deckParam);
  const [pendingParam, setPendingParam] = useState<string | null>(
    deckParam === "" ? null : deckParam,
  );

  if (deckParam !== seenParam) {
    setSeenParam(deckParam);
    // Consume the echo (or any stale echo) so a later external navigation to
    // the same value, e.g. browser forward after back, is treated as external.
    setSyncedParam(null);
    if (deckParam !== syncedParam) setPendingParam(deckParam);
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
          const next: DeckCard[] = [];
          for (const entry of entries) {
            const card = byRef.get(entry.ref);
            if (card) next.push({ ...card, count: entry.count });
          }
          setDeck(next);
          setFetchError(null);
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
      setSyncedParam(encodeDeck(nextEntries));
      router.replace(buildBuilderUrl(nextEntries), { scroll: false });
    },
    [router],
  );

  const runSearch = useCallback((q: string) => {
    startTransition(async () => {
      if (!q.trim()) {
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
        if (!res.ok) {
          setSearchError(data.error ?? "Search failed");
          setResults([]);
          return;
        }
        setSearchError(null);
        setResults(data.cards ?? []);
      } catch {
        setSearchError("Search request failed");
        setResults([]);
      }
    });
  }, []);

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

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="space-y-4">
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            runSearch(query);
          }}
        >
          <div className="relative flex-1">
            <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search cards by name or effect..."
              className="pl-9"
            />
          </div>
          <Button type="submit" disabled={isPending}>
            Search
          </Button>
        </form>

        {searchError && (
          <p className="text-destructive text-sm">{searchError}</p>
        )}

        <div className="grid max-h-[70vh] grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4">
          {results.map((card) => (
            <button
              key={card.id}
              type="button"
              onClick={() => addCard(card)}
              className="hover:ring-primary group overflow-hidden rounded-md hover:ring-2"
              title={`Add ${card.name}`}
            >
              <Image
                src={card.imageUrl}
                alt={card.name}
                width={150}
                height={210}
                className="h-auto w-full"
              />
              <span className="text-muted-foreground block truncate px-1 py-0.5 text-xs">
                {card.name}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-4 rounded-lg border p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold">Your deck</h2>
            <p
              className={cn(
                "text-sm",
                validation.valid
                  ? "text-green-600 dark:text-green-400"
                  : "text-muted-foreground",
              )}
            >
              {validation.totalCards}/20 cards
              {!hydrated && " · loading…"}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={clearDeck}
              disabled={visibleDeck.length === 0}
            >
              <Trash2 className="mr-1 h-4 w-4" />
              Clear
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={copyLink}
              disabled={!validation.valid}
            >
              {copied ? (
                <Check className="mr-1 h-4 w-4" />
              ) : (
                <Copy className="mr-1 h-4 w-4" />
              )}
              {copied ? "Copied" : "Copy link"}
            </Button>
          </div>
        </div>

        {loadError && (
          <p className="text-destructive text-sm">{loadError}</p>
        )}

        {validation.errors.length > 0 && (
          <ul className="text-destructive list-inside list-disc text-sm">
            {validation.errors.map((err) => (
              <li key={err}>{err}</li>
            ))}
          </ul>
        )}

        <DeckSection
          title="Pokémon"
          cards={grouped.pokemon}
          onAdd={addCard}
          onRemove={removeOne}
        />
        <DeckSection
          title="Trainers"
          cards={grouped.trainers}
          onAdd={addCard}
          onRemove={removeOne}
        />
      </section>
    </div>
  );
}

function DeckSection({
  title,
  cards,
  onAdd,
  onRemove,
}: {
  title: string;
  cards: DeckCard[];
  onAdd: (card: SearchCardResult) => void;
  onRemove: (card: DeckCard) => void;
}) {
  if (cards.length === 0) return null;
  return (
    <div>
      <h3 className="mb-2 text-sm font-medium tracking-wide uppercase opacity-70">
        {title}
      </h3>
      <ul className="space-y-2">
        {cards.map((card) => (
          <li
            key={refOf(card)}
            className="flex items-center gap-3 rounded-md border p-2"
          >
            <Image
              src={card.imageUrl}
              alt={card.name}
              width={48}
              height={68}
              className="rounded"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{card.name}</p>
              <p className="text-muted-foreground text-xs">
                {card.setCode}-{card.number}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                aria-label={`Remove one ${card.name}`}
                onClick={() => onRemove(card)}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-4 text-center text-sm">{card.count}</span>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                aria-label={`Add one ${card.name}`}
                onClick={() => onAdd(card)}
                disabled={card.count >= 2}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
