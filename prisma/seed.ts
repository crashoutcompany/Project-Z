import { TESTER_EMAIL, TESTER_ID, TESTER_NAME } from "../lib/auth/config";
import { runImport } from "../scripts/import-cards";
import { SEED_CARDS_PER_SET } from "../scripts/lib/sample-cards";
import prisma from "./db";

async function seedTesterUser() {
  await prisma.user.upsert({
    where: { email: TESTER_EMAIL },
    update: { name: TESTER_NAME },
    create: {
      id: TESTER_ID,
      name: TESTER_NAME,
      email: TESTER_EMAIL,
      emailVerified: true,
    },
  });
  console.log("👤 Seeded preview tester user");
}

async function main() {
  console.log("🌱 Running database seed...");
  await seedTesterUser();
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
