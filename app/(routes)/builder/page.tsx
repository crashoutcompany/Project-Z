import { Suspense } from "react";
import { CatalogShell } from "@/components/catalog/CatalogShell";
import { CatalogLoading } from "@/components/catalog/CatalogLoading";
import { loadCardCatalog } from "@/components/CardBrowser";
import { BuilderClient } from "./BuilderClient";

export default function BuilderPage() {
  return (
    <CatalogShell
      eyebrow="Builder"
      title="Deck Builder"
      description="Build a 20-card Pokémon TCG Pocket deck. Click cards to add them, then share a link."
    >
      <Suspense fallback={<CatalogLoading embedded sidebar />}>
        <BuilderPageContent />
      </Suspense>
    </CatalogShell>
  );
}

async function BuilderPageContent() {
  const data = await loadCardCatalog();
  return (
    <Suspense fallback={<CatalogLoading embedded sidebar />}>
      <BuilderClient {...data} />
    </Suspense>
  );
}
