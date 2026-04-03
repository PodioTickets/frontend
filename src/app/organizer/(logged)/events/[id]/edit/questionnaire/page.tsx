"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
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

const PENDING_QUESTION_PREFIX = "__pending_question__";

function isPendingQuestionId(id: string): boolean {
  return id.startsWith(PENDING_QUESTION_PREFIX);
}

export default function EditQuestionnairePage() {
  const router = useRouter();
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
      router.push("/organizer/login");
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
    setLeavePromptOpen,
    handleBack,
    confirmLeaveWithoutSaving,
    beginNavigationAfterSave,
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

  if (!authChecked || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loading />
      </div>
    );
  }

  return (
    <div className="pb-20">
      <div className="w-full flex flex-col gap-9">
        {/* Title Section */}
        <div className="flex flex-col gap-4">
          <div className="flex gap-3 items-center">
            <button
              onClick={handleBack}
              className="border border-gray-6 rounded-[52px] cursor-pointer size-9 flex items-center justify-center hover:bg-gray-3 transition-colors rotate-180"
            >
              <ArrowButton isOpen={false} />
            </button>
            <h1 className="text-gray-12 text-[28px] font-bold font-manrope leading-[1.1]">
              Questionário
            </h1>
          </div>
          <p className="text-gray-11 text-base font-family-dm-sans leading-[1.3]">
            Crie perguntas extras para coletar informações dos participantes. Você pode pular esta
            etapa se desejar
          </p>
        </div>

        {/* Questions Section */}
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <h2 className="text-gray-12 text-xl font-bold font-manrope leading-[1.1]">Perguntas</h2>
            <Button
              onClick={handleCreateQuestion}
              variant="default"
              className="text-base font-bold font-manrope leading-[1.1]"
            >
              <Plus className="size-5" />
              Criar pergunta
            </Button>
          </div>

          {/* Questions List */}
          {questions.length === 0 ? (
            <div className="border border-gray-6 rounded-xl p-12 flex flex-col items-center justify-center gap-4">
              <p className="text-gray-11 text-base font-family-dm-sans">
                Nenhuma pergunta criada ainda
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-y-6 gap-x-4">
              {questions.map((question, index) => (
                <div
                  key={question.id}
                  className="bg-gray-2 border border-gray-6 rounded-xl p-5 flex flex-col gap-6 flex-1 min-w-[519px]"
                >
                  <p className="text-gray-11 text-base font-normal font-family-dm-sans leading-[1.3]">
                    Pergunta {index + 1}
                  </p>

                  <div className="flex flex-col gap-5">
                    <h3 className="text-gray-12 text-xl font-bold font-manrope leading-[1.1]">
                      {question.question}
                    </h3>

                    <div className="flex gap-2 items-center flex-wrap">
                      {question.isRequired ? (
                        <span className="bg-yellow-3 px-4 py-3 rounded-[32px] text-yellow-12 text-base font-medium font-family-dm-sans leading-[1.3]">
                          Obrigatório
                        </span>
                      ) : (
                        <span className="bg-gray-4 px-4 py-3 rounded-[32px] text-gray-12 text-base font-medium font-family-dm-sans leading-[1.3]">
                          Opcional
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-auto">
                    <div className={`flex gap-2.5 items-center ml-auto`}>
                      <button
                        type="button"
                        title="Editar"
                        onClick={() => handleEditQuestion(question)}
                        className="bg-gray-2 border-[1.5px] border-gray-6 rounded-lg size-9 flex items-center justify-center hover:bg-gray-3 transition-colors cursor-pointer"
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
                        className="bg-red-2 border-[1.5px] border-red-6 rounded-lg size-9 flex items-center justify-center hover:bg-red-3 transition-colors cursor-pointer"
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
        <div className="flex justify-end gap-2">
          <Button
            onClick={() => void handleSaveChanges()}
            disabled={saving || loading}
            variant="default"
            className="text-gray-12 text-lg font-bold px-11 h-[52px] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Salvando..." : "Salvar alterações"}
          </Button>
        </div>
      </div>

      <UnsavedChangesModal
        open={leavePromptOpen}
        onClose={() => setLeavePromptOpen(false)}
        title="Alterações não salvas"
        description="Você fez alterações no questionário. Se sair agora, elas serão perdidas."
        onSaveAndLeave={handleSaveAndLeave}
        onLeaveWithoutSaving={confirmLeaveWithoutSaving}
      />
    </div>
  );
}
