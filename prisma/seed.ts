import { runImport } from "../scripts/import-cards";
import prisma from "./db";

async function main() {
  console.log("🌱 Running database seed...");
  await runImport();
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
