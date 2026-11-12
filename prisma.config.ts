import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    seed: "npx tsx prisma/seed.ts",
  },
  datasource: {
    // Use DATABASE_URL for database connections
    // For Neon: use the pooled connection string for the app
    // For migrations: Prisma CLI will use this URL directly
    url: env("DATABASE_URL"),
    // Only `pnpm db:check-drift` (prisma migrate diff --from-migrations) needs one.
    shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL,
  },
});
