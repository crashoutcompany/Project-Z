import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import prisma from "@/prisma/db";

// Helper to resolve the base URL for OAuth redirect URIs
const getBaseUrl = () => {
  if (process.env.NODE_ENV === "production") {
    return "https://pockettrading.vercel.app";
  }
  // Default to local development
  return "http://localhost:3000";
};

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  socialProviders: {
    github: {
      clientId: process.env.AUTH_GITHUB_ID!,
      clientSecret: process.env.AUTH_GITHUB_SECRET!,
      redirectUri: `${getBaseUrl()}/api/auth/callback/github`,
    },
    google: {
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
      redirectUri: `${getBaseUrl()}/api/auth/callback/google`,
    },
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minutes
    },
  },
  pages: {
    signIn: "/signin",
    error: "/not-allowed",
  },
});

export type Session = typeof auth.$Infer.Session;
