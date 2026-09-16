import { Suspense } from "react";
import { CardBrowser } from "@/components/CardBrowser";
import { CatalogShell } from "@/components/catalog/CatalogShell";
import { CatalogLoading } from "@/components/catalog/CatalogLoading";

export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ set?: string; card?: string }>;
}) {
  return (
    <CatalogShell
      eyebrow="Dex"
      title="Card Dex"
      description="Browse every Pokémon TCG Pocket card by set, name, or effect. Tap a card to read its attacks and text."
    >
      <Suspense fallback={<CatalogLoading embedded />}>
        <DexCatalog searchParams={searchParams} />
      </Suspense>
    </CatalogShell>
  );
}

async function DexCatalog({
  searchParams,
}: {
  searchParams: Promise<{ set?: string; card?: string }>;
}) {
  const { set, card } = await searchParams;
  return (
    <CardBrowser
      mode="view"
      initialSetCode={set}
      initialCardRef={card}
      syncDexUrl
    />
  );
}
