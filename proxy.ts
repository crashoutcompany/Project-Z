import { auth } from "@/lib/auth";
import { SIGN_IN_PATH } from "@/lib/auth/config";
import { createAuthProxy } from "@/lib/auth/proxy";

export default createAuthProxy({
  auth,
  publicPaths: ["/", SIGN_IN_PATH],
  rules: [{ path: "*", access: "session" }],
  signInPath: SIGN_IN_PATH,
});

// Pages stay behind auth. Excluded: /api (each route does its own auth),
// /_next internals, and static files by extension only — never by folder, so
// a page can't slip out through a path prefix. /back.png must skip the proxy:
// a 307 to sign-in there breaks the image optimizer's internal fetch.
export const config = {
  matcher: [
    "/((?!api(?:/|$)|_next(?:/|$)|.*\\.(?:png|jpg|jpeg|svg|webp|gif|ico|avif)$).*)",
  ],
};
