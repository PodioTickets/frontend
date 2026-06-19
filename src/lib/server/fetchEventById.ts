import "server-only";
import { readServerSurfaceToken } from "./serverSurface";

/**
 * Server-side fetch do evento completo (`GET /api/v1/events/{eventId}`).
 *
 * Pareado com `fetchTicketsManagementBundle`, permite hidratar o cache do
 * `useEditEvent` (que usa `queryKeys.events.detail`) via `HydrationBoundary`
 * — eliminando o request paralelo que o `EditEventContext` faz no mount.
 *
 * Em caso de falha (sem token, 401, backend off, etc.), retorna `null` e
 * o client faz o fetch normal.
 */
export async function fetchEventById(eventId: string): Promise<unknown | null> {
  if (!eventId) return null;

  const token = await readServerSurfaceToken();
  if (!token) return null;

  const baseUrl = (
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:3333"
  ).replace(/\/$/, "");

  try {
    const response = await fetch(
      `${baseUrl}/api/v1/events/${encodeURIComponent(eventId)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        cache: "no-store",
      },
    );

    if (!response.ok) return null;

    const body = (await response.json()) as { data?: { event?: unknown } };
    return body?.data?.event ?? null;
  } catch {
    return null;
  }
}
