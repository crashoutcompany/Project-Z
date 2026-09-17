import { constantTimeEqual } from "better-auth/crypto";

/** Header agents send when minting a tester session. */
export const TEST_AUTH_HEADER = "x-test-auth-secret";

/** Stable tester identity used by seed and the test-login endpoint. */
export const TESTER_ID = "preview-tester";
export const TESTER_EMAIL = "tester@preview.pockettrading.local";
export const TESTER_NAME = "Preview Tester";

export type TestAuthEnv = {
  vercelEnv?: string | null;
  nodeEnv?: string | null;
  secret?: string | null;
};

export type TestAuthDecision =
  | { allow: true; secret: string }
  | { allow: false; status: 401 | 404 };

function currentTestAuthEnv(): TestAuthEnv {
  return {
    vercelEnv: process.env.VERCEL_ENV,
    nodeEnv: process.env.NODE_ENV,
    secret: process.env.TEST_AUTH_SECRET,
  };
}

function readEnvLabel(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/**
 * Treat unset / whitespace-only values as missing. Never log the raw secret.
 */
export function readTestAuthSecret(
  secret: string | null | undefined,
): string | null {
  return readEnvLabel(secret);
}

/**
 * Test login is allowed only when `TEST_AUTH_SECRET` is set and the runtime is
 * an explicit non-production environment: Vercel Preview, Vercel Development,
 * or local (`VERCEL_ENV` absent and `NODE_ENV=development`). Preview builds
 * still use `NODE_ENV=production`, so that value is not used as a deny flag.
 * Production and any other `VERCEL_ENV` fail closed.
 */
export function isTestAuthEnabled(
  env: TestAuthEnv = currentTestAuthEnv(),
): boolean {
  if (readTestAuthSecret(env.secret) === null) return false;

  const vercelEnv = readEnvLabel(env.vercelEnv);
  if (vercelEnv === "preview" || vercelEnv === "development") return true;
  if (vercelEnv) return false;
  return readEnvLabel(env.nodeEnv) === "development";
}

export function evaluateTestAuthRequest(
  headerValue: string | null,
  env: TestAuthEnv = currentTestAuthEnv(),
): TestAuthDecision {
  if (!isTestAuthEnabled(env)) {
    return { allow: false, status: 404 };
  }

  const expected = readTestAuthSecret(env.secret);
  if (!expected || !headerValue || !constantTimeEqual(headerValue, expected)) {
    return { allow: false, status: 401 };
  }

  return { allow: true, secret: expected };
}
