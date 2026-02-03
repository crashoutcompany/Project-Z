"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { fetchCards } from "@/server/actions";
import { CardItem } from "./CardItem";
import { CardGridProps, CardWithSet } from "./types";
import { Loader2 } from "lucide-react";

export function CardGrid({
  initialCards,
  initialCursor,
  setId,
  searchQuery,
  tradeableOnly,
  selectable,
  selectedCards,
  selectionMode,
  onCardClick,
}: CardGridProps) {
  const [cards, setCards] = useState<CardWithSet[]>(initialCards);
  const [cursor, setCursor] = useState<number | null>(initialCursor);
  const [isPending, startTransition] = useTransition();
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Reset cards when setId or searchQuery changes
  useEffect(() => {
    setCards(initialCards);
    setCursor(initialCursor);
  }, [initialCards, initialCursor, setId, searchQuery]);

  const loadMore = useCallback(() => {
    if (!cursor || isPending) return;

    startTransition(async () => {
      const result = await fetchCards({
        setId: searchQuery ? undefined : setId,
        search: searchQuery || undefined,
        cursor,
        tradeableOnly,
      });

      setCards((prev) => [...prev, ...result.cards as CardWithSet[]]);
      setCursor(result.nextCursor);
    });
  }, [cursor, isPending, setId, searchQuery, tradeableOnly]);

  // Set up intersection observer for infinite scroll
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
      <div className="py-12 text-center">
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
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {cards.map((card) => (
          <CardItem
            key={card.id}
            card={card}
            selectable={selectable}
            selectionState={getSelectionState(card)}
            onClick={() => onCardClick?.(card)}
          />
        ))}
      </div>

      {/* Load more trigger */}
      <div ref={loadMoreRef} className="flex justify-center py-4">
        {isPending && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading more cards...</span>
          </div>
        )}
        {!cursor && cards.length > 0 && (
          <p className="text-muted-foreground text-sm">
            All {cards.length} cards loaded
          </p>
        )}
      </div>
    </div>
  );
}
