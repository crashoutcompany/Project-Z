// shared:test-auth v2

import { constantTimeEqual } from "better-auth/crypto";

import type { E2EEnvironment } from "@/lib/e2e-env";
import { isTestingApiExposed } from "@/lib/e2e-env";

/** Header agents send when minting a tester session. */
export const TEST_AUTH_HEADER = "x-test-auth-secret";

export type TestAuthEnv = E2EEnvironment & {
  TEST_AUTH_SECRET?: string;
};

export type TestAuthDecision =
  | { allow: true }
  | { allow: false; status: 401 | 404 };

function currentTestAuthEnv(): TestAuthEnv {
  return {
    EXPOSE_TESTING_API: process.env.EXPOSE_TESTING_API,
    TEST_AUTH_SECRET: process.env.TEST_AUTH_SECRET,
    VERCEL: process.env.VERCEL,
  };
}

function readEnvValue(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/**
 * Treat unset / whitespace-only values as missing. Never log the raw secret.
 */
export function readTestAuthSecret(secret: string | undefined): string | null {
  return readEnvValue(secret);
}

/**
 * RDC-strict: test login requires EXPOSE_TESTING_API=1 and is never auto-on
 * from NODE_ENV or VERCEL_ENV alone. Vercel runtimes stay closed via
 * isTestingApiExposed (VERCEL !== "1").
 */
export function isTestAuthEnabled(
  env: TestAuthEnv = currentTestAuthEnv(),
): boolean {
  if (readTestAuthSecret(env.TEST_AUTH_SECRET) === null) return false;
  return isTestingApiExposed(env);
}

export function evaluateTestAuthRequest(
  headerValue: string | null,
  env: TestAuthEnv = currentTestAuthEnv(),
): TestAuthDecision {
  if (!isTestAuthEnabled(env)) {
    return { allow: false, status: 404 };
  }

  const expected = readTestAuthSecret(env.TEST_AUTH_SECRET);
  if (!expected) {
    return { allow: false, status: 404 };
  }

  if (!constantTimeEqual(headerValue ?? "", expected)) {
    return { allow: false, status: 401 };
  }

  return { allow: true };
}
