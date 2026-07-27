/**
 * Prévias em tela cheia dos fluxos de evento — rotas `.../tickets/preview` e
 * `.../topics/preview`, presentes nos 4 fluxos (organizer new/edit, admin
 * edit/review).
 *
 * Essas prévias reproduzem a tela do PARTICIPANTE. Por isso os layouts de edição
 * escondem todo o chrome do organizador/admin nessas rotas (header do evento,
 * header mobile e stepper de etapas): a própria página traz o header de voltar e
 * o resto tem que ser só o conteúdo. Centralizado aqui porque os 4 layouts fazem
 * a mesma checagem — ver `docs`/notes do fluxo de ingressos.
 */

/** Rota que termina em `/<segment>/preview`, ignorando query/hash/barra final. */
function isPreviewOf(
  pathname: string | null | undefined,
  segment: string,
): boolean {
  if (!pathname) return false;
  const clean = pathname.split("?")[0].split("#")[0].replace(/\/+$/, "");
  return clean.endsWith(`/${segment}/preview`);
}

/** Prévia da escolha de ingressos (`.../tickets/preview`). */
export function isTicketsCheckoutPreviewPath(
  pathname: string | null | undefined,
): boolean {
  return isPreviewOf(pathname, "tickets");
}

/** Prévia dos tópicos do evento (`.../topics/preview`). */
export function isTopicsPreviewPath(
  pathname: string | null | undefined,
): boolean {
  return isPreviewOf(pathname, "topics");
}

/**
 * Qualquer prévia em tela cheia do evento (ingressos OU tópicos). É o predicado
 * que os layouts usam para esconder o chrome — ambas as prévias reproduzem a
 * tela do participante e não devem ter navbar/header/stepper em volta.
 */
export function isEventFullscreenPreviewPath(
  pathname: string | null | undefined,
): boolean {
  return (
    isTicketsCheckoutPreviewPath(pathname) || isTopicsPreviewPath(pathname)
  );
}
