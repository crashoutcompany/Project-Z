import { CardBrowser } from "@/components/CardBrowser";
import { H1 } from "@/components/typography/headings";
import { connection } from "next/server";

export default async function Page() {
  // Next.js 16: Signal that this component uses dynamic data
  await connection();

  return (
    <div className="m-16">
      <H1>Card Dex</H1>
      <p className="text-muted-foreground mb-6">
        Browse all available cards across different sets.
      </p>
      <CardBrowser mode="view" />
    </div>
  );
}
