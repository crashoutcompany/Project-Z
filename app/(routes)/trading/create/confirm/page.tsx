import { Suspense } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/lib/auth";
import { CatalogLoading } from "@/components/catalog/CatalogLoading";
import { CatalogShell } from "@/components/catalog/CatalogShell";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PublishTradeForm } from "@/components/trading/PublishTradeForm";
import { TradeSideSection } from "@/components/trading/TradeCardArt";
import { parseCardIdList } from "@/lib/trade";
import { loadCardsByIds } from "@/lib/trade-queries";

export default function ConfirmTradePage({
  searchParams,
}: {
  searchParams: Promise<{ want?: string; give?: string }>;
}) {
  return (
    <CatalogShell
      eyebrow="Trading"
      title="Confirm trade"
      description="Review the cards you want and the cards you’ll give, then publish a shareable listing. Listings expire in 7 days."
    >
      <Suspense fallback={<CatalogLoading embedded />}>
        <ConfirmTradeContent searchParams={searchParams} />
      </Suspense>
    </CatalogShell>
  );
}

async function ConfirmTradeContent({
  searchParams,
}: {
  searchParams: Promise<{ want?: string; give?: string }>;
}) {
  const sessionPromise = auth.api.getSession({
    headers: await headers(),
  });
  const params = await searchParams;

  let wantIds: number[];
  let giveIds: number[];
  try {
    wantIds = parseCardIdList(params.want);
    giveIds = parseCardIdList(params.give);
  } catch {
    const session = await sessionPromise;
    if (!session) redirect("/signin");
    return (
      <ConfirmError
        title="Those card ids aren’t valid."
        description="Go back to create and pick tradeable cards again."
      />
    );
  }

  const [session, wantCards, giveCards] = await Promise.all([
    sessionPromise,
    loadCardsByIds(wantIds),
    loadCardsByIds(giveIds),
  ]);

  if (!session) redirect("/signin");

  if (wantIds.length === 0 || giveIds.length === 0) {
    return (
      <ConfirmError
        title="A listing needs both sides."
        description="Pick at least one card you want and one card you’ll give."
      />
    );
  }

  if (
    wantCards.length !== wantIds.length ||
    giveCards.length !== giveIds.length
  ) {
    return (
      <ConfirmError
        title="Some cards are missing."
        description="One or more selected cards could not be found. Go back and pick again."
      />
    );
  }

  return (
    <div className="space-y-6">
      <Button
        href="/trading/create"
        variant="ghost"
        className="gap-2 px-0 hover:bg-transparent"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to picker
      </Button>

      <div className="grid gap-4 md:grid-cols-2">
        <TradeSideSection
          title="Cards you want"
          cards={wantCards}
          emptyLabel="None selected"
          variant="want"
        />
        <TradeSideSection
          title="Cards you’re giving"
          cards={giveCards}
          emptyLabel="None selected"
          variant="give"
        />
      </div>

      <PublishTradeForm wantIds={wantIds} giveIds={giveIds} />
    </div>
  );
}

function ConfirmError({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-4">
      <Alert variant="destructive">
        <AlertTitle>{title}</AlertTitle>
        <AlertDescription>{description}</AlertDescription>
      </Alert>
      <Button href="/trading/create" variant="outline">
        Back to create
      </Button>
    </div>
  );
}
