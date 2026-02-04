import Link from "next/link";
import { Menu } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export default function SiteHeader() {
  return (
    <header className="bg-background/80 sticky top-0 z-50 w-full border-b backdrop-blur-sm">
      <div className="container flex h-16 items-center">
        <div className="flex items-center gap-6 md:gap-10">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-red-600 to-red-500"></div>
            <span className="bg-gradient-to-r from-red-600 to-red-500 bg-clip-text text-xl font-bold text-transparent">
              PokéTrade
            </span>
          </Link>
          <nav className="hidden gap-6 md:flex">
            <Link
              href="/"
              className="text-sm font-medium transition-colors hover:text-red-500"
            >
              Home
            </Link>
            <Link
              href="/trading"
              className="text-sm font-medium transition-colors hover:text-red-500"
            >
              Trading
            </Link>
            <Link
              href="/collections"
              className="text-sm font-medium transition-colors hover:text-red-500"
            >
              Collections
            </Link>
          </nav>
        </div>

        <div className="ml-auto flex items-center">
          <Sheet>
            <SheetTrigger
              nativeButton
              render={
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle menu</span>
                </Button>
              }
            ></SheetTrigger>
            <SheetContent side="right">
              <nav className="mt-8 flex flex-col gap-4">
                <Link
                  href="/"
                  className="hover:text-primary text-lg font-medium transition-colors"
                >
                  Home
                </Link>
                <Link
                  href="/trading"
                  className="hover:text-primary text-lg font-medium transition-colors"
                >
                  Trading
                </Link>
                <Link
                  href="/collections"
                  className="hover:text-primary text-lg font-medium transition-colors"
                >
                  Collections
                </Link>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
