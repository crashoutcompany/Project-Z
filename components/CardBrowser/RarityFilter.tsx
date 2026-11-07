"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronsUpDown, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { getRarityInfo, RARITY_CODES, RARITY_ICON_SRC } from "@/lib/rarity";
import type { DuplicatesToggleProps, RarityFilterProps } from "./types";

// Intrinsic sizes of the mark images, so each keeps its shape at any height.
const MARK_SIZE = {
  diamond: [49, 59],
  star: [69, 58],
  shiny: [82, 82],
  crown: [66, 46],
} as const;

/**
 * The rarity mark printed in a card's bottom-left corner: the official
 * diamond, star, shiny or crown icons, repeated. Decorative; callers name it.
 * Size it with a height class (default 14px).
 */
export function RaritySymbol({
  rarity,
  className,
}: {
  rarity: string;
  className?: string;
}) {
  const info = getRarityInfo(rarity);
  if (!info.mark) {
    return (
      <span
        aria-hidden
        className={cn(
          "inline-flex h-3.5 items-center text-xs leading-none font-semibold",
          className,
        )}
      >
        {info.symbol}
      </span>
    );
  }
  const { icon, count } = info.mark;
  const [width, height] = MARK_SIZE[icon];
  return (
    <span
      aria-hidden
      className={cn("inline-flex h-3.5 shrink-0 items-center", className)}
    >
      {Array.from({ length: count }, (_, i) => (
        <Image
          key={i}
          src={RARITY_ICON_SRC[icon]}
          alt=""
          width={width}
          height={height}
          unoptimized
          draggable={false}
          // Stars overlap a little, the way the game prints them.
          className={cn(
            "h-full w-auto select-none",
            i > 0 && (icon === "diamond" ? "-ml-px" : "-ml-0.5"),
          )}
        />
      ))}
    </span>
  );
}

/**
 * One toggle per rarity, multi-select, each showing its mark and name. A
 * card matches when it has any picked rarity; with duplicates hidden that
 * picks the lowest copy within them.
 */
export function RarityOptions({
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
      className="grid grid-cols-2 gap-1"
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
              "flex min-h-10 items-center gap-2 rounded-lg px-2.5 text-left text-sm transition-[background-color,box-shadow,opacity,transform] duration-120 ease-out outline-none active:scale-[0.97] motion-reduce:active:scale-100 pointer-coarse:min-h-11",
              "focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:opacity-50",
              on
                ? "bg-primary/10 ring-primary ring-2 ring-inset"
                : "hover:bg-muted",
            )}
          >
            <span className="flex w-14 shrink-0 items-center">
              <RaritySymbol
                rarity={code}
                className={cn(
                  "h-4 transition-[opacity,filter] duration-120",
                  selected.length > 0 && !on && "opacity-50 saturate-50",
                )}
              />
            </span>
            <span
              aria-hidden
              className={cn(
                "truncate",
                selected.length > 0 && !on && "text-muted-foreground",
              )}
            >
              {name}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Rarity toggles in a popover, for the filter bar. */
export function RarityFilter(props: RarityFilterProps) {
  const [open, setOpen] = useState(false);
  const { selected, onChange, disabled } = props;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            aria-label="Filter by rarity"
            disabled={disabled}
            className="h-10 gap-2 rounded-lg px-3 pointer-coarse:h-11"
          />
        }
      >
        Rarity
        {selected.length === 1 ? (
          <RaritySymbol rarity={selected[0]!} className="h-4" />
        ) : null}
        {selected.length > 1 ? (
          <span className="bg-primary text-primary-foreground rounded-full px-1.5 text-xs tabular-nums">
            {selected.length}
          </span>
        ) : null}
        <ChevronsUpDown className="text-muted-foreground" aria-hidden />
      </PopoverTrigger>
      <PopoverContent
        align="start"
        collisionPadding={8}
        className="max-h-(--available-height) w-[min(22rem,calc(100vw-2rem))] gap-2 overflow-y-auto p-2"
      >
        <RarityOptions {...props} />
        <div className="flex items-center justify-end gap-1 border-t pt-2">
          <Button
            variant="ghost"
            size="sm"
            disabled={selected.length === 0}
            onClick={() => onChange([])}
            className="pointer-coarse:h-11"
          >
            Clear
          </Button>
          <Button
            size="sm"
            onClick={() => setOpen(false)}
            className="pointer-coarse:h-11"
          >
            Done
          </Button>
        </div>
      </PopoverContent>
    </Popover>
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
        "inline-flex h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-medium whitespace-nowrap transition-[background-color,box-shadow,transform] duration-120 ease-out outline-none active:scale-[0.97] motion-reduce:active:scale-100 pointer-coarse:h-11",
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
