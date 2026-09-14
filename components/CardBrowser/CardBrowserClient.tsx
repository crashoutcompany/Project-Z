"use client";

import { useCallback, useRef, useState, useTransition } from "react";
import { Set } from "@/prisma/generated/client/client";
import { fetchCards } from "@/server/actions";
import { CardGrid } from "./CardGrid";
import { SearchBox, type SearchMode } from "./SearchBox";
import { SetTabs } from "./SetTabs";
import {
  CardBrowserMode,
  CardWithSet,
  SelectedCards,
  SelectionMode,
} from "./types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { FilterJSON, SearchCardResult } from "@/lib/search";

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
};

function filterToChips(filter: FilterJSON): string[] {
  const chips: string[] = [];
  if (filter.cardType) chips.push(filter.cardType);
  if (filter.trainerType) chips.push(filter.trainerType);
  if (filter.isEx) chips.push("EX");
  if (filter.stage?.length) chips.push(...filter.stage);
  if (filter.energyType?.length) chips.push(...filter.energyType);
  if (filter.hpMin != null) chips.push(`HP≥${filter.hpMin}`);
  if (filter.attack?.energyCost != null) {
    chips.push(`${filter.attack.energyCost} energy`);
  }
  if (filter.attack?.damageMin != null) {
    chips.push(`${filter.attack.damageMin}+ dmg`);
  }
  if (filter.attack?.damageKind) chips.push(filter.attack.damageKind);
  if (filter.attack?.tags?.length) chips.push(...filter.attack.tags);
  if (filter.effect?.tags?.length) chips.push(...filter.effect.tags);
  if (filter.textFallback) chips.push(`text:${filter.textFallback}`);
  return chips;
}

