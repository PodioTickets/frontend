/**
 * Fonte ÚNICA da decisão "o site pode ser indexado pelo Google?".
 *
 * Acoplada de propósito ao MESMO flag de PRODUÇÃO real dos scripts de tracking
 * (`ENABLE_TRACKING_SCRIPTS=true`, ver `trackingEnabled.ts`): só a produção real
 * liga tracking, então só ela deve ser indexável. Ambientes de HOMOLOGAÇÃO/staging
 * rodam com o flag OFF (e também com `NODE_ENV=production`, por isso NÃO dá pra usar
 * `NODE_ENV`) → recebem `noindex` e não aparecem na busca.
 *
 * Aplicada em DOIS pontos (defesa em profundidade):
 *  - `proxy.ts` (middleware): header HTTP `X-Robots-Tag` — autoritativo, cobre TODAS
 *    as rotas e sobrepõe qualquer `<meta robots>` de página (regra do Google: o mais
 *    restritivo vence).
 *  - `layout.tsx` (RootLayout): `<meta name="robots">` em runtime — cobre também as
 *    respostas de rewrite (admin/organizer) e sobrevive se um CDN remover o header.
 */

export const ROBOTS_INDEX = "index, follow";
export const ROBOTS_NOINDEX = "noindex, nofollow";

/** Server-side: indexação liberada apenas em produção real (flag == "true"). */
export function isSearchIndexingEnabled(): boolean {
  return process.env.ENABLE_TRACKING_SCRIPTS?.trim().toLowerCase() === "true";
}

/** Diretiva `robots` a emitir (meta e/ou header), conforme o ambiente. */
export function robotsDirective(): string {
  return isSearchIndexingEnabled() ? ROBOTS_INDEX : ROBOTS_NOINDEX;
}
