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
 * - No app host: URL pública sem prefixo /organizer (ex.: app…/events) com rewrite
 *   interno para /organizer/events; /organizer/… redireciona 307 para /… (canônico).
 * - Fora do app: /organizer/… redireciona 307 para app… com o mesmo caminho curto.
 *
 * Rotas públicas do site (ex.: /events/slug-de-evento) no host app → redirect para ROOT_SITE_URL.
 */
function organizerAppHostConfig(): { raw: string; hostname: string } | null {
  const raw = process.env.ORGANIZER_APP_HOST?.trim();
  if (!raw) return null;
  const hostname = raw.split(":")[0].toLowerCase();
  return { raw, hostname };
}

/**
 * Host “público” da requisição.
 * Em dev, usar só o header `Host` evita loop: alguns ambientes preenchem
 * `x-forwarded-host` de forma que `localhost` é confundido com `app.localhost`,
 * e `/` redireciona para ROOT_SITE_URL na mesma origem → ERR_TOO_MANY_REDIRECTS.
 * Em produção (Vercel etc.), `x-forwarded-host` costuma ser o domínio customizado.
 */
function effectiveRequestHostname(request: NextRequest): string {
  if (process.env.NODE_ENV === "development") {
    const hostHeader = request.headers.get("host");
    if (hostHeader) {
      return hostHeader.split(":")[0].trim().toLowerCase();
    }
    return request.nextUrl.hostname.toLowerCase();
  }

  const forwarded = request.headers.get("x-forwarded-host");
  if (forwarded) {
    const first = forwarded.split(",")[0].trim().split(":")[0];
    if (first) return first.toLowerCase();
  }
  const hostHeader = request.headers.get("host");
  if (hostHeader) {
    return hostHeader.split(":")[0].trim().toLowerCase();
  }
  return request.nextUrl.hostname.toLowerCase();
}

function urlsEquivalentForRedirect(a: URL, b: URL): boolean {
  return (
    a.origin === b.origin &&
    a.pathname === b.pathname &&
    a.search === b.search
  );
}

/**
 * Só trata como rota do painel em /events/:id se o segmento parecer id de backend.
 * Slugs públicos (ex.: "maratona-2024", "2025") vão para o site principal — não usar
 * só dígitos nem "qualquer string de 24 chars" (evita falso positivo com slug/cuid-like).
 */
function isProbableOrganizerEventIdSegment(segment: string): boolean {
  if (segment === "new") return true;
  if (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment)
  ) {
    return true;
  }
  if (/^c[a-z0-9]{20,31}$/i.test(segment)) {
    return true;
  }
  return false;
}

/** Infra e estáticos: não reescrever para /organizer no host app. */
function isAppHostInfrastructurePath(pathname: string): boolean {
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

/**
 * Caminhos que no host app são do organizador (URL curta, sem /organizer).
 * Outros caminhos → redirect para o site principal (checkout, evento público, etc.).
 */
function isOrganizerSurfacePath(pathname: string): boolean {
  if (pathname === "/") return true;

  const roots = [
    "/login",
    "/forgot-password",
    "/reset-password",
    "/create",
    "/settings",
    "/team",
    "/documentation",
  ];
  for (const r of roots) {
    if (pathname === r || pathname.startsWith(`${r}/`)) return true;
  }

  if (pathname === "/organization" || pathname.startsWith("/organization/")) {
    return true;
  }

  if (pathname === "/events" || pathname.startsWith("/events/")) {
    if (pathname.startsWith("/events/new")) return true;
    if (pathname === "/events") return true;
    const parts = pathname.split("/").filter(Boolean);
    if (parts.length >= 3) return true;
    const segment = parts[1];
    return isProbableOrganizerEventIdSegment(segment);
  }

  return false;
}

function applyOrganizerHostRedirectToApp(
  request: NextRequest,
  cfg: { raw: string; hostname: string },
): NextResponse {
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

  const rest =
    request.nextUrl.pathname.slice("/organizer".length) || "/";
  dest.pathname = rest === "" ? "/" : rest;

  return NextResponse.redirect(dest, 307);
}

function applyOrganizerHostRouting(request: NextRequest): NextResponse | null {
  const cfg = organizerAppHostConfig();
  if (!cfg) return null;

  const currentHost = effectiveRequestHostname(request);
  const onAppHost = currentHost === cfg.hostname;
  const { pathname } = request.nextUrl;

  if (onAppHost) {
    if (pathname.startsWith("/organizer")) {
      const rest = pathname.slice("/organizer".length) || "/";
      const dest = request.nextUrl.clone();
      dest.pathname = rest === "" ? "/" : rest;
      if (urlsEquivalentForRedirect(dest, request.nextUrl)) {
        return null;
      }
      return NextResponse.redirect(dest, 307);
    }

    if (isAppHostInfrastructurePath(pathname)) {
      return null;
    }

    if (!isOrganizerSurfacePath(pathname)) {
      const rootBase = process.env.ROOT_SITE_URL?.trim().replace(/\/$/, "");
      if (!rootBase) {
        console.error(
          "proxy: ROOT_SITE_URL é necessário quando ORGANIZER_APP_HOST está ativo (rotas não-organizador no app).",
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
        if (urlsEquivalentForRedirect(dest, request.nextUrl)) {
          return null;
        }
        return NextResponse.redirect(dest, 307);
      } catch {
        console.error("proxy: ROOT_SITE_URL inválida:", rootBase);
        return new NextResponse("Configuração do servidor inválida.", {
          status: 503,
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
      }
    }

    const internalPath =
      pathname === "/" ? "/organizer" : `/organizer${pathname}`;
    const rewriteUrl = request.nextUrl.clone();
    rewriteUrl.pathname = internalPath;
    return NextResponse.rewrite(rewriteUrl);
  }

  if (pathname.startsWith("/organizer")) {
    return applyOrganizerHostRedirectToApp(request, cfg);
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
    `frame-src 'self' https://www.youtube.com https://www.google.com https://maps.google.com https://*.google.com https://*.googleapis.com https://www.strava.com https://*.strava.com`,
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