function searchResultToCardWithSet(
  card: SearchCardResult,
  sets: Set[],
): CardWithSet {
  const set =
    sets.find((s) => s.code === card.setCode) ??
    ({
      id: -1,
      code: card.setCode,
      setName: card.setCode,
      image: "",
      releaseDate: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Set);

  return {
    id: card.id,
    setId: set.id,
    number: card.number,
    name: card.name,
    cardType: card.cardType as CardWithSet["cardType"],
    imageUrl: card.imageUrl,
    rarity: card.rarity,
    isTradeable: card.isTradeable,
    pack: null,
    energyType: card.energyType,
    hp: card.hp,
    stage: null,
    isEx: card.isEx,
    isBaby: false,
    weakness: null,
    retreatCost: null,
    trainerType: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    set,
  };
}

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
  initialSelected = { want: [], give: [] },
  selected,
  onCardClick,
  cardCounts,
}: CardBrowserClientProps) {
  const [activeSetId, setActiveSetId] = useState(initialSetId);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMode, setSearchMode] = useState<SearchMode>(defaultSearchMode);
  const [filterChips, setFilterChips] = useState<string[]>([]);
  const [cards, setCards] = useState<CardWithSet[]>(initialCards);
  const [cursor, setCursor] = useState<number | null>(initialCursor);
  const [resultsEpoch, setResultsEpoch] = useState(0);
  const [selectionMode, setSelectionMode] = useState<SelectionMode>("want");
  const [internalSelected, setInternalSelected] =
    useState<SelectedCards>(initialSelected);
  const [isPending, startTransition] = useTransition();
  const [effectsError, setEffectsError] = useState<string | null>(null);
  const requestSeq = useRef(0);

  const selectedCards = selected ?? internalSelected;

  const commitSelection = useCallback(
    (next: SelectedCards) => {
      if (!selected) setInternalSelected(next);
      onSelectionChange?.(next);
    },
    [selected, onSelectionChange],
  );

  const replaceResults = useCallback(
    (nextCards: CardWithSet[], nextCursor: number | null) => {
      setCards(nextCards);
      setCursor(nextCursor);
      setResultsEpoch((n) => n + 1);
    },
    [],
  );

  const isSearching = searchQuery.length > 0;

  const loadSet = useCallback(
    (setId: number) => {
      const seq = ++requestSeq.current;
      startTransition(async () => {
        const result = await fetchCards({
          setId,
          tradeableOnly,
        });
        if (seq !== requestSeq.current) return;
        replaceResults(result.cards as CardWithSet[], result.nextCursor);
        setFilterChips([]);
        setEffectsError(null);
      });
    },
    [tradeableOnly, replaceResults],
  );

  const handleSetChange = useCallback(
    (setId: number) => {
      setActiveSetId(setId);
      loadSet(setId);
    },
    [loadSet],
  );

  const runNameSearch = useCallback(
    (query: string) => {
      const seq = ++requestSeq.current;
      startTransition(async () => {
        if (query) {
          const result = await fetchCards({
            search: query,
            tradeableOnly,
          });
          if (seq !== requestSeq.current) return;
          replaceResults(result.cards as CardWithSet[], result.nextCursor);
        } else {
          const result = await fetchCards({
            setId: activeSetId,
            tradeableOnly,
          });
          if (seq !== requestSeq.current) return;
          replaceResults(result.cards as CardWithSet[], result.nextCursor);
        }
        setFilterChips([]);
        setEffectsError(null);
      });
    },
    [activeSetId, tradeableOnly, replaceResults],
  );

  const runEffectsSearch = useCallback(
    (query: string) => {
      const seq = ++requestSeq.current;
      startTransition(async () => {
        if (!query) {
          const result = await fetchCards({
            setId: activeSetId,
            tradeableOnly,
          });
          if (seq !== requestSeq.current) return;
          replaceResults(result.cards as CardWithSet[], result.nextCursor);
          setFilterChips([]);
          setEffectsError(null);
          return;
        }

        try {
          const res = await fetch("/api/search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query, limit: 60, tradeableOnly }),
          });
          const data = (await res.json()) as {
            error?: string;
            filter?: FilterJSON;
            cards?: SearchCardResult[];
            usedFallback?: boolean;
          };
          if (seq !== requestSeq.current) return;
          if (!res.ok) {
            setEffectsError(data.error ?? "Search failed");
            replaceResults([], null);
            setFilterChips([]);
            return;
          }
          setEffectsError(null);
          setFilterChips(data.filter ? filterToChips(data.filter) : []);
          replaceResults(
            (data.cards ?? []).map((c) => searchResultToCardWithSet(c, sets)),
            null,
          );
        } catch {
          if (seq !== requestSeq.current) return;
          setEffectsError("Search request failed");
          replaceResults([], null);
          setFilterChips([]);
        }
      });
    },
    [activeSetId, tradeableOnly, sets, replaceResults],
  );

  const handleSearchChange = useCallback(
    (query: string) => {
      setSearchQuery(query);
      if (searchMode === "name") {
        runNameSearch(query);
      } else {
        runEffectsSearch(query);
      }
    },
    [searchMode, runNameSearch, runEffectsSearch],
  );

  const handleModeChange = useCallback(
    (next: SearchMode) => {
      setSearchMode(next);
      setSearchQuery("");
      setFilterChips([]);
      setEffectsError(null);
      loadSet(activeSetId);
    },
    [activeSetId, loadSet],
  );

  const handleCardClick = useCallback(
    (card: CardWithSet) => {
      if (mode === "build") {
        onCardClick?.(card);
        return;
      }

      if (mode !== "select") return;

      const currentList = selectionMode === "want" ? "want" : "give";
      const otherList = selectionMode === "want" ? "give" : "want";
      const indexInCurrent = selectedCards[currentList].findIndex(
        (c) => c.id === card.id,
      );

      const next: SelectedCards = {
        want: [...selectedCards.want],
        give: [...selectedCards.give],
      };

      if (indexInCurrent !== -1) {
        next[currentList] = next[currentList].filter((c) => c.id !== card.id);
      } else {
        next[otherList] = next[otherList].filter((c) => c.id !== card.id);
        next[currentList] = [...next[currentList], card];
      }

      commitSelection(next);
    },
    [mode, selectionMode, selectedCards, onCardClick, commitSelection],
  );

  return (
    <div className="space-y-4">
      <SearchBox
        key={searchMode}
        value={searchQuery}
        onChange={handleSearchChange}
        mode={searchMode}
        onModeChange={handleModeChange}
        filterChips={filterChips}
        showModes={showSearchModes}
      />

      {mode === "select" ? (
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-sm">Adding to</span>
          <div className="bg-muted flex rounded-lg p-0.5">
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
      ) : null}

      {!isSearching ? (
        <SetTabs
          sets={sets}
          activeSetId={activeSetId}
          onSetChange={handleSetChange}
          disabled={isPending}
        />
      ) : null}

      {isSearching ? (
        <p className="text-muted-foreground text-sm">
          {searchMode === "name"
            ? `Searching names for “${searchQuery}”`
            : `Searching effects for “${searchQuery}”`}
        </p>
      ) : null}

      {effectsError ? (
        <p className="text-destructive text-sm">{effectsError}</p>
      ) : null}

      <CardGrid
        key={`${activeSetId}-${searchQuery}-${searchMode}-${resultsEpoch}`}
        initialCards={cards}
        initialCursor={isSearching && searchMode === "effects" ? null : cursor}
        setId={isSearching ? undefined : activeSetId}
        searchQuery={searchQuery}
        tradeableOnly={tradeableOnly}
        selectable={mode === "select" || mode === "build"}
        selectedCards={selectedCards}
        selectionMode={selectionMode}
        density={mode === "build" ? "compact" : "comfortable"}
        cardCounts={cardCounts}
        onCardClick={handleCardClick}
      />
    </div>
  );
}
