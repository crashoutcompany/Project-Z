import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "."),
    },
  },
  test: {
    environment: "node",
    env: {
      DATABASE_URL:
        process.env.DATABASE_URL ??
        "postgresql://user:pass@127.0.0.1:5432/pocket_test",
      BETTER_AUTH_SECRET:
        process.env.BETTER_AUTH_SECRET ??
        "test-better-auth-secret-at-least-32-characters",
    },
    exclude: [
      "**/node_modules/**",
      "**/.next/**",
      "**/e2e/**",
      "**/playwright-report/**",
      "**/test-results/**",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"],
      include: [
        "lib/**/*.ts",
        "server/**/*.ts",
        "app/api/**/*.ts",
        "components/CardBrowser/card-mappers.ts",
        "components/CardBrowser/load-catalog.ts",
        "app/(routes)/builder/use-builder-state.ts",
      ],
      exclude: [
        "**/*.test.ts",
        "lib/auth.ts",
        "lib/auth/client.ts",
        "lib/auth/config.ts",
        "lib/utils.ts",
        "lib/search/index.ts",
        "app/api/auth/**",
      ],
      thresholds: {
        lines: 65,
        functions: 60,
        statements: 60,
        branches: 60,
      },
    },
  },
});
