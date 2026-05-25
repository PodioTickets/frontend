import type { NextConfig } from "next";


const securityHeaders = [
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
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
    value: "camera=(), microphone=(), geolocation=(), payment=(), xr-spatial-tracking=(self \"https://challenges.cloudflare.com\")",
  },
];

const nextConfig: NextConfig = {
  output: "standalone",

  // Type checking roda no editor/IDE — não durante o docker build na VPS.
  // ESLint não precisa de flag: o Next 16 removeu a integração com `next build`.
  typescript: { ignoreBuildErrors: true },

  transpilePackages: ["quill-resize-module"],
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
      { protocol: "https", hostname: "**" },
      /** API / uploads em http (dev ou legado) — sem isso o next/image recusa o src */
      { protocol: "http", hostname: "**" },
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

