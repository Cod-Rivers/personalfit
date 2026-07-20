import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    domains: ["placehold.co", "storage.googleapis.com", "midia.venafit.codriverslabs.com"],
  },
  webpack: (config) => {
    // Desativa source maps de JS e CSS no nível do webpack
    config.devtool = false;

    return config;
  },
};

const withNextIntl = createNextIntlPlugin();
export default withNextIntl(nextConfig);
