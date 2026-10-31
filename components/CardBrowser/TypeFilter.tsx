"use client";

import { cn } from "@/lib/utils";
import { ENERGY_TYPES, type EnergyType } from "@/lib/search/tags";
import { TYPE_INFO } from "./type-info";
import type { TypeFilterProps } from "./types";

/** A round Energy-style symbol for a Pokémon type. */
export function TypeIcon({
  type,
  className,
}: {
  type: EnergyType;
  className?: string;
}) {
  const { icon: Icon, className: colors } = TYPE_INFO[type];
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex size-6 shrink-0 items-center justify-center rounded-full shadow-xs",
        colors,
        className,
      )}
    >
      <Icon className="size-3.5" strokeWidth={2.5} />
    </span>
  );
}

/**
 * One toggle per Pokémon type, multi-select. A card matches when either of
 * its types is picked; the picked types show as pills in ActiveFilters.
 */
export function TypeFilter({ selected, onChange, disabled }: TypeFilterProps) {
  const selectedSet = new Set<string>(selected);

  const toggle = (type: EnergyType) => {
    onChange(
      selectedSet.has(type)
        ? selected.filter((t) => t !== type)
        : [...selected, type],
    );
  };

  return (
    <div
      role="group"
      aria-label="Filter by type"
      data-testid="type-filter"
      className="flex flex-wrap items-center gap-1"
    >
      {ENERGY_TYPES.map((type) => {
        const on = selectedSet.has(type);
        return (
          <button
            key={type}
            type="button"
            aria-pressed={on}
            aria-label={TYPE_INFO[type].label}
            title={TYPE_INFO[type].label}
            disabled={disabled}
            onClick={() => toggle(type)}
            className={cn(
              "pointer-coarse:size-11 inline-flex size-9 items-center justify-center rounded-full outline-none transition-[background-color,box-shadow,opacity,transform] duration-120 ease-out active:scale-[0.94] motion-reduce:active:scale-100",
              "focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:opacity-50",
              on
                ? "bg-primary/10 ring-primary ring-2 ring-inset"
                : "hover:bg-muted",
            )}
          >
            <TypeIcon
              type={type}
              className={cn(
                "transition-[opacity,filter] duration-120",
                selected.length > 0 && !on && "opacity-45 saturate-50",
              )}
            />
          </button>
        );
      })}
    </div>
  );
}
