import fs from "node:fs";
import path from "node:path";
import { SourcePayloadSchema } from "../lib/source-schema";
import { sampleCardsPerSet, SEED_CARDS_PER_SET } from "../lib/sample-cards";

const PINNED_COMMIT_SHA = "dc4a37d4fb7978265a27836b893d8f8b3aabee56";
const SOURCE_URL = `https://raw.githubusercontent.com/marcelpanse/tcg-pocket-collection-tracker/${PINNED_COMMIT_SHA}/frontend/assets/cards.json`;

async function main() {
  const res = await fetch(SOURCE_URL);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${SOURCE_URL}: ${res.status}`);
  }
  const parsed = SourcePayloadSchema.safeParse(await res.json());
  if (!parsed.success) {
    throw new Error("Source payload failed Zod schema validation.");
  }
  const sampled = sampleCardsPerSet(parsed.data, SEED_CARDS_PER_SET);
  const out = path.resolve(__dirname, "cards-sample.json");
  fs.writeFileSync(out, `${JSON.stringify(sampled)}\n`);
  console.log(`Wrote ${sampled.length} cards to ${out}`);
}

void main();
