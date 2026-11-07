"use client";

import { memo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useCollection } from "@/lib/collection/use-collection";
import { MAX_QUANTITY } from "@/lib/collection";
import { Check, Minus, Plus } from "lucide-react";
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
