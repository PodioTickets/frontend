"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { userService } from "@/services";
import { organizerService } from "@/services";
import { useCreateEvent } from "@/contexts/CreateEventContext";
import { Button } from "@/components/Button";
import { ArrowButton } from "@/components/ArrowButton";
import { useCreateQuestionModal } from "@/stores/modalStore";
import toast from "react-hot-toast";
import { Plus, Pencil, Trash2 } from "lucide-react";
import type { Question } from "@/services/organizer/OrganizerService";

export default function QuestionnairePage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { formData } = useCreateEvent();
  const { openCreateQuestionModal, setOnModalSave } = useCreateQuestionModal();
  const [authChecked, setAuthChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);

  // Mock data para desenvolvimento/teste
  const mockQuestions: Question[] = useMemo(() => [
    {
      id: "mock-1",
      question: "Título da pergunta Título da pergunta Título da pergunta Título da pergunta",
      type: "text",
      isRequired: true,
      order: 1,
      eventId: "mock-event",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "mock-2",
      question: "Qual é sua experiência prévia em corridas?",
      type: "select",
      options: ["Iniciante", "Intermediário", "Avançado", "Profissional"],
      isRequired: true,
      order: 2,
      eventId: "mock-event",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "mock-3",
      question: "Você possui alguma alergia alimentar?",
      type: "text",
      isRequired: false,
      order: 3,
      eventId: "mock-event",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "mock-4",
      question: "Qual tamanho de camiseta você prefere?",
      type: "radio",
      options: ["PP", "P", "M", "G", "GG", "XG"],
      isRequired: true,
      order: 4,
      eventId: "mock-event",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ], []);

  // Verificar autenticação
  useEffect(() => {
    const hasToken = userService.isAuthenticated();
    if (!hasToken) {
      router.push("/");
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
      setQuestions(loadedQuestions.sort((a, b) => a.order - b.order));
    } catch (error: any) {
      console.error("Error loading questions:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authChecked) return;
    
    // Temporariamente sempre usa dados mockados para desenvolvimento
    setQuestions(mockQuestions);
    
    // Quando tiver eventId real, descomente a linha abaixo e remova a linha acima
    // if (!formData.createdEventId) {
    //   setQuestions(mockQuestions);
    //   return;
    // }
    // loadQuestions();
  }, [authChecked, formData.createdEventId, mockQuestions]);

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
    // Se for pergunta mockada, permite editar mesmo sem eventId
    if (question.id.startsWith("mock-")) {
      openCreateQuestionModal({
        eventId: formData.createdEventId || "mock-event",
        questionId: question.id,
        question: question,
      });
      return;
    }

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
    if (!confirm("Tem certeza que deseja excluir esta pergunta?")) {
      return;
    }

    // Se for pergunta mockada, apenas remove do estado
    if (questionId.startsWith("mock-")) {
      setQuestions(questions.filter(q => q.id !== questionId));
      toast.success("Pergunta excluída com sucesso!");
      return;
    }

    if (!formData.createdEventId) {
      return;
    }

    try {
      await organizerService.deleteQuestion(formData.createdEventId, questionId);
      setQuestions(questions.filter(q => q.id !== questionId));
      toast.success("Pergunta excluída com sucesso!");
    } catch (error: any) {
      console.error("Error deleting question:", error);
      toast.error(error.response?.data?.message || "Erro ao excluir pergunta");
    }
  };

  const handleSkip = () => {
    router.push("/organizer/events/new/review");
  };

  const handleNext = () => {
    router.push("/organizer/events/new/review");
  };

  if (!authChecked || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-11">Carregando...</div>
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
          <p className="text-gray-11 text-base font-dm-sans leading-[1.3]">
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
              <p className="text-gray-11 text-base font-dm-sans">
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
                  <p className="text-gray-11 text-base font-normal font-dm-sans leading-[1.3]">
                    Pergunta {index + 1}
                  </p>
                  
                  <div className="flex flex-col gap-5">
                    <h3 className="text-gray-12 text-xl font-bold font-manrope leading-[1.1]">
                      {question.question}
                    </h3>
                    
                    <div className="flex gap-2 items-center flex-wrap">
                      {question.isRequired && (
                        <span className="bg-yellow-3 px-4 py-3 rounded-[32px] text-yellow-12 text-base font-medium font-dm-sans leading-[1.3]">
                          Obrigatório
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-auto">
                    {index === 0 && (
                      <div className="bg-gray-5 px-4 py-3 rounded-[32px] text-gray-12 text-base font-normal font-dm-sans leading-[1.3]">
                        Rascunhos
                      </div>
                    )}
                    <div className={`flex gap-2.5 items-center ${index === 0 ? '' : 'ml-auto'}`}>
                      <button
                        onClick={() => handleEditQuestion(question)}
                        className="bg-gray-2 border-[1.5px] border-gray-6 rounded-lg size-9 flex items-center justify-center hover:bg-gray-3 transition-colors"
                      >
                        <Pencil className="size-5 text-gray-11" />
                      </button>
                      <button
                        onClick={() => handleDeleteQuestion(question.id)}
                        className="bg-red-2 border-[1.5px] border-red-6 rounded-lg size-9 flex items-center justify-center hover:bg-red-3 transition-colors"
                      >
                        <Trash2 className="size-5 text-red-12" />
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
            onClick={handleNext}
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
