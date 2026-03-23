/**
 * Auditoria do organizador — page keys e clientPage alinhados a ORGANIZER_AUDIT_FRONTEND.md
 */

const MAX_PAGE_KEY_LEN = 200;

/** Valida e normaliza chave antes de enviar ao backend (evita injeção / payloads enormes). */
export function sanitizeOrganizerAuditPageKey(raw: string): string | null {
  const t = raw.trim().replace(/^\/+|\/+$/g, "");
  if (!t || t.length > MAX_PAGE_KEY_LEN) return null;
  if (t.includes("..")) return null;
  if (!/^[a-zA-Z0-9/_-]+$/.test(t)) return null;
  return t;
}

/**
 * Deriva `pageKey` a partir do pathname do App Router (sem query string).
 * Usa o sufixo após `/organizer/` para consistência com as rotas reais.
 */
export function resolveOrganizerAuditPageKey(pathname: string): string | null {
  const path = pathname.split("?")[0].replace(/\/+$/, "");
  if (!path.startsWith("/organizer")) return null;

  const relative = path.replace(/^\/organizer\/?/, "").trim();
  if (!relative) return "dashboard";

  return sanitizeOrganizerAuditPageKey(relative);
}

/** `clientPage` no PATCH /events/:id — texto estável para metadata no audit. */
export function organizerEventEditClientPage(
  eventId: string,
  section: "general" | "banner" | "topics"
): string {
  return `events/${eventId}/${section}`;
}

/** Fluxo criação de evento (PATCH em rascunho já criado). */
export function organizerNewEventClientPage(
  section: "information" | "banner" | "topics"
): string {
  return `events/new/${section}`;
}

/** PATCH combinado de membro (drawer equipe). */
export function organizerMemberSettingsClientPage(memberUserId: string): string {
  return `members/${memberUserId}/settings`;
}
