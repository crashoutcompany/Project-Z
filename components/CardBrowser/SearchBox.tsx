"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Search, X } from "lucide-react";
import type { SearchBoxProps, SearchMode } from "./types";

export type { SearchMode, SearchBoxProps };

export function SearchBox({
  value,
  onChange,
  mode,
  onModeChange,
  placeholder,
  filterChips = [],
  showModes = true,
}: SearchBoxProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const onChangeRef = useRef(onChange);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [localValue, setLocalValue] = useState(value);
  const [seenMode, setSeenMode] = useState(mode);
  const [seenValue, setSeenValue] = useState(value);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  if (mode !== seenMode || value !== seenValue) {
    setSeenMode(mode);
    setSeenValue(value);
    setLocalValue(value);
  }

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  const switchMode = (next: SearchMode) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    if (next !== mode) setLocalValue("");
    onModeChange(next);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    setLocalValue(next);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      onChangeRef.current(next);
    }, 300);
  };

  const handleClear = () => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    setLocalValue("");
    onChange("");
  };

  const resolvedPlaceholder =
    placeholder ??
    (mode === "name"
      ? "Search by name..."
      : "Search by effect (e.g. coin flip, bench damage)...");

  return (
    <div className="w-full space-y-2">
      <div className="bg-card/80 flex items-center gap-2 rounded-xl p-1 shadow-xs ring-1 ring-foreground/10 backdrop-blur-sm">
        {showModes ? (
          <div className="bg-muted flex shrink-0 rounded-lg p-0.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => switchMode("name")}
              className={cn(
                "rounded-md px-3 transition-[background-color,color,box-shadow] duration-150 ease-out",
                mode === "name" &&
                  "bg-background text-foreground shadow-sm hover:bg-background",
              )}
            >
              Name
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => switchMode("effects")}
              className={cn(
                "rounded-md px-3 transition-[background-color,color,box-shadow] duration-150 ease-out",
                mode === "effects" &&
                  "bg-background text-foreground shadow-sm hover:bg-background",
              )}
            >
              Effects
            </Button>
          </div>
        ) : null}

        <div className="relative min-w-0 flex-1">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2" />
          <Input
            ref={inputRef}
            type="search"
            placeholder={resolvedPlaceholder}
            value={localValue}
            onChange={handleChange}
            className="h-10 border-0 bg-transparent pr-9 pl-8 shadow-none focus-visible:ring-0 dark:bg-transparent"
            autoCorrect="off"
            autoComplete="off"
          />
          {localValue ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="absolute top-1/2 right-1 h-7 w-7 -translate-y-1/2 p-0"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Clear search</span>
            </Button>
          ) : null}
        </div>
      </div>

      {mode === "effects" && filterChips.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {filterChips.map((chip) => (
            <span
              key={chip}
              className="bg-secondary text-secondary-foreground rounded-full px-2.5 py-0.5 text-xs"
            >
              {chip}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
