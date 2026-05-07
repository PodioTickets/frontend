"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { organizerService } from "@/services";
import { useWizardAuth } from "@/hooks/useWizardAuth";
import { Button } from "@/components/Button";
import { UnsavedChangesModal } from "@/components/UnsavedChangesModal";
import { useUnsavedLeaveGuard } from "@/hooks/useUnsavedLeaveGuard";
import { useCreateQuestionModal, useDeleteQuestionModal } from "@/stores/modalStore";
import { WizardStepLayout } from "@/components/Organizer/WizardStepLayout";
import { QuestionsGrid } from "@/components/Questionnaire/QuestionsGrid";
import toast from "react-hot-toast";
import type { Question } from "@/services/organizer/OrganizerService";
import type { QuestionModalLocalPayload } from "@/components/Questionnaire/CreateQuestionModal";
import { cn } from "@/utils/cn";
import { writeQuestionnairePreviewDraft } from "@/lib/questionnairePreviewDraft";

const PENDING_QUESTION_PREFIX = "__pending_question__";

function isPendingQuestionId(id: string): boolean {
  return id.startsWith(PENDING_QUESTION_PREFIX);
}

export default function EditQuestionnairePage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;
  const { authChecked } = useWizardAuth();
  const { openCreateQuestionModal, setOnModalSave } = useCreateQuestionModal();
  const { openDeleteQuestionModal } = useDeleteQuestionModal();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [committedQuestionsJson, setCommittedQuestionsJson] = useState<string | null>(null);

  const refetchQuestions = useCallback(async (): Promise<Question[]> => {
    if (!eventId) return [];
    try {
      const loaded = await organizerService.getQuestions(eventId).catch(() => []);
      const sorted = [...loaded].sort((a, b) => a.order - b.order);
      setQuestions(sorted);
      return sorted;
    } catch (error: any) {
      console.error("Error loading questions:", error);
      return [];
    }
  }, [eventId]);

  const loadQuestions = useCallback(async () => {
    if (!eventId) return;
    setLoading(true);
    try {
      const sorted = await refetchQuestions();
      setCommittedQuestionsJson(JSON.stringify(sorted));
    } finally {
      setLoading(false);
    }
  }, [eventId, refetchQuestions]);

  useEffect(() => {
    if (!authChecked) return;
    loadQuestions();
  }, [authChecked, loadQuestions]);

  useEffect(() => {
    setOnModalSave(
      async (payload: QuestionModalLocalPayload | undefined) => {
        if (payload?.kind === "create") {
          const id = `${PENDING_QUESTION_PREFIX}${crypto.randomUUID()}`;
          setQuestions((prev) => {
            const order = prev.length + 1;
            const q: Question = {
              id,
              question: payload.questionData.question,
              description: payload.questionData.description,
              type: payload.questionData.type,
              options: payload.questionData.options,
              isRequired: payload.questionData.isRequired ?? true,
              order,
              appliesTo: payload.questionData.appliesTo ?? "all",
              eventId,
              createdAt: "",
              updatedAt: "",
            };
            return [...prev, q].sort((a, b) => a.order - b.order);
          });
          return;
        }
        if (payload?.kind === "update") {
          setQuestions((prev) =>
            prev.map((q) =>
              q.id === payload.questionId
                ? {
                    ...q,
                    question: payload.questionData.question,
                    description: payload.questionData.description,
                    type: payload.questionData.type,
                    options: payload.questionData.options,
                    isRequired: payload.questionData.isRequired ?? true,
                    appliesTo: payload.questionData.appliesTo ?? "all",
                  }
                : q
            )
          );
          return;
        }
        if (payload?.kind === "delete") {
          setQuestions((prev) => prev.filter((q) => q.id !== payload.questionId));
          return;
        }
        const sorted = await refetchQuestions();
        setCommittedQuestionsJson(JSON.stringify(sorted));
      }
    );
  }, [setOnModalSave, eventId, refetchQuestions]);

  const isDirty = useMemo(
    () =>
      committedQuestionsJson !== null &&
      JSON.stringify(questions) !== committedQuestionsJson,
    [questions, committedQuestionsJson],
  );

  const discardLocalChanges = useCallback(() => {
    if (committedQuestionsJson == null) return;
    try {
      setQuestions(JSON.parse(committedQuestionsJson) as Question[]);
    } catch {
      toast.error("Não foi possível restaurar o estado anterior.");
    }
  }, [committedQuestionsJson]);

  const {
    leavePromptOpen,
    handleBack,
    confirmLeaveWithoutSaving,
    beginNavigationAfterSave,
    dismissLeavePrompt,
  } = useUnsavedLeaveGuard(isDirty, {
    navigateTarget: `/admin/events/${eventId}/edit/topics`,
    onDiscard: discardLocalChanges,
  });

  const handleCreateQuestion = () => {
    openCreateQuestionModal({
      eventId: eventId || "mock-event",
      deferPersistence: true,
    });
  };

  const handleEditQuestion = (question: Question) => {
    if (!eventId) {
      toast.error("Evento não encontrado");
      return;
    }
    openCreateQuestionModal({
      eventId,
      questionId: question.id,
      question,
      deferPersistence: true,
    });
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!eventId) {
      toast.error("Evento não encontrado");
      return;
    }
    if (isPendingQuestionId(questionId)) {
      setQuestions((prev) => prev.filter((q) => q.id !== questionId));
      toast.success("Pergunta removida.");
      return;
    }
    try {
      await organizerService.deleteQuestion(eventId, questionId);
      toast.success("Pergunta deletada com sucesso!");
      const sorted = await refetchQuestions();
      setCommittedQuestionsJson(JSON.stringify(sorted));
    } catch (error: any) {
      console.error("Error deleting question:", error);
      toast.error(error.response?.data?.message || "Erro ao deletar pergunta");
    }
  };

  const handleSaveChanges = async (): Promise<boolean> => {
    if (!eventId) {
      toast.error("Evento não encontrado");
      return false;
    }
    setSaving(true);
    try {
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        if (!isPendingQuestionId(q.id)) continue;
        await organizerService.createQuestion(eventId, {
          question: q.question,
          description: q.description,
          type: q.type,
          isRequired: q.isRequired,
          options: q.options,
          order: i + 1,
          appliesTo: q.appliesTo ?? "all",
        });
      }
      const sorted = await refetchQuestions();
      setCommittedQuestionsJson(JSON.stringify(sorted));
      toast.success("Alterações salvas com sucesso!");
      return true;
    } catch (error: any) {
      console.error("Error saving questionnaire:", error);
      toast.error(error.response?.data?.message || error.message || "Erro ao salvar questionário");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAndLeave = async () => {
    const ok = await handleSaveChanges();
    if (ok) beginNavigationAfterSave();
  };

  const handleOpenQuestionnairePreview = useCallback(() => {
    if (!eventId) return;
    writeQuestionnairePreviewDraft({ v: 1, eventId, questions: [...questions] });
    router.push(`/admin/events/${eventId}/edit/questionnaire/preview`);
  }, [eventId, questions, router]);

  return (
    <>
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
            onClick={() => void handleSaveChanges()}
            disabled={saving || loading || !isDirty}
            variant="default"
            className={cn(
              "h-[52px] px-11 font-manrope text-lg font-bold text-gray-12 disabled:cursor-not-allowed disabled:opacity-50",
              "max-md:h-12 max-md:w-full max-md:px-4",
            )}
          >
            {saving ? "Salvando..." : "Salvar alterações"}
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

      <UnsavedChangesModal
        open={leavePromptOpen}
        onClose={dismissLeavePrompt}
        title="Alterações não salvas"
        description="Você fez alterações no questionário. Se sair agora, elas serão perdidas."
        onSaveAndLeave={handleSaveAndLeave}
        onLeaveWithoutSaving={confirmLeaveWithoutSaving}
      />
    </>
  );
}
