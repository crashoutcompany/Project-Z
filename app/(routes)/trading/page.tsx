import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/prisma/db";
import { H2 } from "@/components/typography/headings";
import { Button } from "@/components/ui/button";
import { headers } from "next/headers";
import { CatalogShell } from "@/components/catalog/CatalogShell";
import { CatalogLoading } from "@/components/catalog/CatalogLoading";
import { TradeListingCard } from "@/components/trading/TradeListingCard";
import {
  loadListingsForIdentifier,
  loadPublicListings,
} from "@/lib/trade-queries";
import { tradeIdentifier } from "@/lib/trade";
import type { TradeListingView } from "@/lib/trade-queries";

export default function TradingPage() {
  return (
    <CatalogShell
      eyebrow="Trading"
      title="Trading"
      description="Create a trade or browse offers from other trainers."
    >
      <Suspense fallback={<CatalogLoading embedded />}>
        <TradingPageContent />
      </Suspense>
    </CatalogShell>
  );
}

async function TradingPageContent() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.user?.email) redirect("/signin");

  const account = await prisma.account.findFirst({
    where: { userId: session.user.id },
    select: { providerId: true },
  });

  const identifier = tradeIdentifier(session.user.email, account?.providerId);

  const [userListings, publicListings] = await Promise.all([
    loadListingsForIdentifier(identifier),
    loadPublicListings(identifier),
  ]);

  const now = new Date();

  return (
    <>
      <Button href="/trading/create" className="active:scale-[0.97]">
        Make a trade
      </Button>
      <ListingSection
        title="Your Trades"
        listings={userListings}
        empty="You haven’t published a trade yet."
        now={now}
      />
      <ListingSection
        title="Public Trades"
        listings={publicListings}
        empty="No public listings right now."
        now={now}
      />
    </>
  );
}

function ListingSection({
  title,
  listings,
  empty,
  now,
}: {
  title: string;
  listings: TradeListingView[];
  empty: string;
  now: Date;
}) {
  return (
    <section className="my-8 space-y-4">
      <H2>{title}</H2>
      {listings.length === 0 ? (
        <p className="text-muted-foreground rounded-2xl border border-dashed py-10 text-center text-sm">
          {empty}
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {listings.map((listing) => (
            <TradeListingCard
              key={listing.listingId}
              listing={listing}
              now={now}
            />
          ))}
        </div>
      )}
    </section>
  );
}
