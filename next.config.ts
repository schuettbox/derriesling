import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Server Actions body size — Bestellungen mit vielen Positionen
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
};

export default nextConfig;
