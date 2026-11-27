"use client";

import { emailOTPClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

// The server only registers the email OTP routes when the allowlist is set.
export const authClient = createAuthClient({ plugins: [emailOTPClient()] });
export const { signIn, signOut, useSession } = authClient;

/**
 * True when a session cookie is present. Network errors to the auth API also
 * return true so an outage is not treated as signed-out.
 *
 * The auth proxy answers a signed-out server action POST with a redirect to
 * the sign-in page, so the action rejects instead of returning `signed_out`.
 * Ask the auth API (not behind the proxy) whether that is what happened.
 */
export async function hasClientSession(): Promise<boolean> {
  try {
    const { data, error } = await authClient.getSession();
    return Boolean(data) || Boolean(error);
  } catch {
    return true;
  }
}
