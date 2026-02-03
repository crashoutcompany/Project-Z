import { auth } from "@/app/auth";
import { NextRequest, NextResponse } from "next/server";

// Next.js 16: proxy.ts replaces middleware.ts
// The proxy function runs on the Node.js runtime and handles request interception
export default async function proxy(request: NextRequest) {
  // Use NextAuth's auth() to check session and handle authentication
  const session = await auth();

  // If no session and not on public routes, redirect to sign in
  const isPublicRoute =
    request.nextUrl.pathname.startsWith("/api") ||
    request.nextUrl.pathname.startsWith("/_next") ||
    request.nextUrl.pathname.endsWith(".png") ||
    request.nextUrl.pathname === "/signin" ||
    request.nextUrl.pathname === "/";

  if (!session && !isPublicRoute) {
    return NextResponse.redirect(new URL("/signin", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|.*\\.png$).*)"],
};
