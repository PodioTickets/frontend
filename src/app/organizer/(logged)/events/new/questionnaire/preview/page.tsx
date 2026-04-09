"use client";

import { useEffect, useState, useCallback } from "react";
import { useOrganizerNavigate } from "@/hooks/useOrganizerNavigate";
import { useCreateEvent } from "@/contexts/CreateEventContext";
import { organizerService } from "@/services";
import { Loading } from "@/components/Loading";
import { QuestionnaireInformationPreview } from "@/components/Organizer/QuestionnaireInformationPreview";
import type { Event, Question } from "@/interfaces/event";
import toast from "react-hot-toast";
import {
  organizerQuestionsToCheckoutQuestions,
  readQuestionnairePreviewDraft,
} from "@/lib/questionnairePreviewDraft";

export default function NewQuestionnairePreviewPage() {
  const orgNav = useOrganizerNavigate();
  const { formData } = useCreateEvent();
  const eventId = formData.createdEventId ?? "";
  const [event, setEvent] = useState<Event | null>(null);
  const [previewQuestions, setPreviewQuestions] = useState<
    Question[] | undefined
  >(undefined);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!eventId) {
      setReady(true);
      return;
    }
    let cancelled = false;
    const d = readQuestionnairePreviewDraft(eventId);
    if (d) {
      setPreviewQuestions(organizerQuestionsToCheckoutQuestions(d.questions));
    } else {
      setPreviewQuestions(undefined);
    }
    organizerService
      .getEventById(eventId)
      .then((data) => {
        if (!cancelled) setEvent(data as Event);
      })
      .catch(() => {
        if (!cancelled) {
          toast.error("Não foi possível carregar o evento.");
          setEvent(null);
        }
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  const handleBack = useCallback(() => {
    orgNav.push("/organizer/events/new/questionnaire");
  }, [orgNav]);

  if (!eventId) {
    return (
      <div className="px-5 py-12">
        <p className="text-gray-11">
          Evento não encontrado. Conclua as etapas anteriores.
        </p>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loading />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex flex-col gap-4 px-5 py-12">
        <p className="text-gray-11">Não foi possível carregar o evento.</p>
        <button
          type="button"
          onClick={handleBack}
          className="text-left text-primary-11 underline"
        >
          Voltar ao questionário
        </button>
      </div>
    );
  }

  return (
    <QuestionnaireInformationPreview
      event={event}
      eventId={eventId}
      previewQuestions={previewQuestions}
      onBack={handleBack}
    />
  );
}
