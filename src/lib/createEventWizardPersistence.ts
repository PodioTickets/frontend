/** Rotas internas (/organizer/...) — alinhado a useOrganizerPathname. */

export const CREATE_EVENT_WIZARD_LAST_PATH_KEY =
  "podiotickets.createEventWizard.lastPath";

export const CREATE_EVENT_REGULATION_PDF_DRAFT_KEY =
  "podiotickets.createEventWizard.regulationPdfDraft";

export const DEFAULT_CREATE_EVENT_WIZARD_PATH =
  "/organizer/events/new/information";

export type RegulationPdfDraftV1 = {
  v: 1;
  /** data:application/pdf;base64,... */
  dataUrl: string;
  fileName: string;
};

function isValidNewFlowPath(path: string): boolean {
  return (
    path.startsWith("/organizer/events/new/") &&
    path !== "/organizer/events/new"
  );
}

export function loadLastCreateEventWizardPath(): string {
  if (typeof window === "undefined") return DEFAULT_CREATE_EVENT_WIZARD_PATH;
  try {
    const raw = localStorage.getItem(CREATE_EVENT_WIZARD_LAST_PATH_KEY);
    if (raw && isValidNewFlowPath(raw)) return raw;
  } catch {
    /* ignore */
  }
  return DEFAULT_CREATE_EVENT_WIZARD_PATH;
}

export function saveLastCreateEventWizardPath(path: string): void {
  if (typeof window === "undefined") return;
  if (!isValidNewFlowPath(path)) return;
  try {
    localStorage.setItem(CREATE_EVENT_WIZARD_LAST_PATH_KEY, path);
  } catch {
    /* quota */
  }
}

export function clearLastCreateEventWizardPath(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(CREATE_EVENT_WIZARD_LAST_PATH_KEY);
  } catch {
    /* ignore */
  }
}

export function loadRegulationPdfDraft(): RegulationPdfDraftV1 | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CREATE_EVENT_REGULATION_PDF_DRAFT_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as RegulationPdfDraftV1;
    if (
      data?.v === 1 &&
      typeof data.dataUrl === "string" &&
      data.dataUrl.startsWith("data:") &&
      typeof data.fileName === "string"
    ) {
      return data;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function saveRegulationPdfDraft(draft: RegulationPdfDraftV1): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      CREATE_EVENT_REGULATION_PDF_DRAFT_KEY,
      JSON.stringify(draft),
    );
  } catch {
    /* quota */
  }
}

export function clearRegulationPdfDraft(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(CREATE_EVENT_REGULATION_PDF_DRAFT_KEY);
  } catch {
    /* ignore */
  }
}

export function clearCreateEventWizardPersistenceExtras(): void {
  clearLastCreateEventWizardPath();
  clearRegulationPdfDraft();
}

export interface CreationDraftInfo {
  /** Há dados locais de criação em andamento (name ou createdEventId). */
  hasLocalData: boolean;
  /** ID do evento já criado no servidor, ou null se ainda não foi criado. */
  createdEventId: string | null;
  /** Última etapa visitada (para retomar de onde parou). */
  lastPath: string;
}

/** Lê o estado do rascunho de criação do localStorage sem montar nenhum contexto React. */
export function getCreationDraftInfo(): CreationDraftInfo {
  if (typeof window === "undefined") {
    return { hasLocalData: false, createdEventId: null, lastPath: DEFAULT_CREATE_EVENT_WIZARD_PATH };
  }
  try {
    const raw = localStorage.getItem("createEventFormData");
    if (raw) {
      const data = JSON.parse(raw);
      const hasLocalData = !!(data?.name || data?.createdEventId);
      return {
        hasLocalData,
        createdEventId: data?.createdEventId || null,
        lastPath: loadLastCreateEventWizardPath(),
      };
    }
  } catch {
    /* ignore */
  }
  return { hasLocalData: false, createdEventId: null, lastPath: DEFAULT_CREATE_EVENT_WIZARD_PATH };
}

/** Remove rascunho do fluxo "novo evento" (form + última rota + PDF em rascunho). */
export function clearAllCreateEventClientStorage(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem("createEventFormData");
  } catch {
    /* ignore */
  }
  clearCreateEventWizardPersistenceExtras();
}
