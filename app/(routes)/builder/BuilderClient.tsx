"use client";

import { Set } from "@/prisma/generated/client/client";
import { CardBrowserClient } from "@/components/CardBrowser/CardBrowserClient";
import { toSearchCardResult } from "@/components/CardBrowser/card-mappers";
import type { CardWithSet } from "@/components/CardBrowser/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import LazyImage from "@/components/LazyImage";
import { Check, Copy, Trash2, X } from "lucide-react";
import {
  type DeckCard,
  refOf,
  useBuilderDeck,
} from "./use-builder-state";

const DECK_SIZE = 20;

export function BuilderClient({
  sets,
  initialSetId,
  initialCards,
  initialCursor,
}: {
  sets: Set[];
  initialSetId: number;
  initialCards: CardWithSet[];
  initialCursor: number | null;
}) {
  const deck = useBuilderDeck();
  const cardCounts = Object.fromEntries(
    deck.visibleDeck.map((card) => [card.id, card.count]),
  );

  if (sets.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed py-16 text-center">
        <p className="text-muted-foreground">No card sets found.</p>
      </div>
    );
  }

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] xl:grid-cols-[minmax(0,1fr)_22rem]">
      <CardBrowserClient
        sets={sets}
        initialSetId={initialSetId}
        initialCards={initialCards}
        initialCursor={initialCursor}
        mode="build"
        tradeableOnly={false}
        defaultSearchMode="effects"
        cardCounts={cardCounts}
        onCardClick={(card) => deck.addCard(toSearchCardResult(card))}
      />
      <DeckTray
        copied={deck.copied}
        visibleDeck={deck.visibleDeck}
        hydrated={deck.hydrated}
        loadError={deck.loadError}
        validation={deck.validation}
        grouped={deck.grouped}
        onRemove={deck.removeOne}
        onClear={deck.clearDeck}
        onCopyLink={deck.copyLink}
      />
    </div>
  );
}

function DeckTray({
  copied,
  visibleDeck,
  hydrated,
  loadError,
  validation,
  grouped,
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
  onRemove: (card: DeckCard) => void;
  onClear: () => void;
  onCopyLink: () => void;
}) {
  const slots = flattenDeck(visibleDeck);
  const emptyCount = Math.max(0, DECK_SIZE - slots.length);
  const progress = Math.min(validation.totalCards / DECK_SIZE, 1);
  const pokemonCount = grouped.pokemon.reduce((sum, card) => sum + card.count, 0);
  const trainerCount = grouped.trainers.reduce((sum, card) => sum + card.count, 0);

  return (
    <aside className="lg:sticky lg:top-20 lg:self-start">
      <section className="bg-card/90 space-y-4 rounded-2xl p-4 shadow-xs ring-1 ring-foreground/10 backdrop-blur-sm">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Your deck</h2>
            <p
              className={cn(
                "text-sm",
                validation.valid
                  ? "text-green-600 dark:text-green-400"
                  : "text-muted-foreground",
              )}
            >
              {validation.totalCards}/{DECK_SIZE} cards
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
              className="active:scale-[0.97]"
            >
              <Trash2 />
              Clear
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={onCopyLink}
              disabled={!validation.valid}
              className="active:scale-[0.97]"
            >
              {copied ? <Check /> : <Copy />}
              {copied ? "Copied" : "Copy link"}
            </Button>
          </div>
        </div>

        <div
          className="bg-muted h-1 overflow-hidden rounded-full"
          aria-hidden
        >
          <div
            className={cn(
              "h-full origin-left rounded-full transition-transform duration-200 ease-in-out motion-reduce:transition-none",
              validation.valid ? "bg-green-500" : "bg-red-500",
            )}
            style={{ transform: `scaleX(${progress})` }}
          />
        </div>

        {loadError ? (
          <p className="text-destructive text-sm">{loadError}</p>
        ) : null}

        {validation.errors.length > 0 ? (
          <ul className="text-destructive space-y-1 text-sm">
            {validation.errors.map((err) => (
              <li key={err}>{err}</li>
            ))}
          </ul>
        ) : null}

        <div className="grid grid-cols-5 gap-1.5">
          {slots.map((card) => (
            <button
              key={card.slotId}
              type="button"
              onClick={() => onRemove(card)}
              title={`Remove one ${card.name}`}
              aria-label={`Remove one ${card.name}`}
              className="catalog-slot relative overflow-hidden rounded-md ring-1 ring-foreground/10 transition-transform duration-150 ease-out active:scale-[0.97] motion-reduce:active:scale-100"
            >
              <LazyImage
                title={card.name}
                alt={card.name}
                src={card.imageUrl}
                width={72}
                height={100}
                className="h-auto w-full select-none"
                draggable={false}
              />
              <span className="bg-background/90 absolute top-0.5 right-0.5 flex h-4 w-4 items-center justify-center rounded-full ring-1 ring-foreground/10">
                <X className="h-2.5 w-2.5" />
              </span>
            </button>
          ))}
          {Array.from({ length: emptyCount }, (_, i) => (
            <div
              key={`empty-${i}`}
              className="aspect-[5/7] rounded-md border border-dashed border-foreground/15 bg-muted/40"
            />
          ))}
        </div>

        {visibleDeck.length === 0 ? (
          <p className="text-muted-foreground text-center text-sm">
            Click cards in the catalog to fill the 20 slots.
          </p>
        ) : (
          <p className="text-muted-foreground text-center text-xs">
            {pokemonCount} Pokémon · {trainerCount} Trainers
          </p>
        )}
      </section>
    </aside>
  );
}

type DeckSlot = DeckCard & { slotId: string };

function flattenDeck(deck: DeckCard[]): DeckSlot[] {
  const slots: DeckSlot[] = [];
  for (const card of deck) {
    for (let copy = 1; copy <= card.count; copy++) {
      slots.push({ ...card, slotId: `${refOf(card)}#${copy}` });
    }
  }
  return slots;
}
