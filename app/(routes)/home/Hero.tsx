import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import Image from "next/image";

// TODO Change cards to 1 at a time and fade in/out on a timer
//? Cards will fall back like in a 3D space
export default function HeroSection() {
  const pokemon = [
    {
      name: "Arceus",
      position: "translate-y-8",
      url: "/tcgpocket/th/triumphantlight/71.jpg",
    },
    {
      name: "Dialga",
      position: "",
      url: "/tcgpocket/th/space-timesmackdown/119.jpg",
    },
    {
      name: "Mewtwo",
      position: "translate-y-12",
      url: "/tcgpocket/th/geneticapex/286.jpg",
    },
    {
      name: "Palkia",
      position: "translate-y-4",
      url: "/tcgpocket/th/space-timesmackdown/49.jpg",
    },
    {
      name: "Mew",
      position: "translate-y-16",
      url: "/tcgpocket/th/mythicalisland/77.jpg",
    },
    {
      name: "Pikachu",
      position: "translate-y-8",
      url: "/tcgpocket/th/geneticapex/285.jpg",
    },
  ];
  return (
    <section className="relative">
      {/* Background Pattern */}

      <div className="relative container px-4 py-16 md:py-24">
        <div className="mx-auto max-w-5xl">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
            <div className="space-y-6 text-center lg:text-left">
              <div className="bg-background inline-flex items-center rounded-full border px-4 py-1.5 text-sm font-medium">
                <span className="mr-2 flex h-2 w-2 rounded-full bg-red-500"></span>
                The ultimate Pokémon trading platform
              </div>
              <h1 className="text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
                Discover, Trade, and{" "}
                <span className="bg-gradient-to-r from-red-600 to-red-500 bg-clip-text text-transparent">
                  Complete
                </span>{" "}
                Your Collection
              </h1>
              <p className="text-muted-foreground mx-auto max-w-xl text-lg lg:mx-0">
                Connect with fellow trainers, find rare cards, and build your
                dream Pokémon card collection.
              </p>
              <div className="flex flex-col justify-center gap-4 sm:flex-row lg:justify-start">
                <Button
                  size="lg"
                  className="rounded-full"
                  render={
                    <Link href="/trading">
                      Start Trading
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Link>
                  }
                ></Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="rounded-full"
                  render={<Link href="/collections">Browse Collections</Link>}
                ></Button>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -inset-4 rounded-3xl bg-gradient-to-r from-red-500/20 via-red-400/20 to-white/30 opacity-70 blur-xl" />
              {/* <div className="pointer-events-none absolute inset-4 h-60 w-60 -translate-1/2 translate-x-16 scale-150 rounded-full bg-gradient-to-b from-red-500 from-40% via-black via-50% to-white to-50% blur-3xl" /> */}
              <div className="relative grid grid-cols-3 gap-3">
                {pokemon.map((card, index) => (
                  <div
                    key={index}
                    className={`transform ${card.position} transition-all duration-500 hover:z-10 hover:scale-105`}
                  >
                    <div className="aspect-[2/3] overflow-hidden rounded-xl shadow-lg">
                      <Image
                        src={`https://serebii.net${card.url.replace("/th", "")}`}
                        alt={`${card.name} card`}
                        width={200}
                        height={300}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
