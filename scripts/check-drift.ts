/**
 * Fails when prisma/migrations and prisma/schema.prisma disagree, i.e. when a
 * schema change shipped without a migration (or the reverse).
 *
 * Runs `prisma migrate diff --from-migrations --to-schema --script` against a
 * shadow database and prints every statement it would need. The tsvector
 * columns and GIN indexes behind full-text search exist only in SQL (Prisma
 * cannot express generated columns), so they are allowlisted below.
 *
 * Needs SHADOW_DATABASE_URL: the database is wiped, so it is never defaulted
 * to DATABASE_URL unless that points at localhost (the CI Postgres service).
 */
import { spawnSync } from "node:child_process";

/** Statements that exist only in migration SQL on purpose. */
const ALLOWED = [
  'DROP INDEX "attack_effect_tsv_idx"',
  'DROP INDEX "card_effect_effect_tsv_idx"',
  'ALTER TABLE "Attack" DROP COLUMN "effect_tsv"',
  'ALTER TABLE "CardEffect" DROP COLUMN "effect_tsv"',
];

function isLocal(url: string | undefined): url is string {
  if (!url) return false;
  try {
    return ["localhost", "127.0.0.1"].includes(new URL(url).hostname);
  } catch {
    return false;
  }
}

const shadow =
  process.env.SHADOW_DATABASE_URL ??
  (isLocal(process.env.DATABASE_URL) ? process.env.DATABASE_URL : undefined);
if (!shadow) {
  console.error(
    "Set SHADOW_DATABASE_URL to a scratch Postgres database (it is wiped).",
  );
  process.exit(1);
}

const result = spawnSync(
  "pnpm",
  [
    "exec",
    "prisma",
    "migrate",
    "diff",
    "--from-migrations",
    "prisma/migrations",
    "--to-schema",
    "prisma/schema.prisma",
    "--script",
  ],
  {
    encoding: "utf8",
    env: {
      ...process.env,
      // Prisma requires a datasource URL but diffing migrations never connects
      // to it, and it must differ from the shadow database.
      DATABASE_URL: "postgresql://unused@127.0.0.1:1/unused",
      SHADOW_DATABASE_URL: shadow,
    },
  },
);
if (result.status !== 0) {
  console.error(result.stdout, result.stderr);
  process.exit(result.status ?? 1);
}

const statements = result.stdout
  .split(/;\s*\n/)
  .map((chunk) =>
    chunk
      .split("\n")
      .filter((line) => !line.startsWith("--"))
      .join("\n")
      .trim()
      .replace(/;$/, ""),
  )
  .filter(Boolean)
  .filter((statement) => !ALLOWED.includes(statement));

if (statements.length > 0) {
  console.error(
    "Schema drift: prisma/schema.prisma differs from prisma/migrations.\n" +
      "Add a migration (or fix the schema) so these statements are not needed:\n\n" +
      statements.map((s) => `${s};`).join("\n\n"),
  );
  process.exit(1);
}
console.log("No schema drift.");
