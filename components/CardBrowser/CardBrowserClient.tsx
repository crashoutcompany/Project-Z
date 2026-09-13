"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
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
  onSelectionChange?: (selected: SelectedCards) => void;
  initialSelected?: SelectedCards;
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
    isTradeable: false,
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
  onSelectionChange,
  initialSelected = { want: [], give: [] },
}: CardBrowserClientProps) {
  const [activeSetId, setActiveSetId] = useState(initialSetId);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMode, setSearchMode] = useState<SearchMode>("name");
  const [filterChips, setFilterChips] = useState<string[]>([]);
  const [cards, setCards] = useState<CardWithSet[]>(initialCards);
  const [cursor, setCursor] = useState<number | null>(initialCursor);
  const [selectionMode, setSelectionMode] = useState<SelectionMode>("want");
  const [selectedCards, setSelectedCards] =
    useState<SelectedCards>(initialSelected);
  const [isPending, startTransition] = useTransition();
  const [effectsError, setEffectsError] = useState<string | null>(null);

  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    onSelectionChange?.(selectedCards);
  }, [selectedCards, onSelectionChange]);

  const isSearching = searchQuery.length > 0;

  const loadSet = useCallback(
    (setId: number) => {
      startTransition(async () => {
        const result = await fetchCards({
          setId,
          tradeableOnly,
        });
        setCards(result.cards as CardWithSet[]);
        setCursor(result.nextCursor);
        setFilterChips([]);
        setEffectsError(null);
      });
    },
    [tradeableOnly],
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
      startTransition(async () => {
        if (query) {
          const result = await fetchCards({
            search: query,
            tradeableOnly,
          });
          setCards(result.cards as CardWithSet[]);
          setCursor(result.nextCursor);
        } else {
          const result = await fetchCards({
            setId: activeSetId,
            tradeableOnly,
          });
          setCards(result.cards as CardWithSet[]);
          setCursor(result.nextCursor);
        }
        setFilterChips([]);
        setEffectsError(null);
      });
    },
    [activeSetId, tradeableOnly],
  );

  const runEffectsSearch = useCallback(
    (query: string) => {
      startTransition(async () => {
        if (!query) {
          const result = await fetchCards({
            setId: activeSetId,
            tradeableOnly,
          });
          setCards(result.cards as CardWithSet[]);
          setCursor(result.nextCursor);
          setFilterChips([]);
          setEffectsError(null);
          return;
        }

        try {
          const res = await fetch("/api/search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query, limit: 60 }),
          });
          const data = (await res.json()) as {
            error?: string;
            filter?: FilterJSON;
            cards?: SearchCardResult[];
            usedFallback?: boolean;
          };
          if (!res.ok) {
            setEffectsError(data.error ?? "Search failed");
            setCards([]);
            setCursor(null);
            setFilterChips([]);
            return;
          }
          setEffectsError(null);
          setFilterChips(data.filter ? filterToChips(data.filter) : []);
          setCards(
            (data.cards ?? []).map((c) => searchResultToCardWithSet(c, sets)),
          );
          setCursor(null);
        } catch {
          setEffectsError("Search request failed");
          setCards([]);
          setCursor(null);
          setFilterChips([]);
        }
      });
    },
    [activeSetId, tradeableOnly, sets],
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
      if (mode !== "select") return;

      setSelectedCards((prev) => {
        const newSelected = { ...prev };
        const currentList = selectionMode === "want" ? "want" : "give";
        const otherList = selectionMode === "want" ? "give" : "want";

        const indexInCurrent = newSelected[currentList].findIndex(
          (c) => c.id === card.id,
        );

        if (indexInCurrent !== -1) {
          newSelected[currentList] = newSelected[currentList].filter(
            (c) => c.id !== card.id,
          );
        } else {
          newSelected[otherList] = newSelected[otherList].filter(
            (c) => c.id !== card.id,
          );
          newSelected[currentList] = [...newSelected[currentList], card];
        }

        return newSelected;
      });
    },
    [mode, selectionMode],
  );

  return (
    <div className="space-y-4">
      <SearchBox
        value={searchQuery}
        onChange={handleSearchChange}
        mode={searchMode}
        onModeChange={handleModeChange}
        filterChips={filterChips}
      />

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

      {!isSearching && searchMode === "name" && (
        <SetTabs
          sets={sets}
          activeSetId={activeSetId}
          onSetChange={handleSetChange}
          disabled={isPending}
        />
      )}

      {isSearching && (
        <p className="text-muted-foreground text-sm">
          {searchMode === "name"
            ? `Searching names for "${searchQuery}"`
            : `Searching effects for "${searchQuery}"`}
        </p>
      )}

      {effectsError && (
        <p className="text-destructive text-sm">{effectsError}</p>
      )}

      <CardGrid
        key={`${activeSetId}-${searchQuery}-${searchMode}`}
        initialCards={cards}
        initialCursor={searchMode === "effects" ? null : cursor}
        setId={isSearching || searchMode === "effects" ? undefined : activeSetId}
        searchQuery={searchMode === "name" ? searchQuery : ""}
        tradeableOnly={tradeableOnly}
        selectable={mode === "select"}
        selectedCards={selectedCards}
        selectionMode={selectionMode}
        onCardClick={handleCardClick}
      />
    </div>
  );
}
