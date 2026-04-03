import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((o) => o.trim())
  .filter((o) => o.length > 0);

/**
 * Host do painel (ex.: app.podioticket.com.br). Sem protocolo; porta opcional em dev
 * (ex.: app.localhost:3000).
 *
 * Com isso ativo:
 * - /organizer só no app host; em outros hosts → redirect 307 para o app.
 * - No app host, rotas que não forem organizador nem técnicas → redirect 307 para ROOT_SITE_URL.
 *
 * Defina também ROOT_SITE_URL (ex.: https://www.podioticket.com.br) para o redirect do app → site.
 * No cliente, use os mesmos valores em NEXT_PUBLIC_ORGANIZER_APP_HOST e
 * NEXT_PUBLIC_ROOT_SITE_URL (ex.: publicSiteHref) para links ao site público.
 * Ajuste ALLOWED_ORIGINS e cookies (Domain) para ambos os hosts.
 */
function organizerAppHostConfig(): { raw: string; hostname: string } | null {
  const raw = process.env.ORGANIZER_APP_HOST?.trim();
  if (!raw) return null;
  const hostname = raw.split(":")[0].toLowerCase();
  return { raw, hostname };
}

/** Host público da requisição (Vercel/proxy costuma mandar em x-forwarded-host). */
function effectiveRequestHostname(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-host");
  if (forwarded) {
    const first = forwarded.split(",")[0].trim().split(":")[0];
    if (first) return first.toLowerCase();
  }
  return request.nextUrl.hostname.toLowerCase();
}

/** Rotas que precisam responder no host app sem estarem sob /organizer. */
function isTechnicalPathOnAppHost(pathname: string): boolean {
  if (pathname.startsWith("/organizer")) return true;
  if (pathname.startsWith("/_next")) return true;
  if (pathname.startsWith("/api")) return true;
  if (pathname.startsWith("/_vercel")) return true;
  if (pathname.startsWith("/.well-known")) return true;
  if (
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    pathname === "/manifest.json" ||
    pathname === "/manifest.webmanifest"
  ) {
    return true;
  }
  if (pathname === "/icon" || pathname.startsWith("/icon/")) return true;
  if (pathname === "/apple-icon" || pathname.startsWith("/apple-icon/")) return true;
  return false;
}

function applyOrganizerHostRouting(request: NextRequest): NextResponse | null {
  const cfg = organizerAppHostConfig();
  if (!cfg) return null;

  const currentHost = effectiveRequestHostname(request);
  const onAppHost = currentHost === cfg.hostname;
  const { pathname } = request.nextUrl;

  if (onAppHost) {
    if (isTechnicalPathOnAppHost(pathname)) return null;

    const rootBase = process.env.ROOT_SITE_URL?.trim().replace(/\/$/, "");
    if (!rootBase) {
      console.error(
        "proxy: define ROOT_SITE_URL quando ORGANIZER_APP_HOST está ativo (redirect app → site).",
      );
      return new NextResponse("Configuração do servidor incompleta.", {
        status: 503,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    try {
      const dest = new URL(
        request.nextUrl.pathname + request.nextUrl.search,
        rootBase.endsWith("/") ? rootBase : `${rootBase}/`,
      );
      return NextResponse.redirect(dest, 307);
    } catch {
      console.error("proxy: ROOT_SITE_URL inválida:", rootBase);
      return new NextResponse("Configuração do servidor inválida.", {
        status: 503,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }
  }

  if (pathname.startsWith("/organizer")) {
    const dest = request.nextUrl.clone();
    dest.hostname = cfg.hostname;

    const portFromEnv = cfg.raw.includes(":") ? cfg.raw.split(":")[1] : "";
    if (portFromEnv) {
      dest.port = portFromEnv;
    }

    if (process.env.NODE_ENV === "production") {
      dest.protocol = "https:";
      if (!portFromEnv) dest.port = "";
    }

    return NextResponse.redirect(dest, 307);
  }

  return null;
}

function isValidOrigin(origin: string | null, host: string | null): boolean {
  if (!origin || !host) return false;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  if (origin === `https://${host}`) return true;
  const isDev = process.env.NODE_ENV === "development";
  if (isDev && origin.includes("localhost")) return true;
  return false;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostRoute = applyOrganizerHostRouting(request);
  if (hostRoute) return hostRoute;

  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  const userAgent = request.headers.get("user-agent");

  if (!userAgent || userAgent.length < 10) {
    console.log("❌ Blocked: No user agent or too short");
    return new NextResponse(
      JSON.stringify({
        success: false,
        error: "Access denied",
      }),
      {
        status: 403,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  if (request.method === "OPTIONS" && pathname.startsWith("/api/")) {
    return new NextResponse(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": origin || "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers":
          "Content-Type, Authorization, X-Admin-Secret",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  if (pathname.startsWith("/api/")) {
    if (request.method !== "GET" && !isValidOrigin(origin, host)) {
      console.log("❌ Blocked: Invalid origin", { origin, host });
      return new NextResponse(
        JSON.stringify({
          success: false,
          error: "Origin not allowed",
        }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  }

  const response = NextResponse.next();

  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains; preload"
  );
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=()"
  );

  if (pathname.startsWith("/api/")) {
    if (isValidOrigin(origin, host)) {
      response.headers.set("Access-Control-Allow-Origin", origin!);
    } else {
      if (process.env.NODE_ENV === "development") {
        response.headers.set("Access-Control-Allow-Origin", "*");
      }
    }
    response.headers.set(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, DELETE, OPTIONS"
    );
    response.headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-Admin-Secret"
    );
    response.headers.set("Access-Control-Max-Age", "86400");
  }

  const isDev = process.env.NODE_ENV === "development";

  const trustedDomains = [
    "'self'",
    "https://api.podioticket.com.br",
    "https://prod.spline.design",
  ];

  if (isDev) trustedDomains.push("http://localhost:*", "https://localhost:*");

  const cspDirectives = [
    `default-src ${trustedDomains.join(" ")}`,
    `script-src ${trustedDomains.join(" ")} ${isDev ? "'unsafe-eval'" : ""
    } 'unsafe-inline' blob: https://va.vercel-scripts.com https://www.google.com https://maps.googleapis.com https://*.googleapis.com https://*.google.com`,
    `style-src ${trustedDomains.join(
      " "
    )} 'unsafe-inline' https://fonts.googleapis.com https://*.googleapis.com`,
    `font-src ${trustedDomains.join(" ")} data: https://fonts.gstatic.com https://*.google.com`,
    `connect-src ${trustedDomains.join(
      " "
    )} wss: ws: https://www.google.com https://maps.googleapis.com https://*.googleapis.com https://*.google.com https://www.google-analytics.com https://*.google-analytics.com`,
    `frame-src 'self' https://www.google.com https://maps.google.com https://*.google.com https://*.googleapis.com https://www.strava.com https://*.strava.com`,
    `img-src ${trustedDomains.join(" ")} data: blob: https://*.google.com https://*.googleapis.com https://*.gstatic.com https://*.googleusercontent.com`,
    `media-src ${trustedDomains.join(" ")} data: blob:`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    `upgrade-insecure-requests`,
  ];

  response.headers.set("Content-Security-Policy", cspDirectives.join("; "));
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
