"use client";

import { useCallback } from "react";
import { Set } from "@/prisma/generated/client/client";
import { CardGrid } from "./CardGrid";
import { SearchBox, type SearchMode } from "./SearchBox";
import { SetTabs } from "./SetTabs";
import { CardDetailSheet } from "./CardDetailSheet";
import { SelectionModeToggle } from "./SelectionModeToggle";
import { useCardDetail } from "./use-card-detail";
import { useCardSearch } from "./use-card-search";
import { useCardSelection } from "./use-card-selection";
import { CardBrowserMode, CardWithSet, SelectedCards } from "./types";
import type { CardDetail } from "@/lib/card-detail";

type CardBrowserClientProps = {
  sets: Set[];
  initialSetId: number;
  initialCards: CardWithSet[];
  initialCursor: number | null;
  mode: CardBrowserMode;
  tradeableOnly: boolean;
  defaultSearchMode?: SearchMode;
  showSearchModes?: boolean;
  onSelectionChange?: (selected: SelectedCards) => void;
  initialSelected?: SelectedCards;
  selected?: SelectedCards;
  onCardClick?: (card: CardWithSet) => void;
  cardCounts?: Record<number, number>;
  /** When false, catalog cards are not clickable (e.g. shared-deck hydration). */
  interactive?: boolean;
  initialDetail?: CardDetail | null;
  syncDexUrl?: boolean;
};

const EMPTY_SELECTION: SelectedCards = { want: [], give: [] };

export function CardBrowserClient({
  sets,
  initialSetId,
  initialCards,
  initialCursor,
  mode,
  tradeableOnly,
  defaultSearchMode = "name",
  showSearchModes = true,
  onSelectionChange,
  initialSelected = EMPTY_SELECTION,
  selected,
  onCardClick,
  cardCounts,
  interactive = true,
  initialDetail = null,
  syncDexUrl = false,
}: CardBrowserClientProps) {
  const search = useCardSearch({
    sets,
    initialSetId,
    initialCards,
    initialCursor,
    defaultSearchMode,
    tradeableOnly,
  });
  const selection = useCardSelection({
    initialSelected,
    selected,
    onSelectionChange,
  });
  const detail = useCardDetail({ initialDetail, syncDexUrl });

  const { openCard } = detail;
  const { toggleCard } = selection;
  const handleCardClick = useCallback(
    (card: CardWithSet) => {
      if (mode === "view") openCard(card);
      else if (mode === "build") onCardClick?.(card);
      else if (mode === "select") toggleCard(card);
    },
    [mode, openCard, onCardClick, toggleCard],
  );

  return (
    <div className="space-y-4">
      <SearchBox
        key={search.searchMode}
        value={search.searchQuery}
        onChange={search.handleSearchChange}
        mode={search.searchMode}
        onModeChange={search.handleModeChange}
        filterChips={search.filterChips}
        showModes={showSearchModes}
      />

      {mode === "select" ? (
        <SelectionModeToggle
          mode={selection.selectionMode}
          onModeChange={selection.setSelectionMode}
          selectedCards={selection.selectedCards}
        />
      ) : null}

      {!search.isSearching ? (
        <SetTabs
          sets={sets}
          activeSetId={search.activeSetId}
          onSetChange={search.handleSetChange}
          disabled={search.isPending}
        />
      ) : (
        <p className="text-muted-foreground text-sm">
          {search.searchMode === "name"
            ? `Searching names for “${search.searchQuery}”`
            : `Searching effects for “${search.searchQuery}”`}
        </p>
      )}

      {search.effectsError ? (
        <p className="text-destructive text-sm">{search.effectsError}</p>
      ) : null}

      <CardGrid
        key={`${search.activeSetId}-${search.searchQuery}-${search.searchMode}-${search.resultsEpoch}`}
        initialCards={search.cards}
        initialCursor={
          search.isSearching && search.searchMode === "effects"
            ? null
            : search.cursor
        }
        setId={search.isSearching ? undefined : search.activeSetId}
        searchQuery={search.searchQuery}
        tradeableOnly={tradeableOnly}
        selectable={interactive && (mode === "select" || mode === "build")}
        selectedCards={selection.selectedCards}
        selectionMode={selection.selectionMode}
        density={mode === "build" ? "compact" : "comfortable"}
        cardCounts={cardCounts}
        // CardItem is clickable whenever it receives a handler, so withholding
        // it is what makes the catalog inert while `interactive` is false.
        onCardClick={interactive ? handleCardClick : undefined}
      />

      {mode === "view" ? (
        <CardDetailSheet
          open={detail.open}
          onOpenChange={detail.onOpenChange}
          detail={detail.detail}
          loading={detail.loading}
          error={detail.error}
          shareUrl={detail.shareUrl}
        />
      ) : null}
    </div>
  );
}
