/**
 * Carga do editor de tópicos (Quill + módulo de resize + CSS).
 *
 * Mora FORA do `TopicModal` de propósito: o modal é lazy (`next/dynamic` no
 * `ModalsProvider`), então importar o preload de lá puxaria o módulo inteiro
 * para as telas de tópicos e anularia esse lazy. Este arquivo é minúsculo e só
 * carrega o Quill quando alguém chama.
 */

type QuillDeps = {
  Quill: typeof import("quill").default;
  /** `unknown` porque `quill-resize-module` não tem tipos (ver quill-resize-module.d.ts). */
  QuillResize: unknown;
};

/**
 * Memoizada por SESSÃO (não por instância do modal). Guardar a PROMISE — e não
 * um booleano — também deduplica aberturas concorrentes: abrir/fechar/abrir
 * rápido reaproveita a mesma carga em vez de disparar outra.
 */
let quillDepsPromise: Promise<QuillDeps> | null = null;

export function loadQuillDeps(): Promise<QuillDeps> {
  if (!quillDepsPromise) {
    quillDepsPromise = (async () => {
      // CSS em paralelo com o JS — não há dependência entre eles, e serializar
      // custava um round-trip a mais na primeira abertura.
      const [QuillModule, ResizeModule] = await Promise.all([
        import("quill"),
        import("quill-resize-module"),
        import("quill/dist/quill.snow.css").catch(() => null),
        import("quill-resize-module/dist/resize.css").catch(() => null),
      ]);
      return { Quill: QuillModule.default, QuillResize: ResizeModule.default };
    })().catch((err) => {
      // Não deixa uma falha de rede envenenar o cache: a próxima tentativa refaz.
      quillDepsPromise = null;
      throw err;
    });
  }
  return quillDepsPromise;
}

/**
 * Aquece o editor ANTES de o usuário abrir o modal. Chamar no mount das telas de
 * tópicos (em `requestIdleCallback`) faz o download+parse do Quill acontecer
 * enquanto o usuário lê a lista, em vez de começar só no clique.
 *
 * Best-effort e idempotente: erro aqui é engolido — o erro real (se houver)
 * aparece na abertura do modal, que refaz a carga.
 */
export function preloadTopicEditor(): void {
  if (typeof window === "undefined") return;
  void loadQuillDeps().catch(() => {});
}

/**
 * Agenda o preload para a primeira janela ociosa e devolve o cleanup.
 * Use no `useEffect` das telas que abrem o modal de tópicos.
 */
export function scheduleTopicEditorPreload(): () => void {
  if (typeof window === "undefined") return () => {};

  const ric = window.requestIdleCallback;
  if (typeof ric === "function") {
    const id = ric(() => preloadTopicEditor(), { timeout: 2000 });
    return () => window.cancelIdleCallback?.(id);
  }

  // Safari < 17 não tem requestIdleCallback: cai num timer curto, tempo
  // suficiente para não competir com a renderização inicial da tela.
  const id = window.setTimeout(preloadTopicEditor, 600);
  return () => window.clearTimeout(id);
}
