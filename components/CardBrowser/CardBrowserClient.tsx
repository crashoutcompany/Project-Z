"use client";

import { useCallback, useRef, useState, useTransition } from "react";
import { Set } from "@/prisma/generated/client/client";
import { fetchCards } from "@/server/actions";
import { CardGrid } from "./CardGrid";
import { SearchBox, type SearchMode } from "./SearchBox";
import { SetTabs } from "./SetTabs";
import { TagFilter } from "./TagFilter";
import { TypeFilter, typeLabel } from "./TypeFilter";
import { ActiveFilters } from "./ActiveFilters";
import { NoMatches } from "./NoMatches";
import {
  CardBrowserMode,
  CardWithSet,
  SelectedCards,
  SelectionMode,
  TagMode,
} from "./types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { FilterJSON, SearchCardResult } from "@/lib/search";
import { filterTags } from "@/lib/search/filter-tags";

const PAGE_SIZE = 60;

type EffectsRequest = {
  query: string;
  tags: string[];
  matchMode: TagMode;
  types: string[];
  /** Parsed tags the user dismissed. */
  exclude: string[];
};

type EffectsResponse = {
  error?: string;
  filter?: FilterJSON;
  cards?: SearchCardResult[];
  total?: number;
  usedFallback?: boolean;
};

function postEffectsSearch(
  req: EffectsRequest,
  tradeableOnly: boolean,
  offset: number,
) {
  return fetch("/api/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: req.query,
      limit: PAGE_SIZE,
      tradeableOnly,
      ...(offset ? { offset } : {}),
      ...(req.tags.length ? { tags: req.tags, tagMode: req.matchMode } : {}),
      ...(req.types.length ? { types: req.types } : {}),
      ...(req.query && req.exclude.length ? { excludeTags: req.exclude } : {}),
    }),
  });
}

/** Offset of the next page, or null when every match is loaded. */
function nextOffset(offset: number, received: number, total: number) {
  const next = offset + received;
  return received > 0 && next < total ? next : null;
}

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
};

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

