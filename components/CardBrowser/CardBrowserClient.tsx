"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Set } from "@/prisma/generated/client/client";
import { fetchCards } from "@/server/actions";
import { CardGrid } from "./CardGrid";
import { SearchBox } from "./SearchBox";
import { SetTabs } from "./SetTabs";
import {
  CardBrowserMode,
  CardWithSet,
  SelectedCards,
  SelectionMode,
} from "./types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CardBrowserClientProps = {
  sets: Set[];
  initialSetId: number;
  initialCards: CardWithSet[];
  initialCursor: number | null;
  mode: CardBrowserMode;
  tradeableOnly: boolean;
  onSelectionChange?: (selected: SelectedCards) => void;
  initialSelected?: SelectedCards;
};

export function CardBrowserClient({
  sets,
  initialSetId,
  initialCards,
  initialCursor,
  mode,
  tradeableOnly,
  onSelectionChange,
  initialSelected = { want: [], give: [] },
}: CardBrowserClientProps) {
  const [activeSetId, setActiveSetId] = useState(initialSetId);
  const [searchQuery, setSearchQuery] = useState("");
  const [cards, setCards] = useState<CardWithSet[]>(initialCards);
  const [cursor, setCursor] = useState<number | null>(initialCursor);
  const [selectionMode, setSelectionMode] = useState<SelectionMode>("want");
  const [selectedCards, setSelectedCards] =
    useState<SelectedCards>(initialSelected);
  const [isPending, startTransition] = useTransition();

  // Track if this is the initial render to avoid calling onSelectionChange on mount
  const isFirstRender = useRef(true);

  // Notify parent of selection changes via useEffect (not during render)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    onSelectionChange?.(selectedCards);
  }, [selectedCards, onSelectionChange]);

  const isSearching = searchQuery.length > 0;

  const handleSetChange = useCallback(
    (setId: number) => {
      setActiveSetId(setId);

      startTransition(async () => {
        const result = await fetchCards({
          setId,
          tradeableOnly,
        });
        setCards(result.cards as CardWithSet[]);
        setCursor(result.nextCursor);
      });
    },
    [tradeableOnly],
  );

  const handleSearchChange = useCallback(
    (query: string) => {
      setSearchQuery(query);

      startTransition(async () => {
        if (query) {
          // Search across all sets
          const result = await fetchCards({
            search: query,
            tradeableOnly,
          });
          setCards(result.cards as CardWithSet[]);
          setCursor(result.nextCursor);
        } else {
          // Return to the active set
          const result = await fetchCards({
            setId: activeSetId,
            tradeableOnly,
          });
          setCards(result.cards as CardWithSet[]);
          setCursor(result.nextCursor);
        }
      });
    },
    [activeSetId, tradeableOnly],
  );

  const handleCardClick = useCallback(
    (card: CardWithSet) => {
      if (mode !== "select") return;

      setSelectedCards((prev) => {
        const newSelected = { ...prev };
        const currentList = selectionMode === "want" ? "want" : "give";
        const otherList = selectionMode === "want" ? "give" : "want";

        // Check if card is already in the current list
        const indexInCurrent = newSelected[currentList].findIndex(
          (c) => c.id === card.id,
        );

        if (indexInCurrent !== -1) {
          // Remove from current list
          newSelected[currentList] = newSelected[currentList].filter(
            (c) => c.id !== card.id,
          );
        } else {
          // Remove from other list if present
          newSelected[otherList] = newSelected[otherList].filter(
            (c) => c.id !== card.id,
          );
          // Add to current list
          newSelected[currentList] = [...newSelected[currentList], card];
        }

        return newSelected;
      });
    },
    [mode, selectionMode],
  );

  return (
    <div className="space-y-4">
      {/* Search */}
      <SearchBox
        value={searchQuery}
        onChange={handleSearchChange}
        placeholder="Search all cards..."
      />

      {/* Selection mode toggle (only in select mode) */}
      {mode === "select" && (
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-sm">Adding to:</span>
          <div className="flex rounded-lg border p-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setSelectionMode("want")}
              className={cn(
                "rounded-md px-3",
                selectionMode === "want" &&
                  "bg-blue-500 text-white hover:bg-blue-600 hover:text-white",
              )}
            >
              Want ({selectedCards.want.length})
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setSelectionMode("give")}
              className={cn(
                "rounded-md px-3",
                selectionMode === "give" &&
                  "bg-green-500 text-white hover:bg-green-600 hover:text-white",
              )}
            >
              Give ({selectedCards.give.length})
            </Button>
          </div>
        </div>
      )}

      {/* Set tabs (hidden when searching) */}
      {!isSearching && (
        <SetTabs
          sets={sets}
          activeSetId={activeSetId}
          onSetChange={handleSetChange}
          disabled={isPending}
        />
      )}

      {/* Search indicator */}
      {isSearching && (
        <p className="text-muted-foreground text-sm">
          Searching across all sets for &quot;{searchQuery}&quot;
        </p>
      )}

      {/* Card grid */}
      <CardGrid
        initialCards={cards}
        initialCursor={cursor}
        setId={isSearching ? undefined : activeSetId}
        searchQuery={searchQuery}
        tradeableOnly={tradeableOnly}
        selectable={mode === "select"}
        selectedCards={selectedCards}
        selectionMode={selectionMode}
        onCardClick={handleCardClick}
      />
    </div>
  );
}
