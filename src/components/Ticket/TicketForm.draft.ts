import type { Batch, ProductData } from "./TicketForm.types";

const TICKET_DRAFT_TTL_MS = 24 * 60 * 60 * 1000;
const TICKET_DRAFT_VERSION = 1;

export type TicketDraftStoredForm = {
  ticketName: string;
  ticketDescription: string;
  selectedModality: string;
  distance: string;
  distanceUnit: string;
  gender: string;
  hasAgeRestriction: boolean;
  minAge: string;
  maxAge: string;
  hasKit: boolean;
  selectedGroupId: string;
  batches: Batch[];
  products: ProductData[];
};

type TicketDraftEnvelope = {
  v: number;
  savedAt: number;
  form: TicketDraftStoredForm;
};

function ticketDraftStorageKey(
  eventId: string,
  mode: "create" | "edit",
  ticketId?: string,
): string {
  if (mode === "edit" && ticketId)
    return `podioTicketDraft:v${TICKET_DRAFT_VERSION}:${eventId}:edit:${ticketId}`;
  return `podioTicketDraft:v${TICKET_DRAFT_VERSION}:${eventId}:create`;
}

export function readTicketDraft(
  eventId: string,
  mode: "create" | "edit",
  ticketId?: string,
): TicketDraftStoredForm | null {
  if (typeof window === "undefined") return null;
  const key = ticketDraftStorageKey(eventId, mode, ticketId);
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as TicketDraftEnvelope;
    if (
      !parsed ||
      parsed.v !== TICKET_DRAFT_VERSION ||
      typeof parsed.savedAt !== "number" ||
      !parsed.form ||
      typeof parsed.form !== "object"
    ) {
      localStorage.removeItem(key);
      return null;
    }
    if (Date.now() - parsed.savedAt > TICKET_DRAFT_TTL_MS) {
      localStorage.removeItem(key);
      return null;
    }
    return parsed.form;
  } catch {
    localStorage.removeItem(key);
    return null;
  }
}

export function writeTicketDraft(
  eventId: string,
  mode: "create" | "edit",
  ticketId: string | undefined,
  form: TicketDraftStoredForm,
): void {
  const env: TicketDraftEnvelope = {
    v: TICKET_DRAFT_VERSION,
    savedAt: Date.now(),
    form,
  };
  localStorage.setItem(
    ticketDraftStorageKey(eventId, mode, ticketId),
    JSON.stringify(env),
  );
}

export function clearTicketDraft(
  eventId: string,
  mode: "create" | "edit",
  ticketId?: string,
): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ticketDraftStorageKey(eventId, mode, ticketId));
}

export function applyTicketDraftForm(
  draft: TicketDraftStoredForm,
  a: {
    setTicketName: (v: string) => void;
    setTicketDescription: (v: string) => void;
    setSelectedModality: (v: string) => void;
    setDistance: (v: string) => void;
    setDistanceUnit: (v: string) => void;
    setGender: (v: string) => void;
    setHasAgeRestriction: (v: boolean) => void;
    setMinAge: (v: string) => void;
    setMaxAge: (v: string) => void;
    setHasKit: (v: boolean) => void;
    setSelectedGroupId: (v: string) => void;
    setBatches: (v: Batch[]) => void;
    setProducts: (v: ProductData[]) => void;
  },
): void {
  a.setTicketName(draft.ticketName ?? "");
  a.setTicketDescription(draft.ticketDescription ?? "");
  a.setSelectedModality(draft.selectedModality ?? "");
  a.setDistance(draft.distance ?? "");
  a.setDistanceUnit(draft.distanceUnit || "KM");
  a.setGender(draft.gender ?? "");
  a.setHasAgeRestriction(!!draft.hasAgeRestriction);
  a.setMinAge(draft.minAge ?? "");
  a.setMaxAge(draft.maxAge ?? "");
  a.setHasKit(!!draft.hasKit);
  a.setSelectedGroupId(draft.selectedGroupId ?? "");
  if (Array.isArray(draft.batches) && draft.batches.length > 0) {
    a.setBatches(draft.batches);
  }
  if (Array.isArray(draft.products)) {
    a.setProducts(draft.products);
  }
}
