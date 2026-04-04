/**
 * No host app (app.dominio), a URL pública é curta (/events) mas a rota interna
 * do App Router continua em /organizer/events (via rewrite no proxy).
 * Estes helpers alinham pathname e hrefs para UI e navegação.
 */
export function withOrganizerPathPrefix(
  pathname: string,
  isAppOrganizerSurface: boolean,
): string {
  if (!isAppOrganizerSurface || pathname.startsWith("/organizer")) {
    return pathname;
  }
  if (pathname === "/") return "/organizer";
  return `/organizer${pathname}`;
}

/** href interno (/organizer/...) → URL exibida no app host (/...). */
export function organizerExternalHref(
  internalHref: string,
  isAppOrganizerSurface: boolean,
): string {
  if (!isAppOrganizerSurface || !internalHref.startsWith("/organizer")) {
    return internalHref;
  }
  const rest = internalHref.slice("/organizer".length) || "/";
  return rest === "" ? "/" : rest;
}
