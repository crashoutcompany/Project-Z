import { prismaAdapter } from "better-auth/adapters/prisma";
import { APP_NAME, PREVIEW_ORIGIN, PRODUCTION_URL } from "@/lib/auth/config";
import { createAuth, getEnabledSocialProviders } from "@/lib/auth/create-auth";
import prisma from "@/prisma/db";

export type { SocialProviderId } from "@/lib/auth/create-auth";

export const enabledSocialProviders = getEnabledSocialProviders();

export const auth = createAuth({
  appName: APP_NAME,
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  productionUrl: PRODUCTION_URL,
  previewOrigin: PREVIEW_ORIGIN,
});

export type Session = typeof auth.$Infer.Session;
