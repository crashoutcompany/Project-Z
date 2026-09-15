import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import prisma from "@/prisma/db";

const PRODUCTION_URL = "https://pockettrading.vercel.app";
const DEVELOPMENT_URL = `http://localhost:${process.env.PORT ?? "3000"}`;

const isLoopbackUrl = (url: string) => {
  try {
    const { hostname } = new URL(url);
    return (
      hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1"
    );
  } catch {
    return false;
  }
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
const getBaseUrl = () => {
  const configuredUrl = process.env.BETTER_AUTH_URL;
  const isDeployedBuild = process.env.NODE_ENV === "production";

  if (configuredUrl) {
    if (!isDeployedBuild || !isLoopbackUrl(configuredUrl)) return configuredUrl;

    console.warn(
      `[auth] Ignoring loopback BETTER_AUTH_URL in a production build and using ${PRODUCTION_URL}. Set BETTER_AUTH_URL to the deployment URL.`,
    );
  }

  if (process.env.VERCEL_ENV === "preview") {
    const previewHost = process.env.VERCEL_BRANCH_URL || process.env.VERCEL_URL;
    if (previewHost) return `https://${previewHost}`;
  }

  return isDeployedBuild ? PRODUCTION_URL : DEVELOPMENT_URL;
};

/**
 * Origins allowed to call the auth endpoints on top of `baseURL`, which Better
 * Auth always trusts. Wildcards are matched per origin pattern, so the second
 * entry covers preview deployments and the git branch alias.
 */
const TRUSTED_ORIGINS = [
  PRODUCTION_URL,
  "https://*-crashoutcos-projects.vercel.app",
];

type SocialProviderId = "github" | "google";

const socialProviderEnv = {
  github: {
    clientIdName: "AUTH_GITHUB_ID",
    clientSecretName: "AUTH_GITHUB_SECRET",
    clientId: process.env.AUTH_GITHUB_ID,
    clientSecret: process.env.AUTH_GITHUB_SECRET,
  },
  google: {
    clientIdName: "AUTH_GOOGLE_ID",
    clientSecretName: "AUTH_GOOGLE_SECRET",
    clientId: process.env.AUTH_GOOGLE_ID,
    clientSecret: process.env.AUTH_GOOGLE_SECRET,
  },
} satisfies Record<
  SocialProviderId,
  {
    clientIdName: string;
    clientSecretName: string;
    clientId: string | undefined;
    clientSecret: string | undefined;
  }
>;

/**
 * A provider registered without both credentials only fails when someone clicks
 * it, as a 500 from `CLIENT_ID_AND_SECRET_REQUIRED`. Leaving it unregistered
 * keeps that failure out of the request path, and `enabledSocialProviders` lets
 * the sign-in page offer the providers that can actually complete a sign-in.
 */
const socialProviders: Partial<
  Record<SocialProviderId, { clientId: string; clientSecret: string }>
> = {};

for (const [provider, config] of Object.entries(socialProviderEnv) as [
  SocialProviderId,
  (typeof socialProviderEnv)[SocialProviderId],
][]) {
  if (config.clientId && config.clientSecret) {
    socialProviders[provider] = {
      clientId: config.clientId,
      clientSecret: config.clientSecret,
    };
    continue;
  }

  console.warn(
    `[auth] ${provider} sign-in is disabled: set both ${config.clientIdName} and ${config.clientSecretName}.`,
  );
}

export const enabledSocialProviders = Object.keys(
  socialProviders,
) as SocialProviderId[];

export type { SocialProviderId };

export const auth = betterAuth({
  baseURL: getBaseUrl(),
  trustedOrigins: TRUSTED_ORIGINS,
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  socialProviders,
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minutes
    },
  },
});

export type Session = typeof auth.$Infer.Session;
