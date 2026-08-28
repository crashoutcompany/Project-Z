import Link from "next/link";
import { Menu } from "lucide-react";

import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ModeToggle } from "@/next-themes/modetoggle";
import { auth } from "@/lib/auth";
import { AuthButton } from "./client/buttons";
import { headers } from "next/headers";

export const Navbar = async () => {
  const requestHeaders = await headers();
  const session = await auth.api.getSession({
    headers: requestHeaders,
  });
  return (
    <header className="bg-background/80 sticky top-0 z-50 w-full border-b backdrop-blur-sm">
      <div className="mx-5 flex h-16 items-center">
        <div className="flex items-center gap-6 md:gap-10">
          <Link href="/" className="flex items-start gap-2">
            <span className="bg-gradient-to-r from-red-600 to-red-500 bg-clip-text text-xl font-bold text-transparent">
              Pocket Trading
            </span>
          </Link>
          <nav className="hidden items-center gap-6 md:flex">
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
            <Link
              href="/dex"
              className="text-sm font-medium transition-colors hover:text-red-500"
            >
              Dex
            </Link>
            <ModeToggle />
            <AuthButton hideOnSmallScreens={true} session={session} />
          </nav>
        </div>

        <div className="ml-auto flex items-center">
          <Sheet>
            <SheetTrigger
              nativeButton
              className="focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 hover:bg-muted dark:hover:bg-muted/50 aria-expanded:bg-muted aria-expanded:text-foreground size-9 shrink-0 cursor-pointer rounded-md border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all select-none outline-none hover:text-foreground focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50 md:hidden [&_svg]:pointer-events-none [&_svg]:shrink-0"
            >
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle menu</span>
            </SheetTrigger>
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
};
