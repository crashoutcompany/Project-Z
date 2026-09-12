import Link from "next/link";
import Image from "next/image";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FeaturedCardsProps {
  category: "trending" | "rare" | "new" | "deals";
}

export default function FeaturedCards({ category }: FeaturedCardsProps) {
  // Mock data for different categories
  const cardData = {
    trending: [
      {
        id: 1,
        name: "Charizard EX",
        type: "Fire",
        rarity: "Ultra Rare",
        price: 299.99,
        rating: 4.9,
        image: "https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/pocket/A1/A1_036_EN.webp",
      },
      {
        id: 2,
        name: "Pikachu EX",
        type: "Electric",
        rarity: "Rare",
        price: 49.99,
        rating: 4.8,
        image: "https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/pocket/A1/A1_285_EN.webp",
      },
      {
        id: 3,
        name: "Mewtwo EX",
        type: "Psychic",
        rarity: "Ultra Rare",
        price: 199.99,
        rating: 4.7,
        image: "https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/pocket/A1/A1_129_EN.webp",
      },
    ],
    rare: [
      {
        id: 5,
        name: "Lugia GX",
        type: "Psychic",
        rarity: "Secret Rare",
        price: 349.99,
        rating: 5.0,
        image: "https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/pocket/A2/A2_049_EN.webp",
      },
      {
        id: 6,
        name: "Rayquaza V",
        type: "Dragon",
        rarity: "Alt Art",
        price: 279.99,
        rating: 4.9,
        image: "https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/pocket/A2/A2_050_EN.webp",
      },
      {
        id: 7,
        name: "Umbreon VMAX",
        type: "Dark",
        rarity: "Alt Art",
        price: 399.99,
        rating: 4.9,
        image: "https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/pocket/A2/A2_051_EN.webp",
      },
    ],
    new: [
      {
        id: 9,
        name: "Mew VMAX",
        type: "Psychic",
        rarity: "Hyper Rare",
        price: 129.99,
        rating: 4.7,
        image: "https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/pocket/A1a/A1a_031_EN.webp",
      },
      {
        id: 10,
        name: "Arceus V",
        type: "Normal",
        rarity: "Ultra Rare",
        price: 79.99,
        rating: 4.6,
        image: "https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/pocket/A2a/A2a_071_EN.webp",
      },
      {
        id: 11,
        name: "Pikachu VMAX",
        type: "Electric",
        rarity: "Ultra Rare",
        price: 89.99,
        rating: 4.8,
        image: "https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/pocket/A1/A1_005_EN.webp",
      },
    ],
  };

  const cards = cardData[category as keyof typeof cardData];

  return (
    <div className="mx-auto grid w-fit grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => (
        <div key={card.id}>
          <Image
            src={card.image}
            alt={card.name}
            width={300}
            height={450}
            className="object-cover transition-transform duration-500 group-hover:scale-110"
          />

          <div className="absolute inset-x-0 bottom-0 z-20 translate-y-full p-4 transition-transform group-hover:translate-y-0">
            <Link
              href="/collections"
              className={cn(buttonVariants(), "w-full rounded-full")}
            >
              View Details
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}
