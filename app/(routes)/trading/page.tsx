import { Suspense } from "react";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/prisma/db";
import { H2 } from "@/components/typography/headings";
import { Trade } from "@/prisma/generated/client/client";
import { Button } from "@/components/ui/button";
import { headers } from "next/headers";
import { CatalogShell } from "@/components/catalog/CatalogShell";
import { CatalogLoading } from "@/components/catalog/CatalogLoading";

const TRADES_PAGE_SIZE = 50;

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
  const session = await getSession(await headers());
  if (!session) redirect("/signin");

  // Nothing writes trades yet, so there is no data to break either way. Match
  // on the user id (Trade.playerId) and on the legacy "<email>.<PROVIDER>"
  // identifier, using the oldest linked account so the key is deterministic.
  const account = await prisma.account.findFirst({
    where: { userId: session.user.id },
    orderBy: { createdAt: "asc" },
    select: { providerId: true },
  });
  const identifier = `${session.user.email}.${account?.providerId?.toUpperCase() ?? "UNKNOWN"}`;

  // Maybe make each one fetch it's own data, so we're not waiting for all of them to load
  const [allTrades, userTrades] = await Promise.all([
    prisma.trade.findMany({
      where: { isPrivate: false },
      orderBy: { createdAt: "desc" },
      take: TRADES_PAGE_SIZE,
      include: { cards: { select: { name: true, imageUrl: true } } },
    }),
    prisma.trade.findMany({
      where: { OR: [{ playerId: session.user.id }, { identifier }] },
      orderBy: { createdAt: "desc" },
      take: TRADES_PAGE_SIZE,
      include: { cards: { select: { name: true, imageUrl: true } } },
    }),
  ]);

  return (
    <>
      <Button href="/trading/create" className="active:scale-[0.97]">
        Make a trade
      </Button>
      <TradeContainer trades={userTrades} title="Your Trades" />
      <TradeContainer trades={allTrades} title="Public Trades" />
    </>
  );
}

const Gameboy = () => {
  return (
    <div className="mx-auto flex h-screen items-center justify-center">
      <div className="h-7/12 w-1/4 border border-white">
        <div className="mx-auto mt-6 h-3/6 w-3/4 bg-green-600"></div>
      </div>
    </div>
  );
};

const TradeContainer = ({
  trades,
  title,
}: {
  trades: Trade[];
  title: string;
}) => {
  return (
    <div className="my-8">
      <H2>{title}</H2>
      <div className="w-full rounded-lg border border-white">
        <div className="flex flex-col items-center justify-center">
          {trades.map((trade) => (
            <div
              key={trade.id}
              className="m-2 flex w-full items-center justify-between rounded-lg border border-white bg-gray-800 p-4"
            >
              <div className="flex flex-col">
                <span>{trade.id}</span>
                <span>{trade.isSeeking}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
