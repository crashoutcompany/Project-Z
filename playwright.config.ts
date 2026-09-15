import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.PORT ?? 3000);
const baseURL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    viewport: { width: 1280, height: 720 },
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: process.env.CI ? "pnpm start" : "pnpm build && pnpm start",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      ...process.env,
      PORT: String(PORT),
      E2E_AUTH_BYPASS: "1",
      DATABASE_URL:
        process.env.DATABASE_URL ??
        "postgresql://user:pass@127.0.0.1:5432/pocket_test",
      AUTH_SECRET:
        process.env.AUTH_SECRET ?? "test-auth-secret-not-for-production",
    },
  },
});
