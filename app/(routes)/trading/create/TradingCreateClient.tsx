"use client";

import { useState, useCallback } from "react";
import { Set } from "@/prisma/generated/client/client";
import { CardBrowserClient } from "@/components/CardBrowser/CardBrowserClient";
import {
  CardWithSet,
  SelectedCards,
} from "@/components/CardBrowser/types";
import { H3 } from "@/components/typography/headings";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import LazyImage from "@/components/LazyImage";
import { X, ArrowRight } from "lucide-react";
import Link from "next/link";

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

  const handleSelectionChange = useCallback((newSelected: SelectedCards) => {
    setSelectedCards(newSelected);
  }, []);

  const removeCard = (card: CardWithSet, list: "want" | "give") => {
    setSelectedCards((prev) => ({
      ...prev,
      [list]: prev[list].filter((c) => c.id !== card.id),
    }));
  };

  const canSubmit = selectedCards.want.length > 0 && selectedCards.give.length > 0;

  return (
    <div className="space-y-6">
      {/* Instructions */}
      <div className="space-y-2">
        <H3>Create a Trade</H3>
        <p className="text-muted-foreground text-sm">
          Select cards you want to receive and cards you&apos;re willing to give.
          Click on cards below to add them to your trade.
        </p>
      </div>

      {/* Selection Zones */}
      <div className="grid gap-4 md:grid-cols-2">
        <SelectionZone
          title="Cards You Want"
          cards={selectedCards.want}
          onRemove={(card) => removeCard(card, "want")}
          variant="want"
        />
        <SelectionZone
          title="Cards You're Giving"
          cards={selectedCards.give}
          onRemove={(card) => removeCard(card, "give")}
          variant="give"
        />
      </div>

      {/* Submit Button */}
      <div className="flex justify-end">
        <Button
          asChild={canSubmit}
          disabled={!canSubmit}
          size="lg"
          className="gap-2"
        >
          {canSubmit ? (
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
            <>
              Continue
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>

      {/* Card Browser */}
      <div className="rounded-lg border p-4">
        <CardBrowserClient
          sets={sets}
          initialSetId={initialSetId}
          initialCards={initialCards}
          initialCursor={initialCursor}
          mode="select"
          tradeableOnly={true}
          onSelectionChange={handleSelectionChange}
          initialSelected={selectedCards}
        />
      </div>
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
  const borderColor = variant === "want" ? "border-blue-500/50" : "border-green-500/50";
  const bgColor = variant === "want" ? "bg-blue-500/5" : "bg-green-500/5";

  return (
    <Card className={`${borderColor} ${bgColor}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          {title}
          <span className="text-muted-foreground text-sm font-normal">
            {cards.length} card{cards.length !== 1 ? "s" : ""}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {cards.length === 0 ? (
          <div className="flex h-24 items-center justify-center rounded-md border-2 border-dashed">
            <p className="text-muted-foreground text-sm">
              Click cards below to add them here
            </p>
          </div>
        ) : (
          <ScrollArea className="w-full">
            <div className="flex gap-2 pb-2">
              {cards.map((card) => (
                <div key={card.id} className="group relative shrink-0">
                  <LazyImage
                    title={card.name}
                    className="h-28 w-auto rounded-md"
                    alt={card.name}
                    src={`https://serebii.net${card.thumbnail.replace("/th", "")}`}
                    width={80}
                    height={112}
                  />
                  <button
                    type="button"
                    onClick={() => onRemove(card)}
                    className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
