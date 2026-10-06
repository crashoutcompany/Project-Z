import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "next-themes";
import { Navbar } from "@/components/Navbar";
import { Toaster } from "@/components/ui/sonner";
import { Suspense } from "react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Pocket Trading",
  description: "Generate trades and share.",
};

// Navbar skeleton for Suspense fallback
function NavbarSkeleton() {
  return (
    <header className="bg-background/80 sticky top-0 z-50 w-full border-b backdrop-blur-sm">
      <div className="mx-5 flex h-16 items-center">
        <div className="flex items-center gap-6 md:gap-10">
          <span className="bg-gradient-to-r from-red-600 to-red-500 bg-clip-text text-xl font-bold text-transparent">
            Pocket Trading
          </span>
        </div>
      </div>
    </header>
  );
}

/**
 * Dev-only render profiler. The dynamic import sits behind a build-time
 * NODE_ENV check so production bundles never include react-scan.
 */
async function DevReactScan() {
  if (process.env.NODE_ENV !== "development") return null;
  const { ReactScan } = await import("@/components/ReactScan");
  return <ReactScan />;
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <DevReactScan />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Toaster />
          <Suspense fallback={<NavbarSkeleton />}>
            <Navbar />
          </Suspense>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
