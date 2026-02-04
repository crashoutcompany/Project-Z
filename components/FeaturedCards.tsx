import Link from "next/link";
import Image from "next/image";

import { Button } from "@/components/ui/button";

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
        image: "/tcgpocket/th/geneticapex/36.jpg",
      },
      {
        id: 2,
        name: "Pikachu EX",
        type: "Electric",
        rarity: "Rare",
        price: 49.99,
        rating: 4.8,
        image: "/tcgpocket/th/geneticapex/285.jpg",
      },
      {
        id: 3,
        name: "Mewtwo EX",
        type: "Psychic",
        rarity: "Ultra Rare",
        price: 199.99,
        rating: 4.7,
        image: "/tcgpocket/th/geneticapex/129.jpg",
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
        image: "/tcgpocket/th/space-time-smackdown/49.jpg",
      },
      {
        id: 6,
        name: "Rayquaza V",
        type: "Dragon",
        rarity: "Alt Art",
        price: 279.99,
        rating: 4.9,
        image: "/tcgpocket/th/space-time-smackdown/50.jpg",
      },
      {
        id: 7,
        name: "Umbreon VMAX",
        type: "Dark",
        rarity: "Alt Art",
        price: 399.99,
        rating: 4.9,
        image: "/tcgpocket/th/space-time-smackdown/51.jpg",
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
        image: "/tcgpocket/th/mythical-islands/31.jpg",
      },
      {
        id: 10,
        name: "Arceus V",
        type: "Normal",
        rarity: "Ultra Rare",
        price: 79.99,
        rating: 4.6,
        image: "/tcgpocket/th/mythical-islands/32.jpg",
      },
      {
        id: 11,
        name: "Pikachu VMAX",
        type: "Electric",
        rarity: "Ultra Rare",
        price: 89.99,
        rating: 4.8,
        image: "/tcgpocket/th/genetic-apex/5.jpg",
      },
    ],
  };

  const cards = cardData[category as keyof typeof cardData];

  return (
    <div className="mx-auto grid w-fit grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => (
        <div key={card.id}>
          <Image
            src={`https://serebii.net${card.image.replace("/th", "")}`}
            alt={card.name}
            width={300}
            height={450}
            className="object-cover transition-transform duration-500 group-hover:scale-110"
          />

          <div className="absolute inset-x-0 bottom-0 z-20 translate-y-full p-4 transition-transform group-hover:translate-y-0">
            <Button
              className="w-full rounded-full"
              render={<Link href={`/collections`}>View Details</Link>}
            ></Button>
          </div>
        </div>
      ))}
    </div>
  );
}
