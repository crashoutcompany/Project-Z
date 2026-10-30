"use client";

import { useState } from "react";
import { ChevronsUpDown, Tags } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { ALL_TAGS, TAG_GROUPS, TAG_INFO, type Tag } from "@/lib/search/tags";
import type { TagFilterProps, TagMode } from "./types";

const TAGS_BY_GROUP = TAG_GROUPS.map((group) => ({
  group,
  tags: ALL_TAGS.filter((tag) => TAG_INFO[tag].group === group),
})).filter((g) => g.tags.length > 0);

const MODES: { value: TagMode; label: string; hint: string }[] = [
  { value: "all", label: "All", hint: "Cards must have every selected tag" },
  { value: "any", label: "Any", hint: "Cards need at least one selected tag" },
];

/** Searchable multi-select of every tag, grouped, plus the AND/OR switch. */
export function TagFilter({
  selected,
  onChange,
  mode,
  onModeChange,
  disabled,
}: TagFilterProps) {
  const [open, setOpen] = useState(false);
  const selectedSet = new Set<string>(selected);

  const toggle = (tag: Tag) => {
    onChange(
      selectedSet.has(tag)
        ? selected.filter((t) => t !== tag)
        : [...selected, tag],
    );
  };

  return (
    <div className="flex flex-wrap items-center gap-2" data-testid="tag-filter">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              variant="outline"
              role="combobox"
              aria-label="Filter by tags"
              disabled={disabled}
              className="pointer-coarse:h-11 h-9 gap-2 rounded-lg px-3"
            />
          }
        >
          <Tags aria-hidden />
          Tags
          {selected.length > 0 ? (
            <span className="bg-primary text-primary-foreground rounded-full px-1.5 text-xs tabular-nums">
              {selected.length}
            </span>
          ) : null}
          <ChevronsUpDown className="text-muted-foreground" aria-hidden />
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-[min(22rem,calc(100vw-2rem))] gap-0 p-0"
        >
          <Command>
            <CommandInput placeholder="Search tags…" />
            <CommandList className="max-h-[min(20rem,50dvh)]">
              <CommandEmpty>No tags found.</CommandEmpty>
              {TAGS_BY_GROUP.map(({ group, tags }) => (
                <CommandGroup key={group} heading={group}>
                  {tags.map((tag) => (
                    <CommandItem
                      key={tag}
                      value={tag}
                      keywords={[TAG_INFO[tag].label, group]}
                      data-checked={selectedSet.has(tag)}
                      onSelect={() => toggle(tag)}
                      className="pointer-coarse:min-h-11 min-h-9"
                    >
                      {TAG_INFO[tag].label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}
            </CommandList>
          </Command>
          <div className="flex items-center justify-between gap-2 border-t p-2">
            <span className="text-muted-foreground px-1 text-xs tabular-nums">
              {selected.length} selected
            </span>
            <div className="flex gap-1">
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
          </div>
        </PopoverContent>
      </Popover>

      {selected.length > 1 ? (
        <div
          role="radiogroup"
          aria-label="Match selected tags"
          className="bg-muted flex items-center rounded-lg p-0.5"
        >
          <span className="text-muted-foreground px-2 text-xs font-medium">
            Match
          </span>
          {MODES.map(({ value, label, hint }) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={mode === value}
              title={hint}
              disabled={disabled}
              onClick={() => onModeChange(value)}
              className={cn(
                "pointer-coarse:h-10 h-8 rounded-md px-3 text-sm font-medium transition-[background-color,color,box-shadow] duration-150 ease-out",
                "focus-visible:ring-ring/50 outline-none focus-visible:ring-[3px] disabled:opacity-50",
                mode === value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
              <span className="sr-only"> tags</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
