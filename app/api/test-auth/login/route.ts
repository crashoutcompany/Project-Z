import { makeSignature } from "better-auth/crypto";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import {
  evaluateTestAuthRequest,
  TEST_AUTH_HEADER,
  TESTER_EMAIL,
  TESTER_ID,
  TESTER_NAME,
} from "@/lib/test-auth";

function notFound() {
  return new NextResponse(null, { status: 404 });
}

function resolveAuthSecret(secret: unknown): string {
  if (typeof secret === "string" && secret.length > 0) return secret;
  if (
    secret &&
    typeof secret === "object" &&
    "value" in secret &&
    typeof (secret as { value: unknown }).value === "string"
  ) {
    return (secret as { value: string }).value;
  }
  throw new Error("Auth secret is not configured");
}

type AuthContext = Awaited<typeof auth.$context>;

async function ensureTesterUser(ctx: AuthContext) {
  const existing = await ctx.internalAdapter.findUserByEmail(TESTER_EMAIL);
  if (existing?.user) return existing.user;

  try {
    return await ctx.internalAdapter.createUser({
      id: TESTER_ID,
      email: TESTER_EMAIL,
      name: TESTER_NAME,
      emailVerified: true,
    });
  } catch {
    const retry = await ctx.internalAdapter.findUserByEmail(TESTER_EMAIL);
    if (retry?.user) return retry.user;
    throw new Error("Failed to create tester user");
  }
}

/**
 * Secret-gated tester login for local and Vercel Preview only.
 * Production always 404s. Do not enable E2E_AUTH_BYPASS on Preview.
 */
export async function POST(request: Request) {
  const decision = evaluateTestAuthRequest(
    request.headers.get(TEST_AUTH_HEADER),
  );
  if (!decision.allow) {
    return new NextResponse(null, { status: decision.status });
  }

  try {
    const ctx = await auth.$context;
    const user = await ensureTesterUser(ctx);
    const session = await ctx.internalAdapter.createSession(user.id);
    if (!session) {
      return NextResponse.json(
        { error: "Could not create session" },
        { status: 500 },
      );
    }

    const cookie = ctx.authCookies.sessionToken;
    const signedValue = `${session.token}.${await makeSignature(
      session.token,
      resolveAuthSecret(ctx.secret),
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
  } catch (err) {
    console.error("[api/test-auth/login] failed to mint session");
    if (err instanceof Error) {
      console.error("[api/test-auth/login]", err.name);
    }
    return NextResponse.json(
      { error: "Test login failed" },
      { status: 500 },
    );
  }
}

export function GET() {
  return notFound();
}
