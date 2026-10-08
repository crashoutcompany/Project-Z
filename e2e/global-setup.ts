import { mkdir } from "node:fs/promises";
import path from "node:path";

import { request, type FullConfig } from "@playwright/test";

import { TEST_AUTH_HEADER } from "@/lib/test-auth";
import { TESTER_AUTH_STATE } from "./auth-state";

export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use.baseURL;
  if (typeof baseURL !== "string") {
    throw new Error("Playwright baseURL must be configured");
  }

  const testAuthSecret = process.env.TEST_AUTH_SECRET?.trim();
  if (!testAuthSecret) {
    throw new Error("TEST_AUTH_SECRET is required for Playwright");
  }

  const bypassSecret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET?.trim();
  const extraHTTPHeaders = bypassSecret
    ? { "x-vercel-protection-bypass": bypassSecret }
    : undefined;
  const api = await request.newContext({ baseURL, extraHTTPHeaders });

  try {
    const response = await api.post("/api/test-auth/login", {
      headers: {
        [TEST_AUTH_HEADER]: testAuthSecret,
      },
    });

    if (!response.ok()) {
      throw new Error(
        `Test login failed with HTTP ${response.status()}; verify testing API exposure and database connectivity`,
      );
    }

    await mkdir(path.dirname(TESTER_AUTH_STATE), { recursive: true });
    await api.storageState({ path: TESTER_AUTH_STATE });
  } finally {
    await api.dispose();
  }
}
