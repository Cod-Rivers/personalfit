import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// Content-Security-Policy pragmática: trava object-src/base-uri/frame-ancestors
// (defesas que não dependem de conhecer todos os hosts) e restringe script-src
// aos CDNs de fato usados (Font Awesome kit, jsDelivr/Bootstrap). connect-src e
// img-src ficam abrangentes o suficiente para não quebrar chamadas à API,
// Firebase/FCM e embeds de vídeo. 'unsafe-inline' em script-src ainda é
// necessário por causa do script anti-flash de tema e do bootstrap do Next;
// migrar para nonce é o próximo passo para endurecer.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://kit.fontawesome.com https://cdn.jsdelivr.net https://*.fontawesome.com",
  "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://*.fontawesome.com",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https://*.fontawesome.com https://cdn.jsdelivr.net",
  "connect-src 'self' https: wss:",
  "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://www.instagram.com https://www.tiktok.com",
  "media-src 'self' https: blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    domains: ["placehold.co", "storage.googleapis.com", "midia.venafit.codriverslabs.com"],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
  webpack: (config) => {
    // Desativa source maps de JS e CSS no nível do webpack
    config.devtool = false;

    return config;
  },
};

const withNextIntl = createNextIntlPlugin();
export default withNextIntl(nextConfig);
