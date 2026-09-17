import { auth } from "@/lib/auth";
import { isPublicPath, shouldBypassAuth } from "@/lib/public-path";
import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";

// Next.js 16: proxy.ts replaces middleware.ts
// The proxy function runs on the Node.js runtime and handles request interception
export default async function proxy(request: NextRequest) {
  if (shouldBypassAuth()) {
    return NextResponse.next();
  }

  // Use Better Auth's api.getSession() to check session and handle authentication
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session && !isPublicPath(request.nextUrl.pathname)) {
    return NextResponse.redirect(new URL("/signin", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|.*\\.png$).*)"],
};
