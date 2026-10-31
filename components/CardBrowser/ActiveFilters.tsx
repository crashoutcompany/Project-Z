"use client";

import { Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { tagLabel } from "@/lib/search/tags";
import { TypeIcon } from "./TypeFilter";
import { isEnergyType, typeLabel } from "./type-info";
import type { ActiveFiltersProps } from "./types";

// Pills are 36px tall, 44px on touch screens, with 8px between them.
const pill =
  "inline-flex h-9 pointer-coarse:h-11 items-center gap-1.5 rounded-full pl-3.5 pr-2.5 text-sm font-medium outline-none transition-[background-color,color,box-shadow,transform] duration-120 ease-out active:scale-[0.97] motion-reduce:active:scale-100 focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50";

/**
 * Everything currently narrowing an effects search, under the search bar:
 * tags picked from the list, picked Pokémon types, tags parsed from the typed
 * query (all removable) and the query's other parsed constraints (read-only).
 */
export function ActiveFilters({
  picked,
  types,
  parsed,
  notes,
  onRemovePicked,
  onRemoveType,
  onRemoveParsed,
  onClearAll,
  disabled,
}: ActiveFiltersProps) {
  const removable = picked.length + types.length + parsed.length;
  if (removable + notes.length === 0) return null;

  return (
    <div
      role="group"
      aria-label="Active filters"
      className="flex flex-wrap items-center gap-2"
    >
      {picked.map((tag) => (
        <button
          key={`picked-${tag}`}
          type="button"
          onClick={() => onRemovePicked(tag)}
          disabled={disabled}
          aria-label={`Remove tag: ${tagLabel(tag)}`}
          className={cn(
            pill,
            "bg-primary text-primary-foreground hover:bg-primary/85 shadow-xs",
          )}
        >
          <span>{tagLabel(tag)}</span>
          <X className="size-4 opacity-80" aria-hidden />
        </button>
      ))}

      {types.map((type) => (
        <button
          key={`type-${type}`}
          type="button"
          onClick={() => onRemoveType(type)}
          disabled={disabled}
          aria-label={`Remove type: ${typeLabel(type)}`}
          className={cn(
            pill,
            "bg-secondary text-secondary-foreground hover:bg-secondary/70 ring-foreground/10 pl-1.5 ring-1 ring-inset",
          )}
        >
          {isEnergyType(type) ? <TypeIcon type={type} /> : null}
          <span>{typeLabel(type)}</span>
          <X className="text-muted-foreground size-4" aria-hidden />
        </button>
      ))}

      {parsed.map((tag) => (
        <button
          key={`parsed-${tag}`}
          type="button"
          onClick={() => onRemoveParsed(tag)}
          disabled={disabled}
          title="From your search"
          aria-label={`Remove tag from your search: ${tagLabel(tag)}`}
          className={cn(
            pill,
            "bg-primary/10 text-foreground ring-primary/50 hover:bg-primary/20 ring-1 ring-inset",
          )}
        >
          <Sparkles className="text-primary size-3.5" aria-hidden />
          <span>{tagLabel(tag)}</span>
          <X className="text-muted-foreground size-4" aria-hidden />
        </button>
      ))}

      {notes.map((note) => (
        <span
          key={`note-${note}`}
          className="bg-secondary text-secondary-foreground inline-flex h-7 items-center rounded-full px-2.5 text-xs"
        >
          {note}
        </span>
      ))}

      {removable > 0 ? (
        <button
          type="button"
          onClick={onClearAll}
          disabled={disabled}
          className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 pointer-coarse:h-11 inline-flex h-9 items-center rounded-md px-2.5 text-sm font-medium underline-offset-4 outline-none hover:underline focus-visible:ring-[3px] disabled:opacity-50"
        >
          Clear all
        </button>
      ) : null}
    </div>
  );
}
