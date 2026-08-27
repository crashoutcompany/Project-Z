import Link from "next/link";
import { Menu } from "lucide-react";
import { appendFileSync } from "node:fs";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ModeToggle } from "@/next-themes/modetoggle";
import { auth } from "@/lib/auth";
import { AuthButton } from "./client/buttons";
import { headers } from "next/headers";

export const Navbar = async () => {
  const requestHeaders = await headers();
  // #region agent log
  // eslint-disable-next-line react-hooks/purity
  appendFileSync("/opt/cursor/logs/debug.log", `${JSON.stringify({ hypothesisId: "B,D", location: "components/Navbar.tsx:Navbar:entry", message: "Navbar entered with component types and request classification", data: { types: { Link: typeof Link, Menu: typeof Menu, Button: typeof Button, Sheet: typeof Sheet, SheetContent: typeof SheetContent, SheetTrigger: typeof SheetTrigger, ModeToggle: typeof ModeToggle, AuthButton: typeof AuthButton }, request: { hasRscHeader: requestHeaders.has("rsc"), fetchMode: requestHeaders.get("sec-fetch-mode"), fetchSite: requestHeaders.get("sec-fetch-site"), cookieNames: requestHeaders.get("cookie")?.split(";").map((cookie) => cookie.trim().split("=")[0]).filter(Boolean) ?? [] } }, timestamp: Date.now() })}\n`);
  // #endregion
  const session = await auth.api.getSession({
    headers: requestHeaders,
  });
  // #region agent log
  // eslint-disable-next-line react-hooks/purity
  appendFileSync("/opt/cursor/logs/debug.log", `${JSON.stringify({ hypothesisId: "B,D", location: "components/Navbar.tsx:Navbar:after-session", message: "Navbar session lookup completed", data: { hasSession: Boolean(session), hasUser: Boolean(session?.user) }, timestamp: Date.now() })}\n`);
  // #endregion
  console.log(session);
  // #region agent log
  // eslint-disable-next-line react-hooks/purity
  appendFileSync("/opt/cursor/logs/debug.log", `${JSON.stringify({ hypothesisId: "B", location: "components/Navbar.tsx:Navbar:before-return", message: "Navbar returning shared component tree", data: { authBranch: session ? "authenticated" : "anonymous" }, timestamp: Date.now() })}\n`);
  // #endregion
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
};
