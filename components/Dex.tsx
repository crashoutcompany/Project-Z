import Link from "next/link";
import LazyImage from "./LazyImage";
import prisma from "@/prisma/db";

export const CardDex = ({
  cards,
}: {
  cards: Awaited<
    ReturnType<
      typeof prisma.card.findMany<{ include: { details: true; set: true } }>
    >
  >;
}) => (
  <div className="grid grid-cols-2 place-content-center gap-y-4 p-4 md:grid-cols-3 lg:grid-cols-6">
    {cards.map((card, index) => (
      <Link
        target="_blank"
        rel="noopener noreferrer"
        href={`https://serebii.net/${card.url}`}
        key={`${card.name}-${index}`}
        className="flex flex-col items-center"
      >
        <LazyImage
          className="rounded-lg select-none"
          key={`${card.name}-${index}`}
          src={`https://serebii.net${card.thumbnail.replace("/th", "")}`}
          alt={`${card.name} Card`}
          width={200}
          height={300}
          draggable={false}
        />
        {/* <div>Expansion {card.expansion}</div>
        <div>HP {card.details.hp}</div>
        <div>Retreat {card.details.retreat.count}</div>
        <div>Type {card.details.type.split("/").at(-1)?.split(".").at(0)}</div>
        <div>Weakness {card.details.weakness.value}</div> */}
      </Link>
    ))}
  </div>
);
