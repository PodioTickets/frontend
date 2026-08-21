/**
 * Fonte ÚNICA da decisão "scripts de tracking ligados?" (Google Ads + Meta Pixel).
 *
 * Só liga em PRODUÇÃO real. NÃO usa `NODE_ENV`: builds de staging/homolog rodam
 * com NODE_ENV=production (ver src/hooks/useThreeDS.ts), o que vazaria os pixels
 * no ambiente de teste — poluindo dados de conversão do Google/Meta com tráfego
 * interno.
 *
 * Controlado por UM único env de SERVER (runtime, settável por-deploy SEM rebuild):
 *   ENABLE_TRACKING_SCRIPTS = "true"
 *
 * Como o valor mora no server mas parte do tracking é CLIENT (metaPixel.ts) — e
 * envs não-`NEXT_PUBLIC_*` não são inlinados no bundle do browser — o RootLayout
 * (Server Component) publica a decisão numa `<meta name="pt-tracking">`, e o client
 * a lê de volta. Mesmo padrão do `pt-app-surface` em lib/authSurface.ts. Assim NÃO
 * precisa de `NEXT_PUBLIC_*` nem de rebuild para (des)ligar.
 */

/** Nome da `<meta>` que carrega a decisão do server para o client. */
export const TRACKING_META = "pt-tracking";

/** Server-side: lê o env de runtime. Ativa apenas quando == "true". */
export function isTrackingEnabledFromEnv(): boolean {
  return process.env.ENABLE_TRACKING_SCRIPTS?.trim().toLowerCase() === "true";
}

/**
 * Decisão de tracking válida em QUALQUER contexto:
 *  - No SERVER (sem `document`): lê o env diretamente.
 *  - No CLIENT: lê a `<meta name="pt-tracking">` publicada pelo RootLayout.
 */
export function isTrackingEnabled(): boolean {
  if (typeof document === "undefined") {
    return isTrackingEnabledFromEnv();
  }
  return (
    document
      .querySelector(`meta[name="${TRACKING_META}"]`)
      ?.getAttribute("content") === "1"
  );
}
