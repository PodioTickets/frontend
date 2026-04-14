"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { useOrganizerNavigate } from "@/hooks/useOrganizerNavigate";
import { userService, organizerService } from "@/services";
import { Button } from "@/components/Button";
import { ArrowButton } from "@/components/ArrowButton";
import { UnsavedChangesModal } from "@/components/UnsavedChangesModal";
import { useUnsavedLeaveGuard } from "@/hooks/useUnsavedLeaveGuard";
import { useCreateQuestionModal, useDeleteQuestionModal } from "@/stores/modalStore";
import toast from "react-hot-toast";
import { Plus, Pencil } from "lucide-react";
import type { Question } from "@/services/organizer/OrganizerService";
import type { QuestionModalLocalPayload } from "@/components/Questionnaire/CreateQuestionModal";
import { TrashIcon } from "@/components/Icons/TrashIcon";
import { Loading } from "@/components/Loading";
import { cn } from "@/utils/cn";
import { writeQuestionnairePreviewDraft } from "@/lib/questionnairePreviewDraft";

const PENDING_QUESTION_PREFIX = "__pending_question__";

function isPendingQuestionId(id: string): boolean {
  return id.startsWith(PENDING_QUESTION_PREFIX);
}

export default function EditQuestionnairePage() {
  const router = useRouter();
  const orgNav = useOrganizerNavigate();
  const params = useParams();
  const eventId = params.id as string;
  const { openCreateQuestionModal, setOnModalSave } = useCreateQuestionModal();
  const { openDeleteQuestionModal } = useDeleteQuestionModal();
  const [authChecked, setAuthChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [committedQuestionsJson, setCommittedQuestionsJson] = useState<string | null>(null);

  // Verificar autenticação
  useEffect(() => {
    const hasToken = userService.isAuthenticated();
    if (!hasToken) {
      orgNav.push("/organizer/login");
      return;
    }
    const timer = setTimeout(() => {
      setAuthChecked(true);
    }, 300);
    return () => clearTimeout(timer);
  }, [router]);

  const refetchQuestions = useCallback(async (): Promise<Question[]> => {
    if (!eventId) return [];
    try {
      const loadedQuestions = await organizerService.getQuestions(eventId).catch(() => []);
      const sorted = [...loadedQuestions].sort((a, b) => a.order - b.order);
      setQuestions(sorted);
      return sorted;
    } catch (error: any) {
      console.error("Error loading questions:", error);
      return [];
    }
  }, [eventId]);

  // Carregar perguntas (estado inicial / reload com overlay)
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

  // Setup modal save callback
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
    navigateTarget: `/organizer/events/${eventId}/edit/topics`,
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
      eventId: eventId,
      questionId: question.id,
      question: question,
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
      toast.error(
        error.response?.data?.message || error.message || "Erro ao salvar questionário"
      );
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAndLeave = async () => {
    const ok = await handleSaveChanges();
    if (ok) {
      beginNavigationAfterSave();
    }
  };

  const handleOpenQuestionnairePreview = useCallback(() => {
    if (!eventId) return;
    writeQuestionnairePreviewDraft({
      v: 1,
      eventId,
      questions: [...questions],
    });
    orgNav.push(`/organizer/events/${eventId}/edit/questionnaire/preview`);
  }, [eventId, questions, orgNav]);

  if (!authChecked || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loading />
      </div>
    );
  }

  return (
    <div className={cn("pb-20", "max-md:pb-32")}>
      <div className="flex w-full flex-col gap-8 md:gap-9">
        <div
          className={cn(
            "flex h-[52px] items-center gap-2 border-b border-gray-6 bg-gray-2",
            "max-md:-mx-4 max-md:px-4 md:hidden",
          )}
        >
          <button
            type="button"
            onClick={handleBack}
            className="flex size-8 shrink-0 items-center justify-center rounded-[52px] md:border border-gray-6 transition-colors hover:bg-gray-3 rotate-180"
          >
            <ArrowButton isOpen={false} />
          </button>
          <h1 className="font-manrope text-base font-extrabold leading-[1.1] text-gray-12">
            Questionário
          </h1>
        </div>

        {/* Title Section — desktop */}
        <div className="flex flex-col gap-4">
          <div className="hidden gap-3 md:flex md:items-center">
            <button
              type="button"
              onClick={handleBack}
              className="flex size-9 cursor-pointer items-center justify-center rounded-[52px] md:border border-gray-6 transition-colors hover:bg-gray-3 rotate-180"
            >
              <ArrowButton isOpen={false} />
            </button>
            <h1 className="font-manrope text-[28px] font-bold leading-[1.1] text-gray-12">
              Questionário
            </h1>
          </div>
          <p className="font-family-dm-sans text-base leading-[1.3] text-gray-11">
            Crie perguntas extras para coletar informações dos participantes. Você pode pular esta
            etapa se desejar
          </p>
        </div>

        {/* Questions Section */}
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="font-manrope text-xl font-bold leading-[1.1] text-gray-12">Perguntas</h2>
            <Button
              onClick={handleCreateQuestion}
              variant="default"
              className="font-manrope text-base font-bold leading-[1.1] max-md:h-11"
            >
              <Plus className="size-5" />
              Criar pergunta
            </Button>
          </div>

          {/* Questions List */}
          {questions.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-gray-6 p-12 max-md:p-8">
              <p className="font-family-dm-sans text-base text-gray-11">
                Nenhuma pergunta criada ainda
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-x-4 md:gap-y-6">
              {questions.map((question, index) => (
                <div
                  key={question.id}
                  className="flex min-w-0 flex-1 flex-col gap-5 rounded-xl border border-gray-6 bg-gray-2 p-5 md:min-w-[519px] md:gap-6"
                >
                  <p className="font-family-dm-sans text-sm font-normal leading-[1.3] text-gray-11 md:text-base">
                    Pergunta {index + 1}
                  </p>

                  <div className="flex flex-col gap-5">
                    <h3 className="font-manrope text-base font-bold leading-[1.1] text-gray-12 md:text-xl">
                      {question.question}
                    </h3>

                    <div className="flex flex-wrap items-center gap-2">
                      {question.isRequired ? (
                        <span
                          className={cn(
                            "rounded-[52px] bg-yellow-3 px-4 py-3 font-medium font-family-dm-sans text-yellow-12 leading-[1.3]",
                            "text-sm md:rounded-[32px] md:text-base",
                          )}
                        >
                          Obrigatório
                        </span>
                      ) : (
                        <span
                          className={cn(
                            "rounded-[52px] bg-gray-4 px-4 py-3 font-medium font-family-dm-sans text-gray-12 leading-[1.3]",
                            "text-sm md:rounded-[32px] md:text-base",
                          )}
                        >
                          Opcional
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-auto flex items-center justify-end">
                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        title="Editar"
                        onClick={() => handleEditQuestion(question)}
                        className="flex size-9 cursor-pointer items-center justify-center rounded-lg border-[1.5px] border-gray-6 bg-gray-2 transition-colors hover:bg-gray-3"
                      >
                        <Pencil className="size-5 text-gray-11" />
                      </button>
                      <button
                        type="button"
                        title="Deletar"
                        onClick={() =>
                          openDeleteQuestionModal({
                            onConfirm: () => handleDeleteQuestion(question.id),
                          })
                        }
                        className="hidden size-9 cursor-pointer items-center justify-center rounded-lg border-[1.5px] border-red-6 bg-red-2 transition-colors hover:bg-red-3 md:flex"
                      >
                        <TrashIcon className="size-5 text-red-12" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bottom Actions */}
        <div
          className={cn(
            "flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-end sm:gap-2",
            "max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:z-30 max-md:border-t max-md:border-gray-6 max-md:bg-gray-1 max-md:p-4",
            "max-md:pb-[max(1rem,env(safe-area-inset-bottom))]",
          )}
        >
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
        </div>
      </div>

      <UnsavedChangesModal
        open={leavePromptOpen}
        onClose={dismissLeavePrompt}
        title="Alterações não salvas"
        description="Você fez alterações no questionário. Se sair agora, elas serão perdidas."
        onSaveAndLeave={handleSaveAndLeave}
        onLeaveWithoutSaving={confirmLeaveWithoutSaving}
      />
    </div>
  );
}
