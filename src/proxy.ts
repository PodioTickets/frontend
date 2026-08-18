import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isSearchIndexingEnabled } from "@/lib/searchIndexing";
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
  if (origin === `https://${host}`) return true;
  const isDev = process.env.NODE_ENV === "development";
  if (isDev && origin.includes("localhost")) return true;
  return false;
}

function adminAppHostConfig(): { raw: string; hostname: string } | null {
  const raw = process.env.ADMIN_APP_HOST?.trim();
  if (!raw) return null;
  const hostname = raw.split(":")[0].toLowerCase();
  return { raw, hostname };
}

/**
 * Guard de auth do admin no MIDDLEWARE (server-side) — DESLIGADO em dev.
 *
 * Motivo: o cookie httpOnly `pt_at_admin` é gravado pela API sob o host
 * `localhost` (`COOKIE_DOMAIN=localhost`) e o browser NÃO o entrega ao host
 * dedicado do admin (`test890.localhost`) na requisição de NAVEGAÇÃO — só nas
 * chamadas XHR à API (que vão pro próprio `localhost`). Cookies de `localhost`
 * não são compartilhados com `*.localhost`. Resultado: o guard SSR nunca
 * enxerga o token e bounceia o admin pra `/login` mesmo logado. O organizador
 * não sofre disso porque não tem guard SSR (auth é só client-side).
 *
 * Em dev, deixamos a auth a cargo do client (`useAdminAccess`), igual ao fluxo
 * do organizador. NUNCA desligar em produção: lá `app.`/`api.` são same-site e o
 * cookie de domínio-pai (`.podioticket.com.br`) é lido normalmente no SSR — o
 * guard SSR é uma camada de defesa que queremos manter.
 */
function isAdminSsrGuardDisabled(): boolean {
  return process.env.NODE_ENV === "development";
}

function applyAdminHostRouting(request: NextRequest): NextResponse | null {
  const cfg = adminAppHostConfig();
  if (!cfg) return null;

  const currentHost = effectiveRequestHostname(request);
  const onAdminHost = currentHost === cfg.hostname;
  const { pathname } = request.nextUrl;

  if (onAdminHost) {
    // Canonical: strip /admin prefix se presente
    if (pathname.startsWith("/admin")) {
      const rest = pathname.slice("/admin".length) || "/";
      const dest = request.nextUrl.clone();
      dest.pathname = rest === "" ? "/" : rest;
      if (urlsEquivalentForRedirect(dest, request.nextUrl)) return null;
      return NextResponse.redirect(dest, 307);
    }

    if (isAppHostInfrastructurePath(pathname)) return null;

    // Auth guard integrado ao host admin. Lê o access token httpOnly da
    // superfície ADMIN (`pt_at_admin`) — sessões isoladas por superfície (o
    // middleware roda no server e enxerga cookies httpOnly).
    // Em dev fica desligado (cookie de `localhost` não chega ao host dedicado
    // `*.localhost` na navegação) → auth client-side via `useAdminAccess`.
    if (!isAdminSsrGuardDisabled()) {
      const isLoginPath =
        pathname === "/login" || pathname.startsWith("/login/");
      const token = request.cookies.get("pt_at_admin")?.value;

      if (isLoginPath && token && token.length >= 10) {
        const dest = request.nextUrl.clone();
        dest.pathname = "/events";
        return NextResponse.redirect(dest, 307);
      }

      if (!isLoginPath && (!token || token.length < 10)) {
        const dest = request.nextUrl.clone();
        dest.pathname = "/login";
        if (pathname !== "/") dest.searchParams.set("next", pathname);
        return NextResponse.redirect(dest, 307);
      }
    }

    // Rewrite para /admin/*
    const internalPath = pathname === "/" ? "/admin" : `/admin${pathname}`;
    const rewriteUrl = request.nextUrl.clone();
    rewriteUrl.pathname = internalPath;
    return NextResponse.rewrite(rewriteUrl);
  }

  // Fora do host admin: redireciona /admin/* para o host admin (URL curta)
  if (pathname.startsWith("/admin")) {
    const dest = request.nextUrl.clone();
    dest.hostname = cfg.hostname;
    const portFromEnv = cfg.raw.includes(":") ? cfg.raw.split(":")[1] : "";
    if (portFromEnv) dest.port = portFromEnv;
    if (process.env.NODE_ENV === "production") {
      dest.protocol = "https:";
      if (!portFromEnv) dest.port = "";
    }
    const rest = pathname.slice("/admin".length) || "/";
    dest.pathname = rest === "" ? "/" : rest;
    return NextResponse.redirect(dest, 307);
  }

  return null;
}

