"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useOrganizerNavigate } from "@/hooks/useOrganizerNavigate";
import { useEditEvent } from "@/contexts/EditEventContext";
import { Loading } from "@/components/Loading";
import { QuestionnaireInformationPreview } from "@/components/Organizer/QuestionnaireInformationPreview";
import type { Event, Question } from "@/interfaces/event";
import {
  organizerQuestionsToCheckoutQuestions,
  readQuestionnairePreviewDraft,
} from "@/lib/questionnairePreviewDraft";

export default function EditQuestionnairePreviewPage() {
  const params = useParams();
  const eventId = params.id as string;
  const orgNav = useOrganizerNavigate();
  const { event, loading } = useEditEvent();
  const [previewQuestions, setPreviewQuestions] = useState<
    Question[] | undefined
  >(undefined);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const d = readQuestionnairePreviewDraft(eventId);
    if (d) {
      setPreviewQuestions(organizerQuestionsToCheckoutQuestions(d.questions));
    } else {
      setPreviewQuestions(undefined);
    }
    setHydrated(true);
  }, [eventId]);

  const handleBack = () => {
    orgNav.push(`/organizer/events/${eventId}/edit/questionnaire`);
  };

  if (loading || !event || !hydrated) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loading />
      </div>
    );
  }

  return (
    <QuestionnaireInformationPreview
      event={event as Event}
      eventId={eventId}
      previewQuestions={previewQuestions}
      onBack={handleBack}
    />
  );
}
