"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Search, X } from "lucide-react";
import type { SearchBoxProps, SearchMode } from "./types";

// The long effects hint needs about this much input width (text, icon and
// clear-button padding) before it clips.
const LONG_HINT_MIN_WIDTH = 400;

export type { SearchMode, SearchBoxProps };

export function SearchBox({
  value,
  onChange,
  mode,
  onModeChange,
  placeholder,
  showModes = true,
  dropdown: dropdownContent,
}: SearchBoxProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const onChangeRef = useRef(onChange);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [localValue, setLocalValue] = useState(value);
  const [seenMode, setSeenMode] = useState(mode);
  const [seenValue, setSeenValue] = useState(value);
  const [roomy, setRoomy] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownId = useId();

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

  // Pick the placeholder by the input's own width, not the viewport: the
  // builder's catalog column is narrow even on desktop.
  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    const observer = new ResizeObserver(([entry]) => {
      setRoomy((entry?.contentRect.width ?? 0) >= LONG_HINT_MIN_WIDTH);
    });
    observer.observe(input);
    return () => observer.disconnect();
  }, []);

  const switchMode = (next: SearchMode) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    setDropdownOpen(false);
    // Each tab keeps its own query: the parent hands back the new tab's.
    onModeChange(next);
  };

  const closeDropdown = () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    setLocalValue(value);
    setDropdownOpen(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    setLocalValue(next);
    // Typing is a new search: get the history out of the way.
    setDropdownOpen(false);
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
      : roomy
        ? "Search by effect (e.g. coin flip, bench damage)..."
        : "Search by effect...");

  const dropdown = dropdownOpen ? dropdownContent : null;

  /** Arrow keys walk the dropdown's entries, starting from the input. */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape" && dropdown) {
      e.preventDefault();
      setDropdownOpen(false);
      inputRef.current?.focus();
      return;
    }
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    const items = Array.from(
      wrapperRef.current?.querySelectorAll<HTMLElement>(
        "[data-history-item]",
      ) ?? [],
    );
    if (!items.length) return;
    e.preventDefault();
    const at = items.indexOf(document.activeElement as HTMLElement);
    if (e.key === "ArrowUp" && at <= 0) {
      inputRef.current?.focus();
      return;
    }
    const next =
      e.key === "ArrowDown" ? Math.min(at + 1, items.length - 1) : at - 1;
    items[next]?.focus();
  };

  return (
    <div
      ref={wrapperRef}
      className="relative w-full"
      onKeyDown={handleKeyDown}
      onBlur={(e) => {
        if (e.relatedTarget) {
          if (!wrapperRef.current?.contains(e.relatedTarget)) {
            setDropdownOpen(false);
          }
          return;
        }
        // No new target: focus left the page, or a focused entry was removed
        // and the dropdown is about to focus another. Check once it settles.
        requestAnimationFrame(() => {
          if (!wrapperRef.current?.contains(document.activeElement)) {
            setDropdownOpen(false);
          }
        });
      }}
    >
      <div className="bg-card/80 ring-foreground/10 flex items-center gap-2 rounded-xl p-1 shadow-xs ring-1 backdrop-blur-sm">
        {showModes ? (
          <div className="bg-muted flex shrink-0 rounded-lg p-0.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => switchMode("name")}
              aria-pressed={mode === "name"}
              className={cn(
                "h-9 rounded-md px-3 transition-[background-color,color,box-shadow] duration-150 ease-out pointer-coarse:h-11",
                mode === "name" &&
                  "bg-background text-foreground hover:bg-background shadow-sm",
              )}
            >
              Name
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => switchMode("effects")}
              aria-pressed={mode === "effects"}
              className={cn(
                "h-9 rounded-md px-3 transition-[background-color,color,box-shadow] duration-150 ease-out pointer-coarse:h-11",
                mode === "effects" &&
                  "bg-background text-foreground hover:bg-background shadow-sm",
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
            onFocus={() => setDropdownOpen(true)}
            onClick={() => setDropdownOpen(true)}
            aria-expanded={dropdownContent ? Boolean(dropdown) : undefined}
            aria-controls={dropdown ? dropdownId : undefined}
            className={cn(
              "h-10 border-0 bg-transparent pl-8 shadow-none focus-visible:ring-0 dark:bg-transparent pointer-coarse:h-11",
              // Room for the clear button only while there is text to clear.
              localValue ? "pr-9" : "pr-2",
            )}
            autoCorrect="off"
            autoComplete="off"
          />
          {localValue ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="absolute top-1/2 right-1 h-8 w-8 -translate-y-1/2 p-0 pointer-coarse:h-10 pointer-coarse:w-10"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Clear search</span>
            </Button>
          ) : null}
        </div>
      </div>
      {dropdown ? (
        <div
          id={dropdownId}
          role="region"
          aria-label="Recent and saved searches"
          data-testid="search-history"
          // Keep focus in the input while clicking entries (Safari doesn't
          // focus buttons on click), except in the rename field.
          // Running an entry closes the dropdown.
          onClick={(e) => {
            if (
              e.target instanceof Element &&
              e.target.closest("[data-history-item]")
            ) {
              closeDropdown();
            }
          }}
          onMouseDown={(e) => {
            if (!(e.target instanceof HTMLInputElement)) e.preventDefault();
          }}
          className="bg-popover text-popover-foreground ring-foreground/10 animate-in fade-in-0 slide-in-from-top-1 absolute inset-x-0 top-full z-40 mt-2 max-h-[min(24rem,60vh)] overflow-y-auto rounded-xl shadow-lg ring-1 duration-100 motion-reduce:animate-none"
        >
          {dropdown}
        </div>
      ) : null}
    </div>
  );
}
