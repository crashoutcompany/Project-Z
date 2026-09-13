"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { debounce } from "@/lib/utils";
import { Search, X } from "lucide-react";

export type SearchMode = "name" | "effects";

export type SearchBoxProps = {
  value: string;
  onChange: (value: string) => void;
  mode: SearchMode;
  onModeChange: (mode: SearchMode) => void;
  placeholder?: string;
  filterChips?: string[];
};

export function SearchBox({
  value,
  onChange,
  mode,
  onModeChange,
  placeholder,
  filterChips = [],
}: SearchBoxProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    if (value === "") setLocalValue("");
  }, [value]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedOnChange = useCallback(
    debounce((next: string) => {
      onChange(next);
    }, 300),
    [onChange],
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    setLocalValue(next);
    debouncedOnChange(next);
  };

  const handleClear = () => {
    setLocalValue("");
    onChange("");
  };

  const resolvedPlaceholder =
    placeholder ??
    (mode === "name"
      ? "Search by name..."
      : "Search by effect (e.g. coin flip, bench damage)...");

  return (
    <div className="w-full max-w-xl space-y-2">
      <div className="flex items-center gap-2">
        <div className="bg-muted flex rounded-lg p-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onModeChange("name")}
            className={cn(
              "rounded-md px-3",
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
            onClick={() => onModeChange("effects")}
            className={cn(
              "rounded-md px-3",
              mode === "effects" &&
                "bg-background text-foreground shadow-sm hover:bg-background",
            )}
          >
            Effects
          </Button>
        </div>
      </div>

      <div className="relative w-full">
        <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
        <Input
          ref={inputRef}
          type="search"
          placeholder={resolvedPlaceholder}
          value={localValue}
          onChange={handleChange}
          className="pr-9 pl-9"
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

      {mode === "effects" && filterChips.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {filterChips.map((chip) => (
            <span
              key={chip}
              className="bg-secondary text-secondary-foreground rounded-md px-2 py-0.5 text-xs"
            >
              {chip}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
