import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || "https://dbomfim-1003252716435.us-west1.run.app",
  },
  images: {
    domains: ["placehold.co"],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
    },
};

const withNextIntl = createNextIntlPlugin();
export default withNextIntl(nextConfig);
