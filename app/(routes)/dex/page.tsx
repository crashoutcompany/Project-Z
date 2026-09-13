import { Suspense } from "react";
import { CardBrowser } from "@/components/CardBrowser";
import { CatalogShell } from "@/components/catalog/CatalogShell";
import { CatalogLoading } from "@/components/catalog/CatalogLoading";

export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ set?: string }>;
}) {
  return (
    <CatalogShell
      eyebrow="Dex"
      title="Card Dex"
      description="Browse every Pokémon TCG Pocket card by set, name, or effect."
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
  searchParams: Promise<{ set?: string }>;
}) {
  const { set } = await searchParams;
  return <CardBrowser mode="view" initialSetCode={set} />;
}
