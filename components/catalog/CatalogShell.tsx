import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type CatalogShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  className?: string;
};

export function CatalogShell({
  eyebrow,
  title,
  description,
  children,
  className,
}: CatalogShellProps) {
  return (
    <div className="relative isolate min-h-[calc(100dvh-4rem)]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(ellipse_at_top,rgba(239,68,68,0.08),transparent_62%)] dark:bg-[radial-gradient(ellipse_at_top,rgba(239,68,68,0.14),transparent_58%)]"
      />
      <div
        className={cn(
          "relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8",
          className,
        )}
      >
        <header className="mb-8">
          <p className="mb-3 inline-flex items-center rounded-full bg-red-500/10 px-3 py-1 text-xs font-medium tracking-wide text-red-600 uppercase dark:text-red-400">
            {eyebrow}
          </p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            {title}
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl text-base text-pretty">
            {description}
          </p>
        </header>
        {children}
      </div>
    </div>
  );
}
