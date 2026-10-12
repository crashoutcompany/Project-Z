import type { BetterAuthPlugin } from "better-auth";
import {
  APIError,
  createAuthMiddleware,
  formCsrfMiddleware,
} from "better-auth/api";

type BeforeHook = NonNullable<
  NonNullable<BetterAuthPlugin["hooks"]>["before"]
>[number];

/** Roles that must never be reachable through an email code. */
const ELEVATED_ROLES = new Set(["admin", "owner"]);

export type OtpSignInCandidate = {
  user: object;
  accounts: readonly unknown[];
};

/**
 * Email-code sign-in is for allowlisted bot accounts. It must not open an
 * account a person already uses another way (OAuth or password), nor an
 * elevated account. A user created by email-code sign-in has no linked
 * accounts, so it keeps signing in with codes.
 */
export function isOtpSignInBlocked({
  user,
  accounts,
}: OtpSignInCandidate): boolean {
  if (accounts.length > 0) return true;
  return "role" in user && typeof user.role === "string"
    ? ELEVATED_ROLES.has(user.role)
    : false;
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
    // No trim here: an address with stray spaces must fail the endpoint's own
    // validation exactly as it does for an unlisted address.
    const found = await ctx.context.internalAdapter.findUserByEmail(
      body.email.toLowerCase(),
      { includeAccounts: true },
    );
    if (!found || !isOtpSignInBlocked(found)) return;
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
          const found = await ctx.context.internalAdapter.findUserByEmail(
            email.trim().toLowerCase(),
            { includeAccounts: true },
          );
          if (found && isOtpSignInBlocked(found)) {
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
