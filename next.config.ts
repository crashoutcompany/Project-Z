import type { NextConfig } from "next";

import { withAppDefaults } from "./lib/next-config";

const nextConfig: NextConfig = withAppDefaults({
  serverExternalPackages: ["@prisma/client", "prisma"],
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
});

export default nextConfig;