/** What an effects search is narrowed by, e.g. "Filtering by 2 tags · Grass". */
function effectsSummary(
  query: string,
  tagCount: number,
  tagMode: TagMode,
  types: string[],
): string {
  if (query) return `Searching effects for “${query}”`;
  const parts: string[] = [];
  if (tagCount === 1) parts.push("1 tag");
  if (tagCount > 1) {
    parts.push(
      `${tagCount} tags · matching ${tagMode === "all" ? "all of them" : "any of them"}`,
    );
  }
  if (types.length) parts.push(types.map(typeLabel).join(" or "));
  return `Filtering by ${parts.join(" · ")}`;
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
  initialSelected = { want: [], give: [] },
  selected,
  onCardClick,
  cardCounts,
  interactive = true,
}: CardBrowserClientProps) {
  const [activeSetId, setActiveSetId] = useState(initialSetId);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMode, setSearchMode] = useState<SearchMode>(defaultSearchMode);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagMode, setTagMode] = useState<TagMode>("all");
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  // Tags parsed from the typed query, minus any the user dismissed.
  const [parsedTags, setParsedTags] = useState<string[]>([]);
  const [excludedTags, setExcludedTags] = useState<string[]>([]);
  const [filterNotes, setFilterNotes] = useState<string[]>([]);
  const [cards, setCards] = useState<CardWithSet[]>(initialCards);
  const [cursor, setCursor] = useState<number | null>(initialCursor);
  // Effects search: every match, and the request that produced the results
  // (load more repeats it with an offset).
  const [total, setTotal] = useState(0);
  const [effectsRequest, setEffectsRequest] = useState<EffectsRequest | null>(
    null,
  );
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

  const clearParsed = useCallback(() => {
    setParsedTags([]);
    setFilterNotes([]);
  }, []);

  const isSearching =
    searchQuery.length > 0 ||
    (searchMode === "effects" &&
      selectedTags.length + selectedTypes.length > 0);

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
    (req: EffectsRequest) => {
      const seq = ++requestSeq.current;
      startTransition(async () => {
        if (!req.query && req.tags.length + req.types.length === 0) {
          const result = await fetchCards({
            setId: activeSetId,
            tradeableOnly,
          });
          if (seq !== requestSeq.current) return;
          replaceResults(result.cards as CardWithSet[], result.nextCursor);
          setEffectsRequest(null);
          clearParsed();
          setEffectsError(null);
          return;
        }

        try {
          const res = await postEffectsSearch(req, tradeableOnly, 0);
          const data = (await res.json()) as EffectsResponse;
          if (seq !== requestSeq.current) return;
          if (!res.ok) {
            setEffectsError(data.error ?? "Search failed");
            replaceResults([], null);
            setEffectsRequest(null);
            clearParsed();
            return;
          }
          setEffectsError(null);
          setParsedTags(
            data.filter
              ? filterTags(data.filter).filter((t) => !req.tags.includes(t))
              : [],
          );
          setFilterNotes(data.filter ? filterToNotes(data.filter) : []);
          const found = data.cards ?? [];
          const matches = data.total ?? found.length;
          setTotal(matches);
          setEffectsRequest(req);
          replaceResults(
            found.map((c) => searchResultToCardWithSet(c, sets)),
            nextOffset(0, found.length, matches),
          );
        } catch {
          if (seq !== requestSeq.current) return;
          setEffectsError("Search request failed");
          replaceResults([], null);
          setEffectsRequest(null);
          clearParsed();
        }
      });
    },
    [activeSetId, tradeableOnly, sets, replaceResults, clearParsed],
  );

  const loadEffectsPage = useCallback(
    async (offset: number) => {
      if (!effectsRequest) return { cards: [], nextOffset: null };
      const res = await postEffectsSearch(effectsRequest, tradeableOnly, offset);
      const data = (await res.json()) as EffectsResponse;
      if (!res.ok) return { cards: [], nextOffset: null };
      const found = data.cards ?? [];
      return {
        cards: found.map((c) => searchResultToCardWithSet(c, sets)),
        nextOffset: nextOffset(offset, found.length, data.total ?? 0),
      };
    },
    [effectsRequest, tradeableOnly, sets],
  );

  const handleSearchChange = useCallback(
    (query: string) => {
      setSearchQuery(query);
      // A new query brings back every tag it parses to.
      setExcludedTags([]);
      if (searchMode === "name") {
        runNameSearch(query);
      } else {
        runEffectsSearch({
          query,
          tags: selectedTags,
          matchMode: tagMode,
          types: selectedTypes,
          exclude: [],
        });
      }
    },
    [
      searchMode,
      selectedTags,
      tagMode,
      selectedTypes,
      runNameSearch,
      runEffectsSearch,
    ],
  );

  const handleTagsChange = useCallback(
    (tags: string[]) => {
      setSelectedTags(tags);
      runEffectsSearch({
        query: searchQuery,
        tags,
        matchMode: tagMode,
        types: selectedTypes,
        exclude: excludedTags,
      });
    },
    [searchQuery, tagMode, selectedTypes, excludedTags, runEffectsSearch],
  );

  const handleTypesChange = useCallback(
    (types: string[]) => {
      setSelectedTypes(types);
      runEffectsSearch({
        query: searchQuery,
        tags: selectedTags,
        matchMode: tagMode,
        types,
        exclude: excludedTags,
      });
    },
    [searchQuery, selectedTags, tagMode, excludedTags, runEffectsSearch],
  );

  const handleTagModeChange = useCallback(
    (next: TagMode) => {
      setTagMode(next);
      runEffectsSearch({
        query: searchQuery,
        tags: selectedTags,
        matchMode: next,
        types: selectedTypes,
        exclude: excludedTags,
      });
    },
    [searchQuery, selectedTags, selectedTypes, excludedTags, runEffectsSearch],
  );

  const handleRemoveParsedTag = useCallback(
    (tag: string) => {
      // Dismissing the query's last constraint leaves nothing to search for,
      // so drop the query instead of listing every card.
      if (parsedTags.length === 1 && filterNotes.length === 0) {
        setSearchQuery("");
        setExcludedTags([]);
        runEffectsSearch({
          query: "",
          tags: selectedTags,
          matchMode: tagMode,
          types: selectedTypes,
          exclude: [],
        });
        return;
      }
      const exclude = [...excludedTags, tag];
      setExcludedTags(exclude);
      runEffectsSearch({
        query: searchQuery,
        tags: selectedTags,
        matchMode: tagMode,
        types: selectedTypes,
        exclude,
      });
    },
    [
      parsedTags,
      filterNotes,
      excludedTags,
      searchQuery,
      selectedTags,
      tagMode,
      selectedTypes,
      runEffectsSearch,
    ],
  );

  const handleClearFilters = useCallback(() => {
    setSearchQuery("");
    setSelectedTags([]);
    setSelectedTypes([]);
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
      setSelectedTypes([]);
      setExcludedTags([]);
      clearParsed();
      setEffectsError(null);
      loadSet(activeSetId);
    },
    [activeSetId, loadSet, clearParsed],
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
        showModes={showSearchModes}
      />

      {searchMode === "effects" ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <TagFilter
              selected={selectedTags}
              onChange={handleTagsChange}
              mode={tagMode}
              onModeChange={handleTagModeChange}
            />
            <TypeFilter selected={selectedTypes} onChange={handleTypesChange} />
          </div>
          <ActiveFilters
            picked={selectedTags}
            types={selectedTypes}
            parsed={parsedTags}
            notes={filterNotes}
            onRemovePicked={(tag) =>
              handleTagsChange(selectedTags.filter((t) => t !== tag))
            }
            onRemoveType={(type) =>
              handleTypesChange(selectedTypes.filter((t) => t !== type))
            }
            onRemoveParsed={handleRemoveParsedTag}
            onClearAll={handleClearFilters}
          />
        </div>
      ) : null}

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
        <p className="text-muted-foreground text-sm" aria-live="polite">
          {searchMode === "name"
            ? `Searching names for “${searchQuery}”`
            : effectsSummary(searchQuery, selectedTags.length, tagMode, selectedTypes)}
          {searchMode === "effects" && !isPending && !effectsError
            ? ` · ${total === 1 ? "1 card" : `${total.toLocaleString("en-US")} cards`}`
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
          typeCount={selectedTypes.length}
          tagMode={tagMode}
          hasQuery={searchQuery.length > 0}
          onMatchAny={() => handleTagModeChange("any")}
          onClearFilters={handleClearFilters}
        />
      ) : (
      <CardGrid
        key={`${activeSetId}-${searchQuery}-${searchMode}-${selectedTags.join(",")}-${tagMode}-${selectedTypes.join(",")}-${resultsEpoch}`}
        initialCards={cards}
        initialCursor={cursor}
        loadPage={
          isSearching && searchMode === "effects" ? loadEffectsPage : undefined
        }
        total={isSearching && searchMode === "effects" ? total : undefined}
        setId={isSearching ? undefined : activeSetId}
        searchQuery={searchQuery}
        tradeableOnly={tradeableOnly}
        selectable={interactive && (mode === "select" || mode === "build")}
        selectedCards={selectedCards}
        selectionMode={selectionMode}
        density={mode === "build" ? "compact" : "comfortable"}
        cardCounts={cardCounts}
        onCardClick={handleCardClick}
      />
      )}
    </div>
  );
}
