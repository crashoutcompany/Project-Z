import LazyImage from "@/components/LazyImage";
import { cn } from "@/lib/utils";
import type { TradeCardArt } from "@/lib/trade-queries";

export function TradeCardArtRow({
  cards,
  emptyLabel,
}: {
  cards: TradeCardArt[];
  emptyLabel: string;
}) {
  if (cards.length === 0) {
    return <p className="text-muted-foreground text-sm">{emptyLabel}</p>;
  }

  return (
    <ul className="flex flex-wrap gap-2">
      {cards.map((card) => (
        <li key={card.id} className="w-16 sm:w-20">
          <LazyImage
            title={card.name}
            alt={card.name}
            src={card.imageUrl}
            width={80}
            height={112}
            className="ring-foreground/10 h-auto w-full rounded-lg ring-1"
          />
          <p className="mt-1 truncate text-xs font-medium">{card.name}</p>
          <p className="text-muted-foreground truncate text-[11px]">
            {card.set.code}-{card.number}
          </p>
        </li>
      ))}
    </ul>
  );
}

export function TradeSideSection({
  title,
  cards,
  emptyLabel,
  variant,
}: {
  title: string;
  cards: TradeCardArt[];
  emptyLabel: string;
  variant: "want" | "give";
}) {
  return (
    <section
      className={cn(
        "space-y-2 rounded-xl p-3 ring-1",
        variant === "want" ? "ring-blue-500/30" : "ring-green-500/30",
      )}
    >
      <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
      <TradeCardArtRow cards={cards} emptyLabel={emptyLabel} />
    </section>
  );
}
