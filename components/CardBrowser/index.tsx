import prisma from "@/prisma/db";
import { CardBrowserClient } from "./CardBrowserClient";
import { CardBrowserProps, CardWithSet } from "./types";

const INITIAL_LIMIT = 20;

export async function CardBrowser({
  mode,
  tradeableOnly = false,
  onSelectionChange,
  initialSelected,
}: CardBrowserProps) {
  // Fetch all sets
  const sets = await prisma.set.findMany({
    orderBy: { id: "asc" },
  });

  if (sets.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">No card sets found.</p>
      </div>
    );
  }

  // Fetch initial cards for the first set
  const initialSetId = sets[0].id;
  const initialCards = await prisma.card.findMany({
    take: INITIAL_LIMIT + 1,
    where: {
      setId: initialSetId,
      ...(tradeableOnly && { isTradeable: true }),
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
    <CardBrowserClient
      sets={sets}
      initialSetId={initialSetId}
      initialCards={initialCards as CardWithSet[]}
      initialCursor={initialCursor}
      mode={mode}
      tradeableOnly={tradeableOnly}
      onSelectionChange={onSelectionChange}
      initialSelected={initialSelected}
    />
  );
}

export { CardBrowserClient } from "./CardBrowserClient";
export type {
  CardBrowserProps,
  CardWithSet,
  SelectedCards,
  SelectionMode,
} from "./types";
