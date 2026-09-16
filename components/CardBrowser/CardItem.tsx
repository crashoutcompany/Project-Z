"use client";

import { memo } from "react";
import LazyImage from "@/components/LazyImage";
import { formatCardRef } from "@/lib/deck-url";
import { cn } from "@/lib/utils";
import { CardItemProps } from "./types";
import { Check } from "lucide-react";

export const CardItem = memo(function CardItem({
  card,
  selectable,
  selectionState,
  count = 0,
  priority = false,
  onClick,
}: CardItemProps) {
  const isSelected = selectionState !== "none";
  const showCount = count > 0;
  const atCap = count >= 2;

  const interactive = Boolean(onClick);

  const className = cn(
    "relative overflow-hidden rounded-xl bg-card shadow-xs ring-1 ring-foreground/10",
    "transition-[transform,box-shadow] duration-150 ease-out",
    interactive &&
      "cursor-pointer active:scale-[0.97] motion-reduce:active:scale-100 [@media(hover:hover)_and_(pointer:fine)]:hover:-translate-y-0.5 [@media(hover:hover)_and_(pointer:fine)]:hover:shadow-md motion-reduce:hover:translate-y-0",
    !interactive && "cursor-default",
    isSelected && "ring-2 ring-offset-2 ring-offset-background",
    selectionState === "want" && "ring-blue-500",
    selectionState === "give" && "ring-green-500",
    showCount && !isSelected && "ring-2 ring-red-500/70",
    atCap && "opacity-70",
  );

  const media = (
    <>
      <LazyImage
        title={card.name}
        className="h-auto w-full rounded-xl select-none"
        alt={card.name}
        src={card.imageUrl}
        width={200}
        height={280}
        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw"
        priority={priority}
        loading={priority ? "eager" : "lazy"}
        draggable={false}
      />
      {isSelected ? (
        <div
          className={cn(
            "absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full",
            selectionState === "want" && "bg-blue-500",
            selectionState === "give" && "bg-green-500",
          )}
        >
          <Check className="h-3.5 w-3.5 text-white" />
        </div>
      ) : null}
      {showCount ? (
        <div className="absolute top-2 left-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-red-600 px-1.5 text-xs font-semibold text-white">
          {count}×
        </div>
      ) : null}
    </>
  );

  if (!interactive) {
    return <div className={className}>{media}</div>;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      data-card-ref={formatCardRef(card.set.code, card.number)}
      aria-label={selectable ? card.name : `View ${card.name} details`}
      aria-haspopup={selectable ? undefined : "dialog"}
      className={className}
    >
      {media}
    </button>
  );
});
