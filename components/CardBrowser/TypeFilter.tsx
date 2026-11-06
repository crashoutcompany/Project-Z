"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { ENERGY_TYPES, type EnergyType } from "@/lib/search/tags";
import { TYPE_INFO } from "./type-info";
import type { TypeFilterProps } from "./types";

/**
 * The official TCG Energy symbol for a Pokémon type. Decorative by default:
 * the control around it carries the name.
 */
export function TypeIcon({
  type,
  className,
  label = false,
}: {
  type: EnergyType;
  className?: string;
  /** Announce the type name (when nothing else names it). */
  label?: boolean;
}) {
  const { icon, label: name } = TYPE_INFO[type];
  return (
    <Image
      src={icon}
      alt={label ? name : ""}
      aria-hidden={label ? undefined : true}
      title={label ? name : undefined}
      width={64}
      height={64}
      unoptimized
      draggable={false}
      className={cn(
        "size-6 shrink-0 rounded-full shadow-xs select-none",
        className,
      )}
    />
  );
}

/**
 * One toggle per Pokémon type, multi-select. A card matches when either of
 * its types is picked; the picked types show as pills in ActiveFilters.
 * `grid` lays them out with names, for the mobile filter sheet.
 */
export function TypeFilter({
  selected,
  onChange,
  disabled,
  layout = "bar",
}: TypeFilterProps) {
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
      className={cn(
        layout === "grid"
          ? "grid grid-cols-5 gap-1"
          : "flex flex-wrap items-center gap-0.5",
      )}
    >
      {ENERGY_TYPES.map((type) => {
        const on = selectedSet.has(type);
        const { label } = TYPE_INFO[type];
        return (
          <button
            key={type}
            type="button"
            aria-pressed={on}
            aria-label={label}
            title={label}
            disabled={disabled}
            onClick={() => toggle(type)}
            className={cn(
              "inline-flex items-center justify-center rounded-full transition-[background-color,box-shadow,opacity,transform] duration-120 ease-out outline-none active:scale-[0.94] motion-reduce:active:scale-100",
              "focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:opacity-50",
              layout === "grid"
                ? "min-h-11 flex-col gap-1 rounded-xl px-1 py-2"
                : "size-10 pointer-coarse:size-11",
              on
                ? "bg-primary/10 ring-primary ring-2 ring-inset"
                : "hover:bg-muted",
            )}
          >
            <TypeIcon
              type={type}
              className={cn(
                layout === "grid" ? "size-8" : "size-7",
                "transition-[opacity,filter] duration-120",
                selected.length > 0 && !on && "opacity-45 saturate-50",
              )}
            />
            {layout === "grid" ? (
              <span
                aria-hidden
                className={cn(
                  "text-[11px] leading-none font-medium",
                  on ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {label}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
