"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  buildBuilderUrl,
  decodeBuilderSearchParams,
  type DeckEntry,
  validateDeck,
} from "@/lib/deck-url";
import type { SearchCardResult } from "@/lib/search";
import { Check, Copy, Minus, Plus, Search, Trash2 } from "lucide-react";

type DeckCard = SearchCardResult & { count: number };

function refOf(card: { setCode: string; number: number }) {
  return `${card.setCode}-${card.number}`;
}

export function BuilderClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchCardResult[]>([]);
  const [deck, setDeck] = useState<DeckCard[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    async function hydrate() {
      try {
        const { entries } = decodeBuilderSearchParams({
          v: searchParams.get("v"),
          deck: searchParams.get("deck"),
        });
        if (entries.length === 0) {
          setHydrated(true);
          return;
        }
        const refs = entries.map((e) => e.ref);
        const res = await fetch("/api/cards/by-refs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refs }),
        });
        if (!res.ok) throw new Error("Failed to load deck cards");
        const data = (await res.json()) as { cards: SearchCardResult[] };
        if (cancelled) return;
        const byRef = new Map(data.cards.map((c) => [refOf(c), c]));
        const next: DeckCard[] = [];
        for (const entry of entries) {
          const card = byRef.get(entry.ref);
          if (card) next.push({ ...card, count: entry.count });
        }
        setDeck(next);
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setHydrated(true);
      }
    }
    void hydrate();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const nameByRef = useMemo(() => {
    const map: Record<string, string> = {};
    for (const card of deck) map[refOf(card)] = card.name;
    return map;
  }, [deck]);

  const entries: DeckEntry[] = useMemo(
    () =>
      deck.map((c) => ({
        setCode: c.setCode,
        number: c.number,
        count: c.count,
        ref: refOf(c),
      })),
    [deck],
  );

  const validation = useMemo(
    () => validateDeck(entries, nameByRef),
    [entries, nameByRef],
  );

  const syncUrl = useCallback(
    (nextDeck: DeckCard[]) => {
      const nextEntries: DeckEntry[] = nextDeck.map((c) => ({
        setCode: c.setCode,
        number: c.number,
        count: c.count,
        ref: refOf(c),
      }));
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
      setDeck((prev) => {
        const key = refOf(card);
        const existing = prev.find((c) => refOf(c) === key);
        const nameCount = prev
          .filter((c) => c.name === card.name)
          .reduce((sum, c) => sum + c.count, 0);
        if (nameCount >= 2) return prev;
        const total = prev.reduce((sum, c) => sum + c.count, 0);
        if (total >= 20) return prev;

        let next: DeckCard[];
        if (existing) {
          if (existing.count >= 2) return prev;
          next = prev.map((c) =>
            refOf(c) === key ? { ...c, count: c.count + 1 } : c,
          );
        } else {
          next = [...prev, { ...card, count: 1 }];
        }
        syncUrl(next);
        return next;
      });
    },
    [syncUrl],
  );

  const removeOne = useCallback(
    (card: DeckCard) => {
      setDeck((prev) => {
        const key = refOf(card);
        const next = prev
          .map((c) => (refOf(c) === key ? { ...c, count: c.count - 1 } : c))
          .filter((c) => c.count > 0);
        syncUrl(next);
        return next;
      });
    },
    [syncUrl],
  );

  const clearDeck = useCallback(() => {
    setDeck([]);
    syncUrl([]);
  }, [syncUrl]);

  const copyLink = useCallback(async () => {
    const url = `${window.location.origin}${buildBuilderUrl(entries)}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [entries]);

  const grouped = useMemo(() => {
    const pokemon = deck.filter((c) => c.cardType === "POKEMON");
    const trainers = deck.filter((c) => c.cardType === "TRAINER");
    return { pokemon, trainers };
  }, [deck]);

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
              disabled={deck.length === 0}
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
