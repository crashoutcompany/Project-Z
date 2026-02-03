import { H2, H3 } from "@/components/typography/headings";
import { Search } from "../_components/_client/Search";
import prisma from "@/prisma/db";
import { CardPagination } from "../_components/_client/PaginationButtons";
import { Card } from "@/prisma/generated/client/client";
import { toast } from "sonner";
import { TradingArea } from "../_components/_client/TradingArea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default async function Page(props: {
  searchParams?: Promise<{
    card?: string;
    page?: string;
  }>;
}) {
  const searchParams = await props.searchParams;
  const query = searchParams?.card || "";
  const currentPage = Number(searchParams?.page) || 1;

  let cards: Card[] = [];
  let cardsCount = 0;
  try {
    const [c, count] = await Promise.all([
      prisma.card.findMany({
        take: 20,
        skip: (currentPage - 1) * 20,
        where: {
          name: {
            startsWith: query,
            mode: "insensitive",
          },
          AND: { isTradeable: true },
        },
      }),
      prisma.card.count({
        where: {
          name: {
            startsWith: query,
            mode: "insensitive",
          },
          AND: { isTradeable: true },
        },
      }),
    ]);
    cards = c;
    cardsCount = count;
  } catch (error) {
    console.error("Error fetching cards:", error);
    toast.error("Failed to fetch cards. Please try again.");
  }

  return (
    <div className="space-y-5">
      <div>
        <H3>Instructions:</H3>
        <p className="text-muted-foreground text-sm">
          Drag cards to the trade zone to create a trade. You can also search
          for cards by name.
        </p>
        <p className="text-muted-foreground text-sm">
          When you are done click the next button to move onto the next step.
        </p>
      </div>
      <Alert className="w-fit">
        <AlertTitle>Can&apos;t find a card?</AlertTitle>
        <AlertDescription>
          Some cards aren&apos;t available for trade. Please ensure you&apos;re
          spelling the name correctly.
        </AlertDescription>
      </Alert>
      <Search />
      <TradingArea cards={cards} />
      <CardPagination count={cardsCount} page={currentPage} />
    </div>
  );
}
