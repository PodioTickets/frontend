/**
 * Espelha a divisão app (organizador) / site público configurada no proxy.
 * Defina NEXT_PUBLIC_ORGANIZER_APP_HOST e NEXT_PUBLIC_ROOT_SITE_URL iguais a
 * ORGANIZER_APP_HOST e ROOT_SITE_URL para links do cliente abrirem o domínio certo.
 */
export function publicSiteHref(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const root = process.env.NEXT_PUBLIC_ROOT_SITE_URL?.trim().replace(/\/$/, "");
  const splitConfigured = Boolean(
    process.env.NEXT_PUBLIC_ORGANIZER_APP_HOST?.trim() && root,
  );
  if (splitConfigured) {
    return `${root}${normalized}`;
  }
  return normalized;
}
