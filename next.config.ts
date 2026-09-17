import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ensure Prisma client and its runtime are not bundled (resolves custom output + Turbopack)
  serverExternalPackages: ["@prisma/client", "prisma"],

  // Next.js 16: React Compiler is now a stable top-level option
  reactCompiler: true,

  // Next.js 16: Enable Cache Components for opt-in caching with "use cache" directive
  // This enables Partial Pre-Rendering (PPR) and the new caching model
  cacheComponents: true,

  // Instant() Playwright tests need the testing lock in `next start`.
  // Only baked in when the e2e job builds with E2E_AUTH_BYPASS=1; Vercel prod stays off.
  experimental: {
    exposeTestingApiInProductionBuild: process.env.E2E_AUTH_BYPASS === "1",
  },

  async redirects() {
    return [
      {
        source: "/collections",
        destination: "/dex",
        permanent: true,
      },
      {
        source: "/collections/:path*",
        destination: "/dex",
        permanent: true,
      },
    ];
  },

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "limitlesstcg.nyc3.cdn.digitaloceanspaces.com",
        port: "",
        pathname: "/pocket/**",
      },
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
        port: "",
        pathname: "/pocket/**",
      },
    ],
  },
};

export default nextConfig;
