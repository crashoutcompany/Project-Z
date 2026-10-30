import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { TradeSideSection } from "@/components/trading/TradeCardArt";
import { CopyTradeLink } from "@/components/trading/CopyTradeLink";
import { buildTradeUrl } from "@/lib/trade";
import type { TradeListingView } from "@/lib/trade-queries";
import { cn } from "@/lib/utils";

function expiryLabel(expiresAt: Date, now: Date) {
  if (expiresAt.getTime() <= now.getTime()) return "Expired";
  return `Expires ${expiresAt.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  })}`;
}

export function TradeListingCard({
  listing,
  now,
}: {
  listing: TradeListingView;
  now: Date;
}) {
  const invalid = !listing.validity.valid;

  return (
    <article
      className={cn(
        "bg-card/90 ring-foreground/10 w-full space-y-4 rounded-2xl p-4 shadow-xs ring-1",
        invalid && "opacity-80",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {invalid ? (
            <Badge variant="destructive">No longer valid</Badge>
          ) : (
            <Badge variant="secondary">
              {expiryLabel(listing.expiresAt, now)}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <CopyTradeLink listingId={listing.listingId} />
          <Link
            href={buildTradeUrl(listing.listingId)}
            className="text-sm font-medium text-red-600 underline-offset-4 hover:underline dark:text-red-400"
          >
            View
          </Link>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <TradeSideSection
          title="Wants"
          cards={listing.wantCards}
          emptyLabel="No want cards"
          variant="want"
        />
        <TradeSideSection
          title="Giving"
          cards={listing.giveCards}
          emptyLabel="No give cards"
          variant="give"
        />
      </div>
    </article>
  );
}
