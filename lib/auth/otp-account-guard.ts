import type { BetterAuthPlugin } from "better-auth";
import {
  APIError,
  createAuthMiddleware,
  formCsrfMiddleware,
} from "better-auth/api";

import { normalizeOtpEmail } from "./email-otp";

type BeforeHook = NonNullable<
  NonNullable<BetterAuthPlugin["hooks"]>["before"]
>[number];

/** Lookups run this many times in total before the guard fails closed. */
const LOOKUP_ATTEMPTS = 2;

type OtpCandidate = {
  userId: string;
  accounts: readonly unknown[];
};

/**
 * Email-code sign-in is for allowlisted bot accounts. It must not open an
 * account a person already uses another way (OAuth or password). A user
 * created by email-code sign-in has no linked accounts, so it keeps signing in
 * with codes.
 */
export function isOtpSignInBlocked(accounts: readonly unknown[]): boolean {
  return accounts.length > 0;
}

/**
 * Loads the user for an email and that user's accounts by `userId`. Returns
 * null when no user has the email.
 */
async function findOtpCandidate(
  ctx: Parameters<Parameters<typeof createAuthMiddleware>[0]>[0],
  email: string,
): Promise<OtpCandidate | null> {
  const internal = ctx.context.internalAdapter;
  const found = await internal.findUserByEmail(email);
  if (!found) return null;
  const userId = found.user.id;
  const accounts = await internal.findAccounts(userId);
  return { userId, accounts };
}

/**
 * Retries the user and account lookup once. If every attempt fails, the error
 * is logged and rethrown, so the request fails and the sign-in or send is
 * denied. The email is not logged.
 */
async function lookupOtpCandidate(
  ctx: Parameters<Parameters<typeof createAuthMiddleware>[0]>[0],
  email: string,
): Promise<OtpCandidate | null> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= LOOKUP_ATTEMPTS; attempt += 1) {
    try {
      return await findOtpCandidate(ctx, email);
    } catch (error) {
      lastError = error;
    }
  }
  console.error("otp_guard_lookup_failed", {
    attempts: LOOKUP_ATTEMPTS,
    error: lastError,
  });
  throw lastError;
}

/**
 * Blocked accounts can never use a code, so no code is stored or emailed for
 * them. The send endpoint has no hook that can skip the email, so this hook
 * returns the endpoint's own success body early. The CSRF check the endpoint
 * would run first is kept, so a rejected request is rejected the same way.
 * Only sign-in codes are checked. Other types do not email blocked accounts.
 */
const otpSendBlockedAccountHook = {
  matcher: (ctx) => ctx.path === "/email-otp/send-verification-otp",
  handler: createAuthMiddleware(async (ctx) => {
    const body = ctx.body as { email?: unknown; type?: unknown } | undefined;
    if (body?.type !== "sign-in" || typeof body.email !== "string") return;
    const candidate = await lookupOtpCandidate(
      ctx,
      normalizeOtpEmail(body.email),
    );
    if (!candidate || !isOtpSignInBlocked(candidate.accounts)) return;
    await formCsrfMiddleware(ctx);
    return ctx.json({ success: true });
  }),
} satisfies BeforeHook;

/**
 * Refuses email-code sign-in into an existing account that is not an
 * email-code account. Blocked attempts get the same INVALID_OTP error as a
 * wrong code, so the response does not reveal that the account exists. The
 * check runs before the code is consumed. A lookup failure throws, which
 * blocks the sign-in (fail closed).
 */
export const otpExistingAccountGuardPlugin = {
  id: "email-otp-existing-account-guard",
  hooks: {
    before: [
      otpSendBlockedAccountHook,
      {
        matcher: (ctx) => ctx.path === "/sign-in/email-otp",
        handler: createAuthMiddleware(async (ctx) => {
          const email = (ctx.body as { email?: unknown } | undefined)?.email;
          if (typeof email !== "string") return;
          const candidate = await lookupOtpCandidate(
            ctx,
            normalizeOtpEmail(email),
          );
          if (candidate && isOtpSignInBlocked(candidate.accounts)) {
            throw APIError.from("BAD_REQUEST", {
              code: "INVALID_OTP",
              message: "Invalid OTP",
            });
          }
        }),
      },
    ],
  },
} satisfies BetterAuthPlugin;
