import type { BetterAuthPlugin } from "better-auth";
import {
  APIError,
  createAuthMiddleware,
  formCsrfMiddleware,
} from "better-auth/api";

import {
  logOtpFailure,
  normalizeOtpEmail,
  otpEmailLogHash,
} from "./email-otp";

type BeforeHook = NonNullable<
  NonNullable<BetterAuthPlugin["hooks"]>["before"]
>[number];

type HookContext = Parameters<Parameters<typeof createAuthMiddleware>[0]>[0];

/** Lookups run this many times in total before the guard fails closed. */
const LOOKUP_ATTEMPTS = 2;

type OtpCandidate = {
  userId: string;
  accounts: readonly unknown[];
};

type Lookup =
  | { failed: false; candidate: OtpCandidate | null }
  | { failed: true };

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
  ctx: HookContext,
  email: string,
): Promise<OtpCandidate | null> {
  const internal = ctx.context.internalAdapter;
  const found = await internal.findUserByEmail(email);
  if (!found) return null;
  const userId = found.user.id;
  const accounts = await internal.findAccounts(userId);
  return { userId, accounts };
}

/** Error name and message, with the address removed in case a driver echoes it. */
function describeLookupError(error: unknown, email: string) {
  const name = error instanceof Error ? error.name : typeof error;
  const message = error instanceof Error ? error.message : "";
  return { name, message: message.split(email).join("[redacted]") };
}

/**
 * Retries the user and account lookup once. If every attempt fails, the guard
 * logs the failure by hash and returns `{ failed: true }`. The caller then
 * answers as if the address were unlisted, so a lookup failure does not reveal
 * that the address is listed. The raw email is never logged.
 */
async function lookupOtpCandidate(
  ctx: HookContext,
  email: string,
  logSecret: string | undefined,
): Promise<Lookup> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= LOOKUP_ATTEMPTS; attempt += 1) {
    try {
      return {
        failed: false,
        candidate: await findOtpCandidate(ctx, email),
      };
    } catch (error) {
      lastError = error;
    }
  }
  console.error("otp_guard_lookup_failed", {
    attempts: LOOKUP_ATTEMPTS,
    emailHash: otpEmailLogHash(email, logSecret),
    error: describeLookupError(lastError, email),
  });
  return { failed: true };
}

function invalidOtpError(): APIError {
  return APIError.from("BAD_REQUEST", {
    code: "INVALID_OTP",
    message: "Invalid OTP",
  });
}

/**
 * Builds the account guard. `logSecret` keys the email hash in logs, the same
 * secret passed to `createEmailOtpPlugins`.
 *
 * Blocked accounts can never use a code, so no code is stored or emailed for
 * them. The send endpoint has no hook that can skip the email, so this hook
 * returns the endpoint's own success body early. The CSRF check the endpoint
 * would run first is kept, so a rejected request is rejected the same way.
 * Only sign-in codes are checked. Other types do not email blocked accounts.
 *
 * Blocked sign-in attempts and lookup failures get the same INVALID_OTP error
 * as a wrong code, so the response does not reveal that the account exists or
 * that the lookup failed. The check runs before the code is consumed.
 */
export function createOtpExistingAccountGuardPlugin(
  options: { logSecret?: string } = {},
): BetterAuthPlugin {
  const { logSecret } = options;

  const sendBlockedAccountHook = {
    matcher: (ctx) => ctx.path === "/email-otp/send-verification-otp",
    handler: createAuthMiddleware(async (ctx) => {
      const body = ctx.body as { email?: unknown; type?: unknown } | undefined;
      if (body?.type !== "sign-in" || typeof body.email !== "string") return;
      const email = normalizeOtpEmail(body.email);
      const lookup = await lookupOtpCandidate(ctx, email, logSecret);
      if (!lookup.failed) {
        if (!lookup.candidate || !isOtpSignInBlocked(lookup.candidate.accounts)) {
          return;
        }
        logOtpFailure("otp_account_blocked", {
          email,
          userId: lookup.candidate.userId,
          logSecret,
        });
      }
      // Lookup failure and blocked account take the same path: no code is
      // stored or emailed, and the response matches an unlisted address.
      await formCsrfMiddleware(ctx);
      return ctx.json({ success: true });
    }),
  } satisfies BeforeHook;

  return {
    id: "email-otp-existing-account-guard",
    hooks: {
      before: [
        sendBlockedAccountHook,
        {
          matcher: (ctx) => ctx.path === "/sign-in/email-otp",
          handler: createAuthMiddleware(async (ctx) => {
            const raw = (ctx.body as { email?: unknown } | undefined)?.email;
            if (typeof raw !== "string") return;
            const email = normalizeOtpEmail(raw);
            const lookup = await lookupOtpCandidate(ctx, email, logSecret);
            if (lookup.failed) throw invalidOtpError();
            if (lookup.candidate && isOtpSignInBlocked(lookup.candidate.accounts)) {
              logOtpFailure("otp_account_blocked", {
                email,
                userId: lookup.candidate.userId,
                logSecret,
              });
              throw invalidOtpError();
            }
          }),
        },
      ],
    },
  } satisfies BetterAuthPlugin;
}

/** Default guard without a log secret. Logs hash with plain SHA-256. */
export const otpExistingAccountGuardPlugin = createOtpExistingAccountGuardPlugin();
