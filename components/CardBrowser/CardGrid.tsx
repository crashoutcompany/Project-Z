"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { fetchCards } from "@/server/actions";
import { CardItem } from "./CardItem";
import { CardGridProps, CardWithSet } from "./types";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const ABOVE_FOLD_PRIORITY_COUNT = 6;

export function CardGrid({
  initialCards,
  initialCursor,
  setId,
  searchQuery,
  tradeableOnly,
  selectable,
  selectedCards,
  selectionMode,
  density = "comfortable",
  cardCounts,
  onCardClick,
}: CardGridProps) {
  const [cards, setCards] = useState<CardWithSet[]>(initialCards);
  const [cursor, setCursor] = useState<number | null>(initialCursor);
  const [isPending, startTransition] = useTransition();
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const loadMore = useCallback(() => {
    if (!cursor || isPending) return;

    startTransition(async () => {
      const result = await fetchCards({
        setId: searchQuery ? undefined : setId,
        search: searchQuery || undefined,
        cursor,
        tradeableOnly,
      });

      setCards((prev) => [...prev, ...(result.cards as CardWithSet[])]);
      setCursor(result.nextCursor);
    });
  }, [cursor, isPending, setId, searchQuery, tradeableOnly]);

  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && cursor && !isPending) {
          loadMore();
        }
      },
      { threshold: 0.1, rootMargin: "100px" },
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      observerRef.current?.disconnect();
    };
  }, [cursor, isPending, loadMore]);

  const getSelectionState = (card: CardWithSet): "none" | "want" | "give" => {
    if (selectedCards.want.some((c) => c.id === card.id)) return "want";
    if (selectedCards.give.some((c) => c.id === card.id)) return "give";
    return "none";
  };

  if (cards.length === 0 && !isPending) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-16 text-center">
        <p className="text-muted-foreground">
          {searchQuery
            ? `No cards found for "${searchQuery}"`
            : "No cards found in this set"}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div
        className={cn(
          "catalog-results grid gap-3",
          density === "compact"
            ? "grid-cols-2 sm:grid-cols-3 xl:grid-cols-4"
            : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6",
        )}
      >
        {cards.map((card, index) => (
          <CardItem
            key={card.id}
            card={card}
            selectable={selectable}
            selectionState={getSelectionState(card)}
            count={cardCounts?.[card.id]}
            priority={index < ABOVE_FOLD_PRIORITY_COUNT}
            onClick={onCardClick ? () => onCardClick(card) : undefined}
          />
        ))}
      </div>

      <div ref={loadMoreRef} className="flex justify-center py-4">
        {isPending ? (
          <div className="text-muted-foreground flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading more cards...</span>
          </div>
        ) : null}
        {!cursor && cards.length > 0 ? (
          <p className="text-muted-foreground text-sm">
            All {cards.length} cards loaded
          </p>
        ) : null}
      </div>
    </div>
  );
}
