import type { Question as OrganizerQuestion } from "@/services/organizer/OrganizerService";
import type { Question as CheckoutQuestion } from "@/interfaces/event";

export type QuestionnairePreviewDraftV1 = {
  v: 1;
  eventId: string;
  questions: OrganizerQuestion[];
};

const STORAGE_KEY = "podiotickets.organizerQuestionnairePreview.v1";

export function organizerQuestionsToCheckoutQuestions(
  list: OrganizerQuestion[],
): CheckoutQuestion[] {
  return list.map((q) => ({
    id: q.id,
    eventId: q.eventId,
    question: q.question,
    type: q.type,
    options: q.options,
    isRequired: q.isRequired,
    order: q.order,
    createdAt: q.createdAt ?? "",
    updatedAt: q.updatedAt ?? "",
  }));
}

export function writeQuestionnairePreviewDraft(
  draft: QuestionnairePreviewDraftV1,
): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  } catch {
    /* quota / private mode */
  }
}

export function readQuestionnairePreviewDraft(
  eventId: string,
): QuestionnairePreviewDraftV1 | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as QuestionnairePreviewDraftV1;
    if (
      data?.v !== 1 ||
      data.eventId !== eventId ||
      !Array.isArray(data.questions)
    ) {
      return null;
    }
    return data;
  } catch {
    return null;
  }
}
