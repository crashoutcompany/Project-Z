"use client";

import { memo } from "react";
import LazyImage from "@/components/LazyImage";
import { cn } from "@/lib/utils";
import { CardItemProps } from "./types";
import { Check } from "lucide-react";

export const CardItem = memo(function CardItem({
  card,
  selectable,
  selectionState,
  onClick,
}: CardItemProps) {
  const isSelected = selectionState !== "none";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!selectable}
      className={cn(
        "group relative overflow-hidden rounded-lg transition-all duration-200",
        selectable && "cursor-pointer hover:scale-105 hover:z-10",
        !selectable && "cursor-default",
        isSelected && "ring-2 ring-offset-2 ring-offset-background",
        selectionState === "want" && "ring-blue-500",
        selectionState === "give" && "ring-green-500",
      )}
    >
      <LazyImage
        title={card.name}
        className="h-auto w-full rounded-lg select-none"
        alt={`${card.name} Card`}
        src={`https://serebii.net${card.thumbnail.replace("/th", "")}`}
        width={200}
        height={300}
        draggable={false}
      />
      {isSelected && (
        <div
          className={cn(
            "absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full",
            selectionState === "want" && "bg-blue-500",
            selectionState === "give" && "bg-green-500",
          )}
        >
          <Check className="h-4 w-4 text-white" />
        </div>
      )}
      {selectable && !isSelected && (
        <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/10" />
      )}
    </button>
  );
});