function applyAdminAuthGuard(request: NextRequest): NextResponse | null {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith("/admin")) return null;

  // Em dev o guard SSR é desligado (ver `isAdminSsrGuardDisabled`): o cookie
  // httpOnly não chega ao middleware no host dedicado → auth fica client-side.
  if (isAdminSsrGuardDisabled()) return null;

  const isPublic = pathname.startsWith("/admin/login");
  // Access token httpOnly da superfície ADMIN (isolada das demais).
  const token = request.cookies.get("pt_at_admin")?.value;

  if (isPublic) {
    if (token && token.length >= 10) {
      return NextResponse.redirect(new URL("/admin/events", request.url));
    }
    return null;
  }

  if (!token || token.length < 10) {
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return null;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const adminHostRoute = applyAdminHostRouting(request);
  if (adminHostRoute) return adminHostRoute;

  const adminGuard = applyAdminAuthGuard(request);
  if (adminGuard) return adminGuard;

  const hostRoute = applyOrganizerHostRouting(request);
  if (hostRoute) return hostRoute;

  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  const userAgent = request.headers.get("user-agent");

  if (!userAgent || userAgent.length < 10) {
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
    if (!origin || !isValidOrigin(origin, host)) {
      return new NextResponse(null, { status: 403 });
    }
    return new NextResponse(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers":
          "Content-Type, Authorization, X-Admin-Secret",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  if (pathname.startsWith("/api/")) {
    if (request.method !== "GET" && !isValidOrigin(origin, host)) {
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
    "camera=(), microphone=(), geolocation=(self), payment=(), xr-spatial-tracking=(self \"https://challenges.cloudflare.com\")"
  );

  // Fora da produção real (homologação/staging) o site NÃO deve ser indexado.
  // `X-Robots-Tag` é autoritativo e sobrepõe qualquer `<meta robots>` de página.
  // Mesmo flag do tracking (ENABLE_TRACKING_SCRIPTS) — ver lib/searchIndexing.ts.
  if (!isSearchIndexingEnabled()) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
  }

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
    "https://homologacao.api.podioticket.com.br",
    "https://prod.spline.design",
  ];

  if (isDev) trustedDomains.push("http://localhost:*", "https://localhost:*");

  // Braspag MPI 3DS 2.0: SDK carrega script de mpi(sandbox).braspag.com.br,
  // faz fetch para Cardinal Commerce (backend do MPI) e abre iframe do ACS do banco.
  // Apata (apata.io) é o provedor de device fingerprint / coleta do 3DS usado pelo
  // fluxo Braspag/Cardinal — o desafio/coleta carrega recursos de apata.io; sem
  // liberar, a CSP bloqueia e a autenticação 3DS não acontece.
  const braspag3DSDomains = [
    "https://mpi.braspag.com.br",
    "https://mpisandbox.braspag.com.br",
    "https://*.cardinalcommerce.com",
    "https://apata.io",
    "https://*.apata.io",
  ];
  const braspag3DSCsp = braspag3DSDomains.join(" ");

  // Telemetria/log do SDK Braspag (API Gateway AWS dinâmico). Apenas connect-src.
  const braspag3DSConnectExtras = "https://*.execute-api.us-east-1.amazonaws.com";

  // Mercado Pago (débito tokenizado): SDK (sdk.mercadopago.com), security.js
  // (www.mercadopago.com), assets/fingerprint (*.mlstatic.com), tokenização e
  // eventos de device (api/events.mercadopago.com, api.mercadolibre.com). O SDK
  // puxa recursos de VÁRIOS subdomínios das famílias MP/ML — liberamos as
  // famílias inteiras pra não morrer um subdomínio por vez.
  const mercadoPagoCsp =
    "https://mercadopago.com https://*.mercadopago.com https://mercadopago.com.br https://*.mercadopago.com.br " +
    "https://mercadolibre.com https://*.mercadolibre.com https://mercadolivre.com.br https://*.mercadolivre.com.br https://*.mlstatic.com";
  const mercadoPagoScriptCsp = mercadoPagoCsp;
  const mercadoPagoConnectCsp = mercadoPagoCsp;

  // Google tag (gtag.js) / Google Ads (AW-18266397975): o loader vem de
  // googletagmanager.com e dispara scripts/beacons/pixels de conversão e
  // remarketing em googleadservices.com e (td|googleads).doubleclick.net.
  const googleTagDomains = [
    "https://www.googletagmanager.com",
    "https://www.googleadservices.com",
    // *.doubleclick.net cobre ad./td./googleads.g. (conversão, remarketing, collect).
    "https://*.doubleclick.net",
    // Pixel de remarketing (`/pagead/1p-user-list/...`) dispara no domínio Google
    // do país do usuário — público é BR, então o ccTLD é google.com.br (TLD .com.br,
    // NÃO coberto por *.google.com). Outros países usariam outro ccTLD (não listado).
    "https://*.google.com.br",
  ];
  const googleTagCsp = googleTagDomains.join(" ");

  const cspDirectives = [
    `default-src ${trustedDomains.join(" ")}`,
    /* TODO: migrar para nonce */ `script-src ${trustedDomains.join(" ")} ${isDev ? "'unsafe-eval'" : ""
    } 'unsafe-inline' blob: https://*.googleapis.com https://*.google.com https://challenges.cloudflare.com https://www.instagram.com https://connect.facebook.net https://platform.twitter.com https://www.tiktok.com https://strava-embeds.com ${braspag3DSCsp} ${googleTagCsp} ${mercadoPagoScriptCsp}`,
    `style-src ${trustedDomains.join(
      " "
    )} 'unsafe-inline' https://fonts.googleapis.com https://*.googleapis.com`,
    `font-src ${trustedDomains.join(" ")} data: https://fonts.gstatic.com https://*.google.com`,
    `connect-src ${trustedDomains.join(
      " "
    )} wss: ws: https://*.googleapis.com https://*.google.com https://*.google-analytics.com https://*.analytics.google.com https://challenges.cloudflare.com https://www.facebook.com https://connect.facebook.net ${braspag3DSCsp} ${braspag3DSConnectExtras} ${googleTagCsp} ${mercadoPagoConnectCsp}`,
    // 3DS challenge abre iframe do ACS do banco emissor (Itaú, Bradesco, Nubank, etc).
    // No fluxo Braspag/Cardinal o ACS fica ANINHADO no iframe do Cardinal (domínio fixo);
    // no fluxo Mercado Pago (MpChallengeModal) o form POST navega o iframe DIRETO pro
    // ACS do banco — domínio imprevisível por emissor. Por isso `https:` genérico aqui
    // e no form-action (iframe cross-origin não lê a página; frame-ancestors segue 'none').
    `frame-src 'self' https: https://www.youtube.com https://*.google.com https://*.googleapis.com https://www.strava.com https://*.strava.com https://strava-embeds.com https://challenges.cloudflare.com https://www.instagram.com https://www.facebook.com https://platform.twitter.com https://www.tiktok.com ${braspag3DSCsp} https://www.googletagmanager.com https://*.doubleclick.net`,
    `img-src ${trustedDomains.join(" ")} data: blob: https://cdn.podioticket.com.br https://*.google.com https://*.googleapis.com https://*.gstatic.com https://*.googleusercontent.com https://www.instagram.com https://*.cdninstagram.com https://*.fbcdn.net https://www.facebook.com https://*.strava.com https://strava-embeds.com https://apata.io https://*.apata.io ${mercadoPagoCsp} ${googleTagCsp}`,
    `media-src ${trustedDomains.join(" ")} data: blob:`,
    // worker-src e child-src: workers internos do Turnstile usam blob URLs
    `worker-src 'self' blob: https://challenges.cloudflare.com`,
    `child-src 'self' blob: https://challenges.cloudflare.com`,
    `object-src 'none'`,
    `base-uri 'self'`,
    // `https:` genérico por causa do challenge do Mercado Pago: o form do
    // MpChallengeModal submete o creq DIRETO pro ACS do banco (domínio por emissor).
    `form-action 'self' https: https://challenges.cloudflare.com ${braspag3DSCsp}`,
    `frame-ancestors 'none'`,
    `upgrade-insecure-requests`,
  ];

  response.headers.set("Content-Security-Policy", cspDirectives.join("; "));
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
