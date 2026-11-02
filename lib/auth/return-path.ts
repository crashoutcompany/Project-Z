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

/**
 * Post-sign-in destination from a `?next=` query. Read at click/submit time
 * from the live URL so OAuth/OTP still return to the gated page (shared
 * builder/dex links) without subscribing to `useSearchParams`.
 */
export function authCallbackFromSearch(
  search: string | Pick<URLSearchParams, "get"> | null | undefined,
  signInPath: string,
): string {
  let raw: string | null = null;
  if (typeof search === "string") {
    const qs = search.startsWith("?") ? search.slice(1) : search;
    raw = new URLSearchParams(qs).get(AUTH_RETURN_QUERY);
  } else if (search) {
    raw = search.get(AUTH_RETURN_QUERY);
  }
  return safeAuthReturnPath(raw, signInPath) ?? "/";
}

/**
 * Resolve the post-sign-in destination at click/submit time.
 * `explicit` wins (tests / callers that already parsed `next`); otherwise
 * read `?next=` from the current URL.
 */
export function authCallbackFromWindow(
  signInPath: string,
  explicit?: string,
  search?: string,
): string {
  if (explicit !== undefined) return explicit;
  const query =
    search ?? (typeof window === "undefined" ? "" : window.location.search);
  return authCallbackFromSearch(query, signInPath);
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
