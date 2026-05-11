import "server-only";
import { cookies } from "next/headers";
import {
  normalizeTicketsManagementRaw,
  type TicketsManagementBundle,
  type TicketsManagementBundleRaw,
} from "@/hooks/useTicketsManagement";

/**
 * Server-side fetch do bundle de gerenciamento de ingressos.
 *
 * Usado para hidratar a página com `initialData` do React Query, eliminando
 * o waterfall "HTML vazio → JS → fetch → render" que existe quando a página
 * é puramente client-side.
 *
 * Retorna o bundle **já formatado** (via `normalizeTicketsManagementRaw`):
 * o cache armazena tickets formatados, e o `select` apenas reconcila com
 * pending writes — evita dupla aplicação não-idempotente de `formatRawTicket`.
 *
 * Em caso de falha (sem token, 401, 403, 404, backend off, etc.), retorna
 * `null` — o client faz o fetch normal e cuida do erro via interceptor
 * existente (redirect pro login, toast, etc).
 */
export async function fetchTicketsManagementBundle(
  eventId: string,
): Promise<TicketsManagementBundle | null> {
  if (!eventId) return null;

  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  if (!token) return null;

  const baseUrl = (
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:3333"
  ).replace(/\/$/, "");

  try {
    const response = await fetch(
      `${baseUrl}/api/v1/events/${encodeURIComponent(
        eventId,
      )}/tickets-management`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        // Sem cache no fetch do Next — o React Query no client é quem gerencia.
        // Se cachear aqui também duplica o controle de freshness.
        cache: "no-store",
      },
    );

    if (!response.ok) return null;

    const body = (await response.json()) as {
      data?: TicketsManagementBundleRaw;
    };
    if (!body?.data) return null;

    return normalizeTicketsManagementRaw({
      event: body.data.event,
      categories: body.data.categories ?? [],
      tickets: body.data.tickets ?? [],
    });
  } catch {
    // Backend off / timeout / parse error — deixa o client tentar.
    return null;
  }
}
