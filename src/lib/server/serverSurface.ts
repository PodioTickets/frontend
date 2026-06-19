import "server-only";
import { headers, cookies } from "next/headers";
import { surfaceFromHost } from "../authSurface";

/**
 * Resolve, no SERVER (RSC), o access token httpOnly da superfície correta para
 * fetches SSR de hidratação (organizador/admin). Sessões são isoladas por
 * superfície (`pt_at_<surface>`); aqui escolhemos qual ler:
 *
 *  - PROD/homolog: pela HOST da request (subdomínio dedicado admin/organizer).
 *  - DEV/same-host (localhost, sem match de host): primeiro token presente na
 *    ordem organizer → admin → client (estes helpers SSR são do fluxo de
 *    edição de evento, então o token de staff é o relevante).
 *
 * O token vai como `Bearer` (o backend valida por Bearer, independente de
 * superfície). Se a escolha estiver "errada" num cenário multi-sessão, o backend
 * responde 401/403 → o helper retorna null → o client refaz com o header de
 * superfície correto. É só uma otimização de initialData.
 */
const SURFACE_ORDER = ["organizer", "admin", "client"] as const;

export async function readServerSurfaceToken(): Promise<string | null> {
  const h = await headers();
  const host = (h.get("x-forwarded-host") || h.get("host") || "")
    .split(",")[0]
    .split(":")[0]
    .trim()
    .toLowerCase();

  // Mesma resolução host→superfície do client (match exato + rótulo do subdomínio).
  // Aceita os env vars com e sem prefixo NEXT_PUBLIC_ (server-side pode usar bare).
  const preferred = surfaceFromHost(
    host,
    process.env.NEXT_PUBLIC_ADMIN_APP_HOST || process.env.ADMIN_APP_HOST,
    process.env.NEXT_PUBLIC_ORGANIZER_APP_HOST || process.env.ORGANIZER_APP_HOST,
  );

  const c = await cookies();
  const read = (s: string): string | null => {
    const v = c.get(`pt_at_${s}`)?.value;
    return v && v !== "undefined" && v !== "null" ? v : null;
  };

  if (preferred) {
    const t = read(preferred);
    if (t) return t;
  }
  for (const s of SURFACE_ORDER) {
    const t = read(s);
    if (t) return t;
  }
  return null;
}
