import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["lib/**/*.test.ts", "scripts/__tests__/**/*.test.ts"],
    exclude: ["e2e/**", "node_modules/**"],
  },
});
