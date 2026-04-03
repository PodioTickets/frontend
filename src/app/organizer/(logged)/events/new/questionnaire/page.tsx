"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { userService } from "@/services";
import { organizerService } from "@/services";
import { useCreateEvent } from "@/contexts/CreateEventContext";
import { Button } from "@/components/Button";
import { ArrowButton } from "@/components/ArrowButton";
import { useCreateQuestionModal, useDeleteQuestionModal } from "@/stores/modalStore";
import toast from "react-hot-toast";
import { Plus, Pencil } from "lucide-react";
import type { Question } from "@/services/organizer/OrganizerService";
import { TrashIcon } from "@/components/Icons/TrashIcon";
import { Loading } from "@/components/Loading";

export default function QuestionnairePage() {
  const router = useRouter();
  const { formData } = useCreateEvent();
  const { openCreateQuestionModal, setOnModalSave } = useCreateQuestionModal();
  const { openDeleteQuestionModal } = useDeleteQuestionModal();
  const [authChecked, setAuthChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);


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
    router.push("/organizer/events/new/topics");
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

  const handleSkip = () => {
    router.push("/organizer/events/new/coupons");
  };

  const handleConfirmQuestionnaire = () => {
    router.push("/organizer/events/new/coupons");
  };

  if (!authChecked || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loading />
      </div>
    );
  }

  return (
    <div className="flex-1 pb-[176px] px-5 md:px-[124px] pt-[52px]">
      <div className="max-w-[1192px] mx-auto flex flex-col gap-9">
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
            Crie perguntas extras para coletar informações dos participantes. Você pode pular esta etapa se desejar
          </p>
        </div>

        {/* Questions Section */}
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <h2 className="text-gray-12 text-xl font-bold font-manrope leading-[1.1]">
              Perguntas
            </h2>
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
            onClick={handleSkip}
            variant="outline"
            className="border-gray-6 text-gray-12 text-lg font-bold px-11 h-[52px]"
          >
            Pular etapa
          </Button>
          <Button
            onClick={handleConfirmQuestionnaire}
            variant="default"
            className="text-gray-12 text-lg font-bold px-11 h-[52px]"
          >
            Próxima etapa
          </Button>
        </div>
      </div>
    </div>
  );
}
