import type { NextConfig } from "next";

/** Mesmo default que ApiClient — precisa estar em connect-src quando a API é outro host que o da página (ex.: app.* vs api.*). */
const DEFAULT_PUBLIC_API_URL = "http://localhost:3333";

function apiOriginForCsp(): string {
  const raw =
    process.env.NEXT_PUBLIC_API_URL?.trim() || DEFAULT_PUBLIC_API_URL;
  try {
    return new URL(raw).origin;
  } catch {
    return new URL(DEFAULT_PUBLIC_API_URL).origin;
  }
}

const apiConnectOrigin = apiOriginForCsp();

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
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' blob: https://www.google.com https://maps.googleapis.com https://*.googleapis.com https://*.google.com https://challenges.cloudflare.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://*.googleapis.com",
      `img-src 'self' data: https: blob: ${apiConnectOrigin} https://*.google.com https://*.googleapis.com https://*.gstatic.com https://*.googleusercontent.com`,
      "font-src 'self' data: https://fonts.gstatic.com https://*.google.com",
      "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com https://www.google.com https://maps.google.com https://*.google.com https://*.googleapis.com https://www.strava.com https://*.strava.com https://challenges.cloudflare.com",
      `connect-src 'self' ${apiConnectOrigin} wss: ws: https://www.google.com https://maps.googleapis.com https://*.googleapis.com https://*.google.com https://www.google-analytics.com https://*.google-analytics.com https://challenges.cloudflare.com`,
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  output: "standalone",
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
    ],
  },
};

export default nextConfig;

