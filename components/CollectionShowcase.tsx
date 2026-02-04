import Link from "next/link";
import Image from "next/image";
import { ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function CollectionShowcase() {
  const collections = [
    {
      id: 1,
      name: "Genetic Apex",
      releaseYear: 2024,
      cardCount: 226,
      image: "https://serebii.net/tcgpocket/geneticapex/mewtwo.jpg",
      color: "from-red-600 to-red-500",
    },
    {
      id: 2,
      name: "Mythical Island",
      releaseYear: 2025,
      cardCount: 68,
      image: "https://serebii.net/tcgpocket/mythicalisland/mew.jpg",
      color: "from-red-500 to-red-400",
    },
    {
      id: 3,
      name: "Triumphant Light",
      releaseYear: 2025,
      cardCount: 75,
      image: "https://serebii.net/tcgpocket/triumphantlight/arceus.jpg",
      color: "from-red-600 to-red-500",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
      {collections.map((collection) => (
        <div
          key={collection.id}
          className="group relative overflow-hidden rounded-2xl shadow-lg"
        >
          <div className="absolute inset-0 z-10 bg-gradient-to-b from-transparent via-transparent to-black/80" />
          <div
            className={`absolute inset-0 bg-gradient-to-r ${collection.color} opacity-30 transition-opacity group-hover:opacity-40`}
          />

          <div className="relative aspect-[4/3]">
            <Image
              src={collection.image || "/back.png"}
              alt={collection.name}
              width={600}
              height={400}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
          </div>

          <div className="absolute inset-x-0 bottom-0 z-20 p-6">
            <Badge className="mb-2 bg-white/20 text-white hover:bg-white/30">
              {collection.releaseYear}
            </Badge>
            <h3 className="mb-1 text-2xl font-bold text-white">
              {collection.name}
            </h3>
            <p className="mb-4 text-white/80">{collection.cardCount} cards</p>
            <Button
              size="sm"
              variant="secondary"
              className="rounded-full"
              render={
                <Link href={`/collections/${collection.id}`}>
                  View Collection
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Link>
              }
            ></Button>
          </div>
        </div>
      ))}
    </div>
  );
}
