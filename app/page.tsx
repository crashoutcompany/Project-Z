import Link from "next/link";
import { ChevronRight, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FeaturedCards from "@/components/FeaturedCards";
import CollectionShowcase from "@/components/CollectionShowcase";
import SiteFooter from "@/components/Footer";
import HeroSection from "@/app/(routes)/home/Hero";
import { Separator } from "@/components/ui/separator";

export default function HomePage() {
  const bannerStats = [
    { label: "Active Traders", value: "10,000+" },
    { label: "Cards Available", value: "25,000+" },
    { label: "Card Sets", value: "120+" },
    { label: "Trades Completed", value: "50,000+" },
  ];
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-white to-gray-100 dark:from-gray-950 dark:to-gray-900">
      <main className="flex-1">
        {/* Hero Section */}
        <HeroSection />
        {/* Banner Section */}
        <section className="border-y backdrop-blur-sm dark:bg-red-600">
          <div className="p-3">
            <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
              {bannerStats.map((stat, index) => (
                <div key={index} className="text-center">
                  <p className="text-3xl font-bold text-black md:text-4xl dark:text-white">
                    {stat.value}
                  </p>
                  <p className="text-sm font-bold text-black dark:text-black">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Featured Cards Section */}
        <section className="my-16 md:my-24">
          <div className="">
            <div className="mb-12 flex flex-col items-center text-center">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-red-500/10 px-4 py-1.5 text-sm font-medium text-red-500">
                <Sparkles className="h-4 w-4" />
                Featured Cards
              </div>
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
                Discover Rare Finds
              </h2>
              <p className="text-muted-foreground mt-4 max-w-2xl">
                Browse through our curated selection of the most sought-after
                Pokémon cards
              </p>
            </div>

            <Tabs defaultValue="trending" className="w-full">
              <div className="mb-8 flex justify-center">
                <TabsList className="rounded-full p-1">
                  <TabsTrigger
                    value="trending"
                    className="cursor-pointer rounded-full"
                  >
                    Trending
                  </TabsTrigger>
                  <TabsTrigger
                    value="rare"
                    className="cursor-pointer rounded-full"
                  >
                    Rare Finds
                  </TabsTrigger>
                  <TabsTrigger
                    value="new"
                    className="cursor-pointer rounded-full"
                  >
                    New Arrivals
                  </TabsTrigger>
                </TabsList>
              </div>
              <TabsContent value="trending">
                <FeaturedCards category="trending" />
              </TabsContent>
              <TabsContent value="rare">
                <FeaturedCards category="rare" />
              </TabsContent>
              <TabsContent value="new">
                <FeaturedCards category="new" />
              </TabsContent>
            </Tabs>

            <div className="mt-12 flex justify-center">
              <Button
                variant="outline"
                className="rounded-full"
                render={
                  <Link href="/collections">
                    View All Cards
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Link>
                }
              ></Button>
            </div>
          </div>
        </section>

        {/* Collections Showcase */}
        <section className="m-16">
          <div className="px-2">
            <div className="mb-12 flex flex-col items-center text-center">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-red-500/10 px-4 py-1.5 text-sm font-medium text-red-500">
                <Sparkles className="h-4 w-4" />
                Card Sets
              </div>
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
                Explore Collections
              </h2>
              <p className="text-muted-foreground mt-4 max-w-2xl">
                Discover complete Pokémon card sets from every generation
              </p>
            </div>

            <CollectionShowcase />

            <div className="mt-12 flex justify-center">
              <Button
                className="rounded-full"
                render={
                  <Link href="/collections">
                    Browse All Collections
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Link>
                }
              ></Button>
            </div>
          </div>
        </section>

        <Separator />

        {/* How It Works */}
        <section className="py-16 md:py-24">
          <div className="">
            <div className="mb-12 flex flex-col items-center text-center">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-red-500/10 px-4 py-1.5 text-sm font-medium text-red-500">
                <Sparkles className="h-4 w-4" />
                Simple Process
              </div>
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
                How Trading Works
              </h2>
              <p className="text-muted-foreground mt-4 max-w-2xl">
                Our platform makes it easy to connect with other collectors and
                trade cards
              </p>
            </div>

            <div className="mx-auto grid max-w-4xl grid-cols-1 gap-8 md:grid-cols-3">
              {[
                {
                  step: "01",
                  title: "Browse Collections",
                  description:
                    "Explore our extensive catalog of Pokémon cards organized by sets",
                },
                {
                  step: "02",
                  title: "Create Trade Offers",
                  description:
                    "Select cards you want to trade and cards you're looking for",
                },
                {
                  step: "03",
                  title: "Complete Trades",
                  description:
                    "Connect with other collectors and finalize your trades",
                },
              ].map((item, index) => (
                <Card
                  key={index}
                  className="bg-background/50 border-none shadow-md backdrop-blur-sm"
                >
                  <CardContent className="pt-6">
                    <div className="flex flex-col items-center text-center">
                      <div className="bg-primary/10 text-primary mb-4 flex h-12 w-12 items-center justify-center rounded-full font-bold">
                        {item.step}
                      </div>
                      <h3 className="mb-2 text-xl font-bold">{item.title}</h3>
                      <p className="text-muted-foreground">
                        {item.description}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-gradient-to-r from-red-600/90 to-red-500/90 py-16 text-white md:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="mb-6 text-3xl font-bold tracking-tight md:text-4xl">
              Ready to Start Your Trading Journey?
            </h2>
            <p className="mb-8 text-lg text-white/80">
              Join thousands of Pokémon enthusiasts and start building your
              dream collection today.
            </p>
            <div className="flex flex-col justify-center gap-4 sm:flex-row">
              <Button
                size="lg"
                variant="secondary"
                className="rounded-full"
                render={<Link href="/trading">Start Trading Now</Link>}
              ></Button>
              <Button
                size="lg"
                variant="outline"
                className="rounded-full border-white bg-transparent text-white hover:bg-white/20"
                render={<Link href="/collections">Explore Collections</Link>}
              ></Button>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

// Pocket Trading dot com

// const styles = {
//   textShadow: "2px 2px 4px rgba(0, 0, 0, 0.5)",
//   position: "relative",
//   zIndex: 10,
// } as const;
// const Hero = () => (
//   <div className="relative text-center">
//     <div style={styles} className="text-5xl font-bold">
//       Trade. Share. Game
//     </div>
//     <p style={styles}>
//       Your Pocket Trading Hub. Create trades to share with others.
//     </p>
//     <div className="pointer-events-none absolute inset-4 h-60 w-60 -translate-1/2 translate-x-16 scale-150 rounded-full bg-gradient-to-b from-red-500 from-40% via-black via-50% to-white to-50% blur-3xl" />
//     <div className="my-2 flex gap-5">
//       <Button variant="secondary" className="flex-[1] hover:bg-red-600" asChild>
//         <Link href="/dex">Pokedex</Link>
//       </Button>
//       <Button className="flex-[1]" asChild>
//         <Link href="/trading">Trades</Link>
//       </Button>
//     </div>
//     <PokeBall />
//   </div>
// );

// // Create pokeball using layers and conic gradients
// const PokeBall = () => <></>;
