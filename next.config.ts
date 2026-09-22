import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { buildServiceWorkerCsp } from "./src/libs/csp";

const isDev = process.env.NODE_ENV !== "production";

// A Content-Security-Policy das PÁGINAS não mora aqui: ela leva um nonce novo
// a cada requisição, então é montada no middleware (src/middleware.ts, regras
// em src/libs/csp.ts). Aqui ficam os headers fixos, iguais para toda resposta,
// e a CSP do service worker, que não pode usar nonce.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // camera=(self): a Pose do Dia (PoseCapture.tsx) abre a câmera ao vivo com
  // getUserMedia. Com camera=() ela era negada até para o próprio site, e o
  // aluno sempre caía no seletor de arquivo.
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(self)" },
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
    // remotePatterns substitui `domains` (obsoleto no Next 15) e também fixa o
    // protocolo: só https.
    remotePatterns: [
      { protocol: "https", hostname: "placehold.co" },
      { protocol: "https", hostname: "storage.googleapis.com" },
      { protocol: "https", hostname: "midia.venafit.codriverslabs.com" },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        // Ver buildServiceWorkerCsp: com a CSP das páginas, o importScripts
        // do Firebase Messaging seria bloqueado dentro do worker.
        source: "/sw.js",
        headers: [
          { key: "Content-Security-Policy", value: buildServiceWorkerCsp(isDev) },
        ],
      },
    ];
  },
  // Aliases da política de privacidade. A URL canônica é
  // /politica-privacidade, mas lojas de aplicativo, e-mails e materiais
  // antigos costumam apontar para variações em inglês ou com hífen a mais.
  // Sem estes aliases, essas variações caem em 404 — o que uma revisão de
  // loja lê como "política inacessível".
  // A mesma lógica vale para a página de exclusão de conta (canônica:
  // /excluir-conta), que é a URL declarada no Play Console em Segurança de
  // dados → Exclusão de conta. Um 404 ali é lido como "não existe forma de
  // pedir exclusão" e reprova a versão.
  async redirects() {
    const alias = (sources: string[], destination: string) =>
      sources.map((source) => ({ source, destination, permanent: true }));

    return [
      ...alias(
        [
          "/privacy",
          "/privacy-policy",
          "/politica-de-privacidade",
          "/politica",
        ],
        "/politica-privacidade",
      ),
      ...alias(
        [
          "/exclusao-de-conta",
          "/exclusao-conta",
          "/excluir-cadastro",
          "/excluir-dados",
          "/delete-account",
          "/account-deletion",
          "/data-deletion",
        ],
        "/excluir-conta",
      ),
    ];
  },
  // Proxy local só para testar o front contra um backend remoto sem CORS: o
  // backend de produção só libera as origens em CORS_ALLOWED_ORIGINS, e
  // localhost não está nessa lista. Passando pelo próprio servidor Next
  // (mesma origem do navegador), a chamada nunca sai do domínio local.
  // Inativo por padrão — só existe quando LOCAL_API_PROXY_TARGET é setada
  // (nunca em produção, onde a env não é definida).
  async rewrites() {
    const target = process.env.LOCAL_API_PROXY_TARGET;
    if (!target) return [];
    return [{ source: "/api-proxy/:path*", destination: `${target}/:path*` }];
  },
  webpack: (config) => {
    // Desativa source maps de JS e CSS no nível do webpack
    config.devtool = false;

    return config;
  },
};

const withNextIntl = createNextIntlPlugin();
export default withNextIntl(nextConfig);
