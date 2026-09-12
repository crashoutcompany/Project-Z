import LazyImage from "./LazyImage";
import prisma from "@/prisma/db";

export const CardDex = ({
  cards,
}: {
  cards: Awaited<
    ReturnType<
      typeof prisma.card.findMany<{ include: { set: true } }>
    >
  >;
}) => (
  <div className="grid grid-cols-2 place-content-center gap-y-4 p-4 md:grid-cols-3 lg:grid-cols-6">
    {cards.map((card, index) => (
      <a
        target="_blank"
        rel="noopener noreferrer"
        href={`https://pocket.limitlesstcg.com/cards/${card.set.code}/${card.number}`}
        key={`${card.name}-${index}`}
        className="flex flex-col items-center"
      >
        <LazyImage
          className="rounded-lg select-none"
          key={`${card.name}-${index}`}
          src={card.imageUrl}
          alt={`${card.name} Card`}
          width={200}
          height={300}
          draggable={false}
        />
      </a>
    ))}
  </div>
);
