"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useOrganizerNavigate } from "@/hooks/useOrganizerNavigate";
import { userService } from "@/services";
import { organizerService } from "@/services";
import { useCreateEvent } from "@/contexts/CreateEventContext";
import { ensureCreateEventSyncedFromDraft } from "@/lib/createEventDraftSync";
import { Button } from "@/components/Button";
import { ArrowButton } from "@/components/ArrowButton";
import { useCreateQuestionModal, useDeleteQuestionModal } from "@/stores/modalStore";
import toast from "react-hot-toast";
import { Plus, Pencil } from "lucide-react";
import type { Question } from "@/services/organizer/OrganizerService";
import { TrashIcon } from "@/components/Icons/TrashIcon";
import { Loading } from "@/components/Loading";
import { cn } from "@/utils/cn";

export default function QuestionnairePage() {
  const router = useRouter();
  const orgNav = useOrganizerNavigate();
  const { formData, updateFormData } = useCreateEvent();
  const { openCreateQuestionModal, setOnModalSave } = useCreateQuestionModal();
  const { openDeleteQuestionModal } = useDeleteQuestionModal();
  const [authChecked, setAuthChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);


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

  // Carregar perguntas
  const loadQuestions = async () => {
    if (!formData.createdEventId) return;
    setLoading(true);
    try {
      const loadedQuestions = await organizerService.getQuestions(formData.createdEventId).catch(() => []);
      console.log(loadedQuestions);
      setQuestions(loadedQuestions.sort((a, b) => a.order - b.order));
    } catch (error: any) {
      console.error("Error loading questions:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authChecked) return;
    loadQuestions();
  }, [authChecked, formData.createdEventId]);

  // Setup modal save callback
  useEffect(() => {
    setOnModalSave(async () => {
      await loadQuestions();
    });
  }, [setOnModalSave, formData.createdEventId]);

  const handleBack = () => {
    orgNav.push("/organizer/events/new/topics");
  };

  const handleCreateQuestion = () => {
    // Permite criar pergunta mesmo sem eventId (para desenvolvimento com mocks)
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
      question: question,
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
      loadQuestions(); // Recarregar perguntas da API
    } catch (error: any) {
      console.error("Error deleting question:", error);
      toast.error(error.response?.data?.message || "Erro ao deletar pergunta");
    }
  };

  const goToCouponsAfterSync = async () => {
    if (!formData.createdEventId) {
      try {
        await ensureCreateEventSyncedFromDraft({ formData, updateFormData });
      } catch (error: unknown) {
        console.error("Error syncing event before cupons:", error);
        toast.error(
          error instanceof Error
            ? error.message
            : "Não foi possível sincronizar o evento. Conclua informações e banner.",
        );
        return;
      }
    }
    orgNav.push("/organizer/events/new/coupons");
  };

  const handleSkip = () => {
    void goToCouponsAfterSync();
  };

  const handleConfirmQuestionnaire = () => {
    void goToCouponsAfterSync();
  };

  if (!authChecked || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loading />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex-1 px-5 pt-[52px] pb-[176px] md:px-[124px]",
        "max-md:pb-40",
      )}
    >
      <div className="mx-auto flex max-w-[1192px] flex-col gap-8 md:gap-9">
        <div
          className={cn(
            "flex h-[52px] items-center gap-2 border-b border-gray-6 bg-gray-2",
            "max-md:-mx-5 max-md:px-5 md:hidden",
          )}
        >
          <button
            type="button"
            onClick={handleBack}
            className="flex size-8 shrink-0 items-center justify-center rounded-[52px] border border-gray-6 transition-colors hover:bg-gray-3 rotate-180"
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
              className="flex size-9 cursor-pointer items-center justify-center rounded-[52px] border border-gray-6 transition-colors hover:bg-gray-3 rotate-180"
            >
              <ArrowButton isOpen={false} />
            </button>
            <h1 className="font-manrope text-[28px] font-bold leading-[1.1] text-gray-12">
              Questionário
            </h1>
          </div>
          <p className="font-family-dm-sans text-base leading-[1.3] text-gray-11">
            Crie perguntas extras para coletar informações dos participantes. Você pode pular esta etapa se desejar
          </p>
        </div>

        {/* Questions Section */}
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="font-manrope text-xl font-bold leading-[1.1] text-gray-12">
              Perguntas
            </h2>
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
            "flex gap-2",
            "max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:z-30 max-md:flex-col max-md:border-t max-md:border-gray-6 max-md:bg-gray-1 max-md:p-4",
            "max-md:pb-[max(1rem,env(safe-area-inset-bottom))]",
            "md:justify-end",
          )}
        >
          <Button
            onClick={handleConfirmQuestionnaire}
            variant="default"
            className={cn(
              "h-[52px] px-11 font-manrope text-lg font-bold text-gray-12",
              "max-md:h-12 max-md:w-full max-md:px-4",
            )}
          >
            Próxima etapa
          </Button>
        </div>
      </div>
    </div>
  );
}
