import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// Content-Security-Policy pragmática: trava object-src/base-uri/frame-ancestors
// (defesas que não dependem de conhecer todos os hosts) e restringe script-src
// aos CDNs de fato usados (Font Awesome kit, jsDelivr/Bootstrap). connect-src e
// img-src ficam abrangentes o suficiente para não quebrar chamadas à API,
// Firebase/FCM e embeds de vídeo. 'unsafe-inline' em script-src ainda é
// necessário por causa do script anti-flash de tema e do bootstrap do Next;
// migrar para nonce é o próximo passo para endurecer.
// Em dev, o backend local roda em HTTP puro (sem TLS), então connect-src
// precisa aceitar http(s)/ws(s) e upgrade-insecure-requests fica de fora —
// senão o browser bloqueia ou reescreve as chamadas à API local para https,
// e o login local para de funcionar.
const isDev = process.env.NODE_ENV !== "production";
const csp = [
  "default-src 'self'",
  isDev
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://kit.fontawesome.com https://cdn.jsdelivr.net https://*.fontawesome.com https://www.gstatic.com"
    : "script-src 'self' 'unsafe-inline' https://kit.fontawesome.com https://cdn.jsdelivr.net https://*.fontawesome.com https://www.gstatic.com",
  "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://*.fontawesome.com",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https://*.fontawesome.com https://cdn.jsdelivr.net",
  isDev ? "connect-src 'self' http: https: ws: wss:" : "connect-src 'self' https: wss:",
  "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://www.instagram.com https://www.tiktok.com",
  "media-src 'self' https: blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
  ...(isDev
    ? []
    : [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ]),
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
