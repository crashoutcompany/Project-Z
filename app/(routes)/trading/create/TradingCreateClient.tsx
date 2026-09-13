"use client";

import { useCallback, useState } from "react";
import { Set } from "@/prisma/generated/client/client";
import { CardBrowserClient } from "@/components/CardBrowser/CardBrowserClient";
import { CardWithSet, SelectedCards } from "@/components/CardBrowser/types";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import LazyImage from "@/components/LazyImage";
import { X, ArrowRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type TradingCreateClientProps = {
  sets: Set[];
  initialSetId: number;
  initialCards: CardWithSet[];
  initialCursor: number | null;
};

export function TradingCreateClient({
  sets,
  initialSetId,
  initialCards,
  initialCursor,
}: TradingCreateClientProps) {
  const [selectedCards, setSelectedCards] = useState<SelectedCards>({
    want: [],
    give: [],
  });

  const handleSelectionChange = useCallback((next: SelectedCards) => {
    setSelectedCards(next);
  }, []);

  const removeCard = (card: CardWithSet, list: "want" | "give") => {
    setSelectedCards((prev) => ({
      ...prev,
      [list]: prev[list].filter((c) => c.id !== card.id),
    }));
  };

  const canSubmit =
    selectedCards.want.length > 0 && selectedCards.give.length > 0;

  if (sets.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed py-16 text-center">
        <p className="text-muted-foreground">No card sets available.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <SelectionZone
          title="Cards you want"
          cards={selectedCards.want}
          onRemove={(card) => removeCard(card, "want")}
          variant="want"
        />
        <SelectionZone
          title="Cards you’re giving"
          cards={selectedCards.give}
          onRemove={(card) => removeCard(card, "give")}
          variant="give"
        />
      </div>

      <div className="flex justify-end">
        <Button
          disabled={!canSubmit}
          size="lg"
          className="gap-2 active:scale-[0.97]"
          render={
            canSubmit ? (
              <Link
                href={{
                  pathname: "/trading/create/confirm",
                  query: {
                    want: selectedCards.want.map((c) => c.id).join(","),
                    give: selectedCards.give.map((c) => c.id).join(","),
                  },
                }}
              >
                Continue
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <span>
                Continue
                <ArrowRight className="h-4 w-4" />
              </span>
            )
          }
        />
      </div>

      <CardBrowserClient
        sets={sets}
        initialSetId={initialSetId}
        initialCards={initialCards}
        initialCursor={initialCursor}
        mode="select"
        tradeableOnly
        showSearchModes={false}
        selected={selectedCards}
        onSelectionChange={handleSelectionChange}
      />
    </div>
  );
}

function SelectionZone({
  title,
  cards,
  onRemove,
  variant,
}: {
  title: string;
  cards: CardWithSet[];
  onRemove: (card: CardWithSet) => void;
  variant: "want" | "give";
}) {
  return (
    <section
      className={cn(
        "bg-card/90 space-y-3 rounded-2xl p-4 shadow-xs ring-1 backdrop-blur-sm",
        variant === "want" ? "ring-blue-500/30" : "ring-green-500/30",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold tracking-tight">{title}</h2>
        <span className="text-muted-foreground text-sm">
          {cards.length} card{cards.length !== 1 ? "s" : ""}
        </span>
      </div>
      {cards.length === 0 ? (
        <div className="flex h-24 items-center justify-center rounded-xl border border-dashed">
          <p className="text-muted-foreground text-sm">
            Click cards below to add them here
          </p>
        </div>
      ) : (
        <ScrollArea className="w-full">
          <div className="flex gap-2 pb-2">
            {cards.map((card) => (
              <div key={card.id} className="catalog-slot group relative shrink-0">
                <LazyImage
                  title={card.name}
                  className="h-28 w-auto rounded-lg ring-1 ring-foreground/10"
                  alt={card.name}
                  src={card.imageUrl}
                  width={80}
                  height={112}
                />
                <button
                  type="button"
                  onClick={() => onRemove(card)}
                  aria-label={`Remove ${card.name}`}
                  className="bg-destructive text-destructive-foreground absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full opacity-100 transition-opacity duration-150 ease-out [@media(hover:hover)_and_(pointer:fine)]:opacity-0 [@media(hover:hover)_and_(pointer:fine)]:group-hover:opacity-100"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      )}
    </section>
  );
}
