"use client";

import { emailOTPClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

// The server only registers the email OTP routes when the allowlist is set.
export const authClient = createAuthClient({ plugins: [emailOTPClient()] });
export const { signIn, signOut, useSession } = authClient;
