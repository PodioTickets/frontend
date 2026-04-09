import type { EventKitSelectionDisplay } from "@/lib/eventKitSelectionDisplay";

export type TicketsCheckoutPreviewDraftV1 = {
  v: 1;
  eventId: string;
  kitSelectionDisplay: EventKitSelectionDisplay;
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
    return data;
  } catch {
    return null;
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
