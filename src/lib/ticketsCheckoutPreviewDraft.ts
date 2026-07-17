import type { EventKitSelectionDisplay } from "@/lib/eventKitSelectionDisplay";

export type TicketsCheckoutPreviewDraftV1 = {
  v: 1;
  eventId: string;
  kitSelectionDisplay: EventKitSelectionDisplay;
  /**
   * Prévia aberta de DENTRO do drawer de posição das imagens. Ao voltar, a tela
   * de ingressos reabre o drawer já com as escolhas do rascunho — o
   * sessionStorage é a única ponte de estado entre as duas rotas (a prévia
   * desmonta a tela de ingressos). Ausente/false = prévia do botão da página.
   */
  reopenKitDrawer?: boolean;
};

const STORAGE_KEY = "podiotickets.organizerTicketsCheckoutPreview.v1";

export function writeTicketsCheckoutPreviewDraft(
  draft: TicketsCheckoutPreviewDraftV1,
): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  } catch {
    /* quota / private mode */
  }
}

export function readTicketsCheckoutPreviewDraft(
  eventId: string,
): TicketsCheckoutPreviewDraftV1 | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as TicketsCheckoutPreviewDraftV1;
    if (
      data?.v !== 1 ||
      data.eventId !== eventId ||
      !data.kitSelectionDisplay ||
      typeof data.kitSelectionDisplay !== "object"
    ) {
      return null;
    }
    // Normaliza a flag: rascunhos gravados antes desta feature não a têm.
    return { ...data, reopenKitDrawer: data.reopenKitDrawer === true };
  } catch {
    return null;
  }
}

/**
 * Consome a marca de reabertura MANTENDO o rascunho. A flag é one-shot: reabre
 * o drawer exatamente uma vez ao voltar da prévia. Sem isso ela sobreviveria no
 * sessionStorage e o drawer voltaria a abrir sozinho em qualquer reentrada na
 * tela (o rascunho só é descartado no save/discard) — mas as escolhas de
 * exibição continuam valendo para a página.
 */
export function consumeTicketsCheckoutPreviewDraftReopenFlag(): void {
  if (typeof window === "undefined") return;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw) as TicketsCheckoutPreviewDraftV1;
    if (data?.v !== 1 || data.reopenKitDrawer !== true) return;
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...data, reopenKitDrawer: false }),
    );
  } catch {
    /* quota / private mode */
  }
}

export function clearTicketsCheckoutPreviewDraft(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
