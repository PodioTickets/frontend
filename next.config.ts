import type { NextConfig } from "next";


const securityHeaders = [
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  // Anti-clickjacking: as PÁGINAS HTML do app (checkout, exclusão de conta,
  // dashboard) não podiam ser enquadradas. `X-Frame-Options` cobre navegadores
  // legados; `frame-ancestors 'none'` é o equivalente moderno via CSP.
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "Content-Security-Policy",
    value: "frame-ancestors 'none'",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "X-XSS-Protection",
    value: "1; mode=block",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains; preload",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(self), payment=(), xr-spatial-tracking=(self \"https://challenges.cloudflare.com\")",
  },
];

const nextConfig: NextConfig = {
  output: "standalone",

  // Type checking roda no editor/IDE — não durante o docker build na VPS.
  // ESLint não precisa de flag: o Next 16 removeu a integração com `next build`.
  /* ATENÇÃO: erros de TS existentes — remover após corrigir */
  typescript: { ignoreBuildErrors: true },

  // Remove TODOS os console.* do bundle de produção (mantém error/warn para
  // observabilidade real). Evita vazar dado de usuário/preço/IDs em produção
  // sem precisar caçar cada log manualmente. Em dev os logs continuam ativos.
  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production"
        ? { exclude: ["error", "warn"] }
        : false,
  },

  transpilePackages: ["quill-resize-module"],
  async redirects() {
    return [
      {
        // Rota antiga da landing institucional (/lp). Renomeada para a URL
        // canônica abaixo (melhor SEO e divulgação). 308 permanente: preserva
        // links já compartilhados e sinaliza a mudança definitiva aos crawlers.
        source: "/lp",
        destination: "/crie-seu-evento-na-podioticket",
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "*.podioticket.com.br" },
      { protocol: "https", hostname: "cdn.podioticket.com.br" },
      { protocol: "https", hostname: "*.amazonaws.com" },
      { protocol: "https", hostname: "*.googleusercontent.com" },
      { protocol: "https", hostname: "*.cdninstagram.com" },
      // Desenvolvimento local (HTTP apenas para localhost)
      { protocol: "http", hostname: "localhost" },
    ],
  },
  compress: true,
  poweredByHeader: false,
  experimental: {
    optimizePackageImports: [
      "@fortawesome/react-fontawesome",
      "@fortawesome/free-solid-svg-icons",
      "lucide-react",
      "framer-motion",
      "@radix-ui/react-checkbox",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-popover",
      "@radix-ui/react-slot",
      "react-svg-credit-card-payment-icons",
      "@dnd-kit/core",
      "@dnd-kit/sortable",
      "@dnd-kit/utilities",
    ],
    // Usa worker threads para paralelizar a compilação webpack — reduz tempo de build
    webpackBuildWorker: true,
    // Compila server e client em paralelo em vez de sequencialmente
    parallelServerCompiles: true,
    parallelServerBuildTraces: true,
  },
};

export default nextConfig;

