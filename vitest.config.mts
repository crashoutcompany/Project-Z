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
        "lib/auth-client.ts",
        "lib/config.ts",
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
