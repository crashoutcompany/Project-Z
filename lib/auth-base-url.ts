export const PRODUCTION_URL = "https://pockettrading.vercel.app";

export function isLoopbackUrl(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1" ||
      hostname === "[::1]"
    );
  } catch {
    return false;
  }
}

export type AuthBaseUrlEnv = {
  BETTER_AUTH_URL?: string;
  NODE_ENV?: string;
  VERCEL_ENV?: string;
  VERCEL_BRANCH_URL?: string;
  VERCEL_URL?: string;
  PORT?: string;
};

/**
 * Resolves the base URL Better Auth uses for cookies, OAuth redirect URIs, and
 * the default trusted origin.
 *
 * `BETTER_AUTH_URL` wins where it is set, except in a deployed build: a
 * loopback value there leaves the deployment unable to trust its own domain and
 * hands providers a `localhost` redirect URI, so the canonical URL is used
 * instead. The check deliberately keys off `NODE_ENV` rather than `VERCEL_ENV`,
 * which is only present when Vercel system environment variables are exposed.
 */
export function resolveAuthBaseUrl(env: AuthBaseUrlEnv = process.env): string {
  const configuredUrl = env.BETTER_AUTH_URL;
  const isDeployedBuild = env.NODE_ENV === "production";
  const developmentUrl = `http://localhost:${env.PORT ?? "3000"}`;

  if (configuredUrl) {
    if (!isDeployedBuild || !isLoopbackUrl(configuredUrl)) return configuredUrl;

    console.warn(
      `[auth] Ignoring loopback BETTER_AUTH_URL in a production build and using ${PRODUCTION_URL}. Set BETTER_AUTH_URL to the deployment URL.`,
    );
  }

  if (env.VERCEL_ENV === "preview") {
    const previewHost = env.VERCEL_BRANCH_URL || env.VERCEL_URL;
    if (previewHost) return `https://${previewHost}`;
  }

  return isDeployedBuild ? PRODUCTION_URL : developmentUrl;
}
