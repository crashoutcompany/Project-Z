// shared:test-auth v2

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
export function readConfiguredTestAuthSecret(
  secret: string | undefined,
): string | null {
  return readEnvValue(secret);
}

/** @deprecated Prefer readConfiguredTestAuthSecret for env values. */
export function readTestAuthSecret(secret: string | undefined): string | null {
  return readConfiguredTestAuthSecret(secret);
}

/**
 * RDC-strict / blue gate: require EXPOSE_TESTING_API=1 and never enable on
 * Vercel production. Do not auto-enable from NODE_ENV=development or Vercel
 * preview alone.
 */
export function isTestAuthEnabled(
  env: TestAuthEnv = currentTestAuthEnv(),
): boolean {
  if (readConfiguredTestAuthSecret(env.TEST_AUTH_SECRET) === null) return false;

  const vercelEnv = readEnvValue(env.VERCEL_ENV);
  if (vercelEnv === "production") return false;

  return isTestingApiExposed(env);
}

export function isValidTestAuthSecret(
  providedSecret: string | null,
  env: TestAuthEnv = currentTestAuthEnv(),
): boolean {
  const expected = readConfiguredTestAuthSecret(env.TEST_AUTH_SECRET);
  return Boolean(expected) && constantTimeEqual(providedSecret ?? "", expected!);
}

export function evaluateTestAuthRequest(
  headerValue: string | null,
  env: TestAuthEnv = currentTestAuthEnv(),
): TestAuthDecision {
  if (!isTestAuthEnabled(env)) {
    return { allow: false, status: 404 };
  }

  const expected = readConfiguredTestAuthSecret(env.TEST_AUTH_SECRET);
  if (!expected) {
    return { allow: false, status: 404 };
  }

  if (!constantTimeEqual(headerValue ?? "", expected)) {
    return { allow: false, status: 401 };
  }

  return { allow: true };
}
