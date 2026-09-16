import { TESTER_EMAIL, TESTER_ID, TESTER_NAME } from "../lib/test-auth";
import { runImport } from "../scripts/import-cards";
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
