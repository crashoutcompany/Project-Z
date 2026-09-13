"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { SearchCardResult } from "@/lib/search";
import { Check, Copy, Minus, Plus, Search, Trash2 } from "lucide-react";
import {
  type DeckCard,
  refOf,
  useBuilderDeck,
  useBuilderSearch,
} from "./use-builder-state";

export function BuilderClient() {
  const search = useBuilderSearch();
  const deck = useBuilderDeck();

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <BuilderSearchPane
        query={search.query}
        onQueryChange={search.setQuery}
        onSearch={search.runSearch}
        isPending={search.isPending}
        searchError={search.searchError}
        results={search.results}
        onAdd={deck.addCard}
      />
      <BuilderDeckPane
        copied={deck.copied}
        visibleDeck={deck.visibleDeck}
        hydrated={deck.hydrated}
        loadError={deck.loadError}
        validation={deck.validation}
        grouped={deck.grouped}
        onAdd={deck.addCard}
        onRemove={deck.removeOne}
        onClear={deck.clearDeck}
        onCopyLink={deck.copyLink}
      />
    </div>
  );
}

function BuilderSearchPane({
  query,
  onQueryChange,
  onSearch,
  isPending,
  searchError,
  results,
  onAdd,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  onSearch: (query: string) => void;
  isPending: boolean;
  searchError: string | null;
  results: SearchCardResult[];
  onAdd: (card: SearchCardResult) => void;
}) {
  return (
    <section className="space-y-4">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          onSearch(query);
        }}
      >
        <div className="relative flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search cards by name or effect..."
            className="pl-9"
          />
        </div>
        <Button type="submit" disabled={isPending}>
          Search
        </Button>
      </form>

      {searchError ? (
        <p className="text-destructive text-sm">{searchError}</p>
      ) : null}

      <div className="grid max-h-[70vh] grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4">
        {results.map((card) => (
          <button
            key={card.id}
            type="button"
            onClick={() => onAdd(card)}
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
  );
}

function BuilderDeckPane({
  copied,
  visibleDeck,
  hydrated,
  loadError,
  validation,
  grouped,
  onAdd,
  onRemove,
  onClear,
  onCopyLink,
}: {
  copied: boolean;
  visibleDeck: DeckCard[];
  hydrated: boolean;
  loadError: string | null;
  validation: { valid: boolean; totalCards: number; errors: string[] };
  grouped: { pokemon: DeckCard[]; trainers: DeckCard[] };
  onAdd: (card: SearchCardResult) => void;
  onRemove: (card: DeckCard) => void;
  onClear: () => void;
  onCopyLink: () => void;
}) {
  return (
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
            {!hydrated ? " · loading…" : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClear}
            disabled={visibleDeck.length === 0}
          >
            <Trash2 className="mr-1 h-4 w-4" />
            Clear
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={onCopyLink}
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

      {loadError ? <p className="text-destructive text-sm">{loadError}</p> : null}

      {validation.errors.length > 0 ? (
        <ul className="text-destructive list-inside list-disc text-sm">
          {validation.errors.map((err) => (
            <li key={err}>{err}</li>
          ))}
        </ul>
      ) : null}

      <DeckSection
        title="Pokémon"
        cards={grouped.pokemon}
        onAdd={onAdd}
        onRemove={onRemove}
      />
      <DeckSection
        title="Trainers"
        cards={grouped.trainers}
        onAdd={onAdd}
        onRemove={onRemove}
      />
    </section>
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
