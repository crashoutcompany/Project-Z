"use client";

import { useCallback, useRef } from "react";
import { Input } from "@/components/ui/input";
import { SearchBoxProps } from "./types";
import { debounce } from "@/lib/utils";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SearchBox({ value, onChange, placeholder = "Search cards..." }: SearchBoxProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedOnChange = useCallback(
    debounce((newValue: string) => {
      onChange(newValue);
    }, 300),
    [onChange],
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    debouncedOnChange(e.target.value);
  };

  const handleClear = () => {
    if (inputRef.current) {
      inputRef.current.value = "";
    }
    onChange("");
  };

  return (
    <div className="relative w-full max-w-md">
      <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
      <Input
        ref={inputRef}
        type="search"
        placeholder={placeholder}
        defaultValue={value}
        onChange={handleChange}
        className="pl-9 pr-9"
        autoCorrect="off"
        autoComplete="off"
      />
      {value && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleClear}
          className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 p-0"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Clear search</span>
        </Button>
      )}
    </div>
  );
}
