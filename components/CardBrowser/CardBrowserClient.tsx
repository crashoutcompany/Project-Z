"use client";

import { useCallback, useRef, useState, useTransition } from "react";
import { Set } from "@/prisma/generated/client/client";
import { fetchCards } from "@/server/actions";
import { CardGrid } from "./CardGrid";
import { SearchBox, type SearchMode } from "./SearchBox";
import { SetTabs } from "./SetTabs";
import { TagFilter } from "./TagFilter";
import { ActiveFilters } from "./ActiveFilters";
import { NoMatches } from "./NoMatches";
import { CardDetailSheet } from "./CardDetailSheet";
import { SelectionModeToggle } from "./SelectionModeToggle";
import { useCardDetail } from "./use-card-detail";
import { useCardSelection } from "./use-card-selection";
import { CardBrowserMode, CardWithSet, SelectedCards, TagMode } from "./types";
import type { CardDetail } from "@/lib/card-detail";
import type { FilterJSON, SearchCardResult } from "@/lib/search";
import { filterTags } from "@/lib/search/filter-tags";

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

/** Parsed constraints other than tags, shown read-only beside the tag pills. */
function filterToNotes(filter: FilterJSON): string[] {
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
    secondaryEnergyType: card.secondaryEnergyType,
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
  initialSelected = EMPTY_SELECTION,
  selected,
  onCardClick,
  cardCounts,
  interactive = true,
  initialDetail = null,
  syncDexUrl = false,
}: CardBrowserClientProps) {
  const [activeSetId, setActiveSetId] = useState(initialSetId);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMode, setSearchMode] = useState<SearchMode>(defaultSearchMode);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagMode, setTagMode] = useState<TagMode>("all");
  // Tags parsed from the typed query, minus any the user dismissed.
  const [parsedTags, setParsedTags] = useState<string[]>([]);
  const [excludedTags, setExcludedTags] = useState<string[]>([]);
  const [filterNotes, setFilterNotes] = useState<string[]>([]);
  const [cards, setCards] = useState<CardWithSet[]>(initialCards);
  const [cursor, setCursor] = useState<number | null>(initialCursor);
  const [resultsEpoch, setResultsEpoch] = useState(0);
  const [isPending, startTransition] = useTransition();
  const [effectsError, setEffectsError] = useState<string | null>(null);
  const requestSeq = useRef(0);

  const selection = useCardSelection({
    initialSelected,
    selected,
    onSelectionChange,
  });
  const detail = useCardDetail({ initialDetail, syncDexUrl });

  const replaceResults = useCallback(
    (nextCards: CardWithSet[], nextCursor: number | null) => {
      setCards(nextCards);
      setCursor(nextCursor);
      setResultsEpoch((n) => n + 1);
    },
    [],
  );

  const clearParsed = useCallback(() => {
    setParsedTags([]);
    setFilterNotes([]);
  }, []);

  const isSearching =
    searchQuery.length > 0 ||
    (searchMode === "effects" && selectedTags.length > 0);

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
        clearParsed();
        setEffectsError(null);
      });
    },
    [tradeableOnly, replaceResults, clearParsed],
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
        clearParsed();
        setEffectsError(null);
      });
    },
    [activeSetId, tradeableOnly, replaceResults, clearParsed],
  );

  const runEffectsSearch = useCallback(
    (
      query: string,
      tags: string[],
      matchMode: TagMode,
      exclude: string[] = [],
    ) => {
      const seq = ++requestSeq.current;
      startTransition(async () => {
        if (!query && tags.length === 0) {
          const result = await fetchCards({
            setId: activeSetId,
            tradeableOnly,
          });
          if (seq !== requestSeq.current) return;
          replaceResults(result.cards as CardWithSet[], result.nextCursor);
          clearParsed();
          setEffectsError(null);
          return;
        }

        try {
          const res = await fetch("/api/search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              query,
              limit: 60,
              tradeableOnly,
              ...(tags.length ? { tags, tagMode: matchMode } : {}),
              ...(query && exclude.length ? { excludeTags: exclude } : {}),
            }),
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
            clearParsed();
            return;
          }
          setEffectsError(null);
          setParsedTags(
            data.filter
              ? filterTags(data.filter).filter((t) => !tags.includes(t))
              : [],
          );
          setFilterNotes(data.filter ? filterToNotes(data.filter) : []);
          replaceResults(
            (data.cards ?? []).map((c) => searchResultToCardWithSet(c, sets)),
            null,
          );
        } catch {
          if (seq !== requestSeq.current) return;
          setEffectsError("Search request failed");
          replaceResults([], null);
          clearParsed();
        }
      });
    },
    [activeSetId, tradeableOnly, sets, replaceResults, clearParsed],
  );

  const handleSearchChange = useCallback(
    (query: string) => {
      setSearchQuery(query);
      // A new query brings back every tag it parses to.
      setExcludedTags([]);
      if (searchMode === "name") {
        runNameSearch(query);
      } else {
        runEffectsSearch(query, selectedTags, tagMode);
      }
    },
    [searchMode, selectedTags, tagMode, runNameSearch, runEffectsSearch],
  );

  const handleTagsChange = useCallback(
    (tags: string[]) => {
      setSelectedTags(tags);
      runEffectsSearch(searchQuery, tags, tagMode, excludedTags);
    },
    [searchQuery, tagMode, excludedTags, runEffectsSearch],
  );

  const handleTagModeChange = useCallback(
    (next: TagMode) => {
      setTagMode(next);
      runEffectsSearch(searchQuery, selectedTags, next, excludedTags);
    },
    [searchQuery, selectedTags, excludedTags, runEffectsSearch],
  );

  const handleRemoveParsedTag = useCallback(
    (tag: string) => {
      // Dismissing the query's last constraint leaves nothing to search for,
      // so drop the query instead of listing every card.
      if (parsedTags.length === 1 && filterNotes.length === 0) {
        setSearchQuery("");
        setExcludedTags([]);
        runEffectsSearch("", selectedTags, tagMode);
        return;
      }
      const exclude = [...excludedTags, tag];
      setExcludedTags(exclude);
      runEffectsSearch(searchQuery, selectedTags, tagMode, exclude);
    },
    [
      parsedTags,
      filterNotes,
      excludedTags,
      searchQuery,
      selectedTags,
      tagMode,
      runEffectsSearch,
    ],
  );

  const handleClearFilters = useCallback(() => {
    setSearchQuery("");
    setSelectedTags([]);
    setExcludedTags([]);
    clearParsed();
    setEffectsError(null);
    loadSet(activeSetId);
  }, [activeSetId, loadSet, clearParsed]);

  const handleModeChange = useCallback(
    (next: SearchMode) => {
      setSearchMode(next);
      setSearchQuery("");
      setSelectedTags([]);
      setExcludedTags([]);
      clearParsed();
      setEffectsError(null);
      loadSet(activeSetId);
    },
    [activeSetId, loadSet, clearParsed],
  );

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
        key={searchMode}
        value={searchQuery}
        onChange={handleSearchChange}
        mode={searchMode}
        onModeChange={handleModeChange}
        showModes={showSearchModes}
      />

      {searchMode === "effects" ? (
        <div className="space-y-3">
          <TagFilter
            selected={selectedTags}
            onChange={handleTagsChange}
            mode={tagMode}
            onModeChange={handleTagModeChange}
          />
          <ActiveFilters
            picked={selectedTags}
            parsed={parsedTags}
            notes={filterNotes}
            onRemovePicked={(tag) =>
              handleTagsChange(selectedTags.filter((t) => t !== tag))
            }
            onRemoveParsed={handleRemoveParsedTag}
            onClearAll={handleClearFilters}
          />
        </div>
      ) : null}

      {mode === "select" ? (
        <SelectionModeToggle
          mode={selection.selectionMode}
          onModeChange={selection.setSelectionMode}
          selectedCards={selection.selectedCards}
        />
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
        <p className="text-muted-foreground text-sm" aria-live="polite">
          {searchMode === "name"
            ? `Searching names for “${searchQuery}”`
            : searchQuery
              ? `Searching effects for “${searchQuery}”`
              : selectedTags.length === 1
                ? "Filtering by 1 tag"
                : `Filtering by ${selectedTags.length} tags · matching ${tagMode === "all" ? "all of them" : "any of them"}`}
          {searchMode === "effects" && !isPending
            ? ` · ${cards.length === 1 ? "1 card" : `${cards.length} cards`}`
            : null}
        </p>
      ) : null}

      {effectsError ? (
        <p className="text-destructive text-sm">{effectsError}</p>
      ) : null}

      {searchMode === "effects" &&
      isSearching &&
      !isPending &&
      !effectsError &&
      cards.length === 0 ? (
        <NoMatches
          tagCount={selectedTags.length}
          tagMode={tagMode}
          hasQuery={searchQuery.length > 0}
          onMatchAny={() => handleTagModeChange("any")}
          onClearFilters={handleClearFilters}
        />
      ) : (
      <CardGrid
        key={`${activeSetId}-${searchQuery}-${searchMode}-${selectedTags.join(",")}-${tagMode}-${resultsEpoch}`}
        initialCards={cards}
        initialCursor={isSearching && searchMode === "effects" ? null : cursor}
        setId={isSearching ? undefined : activeSetId}
        searchQuery={searchQuery}
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
      )}

      {mode === "view" ? (
        <CardDetailSheet
          open={detail.open}
          onOpenChange={detail.onOpenChange}
          detail={detail.detail}
          loading={detail.loading}
          error={detail.error}
          signedOut={detail.signedOut}
          shareUrl={detail.shareUrl}
        />
      ) : null}
    </div>
  );
}
