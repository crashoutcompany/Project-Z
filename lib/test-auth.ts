import { constantTimeEqual } from "better-auth/crypto";

/** Header agents send when minting a tester session. */
export const TEST_AUTH_HEADER = "x-test-auth-secret";

/** Stable tester identity used by seed and the test-login endpoint. */
export const TESTER_ID = "preview-tester";
export const TESTER_EMAIL = "tester@preview.pockettrading.local";
export const TESTER_NAME = "Preview Tester";

export type TestAuthEnv = {
  vercelEnv?: string | null;
  secret?: string | null;
};

export type TestAuthDecision =
  | { allow: true; secret: string }
  | { allow: false; status: 401 | 404 };

/**
 * Treat unset / whitespace-only values as missing. Never log the raw secret.
 */
export function readTestAuthSecret(
  secret: string | null | undefined,
): string | null {
  const trimmed = secret?.trim();
  return trimmed ? trimmed : null;
}

/**
 * Test login is allowed only when `TEST_AUTH_SECRET` is set and the runtime is
 * not Vercel Production. Local (no `VERCEL_ENV`) and Preview/Development stay
 * eligible. `NODE_ENV` is ignored: Preview builds also run with
 * `NODE_ENV=production`.
 */
export function isTestAuthEnabled(
  env: TestAuthEnv = {
    vercelEnv: process.env.VERCEL_ENV,
    secret: process.env.TEST_AUTH_SECRET,
  },
): boolean {
  if (env.vercelEnv === "production") return false;
  return readTestAuthSecret(env.secret) !== null;
}

export function evaluateTestAuthRequest(
  headerValue: string | null,
  env: TestAuthEnv = {
    vercelEnv: process.env.VERCEL_ENV,
    secret: process.env.TEST_AUTH_SECRET,
  },
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
