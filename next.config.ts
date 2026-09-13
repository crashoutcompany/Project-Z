import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ensure Prisma client and its runtime are not bundled (resolves custom output + Turbopack)
  serverExternalPackages: ["@prisma/client", "prisma"],

  // Next.js 16: React Compiler is now a stable top-level option
  reactCompiler: true,

  // Next.js 16: Enable Cache Components for opt-in caching with "use cache" directive
  // This enables Partial Pre-Rendering (PPR) and the new caching model
  cacheComponents: true,

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "limitlesstcg.nyc3.cdn.digitaloceanspaces.com",
        port: "",
        pathname: "/pocket/**",
      },
    ],
  },
};

export default nextConfig;
