"use client";

import LazyImage from "@/components/LazyImage";
import { H2 } from "@/components/typography/headings";
import { Card as ShadCard, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, sleep } from "@/lib/utils";
import { Card } from "@/prisma/generated/client/client";
import {
  Dispatch,
  memo,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";

export const TradingArea = memo(({ cards }: { cards: Card[] }) => {
  const [draggedCard, setDraggedCard] = useState<Card | null>(null);
  const [givingCards, setGivingCards] = useState<Card[]>([]);
  const [wantedCards, setWantedCards] = useState<Card[]>([]);
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback(
    (
      e: React.DragEvent<HTMLDivElement>,
      cardSetter: Dispatch<SetStateAction<Card[]>>,
    ) => {
      e.preventDefault();
      cardSetter((prev) => {
        const previouslySelected = prev.find(
          (card) => card.id === draggedCard?.id,
        );
        if (previouslySelected) {
          if (toast.getToasts().length === 0)
            toast.error("Card already selected", { richColors: true });
          return prev;
        } else return [...prev, draggedCard!].sort((a, b) => a.id - b.id);
      });
      console.log(e.dataTransfer.getData("text"));
      console.log(e);
    },
    [draggedCard],
  );

  const Top = useMemo(() => {
    return (
      <div className="grid grid-cols-2 gap-3">
        <TopDropZone
          label="Cards you want"
          draggedCard={draggedCard}
          selectedCards={wantedCards}
          setSelectedCards={setWantedCards}
        />
        <TopDropZone
          label="Cards you are willing to trade"
          draggedCard={draggedCard}
          selectedCards={givingCards}
          setSelectedCards={setGivingCards}
        />
      </div>
    );
  }, [draggedCard, wantedCards, givingCards]);
  TradingArea.displayName = "TradingArea";

  return (
    <>
      {Top}
      <SideDropZone
        side="right"
        dragging={dragging}
        handleDrop={(e) => handleDrop(e, setGivingCards)}
        text="Drag cards you are giving"
      />
      <SideDropZone
        side="left"
        dragging={dragging}
        handleDrop={(e) => handleDrop(e, setWantedCards)}
        text="Drag cards you want"
      />
      <Cards
        cards={cards}
        setCard={setDraggedCard}
        setIsDragging={setDragging}
      />
    </>
  );
});

const TopDropZone = memo(
  ({
    draggedCard,
    selectedCards,
    setSelectedCards,
    label,
  }: {
    draggedCard: Card | null;
    selectedCards: Card[];
    setSelectedCards: Dispatch<SetStateAction<Card[]>>;
    label: string;
  }) => {
    const [isHovered, setIsHovered] = useState(false);

    const handleDrop = useCallback(
      (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setSelectedCards((prev) => {
          const previouslySelected = prev.find(
            (card) => card.id === draggedCard?.id,
          );
          if (previouslySelected) {
            if (toast.getToasts().length === 0)
              toast.error("Card already selected", { richColors: true });
            return prev;
          } else return [...prev, draggedCard!].sort((a, b) => a.id - b.id);
        });
        setIsHovered(false);
      },
      [draggedCard, setSelectedCards],
    );

    const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsHovered(true);
    }, []);

    const handleDragLeave = useCallback(
      (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsHovered(false);
      },
      [],
    );

    return (
      <div>
        <div>{label}</div>
        <div
          className={cn(
            "min-h-60 w-full border transition-colors",
            isHovered && "border-white",
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="flex h-full flex-wrap items-center justify-center gap-3">
            {selectedCards.length > 0 ? (
              selectedCards.map((card) => (
                <CardImage key={card.id} card={card} />
              ))
            ) : (
              <p className="text-muted-foreground">Drag a card here</p>
            )}
          </div>
        </div>
      </div>
    );
  },
);
TopDropZone.displayName = "TopDropZone";

const SideDropZone = ({
  dragging,
  handleDrop,
  side,
  text,
}: {
  dragging: boolean;
  handleDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  side: "left" | "right";
  text: string;
}) => {
  const [isHovered, setIsHovered] = useState(false);
  return (
    <ShadCard
      draggable={false}
      onDragOver={(e) => {
        e.preventDefault();
        setIsHovered(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        setIsHovered(false);
      }}
      onDrop={handleDrop}
      className={cn(
        "fixed top-1/2 h-64 w-64 border transition-transform duration-300 ease-in-out",
        side === "right" ? "right-0 translate-x-64" : "left-0 -translate-x-64",
        dragging && "translate-x-0",
        isHovered && "border-white transition-colors",
      )}
    >
      <CardHeader>
        <CardTitle className="select-none" draggable={false}>
          {text}
        </CardTitle>
      </CardHeader>
    </ShadCard>
  );
};

const Cards = ({
  cards,
  setCard,
  setIsDragging,
}: {
  cards: Card[];
  setCard: Dispatch<SetStateAction<Card | null>>;
  setIsDragging: Dispatch<SetStateAction<boolean>>;
}) => {
  return (
    <>
      <H2 id="cards-list">Cards List</H2>
      {cards.length === 0 && (
        <div className="py-8 text-center">
          <p>No cards found. Try a different search term.</p>
        </div>
      )}
      <div className="grid grid-cols-2 place-content-center gap-y-4 p-4 md:grid-cols-3 lg:grid-cols-6">
        {cards.map((card) => (
          <div
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData("text/plain", JSON.stringify(card));
              setCard(card);
              setIsDragging(true);
            }}
            onDragEnd={(e) => setIsDragging(false)}
            key={card.id}
          >
            <CardImage card={card} />
          </div>
        ))}
      </div>
    </>
  );
};

const CardImage = ({ card }: { card: Card }) => (
  <LazyImage
    title={card.name}
    className="h-auto w-auto rounded-lg select-none"
    alt={`${card.name} Card`}
    src={`https://serebii.net${card.thumbnail.replace("/th", "")}`}
    width={200}
    height={300}
    draggable={false}
  />
);
