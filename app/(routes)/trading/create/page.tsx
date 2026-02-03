import prisma from "@/prisma/db";
import { TradingCreateClient } from "./TradingCreateClient";
import { CardWithSet } from "@/components/CardBrowser/types";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

const INITIAL_LIMIT = 20;

export default async function Page() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/signin");
  }

  // Fetch all sets
  const sets = await prisma.set.findMany({
    orderBy: { id: "asc" },
  });

  if (sets.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">No card sets available.</p>
      </div>
    );
  }

  // Fetch initial tradeable cards for the first set
  const initialSetId = sets[0].id;
  const initialCards = await prisma.card.findMany({
    take: INITIAL_LIMIT + 1,
    where: {
      setId: initialSetId,
      isTradeable: true,
    },
    orderBy: { id: "asc" },
    include: {
      set: true,
    },
  });

  let initialCursor: number | null = null;
  if (initialCards.length > INITIAL_LIMIT) {
    const lastItem = initialCards.pop();
    initialCursor = lastItem?.id ?? null;
  }

  return (
    <TradingCreateClient
      sets={sets}
      initialSetId={initialSetId}
      initialCards={initialCards as CardWithSet[]}
      initialCursor={initialCursor}
    />
  );
}
