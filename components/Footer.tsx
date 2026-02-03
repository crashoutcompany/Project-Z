"use client";

import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="bg-background/80 border-t backdrop-blur-sm">
      <div className="container px-4 py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="md:col-span-2">
            <Link href="/" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-red-600 to-red-500"></div>
              <span className="bg-gradient-to-r from-red-600 to-red-500 bg-clip-text text-xl font-bold text-transparent">
                Pocket Trading
              </span>
            </Link>
            <p className="text-muted-foreground mt-4 max-w-md text-sm">
              The premier platform for trading Pokémon cards. Find, collect, and
              trade cards with collectors worldwide. Join our community of
              passionate Pokémon enthusiasts today.
            </p>
          </div>
          <div>
            <h3 className="mb-4 font-semibold">Navigation</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Home
                </Link>
              </li>
              <li>
                <Link
                  href="/trading"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Trading
                </Link>
              </li>
              <li>
                <Link
                  href="/collections"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Collections
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="mb-4 font-semibold">Legal</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="#"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cookie Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-12 border-t pt-8 text-center">
          <p className="text-muted-foreground text-sm">
            © {new Date().getFullYear()} Pocket Trading. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
