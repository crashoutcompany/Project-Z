import { Suspense } from "react";
import { fetchSetsWithCards } from "@/server/actions";
import { CollectionStats } from "./CollectionStats";
import { CatalogShell } from "@/components/catalog/CatalogShell";
import { CatalogLoading } from "@/components/catalog/CatalogLoading";

export default function Page() {
  return (
    <CatalogShell
      eyebrow="Collection"
      title="My Collection"
      description="Track which cards you own and see your completion progress for each set."
    >
      <Suspense fallback={<CatalogLoading embedded />}>
        <CollectionPage />
      </Suspense>
    </CatalogShell>
  );
}

async function CollectionPage() {
  const sets = await fetchSetsWithCards();
  return <CollectionStats sets={sets} />;
}
