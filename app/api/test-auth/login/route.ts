import { makeSignature } from "better-auth/crypto";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { TESTER_EMAIL, TESTER_ID, TESTER_NAME } from "@/lib/auth/config";
import { requireBetterAuthSecret } from "@/lib/auth/create-auth";
import { evaluateTestAuthRequest, TEST_AUTH_HEADER } from "@/lib/test-auth";

function notFound() {
  return new NextResponse(null, { status: 404 });
}

type AuthContext = Awaited<typeof auth.$context>;

async function ensureTesterUser(ctx: AuthContext) {
  const existing = await ctx.internalAdapter.findUserByEmail(TESTER_EMAIL);
  if (existing?.user) return existing.user;

  return ctx.internalAdapter.createUser({
    id: TESTER_ID,
    email: TESTER_EMAIL,
    name: TESTER_NAME,
    emailVerified: true,
  });
}

/**
 * Secret-gated tester login for browser automation.
 * Production and disabled environments always return 404.
 */
export async function POST(request: Request) {
  const decision = evaluateTestAuthRequest(
    request.headers.get(TEST_AUTH_HEADER),
  );
  if (!decision.allow) {
    return new NextResponse(null, { status: decision.status });
  }

  const ctx = await auth.$context;
  const user = await ensureTesterUser(ctx);
  const session = await ctx.internalAdapter.createSession(user.id);
  const cookie = ctx.authCookies.sessionToken;
  const signedValue = `${session.token}.${await makeSignature(
    session.token,
    requireBetterAuthSecret(),
  )}`;

  const response = NextResponse.json({
    ok: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
  });

  response.cookies.set({
    name: cookie.name,
    value: signedValue,
    httpOnly: cookie.attributes.httpOnly ?? true,
    secure: cookie.attributes.secure ?? false,
    sameSite: "lax",
    path: cookie.attributes.path ?? "/",
    maxAge: cookie.attributes.maxAge,
  });

  return response;
}

export function GET() {
  return notFound();
}
