"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SelectedCards, SelectionMode } from "./types";

const ACTIVE_CLASSES: Record<SelectionMode, string> = {
  want: "bg-blue-500 text-white hover:bg-blue-600 hover:text-white",
  give: "bg-green-500 text-white hover:bg-green-600 hover:text-white",
};

const LABELS: Record<SelectionMode, string> = { want: "Want", give: "Give" };

export function SelectionModeToggle({
  mode,
  onModeChange,
  selectedCards,
}: {
  mode: SelectionMode;
  onModeChange: (mode: SelectionMode) => void;
  selectedCards: SelectedCards;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-muted-foreground text-sm">Adding to</span>
      <div className="bg-muted flex rounded-lg p-0.5">
        {(["want", "give"] as const).map((option) => (
          <Button
            key={option}
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onModeChange(option)}
            className={cn("rounded-md px-3", mode === option && ACTIVE_CLASSES[option])}
          >
            {LABELS[option]} ({selectedCards[option].length})
          </Button>
        ))}
      </div>
    </div>
  );
}
