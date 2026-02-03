import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    // Use DATABASE_URL for database connections
    // For Neon: use the pooled connection string for the app
    // For migrations: Prisma CLI will use this URL directly
    url: env("DATABASE_URL"),
  },
});
