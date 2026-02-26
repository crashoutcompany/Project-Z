import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ChevronRight, Filter, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import SiteHeader from "@/components/Header";
import SiteFooter from "@/components/Footer";

export default function CollectionsPage() {
  // Mock data for card sets
  const cardSets = [
    {
      id: 1,
      name: "Base Set",
      releaseYear: 1999,
      cardCount: 102,
      image: "/back.png",
      color: "from-red-600 to-red-500",
    },
    {
      id: 2,
      name: "Jungle",
      releaseYear: 1999,
      cardCount: 64,
      image: "/back.png",
      color: "from-red-500 to-red-400",
    },
    {
      id: 3,
      name: "Fossil",
      releaseYear: 1999,
      cardCount: 62,
      image: "/back.png",
      color: "from-red-600 to-red-500",
    },
    {
      id: 4,
      name: "Team Rocket",
      releaseYear: 2000,
      cardCount: 83,
      image: "/back.png",
      color: "from-red-500 to-red-400",
    },
    {
      id: 5,
      name: "Gym Heroes",
      releaseYear: 2000,
      cardCount: 132,
      image: "/back.png",
      color: "from-red-600 to-red-500",
    },
    {
      id: 6,
      name: "Gym Challenge",
      releaseYear: 2000,
      cardCount: 132,
      image: "/back.png",
      color: "from-red-500 to-red-400",
    },
    {
      id: 7,
      name: "Neo Genesis",
      releaseYear: 2000,
      cardCount: 111,
      image: "/back.png",
      color: "from-red-600 to-red-500",
    },
    {
      id: 8,
      name: "Neo Discovery",
      releaseYear: 2001,
      cardCount: 75,
      image: "/back.png",
      color: "from-red-500 to-red-400",
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-white to-gray-100 dark:from-gray-950 dark:to-gray-900">
      <SiteHeader />

      <main className="flex-1">
        <div className="container px-4 py-8">
          <div className="mb-8 flex items-center">
            <Button
              variant="ghost"
              size="icon"
              className="mr-2"
              render={
                <Link href="/">
                  <ArrowLeft className="h-5 w-5" />
                </Link>
              }
            ></Button>
            <h1 className="text-3xl font-bold">Card Collections</h1>
          </div>

          <Tabs defaultValue="sets" className="w-full">
            <TabsList className="mb-8 grid w-full grid-cols-2 rounded-full p-1">
              <TabsTrigger value="sets" className="rounded-full">
                Card Sets
              </TabsTrigger>
              <TabsTrigger value="my-collection" className="rounded-full">
                My Collection
              </TabsTrigger>
            </TabsList>

            <TabsContent value="sets" className="space-y-6">
              <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
                <div className="relative w-full md:w-64">
                  <Search className="text-muted-foreground absolute top-2.5 left-3 h-4 w-4" />
                  <Input
                    placeholder="Search sets..."
                    className="rounded-full pl-9"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Select defaultValue="all">
                    <SelectTrigger className="w-[180px] rounded-full">
                      <SelectValue placeholder="Filter by year" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Years</SelectItem>
                      <SelectItem value="1999">1999</SelectItem>
                      <SelectItem value="2000">2000</SelectItem>
                      <SelectItem value="2001">2001</SelectItem>
                      <SelectItem value="2002">2002</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="icon"
                    className="rounded-full"
                  >
                    <Filter className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {cardSets.map((set) => (
                  <div
                    key={set.id}
                    className="group relative overflow-hidden rounded-2xl shadow-lg"
                  >
                    <div className="absolute inset-0 z-10 bg-gradient-to-b from-transparent via-transparent to-black/80" />
                    <div
                      className={`absolute inset-0 bg-gradient-to-r ${set.color} opacity-30 transition-opacity group-hover:opacity-40`}
                    />

                    <div className="relative aspect-[4/3]">
                      <Image
                        src={set.image || "/back.png"}
                        alt={set.name}
                        width={600}
                        height={400}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    </div>

                    <div className="absolute inset-x-0 bottom-0 z-20 p-4">
                      <Badge className="mb-2 rounded-full bg-white/20 text-white hover:bg-white/30">
                        {set.releaseYear}
                      </Badge>
                      <h3 className="mb-1 text-xl font-bold text-white">
                        {set.name}
                      </h3>
                      <p className="mb-3 text-sm text-white/80">
                        {set.cardCount} cards
                      </p>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="rounded-full"
                        render={
                          <Link href={`/collections/${set.id}`}>
                            View Set
                            <ChevronRight className="ml-1 h-4 w-4" />
                          </Link>
                        }
                      ></Button>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="my-collection">
              <div className="bg-background/50 flex h-64 items-center justify-center rounded-xl border backdrop-blur-sm">
                <div className="text-center">
                  <h3 className="mb-2 text-lg font-medium">
                    Track Your Collection
                  </h3>
                  <p className="text-muted-foreground mb-4 max-w-md">
                    Create an account to track your cards and see your
                    collection progress
                  </p>
                  <Button className="rounded-full">Create Account</Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
