import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { CatalogShell } from "@/components/catalog/CatalogShell";
import { CatalogLoading } from "@/components/catalog/CatalogLoading";
import { loadCardCatalog } from "@/components/CardBrowser";
import { TradingCreateClient } from "./TradingCreateClient";

export default function Page() {
  return (
    <CatalogShell
      eyebrow="Trading"
      title="Create a Trade"
      description="Pick cards you want and cards you’ll give. Click a card in the catalog to add it."
    >
      <Suspense fallback={<CatalogLoading embedded />}>
        <CreateTradeContent />
      </Suspense>
    </CatalogShell>
  );
}

async function CreateTradeContent() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/signin");
  }

  const data = await loadCardCatalog({ tradeableOnly: true });
  return <TradingCreateClient {...data} />;
}
