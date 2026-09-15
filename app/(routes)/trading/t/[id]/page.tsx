import { Suspense } from "react";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { CatalogLoading } from "@/components/catalog/CatalogLoading";
import { CatalogShell } from "@/components/catalog/CatalogShell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CancelListingButton } from "@/components/trading/CancelListingButton";
import { CopyTradeLink } from "@/components/trading/CopyTradeLink";
import { TradeSideSection } from "@/components/trading/TradeCardArt";
import { LISTING_INVALID_MESSAGE, tradeIdentifier } from "@/lib/trade";
import { loadListingById } from "@/lib/trade-queries";
import prisma from "@/prisma/db";

export default function TradeListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <CatalogShell
      eyebrow="Trading"
      title="Trade listing"
      description="A shareable want/give listing. Expired or cancelled listings are no longer valid."
    >
      <Suspense fallback={<CatalogLoading embedded />}>
        <TradeListingContent params={params} />
      </Suspense>
    </CatalogShell>
  );
}

async function TradeListingContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!id) notFound();

  const sessionPromise = auth.api.getSession({
    headers: await headers(),
  });
  const listingPromise = loadListingById(id);
  const [session, listing] = await Promise.all([
    sessionPromise,
    listingPromise,
  ]);

  if (!listing || !listing.validity.valid) {
    return (
      <Alert variant="destructive">
        <AlertTitle>{LISTING_INVALID_MESSAGE}</AlertTitle>
        <AlertDescription>
          This trade may have expired, been cancelled, or never existed.
        </AlertDescription>
      </Alert>
    );
  }

  let isOwner = false;
  if (session?.user?.email) {
    const account = await prisma.account.findFirst({
      where: { userId: session.user.id },
      select: { providerId: true },
    });
    isOwner =
      listing.identifier ===
      tradeIdentifier(session.user.email, account?.providerId);
  }

  const expiresLabel = listing.expiresAt.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Badge variant="secondary">Expires {expiresLabel}</Badge>
        <div className="flex flex-wrap items-center gap-2">
          <CopyTradeLink listingId={listing.listingId} />
          <Button href="/trading" variant="ghost" size="sm">
            All trades
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
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

      {isOwner ? <CancelListingButton listingId={listing.listingId} /> : null}
    </div>
  );
}
