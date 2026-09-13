import { PrismaClient } from "./generated/client/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";

// Attempt to load environment files if running outside Next.js (e.g. standalone scripts, seed, migrations)
if (!process.env.DATABASE_URL) {
  try {
    process.loadEnvFile?.(".env.local");
  } catch {}
  try {
    process.loadEnvFile?.(".env");
  } catch {}
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error(
    "DATABASE_URL environment variable is not defined. Please check your .env or .env.local file."
  );
}

// Configure Neon for WebSocket connections
neonConfig.webSocketConstructor = ws;
// To work in edge environments (Cloudflare Workers, Vercel Edge, etc.), enable querying over fetch
neonConfig.poolQueryViaFetch = true;

// Type definitions
declare global {
  var prisma: PrismaClient | undefined;
}

// Create Neon adapter for serverless PostgreSQL
const adapter = new PrismaNeon({ connectionString });

// Initialize Prisma Client with the Neon adapter
const prisma = global.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV === "development") global.prisma = prisma;

export default prisma;
