"use client";

import { useState, useEffect, useCallback } from "react";
import { useOrganizerNavigate } from "@/hooks/useOrganizerNavigate";
import { organizerService } from "@/services";
import { useWizardAuth } from "@/hooks/useWizardAuth";
import { useCreateEvent } from "@/contexts/CreateEventContext";
import { ensureCreateEventSyncedFromDraft } from "@/lib/createEventDraftSync";
import { Button } from "@/components/Button";
import { useCreateQuestionModal, useDeleteQuestionModal } from "@/stores/modalStore";
import toast from "react-hot-toast";
import type { Question } from "@/services/organizer/OrganizerService";
import { cn } from "@/utils/cn";
import { writeQuestionnairePreviewDraft } from "@/lib/questionnairePreviewDraft";
import { WizardStepLayout } from "@/components/Organizer/WizardStepLayout";
import { QuestionsGrid } from "@/components/Questionnaire/QuestionsGrid";

export default function QuestionnairePage() {
  const orgNav = useOrganizerNavigate();
  const { authChecked } = useWizardAuth();
  const { formData, updateFormData } = useCreateEvent();
  const { openCreateQuestionModal, setOnModalSave } = useCreateQuestionModal();
  const { openDeleteQuestionModal } = useDeleteQuestionModal();
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);

  const loadQuestions = useCallback(async () => {
    if (!formData.createdEventId) return;
    setLoading(true);
    try {
      const loaded = await organizerService.getQuestions(formData.createdEventId).catch(() => []);
      setQuestions(loaded.sort((a, b) => a.order - b.order));
    } catch (error: any) {
      console.error("Error loading questions:", error);
    } finally {
      setLoading(false);
    }
  }, [formData.createdEventId]);

  useEffect(() => {
    if (!authChecked) return;
    loadQuestions();
  }, [authChecked, loadQuestions]);

  useEffect(() => {
    setOnModalSave(async () => {
      await loadQuestions();
    });
  }, [setOnModalSave, loadQuestions]);

  const handleBack = () => {
    orgNav.push("/organizer/events/new/topics");
  };

  const handleCreateQuestion = () => {
    openCreateQuestionModal({
      eventId: formData.createdEventId || "mock-event",
    });
  };

  const handleEditQuestion = (question: Question) => {
    if (!formData.createdEventId) {
      toast.error("Evento não encontrado");
      return;
    }
    openCreateQuestionModal({
      eventId: formData.createdEventId,
      questionId: question.id,
      question,
    });
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!formData.createdEventId) {
      toast.error("Evento não encontrado");
      return;
    }
    try {
      await organizerService.deleteQuestion(formData.createdEventId, questionId);
      toast.success("Pergunta deletada com sucesso!");
      await loadQuestions();
    } catch (error: any) {
      console.error("Error deleting question:", error);
      toast.error(error.response?.data?.message || "Erro ao deletar pergunta");
    }
  };

  const goFinanceiro = () => {
    orgNav.push("/organizer/events/new/financial");
  };

  const handleOpenQuestionnairePreview = useCallback(() => {
    if (!formData.createdEventId) {
      toast.error("Evento não encontrado");
      return;
    }
    writeQuestionnairePreviewDraft({
      v: 1,
      eventId: formData.createdEventId,
      questions: [...questions],
    });
    orgNav.push("/organizer/events/new/questionnaire/preview");
  }, [formData.createdEventId, questions, orgNav]);

  return (
    <WizardStepLayout
      title="Questionário"
      onBack={handleBack}
      className="flex-1 bg-gray-2 px-5 pt-[52px] pb-[176px] max-md:pb-40 md:px-[124px]"
      maxWidth="max-w-[1192px]"
      gutter="5"
      description="Crie perguntas extras para coletar informações dos participantes. Você pode pular esta etapa se desejar"
      showDescriptionOnMobile
      isLoading={!authChecked || loading}
      actions={
        <Button
          type="button"
          onClick={goFinanceiro}
          variant="default"
          className={cn(
            "h-[52px] px-11 font-manrope text-lg font-bold text-gray-12",
            "max-md:h-12 max-md:w-full max-md:px-4",
          )}
        >
          Próximo
        </Button>
      }
    >
      <QuestionsGrid
        questions={questions}
        onCreateQuestion={handleCreateQuestion}
        onEditQuestion={handleEditQuestion}
        onDeleteQuestion={(id) =>
          openDeleteQuestionModal({ onConfirm: () => handleDeleteQuestion(id) })
        }
      />
    </WizardStepLayout>
  );
}
