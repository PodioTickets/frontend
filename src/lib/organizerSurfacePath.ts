/**
 * "Este caminho é de uma tela do PAINEL do organizador?" — decidido SÓ pela forma
 * do pathname, sem depender de reconhecer o app host.
 *
 * Por que existe: no host do painel a URL pública é curta (`/events/<id>/edit`) e
 * o prefixo `/organizer` só é recolocado por `withOrganizerPathPrefix`, que
 * depende de `isAppOrganizerSurface` — um valor calculado no SERVER a partir de
 * `headers().get("host")`. Atrás de um proxy esse `host` pode não ser o host
 * público (o `proxy.ts` usa `x-forwarded-host` primeiro; o `layout.tsx`, não), e
 * aí a superfície é lida como PÚBLICA mesmo servindo o painel. A consequência era
 * visível: o `<Header/>` do site renderizava e o `ContentWrapper` reservava
 * `mt-[64px]` para ele, SOMADO ao `pt-16` que o layout do organizador já reserva
 * para o nav mobile dele — dois offsets, um header só → faixa vazia de 64px entre
 * o header e o título da página.
 *
 * Só entram caminhos que NÃO existem no site público (ver `src/app/`): o público
 * tem `/events/[slug]` (2 segmentos), `/search`, `/checkout/*`, `/user/*` e a
 * landing. Por isso `/` fica DE FORA — no host do painel ele é o painel, mas no
 * site é a home, e confundir os dois esconderia o header da home.
 */
export function isOrganizerShortSurfacePath(pathname: string): boolean {
  const path = pathname.split("?")[0].replace(/\/+$/, "") || "/";

  // Telas de organização/equipe/configuração e o fluxo de auth do painel não têm
  // equivalente no site público, então a forma basta.
  const roots = [
    "/login",
    "/forgot-password",
    "/reset-password",
    "/create",
    "/settings",
    "/team",
    "/documentation",
    "/organization",
  ];
  for (const root of roots) {
    if (path === root || path.startsWith(`${root}/`)) return true;
  }

  if (path === "/events" || path.startsWith("/events/")) {
    // `/events/new…` é o wizard de criação.
    if (path === "/events/new" || path.startsWith("/events/new/")) return true;
    // `/events` (lista "Meus eventos") não existe no público — lá a listagem é `/search`.
    if (path === "/events") return true;
    // 3+ segmentos (`/events/<id>/edit`, `/events/<id>/dashboard`, …). O público
    // para em 2 (`/events/<slug>`), então não há colisão.
    return path.split("/").filter(Boolean).length >= 3;
  }

  return false;
}
