import { runImport } from "../scripts/import-cards";
import { SEED_CARDS_PER_SET } from "../scripts/lib/sample-cards";
import prisma from "./db";

async function main() {
  console.log("🌱 Running database seed...");
  // Lightweight sample for Cloud Agent snapshots and local bootstraps.
  // Full catalog + Blob uploads stay on `pnpm import:cards`.
  await runImport({ skipUpload: true, perSetLimit: SEED_CARDS_PER_SET });
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
