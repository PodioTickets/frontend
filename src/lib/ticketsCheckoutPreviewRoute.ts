/**
 * Prévia da escolha de ingressos — rota `.../tickets/preview`, presente nos 4
 * fluxos de evento (organizer new/edit, admin edit/review).
 *
 * A prévia reproduz a tela do PARTICIPANTE. Por isso os layouts de edição
 * escondem todo o chrome do organizador/admin nessa rota (header do evento,
 * header mobile e stepper de etapas): a página traz o próprio header de voltar
 * e o resto tem que ser só o conteúdo. Centralizado aqui porque os 4 layouts
 * fazem a mesma checagem — ver `docs`/notes do fluxo de ingressos.
 */
export function isTicketsCheckoutPreviewPath(
  pathname: string | null | undefined,
): boolean {
  if (!pathname) return false;
  const clean = pathname.split("?")[0].split("#")[0].replace(/\/+$/, "");
  return clean.endsWith("/tickets/preview");
}
