import { Suspense } from "react";
import { H1 } from "@/components/typography/headings";
import { BuilderClient } from "./BuilderClient";

export default function BuilderPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <H1>Deck Builder</H1>
      <p className="text-muted-foreground mb-6">
        Build a 20-card Pokémon TCG Pocket deck. Share it with a link.
      </p>
      <Suspense
        fallback={<p className="text-muted-foreground">Loading builder…</p>}
      >
        <BuilderClient />
      </Suspense>
    </div>
  );
}
