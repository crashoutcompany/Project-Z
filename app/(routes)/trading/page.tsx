import { auth } from "@/app/auth";
import { redirect } from "next/navigation";
import prisma from "@/prisma/db";
import { sleep } from "@/lib/utils";
import { H2 } from "@/components/typography/headings";
import { Trade } from "@/prisma/generated/client/client";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function TradingPage() {
  const session = await auth();
  if (!session) redirect("/signin");

  const identifier = `${session.user?.email}.${session.user?.["provider" as keyof typeof session.user]}`;
  console.log({ identifier });

  // Maybe make each one fetch it's own data, so we're not waiting for all of them to load
  const [allTrades, userTrades] = await Promise.all([
    prisma.trade.findMany({
      include: { cards: { select: { name: true, image: true } } },
    }),
    prisma.trade.findMany({
      where: { identifier },
      include: { cards: { select: { name: true, image: true } } },
    }),
  ]);

  return (
    <>
      <Button asChild>
        <Link className="cursor-pointer" href="/trading/create">
          Make a trade
        </Link>
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
