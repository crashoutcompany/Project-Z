"use client";

import { useState } from "react";
import { ChevronsUpDown, Library } from "lucide-react";
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
import type { SetFilterProps } from "./types";

/** What the trigger says: every set, the one picked, or how many. */
export function setFilterLabel(
  sets: SetFilterProps["sets"],
  selected: number[],
): string {
  if (selected.length === 0) return "All sets";
  if (selected.length === 1) {
    return sets.find((s) => s.id === selected[0])?.setName ?? "1 set";
  }
  return `${selected.length} sets`;
}

/**
 * Searchable multi-select of every set, newest first. Nothing picked means
 * every set. It narrows browsing and both kinds of search alike.
 */
export function SetFilter({
  sets,
  selected,
  onChange,
  disabled,
  className,
}: SetFilterProps) {
  const [open, setOpen] = useState(false);
  const selectedSet = new Set(selected);
  const newestFirst = [...sets].reverse();

  const toggle = (id: number) => {
    onChange(
      selectedSet.has(id)
        ? selected.filter((s) => s !== id)
        : [...selected, id],
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            role="combobox"
            aria-label="Filter by set"
            disabled={disabled}
            className={cn(
              "h-10 max-w-64 min-w-0 gap-2 rounded-lg px-3 pointer-coarse:h-11",
              className,
            )}
          />
        }
      >
        <Library aria-hidden />
        <span className="truncate">{setFilterLabel(sets, selected)}</span>
        <ChevronsUpDown className="text-muted-foreground ml-auto" aria-hidden />
      </PopoverTrigger>
      <PopoverContent
        align="start"
        collisionPadding={8}
        className="max-h-(--available-height) w-[min(22rem,calc(100vw-2rem))] gap-0 overflow-hidden p-0"
      >
        <Command className="min-h-0 flex-1">
          <CommandInput placeholder="Search sets…" />
          <CommandList className="max-h-80 min-h-0 flex-1">
            <CommandEmpty>No sets found.</CommandEmpty>
            <CommandGroup>
              {newestFirst.map((set) => (
                <CommandItem
                  key={set.id}
                  value={String(set.id)}
                  keywords={[set.setName, set.code]}
                  data-checked={selectedSet.has(set.id)}
                  onSelect={() => toggle(set.id)}
                  className="min-h-9 pointer-coarse:min-h-11"
                >
                  <span className="text-muted-foreground w-10 shrink-0 font-mono text-[11px]">
                    {set.code}
                  </span>
                  <span className="truncate">{set.setName}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
        <div className="flex shrink-0 items-center justify-between gap-2 border-t p-2">
          <span className="text-muted-foreground px-1 text-xs tabular-nums">
            {selected.length === 0 ? "All sets" : `${selected.length} selected`}
          </span>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              disabled={selected.length === 0}
              onClick={() => onChange([])}
              className="pointer-coarse:h-11"
            >
              All sets
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
  );
}
