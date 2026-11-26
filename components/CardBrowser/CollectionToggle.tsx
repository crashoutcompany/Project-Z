"use client";

import { memo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useCollection } from "@/lib/collection/use-collection";
import { useWantList } from "@/lib/collection/use-want-list";
import { MAX_QUANTITY } from "@/lib/collection";
import { Bookmark, Check, Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

type CollectionToggleProps = {
  cardId: number;
  variant?: "icon" | "full";
  className?: string;
};

export const CollectionToggle = memo(function CollectionToggle({
  cardId,
  variant = "icon",
  className,
}: CollectionToggleProps) {
  const { getQuantity, toggle, adjust } = useCollection();
  const quantity = getQuantity(cardId);
  const owned = quantity > 0;

  const handleToggle = useCallback(() => {
    toggle(cardId);
  }, [cardId, toggle]);

  const handleIncrement = useCallback(() => {
    adjust(cardId, 1);
  }, [cardId, adjust]);

  const handleDecrement = useCallback(() => {
    adjust(cardId, -1);
  }, [cardId, adjust]);

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          handleToggle();
        }}
        aria-label={owned ? "Remove from collection" : "Add to collection"}
        aria-pressed={owned}
        className={cn(
          "flex size-7 items-center justify-center rounded-full transition-colors",
          owned
            ? "bg-emerald-500 text-white hover:bg-emerald-600"
            : "bg-black/60 text-white/80 hover:bg-black/80 hover:text-white",
          className,
        )}
      >
        {owned ? <Check className="size-4" /> : <Plus className="size-4" />}
      </button>
    );
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="size-8"
        onClick={handleDecrement}
        disabled={quantity === 0}
        aria-label="Decrease quantity"
      >
        <Minus className="size-4" />
      </Button>
      <span
        data-testid="collection-quantity"
        className="min-w-[2.5rem] text-center font-medium tabular-nums"
      >
        {quantity}
      </span>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="size-8"
        onClick={handleIncrement}
        disabled={quantity >= MAX_QUANTITY}
        aria-label="Increase quantity"
      >
        <Plus className="size-4" />
      </Button>
      <span className="text-muted-foreground text-sm">owned</span>
    </div>
  );
});

type CollectionBadgeProps = {
  cardId: number;
  className?: string;
};

export const CollectionBadge = memo(function CollectionBadge({
  cardId,
  className,
}: CollectionBadgeProps) {
  const { getQuantity, toggle } = useCollection();
  const quantity = getQuantity(cardId);

  if (quantity === 0) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          toggle(cardId);
        }}
        aria-label="Add to collection"
        className={cn(
          "absolute right-1.5 bottom-1.5 flex size-6 items-center justify-center rounded-full bg-black/60 text-white/80 transition-colors hover:bg-black/80 hover:text-white",
          className,
        )}
      >
        <Plus className="size-3.5" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        toggle(cardId);
      }}
      aria-label={`Owned: ${quantity}. Click to remove from collection`}
      className={cn(
        "absolute right-1.5 bottom-1.5 flex h-6 min-w-6 items-center justify-center gap-0.5 rounded-full bg-emerald-500 px-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-600",
        className,
      )}
    >
      <Check className="size-3" />
      {quantity > 1 ? <span>{quantity}</span> : null}
    </button>
  );
});

type WantToggleProps = {
  cardId: number;
  /** Card name for the accessible label. */
  name?: string;
  /** Copies to want when adding (e.g. what a deck still needs). */
  copies?: number;
  variant?: "icon" | "full";
  className?: string;
};

/**
 * Adds a card to, or removes it from, the global want list. Sits next to the
 * collection controls so any card can go on either list from the same place.
 */
export const WantToggle = memo(function WantToggle({
  cardId,
  name,
  copies = 1,
  variant = "icon",
  className,
}: WantToggleProps) {
  const { getWanted, toggle } = useWantList();
  const wanted = getWanted(cardId);
  const onList = wanted > 0;
  const subject = name ? `${name} ` : "";
  const label = onList
    ? `Remove ${subject}from want list`
    : `Add ${subject}to want list`;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggle(cardId, copies);
  };

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={handleClick}
        aria-label={label}
        aria-pressed={onList}
        title={label}
        data-testid="want-toggle"
        className={cn(
          "ring-foreground/10 flex size-7 shrink-0 items-center justify-center rounded-full ring-1 transition-colors",
          onList
            ? "bg-amber-500 text-white hover:bg-amber-600"
            : "bg-background hover:bg-amber-500 hover:text-white",
          className,
        )}
      >
        <Bookmark className={cn("size-4", onList && "fill-current")} />
      </button>
    );
  }

  return (
    <Button
      type="button"
      variant={onList ? "secondary" : "outline"}
      size="sm"
      onClick={handleClick}
      aria-pressed={onList}
      data-testid="want-toggle"
      className={cn("gap-1.5", className)}
    >
      <Bookmark
        className={cn("size-4", onList && "fill-amber-500 text-amber-500")}
      />
      {onList
        ? `On want list${wanted > 1 ? ` (${wanted})` : ""}`
        : "Add to want list"}
    </Button>
  );
});
