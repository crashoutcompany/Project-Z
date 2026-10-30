/** Query param carrying the post-sign-in destination. */
export const AUTH_RETURN_QUERY = "next";

const MAX_RETURN_PATH_LENGTH = 2048;

/**
 * Accepts only same-origin relative paths for post-sign-in redirects.
 *
 * Rejects protocol-relative URLs, other hosts, the sign-in page itself (to
 * avoid bounce loops), and control characters. Hash fragments are dropped:
 * OAuth callbacks never send them, and they are not needed for deck/dex links.
 */
export function safeAuthReturnPath(
  candidate: string | null | undefined,
  signInPath: string,
): string | null {
  if (!candidate || candidate.length > MAX_RETURN_PATH_LENGTH) return null;
  if (!candidate.startsWith("/") || candidate.startsWith("//")) return null;
  if (candidate.includes("\\") || candidate.includes("://")) return null;
  if (/[\u0000-\u001F\u007F]/.test(candidate)) return null;

  let parsed: URL;
  try {
    parsed = new URL(candidate, "https://pocket.invalid");
  } catch {
    return null;
  }

  if (parsed.username || parsed.password || parsed.host !== "pocket.invalid") {
    return null;
  }

  if (
    parsed.pathname === signInPath ||
    parsed.pathname.startsWith(`${signInPath}/`)
  ) {
    return null;
  }

  return `${parsed.pathname}${parsed.search}`;
}

/** Guest redirect to sign-in, preserving a safe return path when one exists. */
export function signInRedirectUrl(
  requestUrl: string,
  signInPath: string,
  returnPath: string,
): URL {
  const target = new URL(signInPath, requestUrl);
  const safe = safeAuthReturnPath(returnPath, signInPath);
  if (safe) {
    target.searchParams.set(AUTH_RETURN_QUERY, safe);
  }
  return target;
}
