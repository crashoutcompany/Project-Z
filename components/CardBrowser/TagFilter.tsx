"use client";

import { useId, useState } from "react";
import { ChevronDown, Tags, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ALL_TAGS, TAG_GROUPS, TAG_INFO, type Tag } from "@/lib/search/tags";
import type { TagFilterProps } from "./types";

const TAGS_BY_GROUP = TAG_GROUPS.map((group) => ({
  group,
  tags: ALL_TAGS.filter((tag) => TAG_INFO[tag].group === group),
})).filter((g) => g.tags.length > 0);

// Shared by every pressable in this filter: 120ms feedback, a press scale and
// 44px targets on touch screens.
const pressable =
  "transition-[background-color,color,box-shadow,transform] duration-120 ease-out active:scale-[0.97] motion-reduce:active:scale-100 pointer-coarse:min-h-11";

export function TagFilter({ selected, onChange, disabled }: TagFilterProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const selectedSet = new Set<string>(selected);

  const toggle = (tag: Tag) => {
    onChange(
      selectedSet.has(tag)
        ? selected.filter((t) => t !== tag)
        : [...selected, tag],
    );
  };

  return (
    <div className="space-y-2" data-testid="tag-filter">
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((v) => !v)}
          className={cn(
            "bg-card/80 text-foreground inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-sm font-medium ring-1 ring-foreground/10",
            "hover:bg-muted focus-visible:ring-ring/50 outline-none focus-visible:ring-[3px]",
            pressable,
          )}
        >
          <Tags className="size-4" aria-hidden />
          Tags
          {selected.length > 0 ? (
            <span className="bg-primary text-primary-foreground rounded-full px-1.5 text-xs tabular-nums">
              {selected.length}
            </span>
          ) : null}
          <ChevronDown
            className={cn(
              "text-muted-foreground size-4 transition-transform duration-120 ease-out motion-reduce:transition-none",
              open && "rotate-180",
            )}
            aria-hidden
          />
        </button>

        {selected.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => onChange(selected.filter((t) => t !== tag))}
            disabled={disabled}
            aria-label={`Remove tag: ${TAG_INFO[tag as Tag]?.label ?? tag}`}
            className={cn(
              "bg-primary text-primary-foreground inline-flex h-8 items-center gap-1 rounded-full pr-2 pl-3 text-xs font-medium",
              "hover:bg-primary/85 focus-visible:ring-ring/50 outline-none focus-visible:ring-[3px] disabled:opacity-50",
              pressable,
            )}
          >
            {TAG_INFO[tag as Tag]?.label ?? tag}
            <X className="size-3.5" aria-hidden />
          </button>
        ))}

        {selected.length > 1 ? (
          <button
            type="button"
            onClick={() => onChange([])}
            disabled={disabled}
            className={cn(
              "text-muted-foreground hover:text-foreground inline-flex h-8 items-center rounded-md px-2 text-xs underline-offset-4 hover:underline",
              "focus-visible:ring-ring/50 outline-none focus-visible:ring-[3px]",
              pressable,
            )}
          >
            Clear all
          </button>
        ) : null}
      </div>

      {open ? (
        <div
          id={panelId}
          className="bg-card/80 catalog-results space-y-3 rounded-xl p-3 shadow-xs ring-1 ring-foreground/10 backdrop-blur-sm"
        >
          {TAGS_BY_GROUP.map(({ group, tags }) => (
            <fieldset key={group} className="space-y-1.5">
              <legend className="text-muted-foreground mb-1.5 text-xs font-medium tracking-wide uppercase">
                {group}
              </legend>
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag) => {
                  const active = selectedSet.has(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      aria-pressed={active}
                      onClick={() => toggle(tag)}
                      disabled={disabled}
                      className={cn(
                        "inline-flex h-8 items-center rounded-full px-3 text-xs font-medium ring-1",
                        "focus-visible:ring-ring/50 outline-none focus-visible:ring-[3px] disabled:opacity-50",
                        pressable,
                        active
                          ? "bg-primary text-primary-foreground ring-transparent hover:bg-primary/85"
                          : "bg-background text-foreground ring-foreground/10 hover:bg-muted",
                      )}
                    >
                      {TAG_INFO[tag].label}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          ))}
        </div>
      ) : null}
    </div>
  );
}
