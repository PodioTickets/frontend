/**
 * No host admin (admin.dominio), a URL pública é curta (/events) mas a rota interna
 * do App Router continua em /admin/events (via rewrite no proxy).
 * Estes helpers alinham pathname e hrefs para UI e navegação.
 */
export function withAdminPathPrefix(
  pathname: string,
  isAdminSurface: boolean,
): string {
  if (!isAdminSurface || pathname.startsWith("/admin")) {
    return pathname;
  }
  if (pathname === "/") return "/admin";
  return `/admin${pathname}`;
}

/** href interno (/admin/...) → URL exibida no admin host (/...). */
export function adminExternalHref(
  internalHref: string,
  isAdminSurface: boolean,
): string {
  if (!isAdminSurface || !internalHref.startsWith("/admin")) {
    return internalHref;
  }
  const rest = internalHref.slice("/admin".length) || "/";
  return rest === "" ? "/" : rest;
}
