import { NextRequest, NextResponse } from "next/server";
import {
  isAllowedGoogleHost,
  isShortGoogleMapsLink,
} from "@/utils/googleMapsEmbed";

/**
 * GET /api/maps/resolve?url=<link curto do Google Maps>
 *
 * Resolve o redirect de links curtos (maps.app.goo.gl / goo.gl) server-side —
 * o browser não consegue (CORS) — e devolve a URL final pro client converter
 * em embed do local exato.
 *
 * Segurança (anti-SSRF):
 * - Só aceita como entrada hosts curtos do Google (allowlist estrita);
 * - Só devolve a URL final se ela também for de host Google;
 * - Nunca repassa o corpo da resposta, só a URL.
 *
 * Performance: resposta cacheada na edge/CDN por 24h (links curtos são
 * estáveis) + stale-while-revalidate.
 */
export async function GET(request: NextRequest) {
  const link = request.nextUrl.searchParams.get("url")?.trim();

  if (!link || link.length > 2048 || !isShortGoogleMapsLink(link)) {
    return NextResponse.json({ error: "invalid_url" }, { status: 400 });
  }

  const target = /^https?:\/\//i.test(link) ? link : `https://${link}`;

  try {
    const res = await fetch(target, {
      method: "GET",
      redirect: "follow",
      signal: AbortSignal.timeout(5000),
      // Sem cookies/credenciais; UA simples evita challenge de bot em alguns POPs
      headers: { "User-Agent": "Mozilla/5.0 (compatible; PodioTicket/1.0)" },
    });

    const finalUrl = new URL(res.url);
    if (
      (finalUrl.protocol !== "https:" && finalUrl.protocol !== "http:") ||
      !isAllowedGoogleHost(finalUrl.hostname)
    ) {
      return NextResponse.json({ error: "unresolvable" }, { status: 422 });
    }

    return NextResponse.json(
      { url: finalUrl.toString() },
      {
        headers: {
          "Cache-Control":
            "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
        },
      },
    );
  } catch {
    // Timeout/erro de rede: o client mantém o fallback por cidade/estado
    return NextResponse.json({ error: "unresolvable" }, { status: 422 });
  }
}
