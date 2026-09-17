import { constantTimeEqual } from "better-auth/crypto";

import type { E2EEnvironment } from "@/lib/e2e-env";
import { isTestingApiExposed } from "@/lib/e2e-env";

/** Header agents send when minting a tester session. */
export const TEST_AUTH_HEADER = "x-test-auth-secret";

export type TestAuthEnv = E2EEnvironment & {
  NODE_ENV?: string;
  TEST_AUTH_SECRET?: string;
  VERCEL_ENV?: string;
};

export type TestAuthDecision =
  | { allow: true }
  | { allow: false; status: 401 | 404 };

function currentTestAuthEnv(): TestAuthEnv {
  return {
    EXPOSE_TESTING_API: process.env.EXPOSE_TESTING_API,
    NODE_ENV: process.env.NODE_ENV,
    TEST_AUTH_SECRET: process.env.TEST_AUTH_SECRET,
    VERCEL: process.env.VERCEL,
    VERCEL_ENV: process.env.VERCEL_ENV,
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
 * Test login is available in explicit non-production Vercel environments,
 * local development, and local e2e builds. Every mode requires its own secret.
 */
export function isTestAuthEnabled(
  env: TestAuthEnv = currentTestAuthEnv(),
): boolean {
  if (readTestAuthSecret(env.TEST_AUTH_SECRET) === null) return false;

  const vercelEnv = readEnvValue(env.VERCEL_ENV);
  if (vercelEnv === "preview" || vercelEnv === "development") return true;
  if (vercelEnv) return false;

  return (
    readEnvValue(env.NODE_ENV) === "development" || isTestingApiExposed(env)
  );
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
