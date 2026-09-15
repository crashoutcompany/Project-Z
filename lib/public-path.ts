/**
 * Paths the auth proxy allows without a session.
 * Keep in lockstep with `proxy.ts` `config.matcher` exclusions.
 */
export function isPublicPath(pathname: string): boolean {
  return (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.endsWith(".png") ||
    pathname === "/signin" ||
    pathname === "/"
  );
}

/** Playwright / CI-only bypass so instant() tests can hit protected shells. */
export function shouldBypassAuth(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.E2E_AUTH_BYPASS === "1";
}
