"use client";

import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TagMode } from "./types";

type NoMatchesProps = {
  tagCount: number;
  /** Picked sets, types and rarities. */
  filterCount: number;
  tagMode: TagMode;
  hasQuery: boolean;
  onMatchAny: () => void;
  onClearFilters: () => void;
};

/** No results on either tab: says why and offers a way out. */
export function NoMatches({
  tagCount,
  filterCount,
  tagMode,
  hasQuery,
  onMatchAny,
  onClearFilters,
}: NoMatchesProps) {
  const canWiden = tagMode === "all" && tagCount > 1;

  return (
    <div
      role="status"
      className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed px-6 py-14 text-center"
    >
      <div className="bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-full">
        <SearchX className="size-6" aria-hidden />
      </div>
      <div className="max-w-sm space-y-1.5">
        <p className="text-foreground font-medium">
          No cards match these filters
        </p>
        <p className="text-muted-foreground text-sm">
          {canWiden
            ? `No card has all ${tagCount} tags. Match any of them instead, or remove a tag.`
            : hasQuery
              ? "Try removing a filter or rewording your search."
              : "Try removing a filter."}
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {canWiden ? (
          <Button
            onClick={onMatchAny}
            className="h-10 px-4 pointer-coarse:h-11"
          >
            Match any tag
          </Button>
        ) : null}
        {hasQuery || tagCount + filterCount > 0 ? (
          <Button
            variant="outline"
            onClick={onClearFilters}
            className="h-10 px-4 pointer-coarse:h-11"
          >
            Clear filters
          </Button>
        ) : null}
      </div>
    </div>
  );
}
