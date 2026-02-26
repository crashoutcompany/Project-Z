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
        hostname: "serebii.net",
        port: "",
        pathname: "/tcgpocket/**",
      },
    ],
  },
};

export default nextConfig;
