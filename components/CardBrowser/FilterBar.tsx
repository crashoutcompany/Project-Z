"use client";

import type { ReactNode } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { DuplicatesToggle, RarityFilter, RarityOptions } from "./RarityFilter";
import { SetFilter } from "./SetFilter";
import { TagFilter } from "./TagFilter";
import { TypeFilter } from "./TypeFilter";
import type { SearchMode, SetFilterProps, TagMode } from "./types";

export type FilterBarProps = {
  mode: SearchMode;
  sets: SetFilterProps["sets"];
  setIds: number[];
  types: string[];
  rarities: string[];
  showDuplicates: boolean;
  tags: string[];
  tagMode: TagMode;
  onSetsChange: (setIds: number[]) => void;
  onTypesChange: (types: string[]) => void;
  onRaritiesChange: (rarities: string[]) => void;
  onDuplicatesChange: (next: boolean) => void;
  onTagsChange: (tags: string[]) => void;
  onTagModeChange: (mode: TagMode) => void;
  onClearAll: () => void;
  /** Result count, e.g. "1,204 cards"; null while loading. */
  resultLabel: string | null;
  /** The status line, under the bar (beside the Filters button on phones). */
  summary: ReactNode;
};

function FilterSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h3 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        {title}
      </h3>
      {children}
    </section>
  );
}

/**
 * The same filters on both tabs: type, rarity, set and duplicates, plus tags
 * on Effects (last, so nothing shifts when it appears). Wide browsers get an
 * inline bar; narrow ones (phones, by the browser's own width) get a Filters
 * button that opens them in a bottom sheet.
 */
export function FilterBar(props: FilterBarProps) {
  const {
    mode,
    sets,
    setIds,
    types,
    rarities,
    showDuplicates,
    tags,
    tagMode,
    onSetsChange,
    onTypesChange,
    onRaritiesChange,
    onDuplicatesChange,
    onTagsChange,
    onTagModeChange,
    onClearAll,
    resultLabel,
    summary,
  } = props;
  const activeCount =
    setIds.length +
    types.length +
    rarities.length +
    (showDuplicates ? 1 : 0) +
    (mode === "effects" ? tags.length : 0);

  return (
    <>
      <div
        data-testid="filter-bar"
        className="hidden flex-wrap items-center gap-x-3 gap-y-2 @xl/browser:flex"
      >
        <TypeFilter selected={types} onChange={onTypesChange} />
        <div aria-hidden className="bg-border h-6 w-px" />
        <RarityFilter selected={rarities} onChange={onRaritiesChange} />
        <SetFilter sets={sets} selected={setIds} onChange={onSetsChange} />
        <DuplicatesToggle
          pressed={showDuplicates}
          onChange={onDuplicatesChange}
        />
        {/* Name keeps an invisible, inert Tags in its slot so the bar wraps the
            same on both tabs and the results never jump. */}
        <div
          className={mode === "effects" ? "contents" : "invisible"}
          aria-hidden={mode === "effects" ? undefined : true}
          inert={mode !== "effects"}
        >
          <TagFilter
            selected={mode === "effects" ? tags : []}
            onChange={onTagsChange}
            mode={tagMode}
            onModeChange={onTagModeChange}
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Sheet>
          <SheetTrigger
            render={
              <Button
                variant="outline"
                className="h-11 shrink-0 gap-2 rounded-lg px-4 @xl/browser:hidden"
              />
            }
          >
            <SlidersHorizontal aria-hidden />
            Filters
            {activeCount > 0 ? (
              <span className="bg-primary text-primary-foreground rounded-full px-1.5 text-xs tabular-nums">
                {activeCount}
              </span>
            ) : null}
          </SheetTrigger>
          <SheetContent
            side="bottom"
            data-testid="filter-sheet"
            className="max-h-[85dvh] gap-0 rounded-t-2xl"
          >
            <SheetHeader className="border-b">
              <SheetTitle>Filters</SheetTitle>
              <SheetDescription>
                {mode === "effects"
                  ? "Narrow the effects search."
                  : "Narrow the name search."}
              </SheetDescription>
            </SheetHeader>
            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
              <FilterSection title="Type">
                <TypeFilter
                  selected={types}
                  onChange={onTypesChange}
                  layout="grid"
                />
              </FilterSection>
              <FilterSection title="Rarity">
                <RarityOptions
                  selected={rarities}
                  onChange={onRaritiesChange}
                />
              </FilterSection>
              <FilterSection title="Set">
                <SetFilter
                  sets={sets}
                  selected={setIds}
                  onChange={onSetsChange}
                  className="w-full max-w-none"
                />
              </FilterSection>
              {mode === "effects" ? (
                <FilterSection title="Tags">
                  <TagFilter
                    selected={tags}
                    onChange={onTagsChange}
                    mode={tagMode}
                    onModeChange={onTagModeChange}
                  />
                </FilterSection>
              ) : null}
              <DuplicatesToggle
                pressed={showDuplicates}
                onChange={onDuplicatesChange}
              />
            </div>
            <SheetFooter className="flex-row border-t">
              <Button
                variant="ghost"
                onClick={onClearAll}
                disabled={activeCount === 0}
                className="h-11 flex-1"
              >
                Clear all
              </Button>
              <SheetClose render={<Button className="h-11 flex-1" />}>
                {resultLabel ? `Show ${resultLabel}` : "Show results"}
              </SheetClose>
            </SheetFooter>
          </SheetContent>
        </Sheet>
        <div className="min-w-0 flex-1">{summary}</div>
      </div>
    </>
  );
}
