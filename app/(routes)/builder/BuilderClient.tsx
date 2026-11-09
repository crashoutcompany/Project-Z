"use client";

import { Set } from "@/prisma/generated/client/client";
import { CardBrowserClient } from "@/components/CardBrowser/CardBrowserClient";
import { toSearchCardResult } from "@/components/CardBrowser/card-mappers";
import type { CardWithSet } from "@/components/CardBrowser/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";
import LazyImage from "@/components/LazyImage";
import { Check, Copy, Trash2, X } from "lucide-react";
import { type DeckCard, refOf, useBuilderDeck } from "./use-builder-state";
import {
  type DeckOwnershipState,
  useDeckOwnership,
} from "./use-deck-ownership";

const DECK_SIZE = 20;

export function BuilderClient({
  sets,
  initialSetIds,
  initialCards,
  initialCursor,
  initialTotal,
}: {
  sets: Set[];
  initialSetIds: number[];
  initialCards: CardWithSet[];
  initialCursor: number | null;
  initialTotal: number;
}) {
  const deck = useBuilderDeck();
  const ownership = useDeckOwnership(deck.visibleDeck);
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
        initialSetIds={initialSetIds}
        initialCards={initialCards}
        initialCursor={initialCursor}
        initialTotal={initialTotal}
        mode="build"
        tradeableOnly={false}
        defaultSearchMode="effects"
        interactive={deck.hydrated}
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
        ownership={ownership}
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
  ownership,
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
  ownership: DeckOwnershipState;
  onRemove: (card: DeckCard) => void;
  onClear: () => void;
  onCopyLink: () => void;
}) {
  const slots = flattenDeck(visibleDeck);
  const emptyCount = Math.max(0, DECK_SIZE - slots.length);
  const progress = Math.min(validation.totalCards / DECK_SIZE, 1);
  const pokemonCount = grouped.pokemon.reduce(
    (sum, card) => sum + card.count,
    0,
  );
  const trainerCount = grouped.trainers.reduce(
    (sum, card) => sum + card.count,
    0,
  );

  // Sticks level with the catalog's search bar (the toolbar sticks at 4rem
  // with 0.75rem of padding) and starts level with it too.
  return (
    <aside className="lg:sticky lg:top-19 lg:mt-3 lg:self-start">
      <section className="bg-card/90 ring-foreground/10 space-y-4 rounded-2xl p-4 shadow-xs ring-1 backdrop-blur-sm">
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
              className="active:scale-[0.97] motion-reduce:active:scale-100"
            >
              <Trash2 />
              Clear
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={onCopyLink}
              disabled={!validation.valid}
              className="active:scale-[0.97] motion-reduce:active:scale-100"
            >
              {copied ? <Check /> : <Copy />}
              {copied ? "Copied" : "Copy link"}
            </Button>
          </div>
        </div>

        <div className="bg-muted h-1 overflow-hidden rounded-full" aria-hidden>
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
          {slots.map((card) => {
            // Slot marks only once there is a collection to compare against,
            // so people who don't track one never see a greyed-out deck.
            const owned =
              ownership.status === "ready"
                ? card.copy <=
                  (ownership.ownership.byCardId[card.id]?.owned ?? 0)
                : null;
            return (
              <button
                key={card.slotId}
                type="button"
                onClick={() => onRemove(card)}
                title={`Remove one ${card.name}`}
                aria-label={`Remove one ${card.name}${
                  owned === null ? "" : owned ? " (owned)" : " (missing)"
                }`}
                data-testid="deck-slot"
                data-owned={owned === null ? undefined : owned}
                className="catalog-slot ring-foreground/10 relative overflow-hidden rounded-md ring-1 transition-transform duration-150 ease-out active:scale-[0.97] motion-reduce:active:scale-100"
              >
                <LazyImage
                  title={card.name}
                  alt={card.name}
                  src={card.imageUrl}
                  width={72}
                  height={100}
                  className={cn(
                    "h-auto w-full transition-[filter,opacity] duration-200 select-none motion-reduce:transition-none",
                    owned === false && "opacity-45 grayscale",
                  )}
                  draggable={false}
                />
                <span className="bg-background/90 ring-foreground/10 absolute top-0.5 right-0.5 flex h-4 w-4 items-center justify-center rounded-full ring-1">
                  <X className="h-2.5 w-2.5" />
                </span>
                {owned ? (
                  <span
                    aria-hidden
                    className="absolute bottom-0.5 left-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-white"
                  >
                    <Check className="h-2.5 w-2.5" />
                  </span>
                ) : null}
              </button>
            );
          })}
          {Array.from({ length: emptyCount }, (_, i) => (
            <div
              key={`empty-${i}`}
              className="border-foreground/15 bg-muted/40 aspect-[5/7] rounded-md border border-dashed"
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

        {visibleDeck.length > 0 ? (
          <MissingCards deck={visibleDeck} ownership={ownership} />
        ) : null}
      </section>
    </aside>
  );
}

function MissingCards({
  deck,
  ownership,
}: {
  deck: DeckCard[];
  ownership: DeckOwnershipState;
}) {
  const ready = ownership.status === "ready" ? ownership : null;
  const missing = ready
    ? deck.flatMap((card) => {
        const counts = ready.ownership.byCardId[card.id];
        return counts && counts.owned < counts.needed
          ? [{ card, ...counts }]
          : [];
      })
    : [];

  return (
    <div
      className="border-foreground/10 space-y-2 border-t pt-3"
      data-testid="deck-missing-cards"
    >
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold">Missing cards</h3>
        {ready ? (
          <span
            className="text-muted-foreground text-xs tabular-nums"
            data-testid="deck-owned-total"
          >
            {ready.ownership.owned} of {ready.ownership.needed} owned
          </span>
        ) : null}
      </div>

      {ownership.status === "loading" ? (
        <p className="text-muted-foreground text-xs">
          Checking your collection…
        </p>
      ) : ownership.status === "empty" ? (
        <p className="text-muted-foreground text-xs">
          Your collection is empty. Mark cards you own in the{" "}
          <Link href="/dex" className="text-foreground underline">
            Dex
          </Link>{" "}
          to see what this deck is missing.
        </p>
      ) : missing.length === 0 ? (
        <p className="text-xs text-green-600 dark:text-green-400">
          You own every card in this deck.
        </p>
      ) : (
        <ul className="space-y-1">
          {missing.map(({ card, owned, needed }) => (
            <li
              key={refOf(card)}
              data-testid="deck-missing-card"
              className="bg-muted/50 flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm"
            >
              <LazyImage
                alt=""
                src={card.imageUrl}
                width={24}
                height={33}
                className="h-auto w-6 shrink-0 rounded-sm select-none"
                draggable={false}
              />
              <span className="min-w-0 flex-1 truncate" title={card.name}>
                {card.name}
              </span>
              <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                {owned} of {needed} owned
              </span>
            </li>
          ))}
        </ul>
      )}

      {ready?.exactOnly ? (
        <p className="text-muted-foreground text-xs">
          Couldn&apos;t check alt arts, so only exact prints are counted.
        </p>
      ) : null}
    </div>
  );
}

type DeckSlot = DeckCard & { slotId: string; copy: number };

function flattenDeck(deck: DeckCard[]): DeckSlot[] {
  const slots: DeckSlot[] = [];
  for (const card of deck) {
    for (let copy = 1; copy <= card.count; copy++) {
      slots.push({ ...card, slotId: `${refOf(card)}#${copy}`, copy });
    }
  }
  return slots;
}
