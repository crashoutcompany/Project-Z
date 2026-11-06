"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { CardItem } from "./CardItem";
import { CardGridProps, CardWithSet } from "./types";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const ABOVE_FOLD_PRIORITY_COUNT = 6;

/**
 * The catalog's cards with infinite scroll. Which request a page repeats is up
 * to `loadPage`; the parent remounts the grid (via `key`) for new results.
 */
export function CardGrid({
  initialCards,
  initialCursor,
  loadPage,
  total,
  selectable,
  selectedCards,
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
      const page = await loadPage(cursor);
      setCards((prev) => [...prev, ...page.cards]);
      setCursor(page.nextOffset);
    });
  }, [cursor, isPending, loadPage]);

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

  return (
    <div className="space-y-4">
      {/* Columns follow the browser's own width (the @container/browser in
          CardBrowserClient), so /dex and the builder's narrower catalog
          column line up the same way: up to 6 across on wide screens. */}
      <div className="catalog-results grid grid-cols-2 gap-3 @lg/browser:grid-cols-3 @2xl/browser:grid-cols-4 @3xl/browser:grid-cols-5 @5xl/browser:grid-cols-6">
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
        {cursor && !isPending && total !== undefined ? (
          <Button
            type="button"
            variant="outline"
            onClick={loadMore}
            className="pointer-coarse:h-11"
          >
            Load more · {cards.length} of {total}
          </Button>
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
