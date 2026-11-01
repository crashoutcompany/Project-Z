"use client";

import { Crown, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import { getRarityInfo, RARITY_CODES } from "@/lib/rarity";
import type { DuplicatesToggleProps, RarityFilterProps } from "./types";

/** The rarity mark printed in a card's bottom-left corner. */
export function RaritySymbol({
  rarity,
  className,
}: {
  rarity: string;
  className?: string;
}) {
  const info = getRarityInfo(rarity);
  return (
    <span
      className={cn("inline-flex items-center leading-none", className)}
      aria-hidden
    >
      {info.code === "UR" ? (
        <Crown className="size-3.5" strokeWidth={2.5} />
      ) : (
        info.symbol
      )}
    </span>
  );
}

/**
 * One toggle per rarity, multi-select. A card matches when it has any picked
 * rarity; with duplicates hidden that picks the lowest copy within them.
 */
export function RarityFilter({
  selected,
  onChange,
  disabled,
}: RarityFilterProps) {
  const selectedSet = new Set(selected);

  const toggle = (code: string) => {
    onChange(
      selectedSet.has(code)
        ? selected.filter((r) => r !== code)
        : [...selected, code],
    );
  };

  return (
    <div
      role="group"
      aria-label="Filter by rarity"
      data-testid="rarity-filter"
      className="flex flex-wrap items-center gap-1"
    >
      {RARITY_CODES.map((code) => {
        const on = selectedSet.has(code);
        const { name } = getRarityInfo(code);
        return (
          <button
            key={code}
            type="button"
            aria-pressed={on}
            aria-label={name}
            title={name}
            disabled={disabled}
            onClick={() => toggle(code)}
            className={cn(
              "pointer-coarse:h-11 inline-flex h-9 min-w-9 items-center justify-center rounded-full px-2.5 text-xs font-semibold outline-none transition-[background-color,box-shadow,opacity,transform] duration-120 ease-out active:scale-[0.94] motion-reduce:active:scale-100",
              "focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:opacity-50",
              on
                ? "bg-primary/10 ring-primary ring-2 ring-inset"
                : "hover:bg-muted",
              selected.length > 0 && !on && "text-muted-foreground",
            )}
          >
            <RaritySymbol rarity={code} />
          </button>
        );
      })}
    </div>
  );
}

/** Shows every print of a card instead of only its lowest-rarity copy. */
export function DuplicatesToggle({
  pressed,
  onChange,
  disabled,
}: DuplicatesToggleProps) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      disabled={disabled}
      onClick={() => onChange(!pressed)}
      title="Alt arts and reprints of the same card are hidden unless this is on"
      className={cn(
        "pointer-coarse:h-11 inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-medium outline-none transition-[background-color,box-shadow,transform] duration-120 ease-out active:scale-[0.97] motion-reduce:active:scale-100",
        "focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:opacity-50",
        pressed
          ? "bg-primary/10 ring-primary ring-2 ring-inset"
          : "ring-foreground/15 hover:bg-muted ring-1 ring-inset",
      )}
    >
      <Layers className="size-4" aria-hidden />
      Show duplicates
    </button>
  );
}
