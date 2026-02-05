"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { organizerService, userService } from "@/services";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import {
  ArrowLeft,
  Plus,
  Edit,
  Trash2,
  HelpCircle,
  X,
  Save,
  PlusCircle,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

export default function EventQuestionsPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [authChecked, setAuthChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<any>(null);
  const [questionForm, setQuestionForm] = useState({
    question: "",
    type: "text" as "text" | "true_false" | "number" | "select" | "multiple_choice",
    options: [] as string[],
    isRequired: false,
    order: 0,
  });
  const [newOption, setNewOption] = useState("");

  useEffect(() => {
    // Aguarda a verificação de autenticação terminar
    if (authLoading) return;

    const hasToken = userService.isAuthenticated();
    if (!hasToken && !isAuthenticated) {
      router.push("/");
      return;
    }

    if (!authChecked) {
      setAuthChecked(true);
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!authChecked || authLoading || !eventId) return;
    loadData();
  }, [authChecked, eventId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [eventData, questionsData] = await Promise.all([
        organizerService.getEventById(eventId),
        organizerService.getQuestions(eventId),
      ]);

      setEvent(eventData);
      setQuestions(questionsData.sort((a, b) => a.order - b.order));
    } catch (error: any) {
      console.error("Error loading data:", error);
      toast.error("Erro ao carregar dados");
      router.push("/organizer/events");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateQuestion = async () => {
    try {
      if (!questionForm.question.trim()) {
        toast.error("Pergunta é obrigatória");
        return;
      }

      if (
        (questionForm.type === "select" ||
          questionForm.type === "multiple_choice" ||
          questionForm.type === "true_false") &&
        questionForm.options.length === 0
      ) {
        toast.error("Adicione pelo menos uma opção");
        return;
      }

      const data = {
        ...questionForm,
        options:
          questionForm.type === "text"
            ? undefined
            : questionForm.options.filter((opt) => opt.trim()),
      };

      if (editingQuestion) {
        await organizerService.updateQuestion(
          eventId,
          editingQuestion.id,
          data
        );
        toast.success("Pergunta atualizada com sucesso!");
      } else {
        await organizerService.createQuestion(eventId, data);
        toast.success("Pergunta criada com sucesso!");
      }

      setShowModal(false);
      setEditingQuestion(null);
      setQuestionForm({
        question: "",
        type: "text",
        options: [],
        isRequired: false,
        order: 0,
      });
      loadData();
    } catch (error: any) {
      console.error("Error saving question:", error);
      toast.error(
        error.response?.data?.message || "Erro ao salvar pergunta"
      );
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!confirm("Tem certeza que deseja excluir esta pergunta?")) {
      return;
    }

    try {
      await organizerService.deleteQuestion(eventId, questionId);
      toast.success("Pergunta excluída com sucesso!");
      loadData();
    } catch (error: any) {
      console.error("Error deleting question:", error);
      toast.error("Erro ao excluir pergunta");
    }
  };

  const handleEditQuestion = (question: any) => {
    setEditingQuestion(question);
    setQuestionForm({
      question: question.question,
      type: question.type,
      options: question.options || [],
      isRequired: question.isRequired,
      order: question.order || 0,
    });
    setShowModal(true);
  };

  const handleAddOption = () => {
    if (newOption.trim()) {
      setQuestionForm({
        ...questionForm,
        options: [...questionForm.options, newOption.trim()],
      });
      setNewOption("");
    }
  };

  const handleRemoveOption = (index: number) => {
    setQuestionForm({
      ...questionForm,
      options: questionForm.options.filter((_, i) => i !== index),
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-2 flex items-center justify-center">
        <div className="text-gray-11">Carregando...</div>
      </div>
    );
  }

  const getQuestionTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      text: "Texto Livre",
      select: "Seleção (Dropdown)",
      multiple_choice: "Escolha Única",
      true_false: "Múltipla Escolha",
      number: "Número",
    };
    return types[type] || type;
  };

  return (
    <div className="min-h-screen bg-gray-2 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link
          href={`/organizer/events/${eventId}/edit`}
          className="inline-flex items-center text-gray-11 hover:text-gray-12 mb-6"
        >
          <ArrowLeft className="size-4 mr-2" />
          Voltar para Edição
        </Link>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-12 mb-2">
                Perguntas - {event?.name}
              </h1>
              <p className="text-gray-11">
                Gerencie as perguntas do questionário de inscrição
              </p>
            </div>
            <Button
              onClick={() => {
                setEditingQuestion(null);
                setQuestionForm({
                  question: "",
                  type: "text",
                  options: [],
                  isRequired: false,
                  order: 0,
                });
                setShowModal(true);
              }}
            >
              <Plus className="size-4 mr-2" />
              Nova Pergunta
            </Button>
          </div>
        </div>

        {/* Questions List */}
        {questions.length === 0 ? (
          <div className="bg-gray-1 rounded-lg p-12 border border-gray-6 text-center">
            <HelpCircle className="size-12 text-gray-11 mx-auto mb-4" />
            <p className="text-gray-11 mb-4">Nenhuma pergunta criada ainda</p>
            <Button
              onClick={() => {
                setEditingQuestion(null);
                setQuestionForm({
                  question: "",
                  type: "text",
                  options: [],
                  isRequired: false,
                  order: 0,
                });
                setShowModal(true);
              }}
            >
              <Plus className="size-4 mr-2" />
              Criar Primeira Pergunta
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {questions.map((question) => (
              <div
                key={question.id}
                className="bg-gray-1 rounded-lg border border-gray-6 p-6"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-medium text-gray-12">
                        {question.question}
                      </h3>
                      {question.isRequired && (
                        <span className="px-2 py-0.5 rounded text-xs bg-red-10/20 text-red-11">
                          Obrigatória
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded text-xs bg-gray-10/20 text-gray-11">
                        {getQuestionTypeLabel(question.type)}
                      </span>
                    </div>
                    {question.options && question.options.length > 0 && (
                      <div className="mt-2">
                        <p className="text-sm text-gray-11 mb-1">Opções:</p>
                        <div className="flex flex-wrap gap-2">
                          {question.options.map((option: string, idx: number) => (
                            <span
                              key={idx}
                              className="px-2 py-1 rounded text-xs bg-gray-10/20 text-gray-11"
                            >
                              {option}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    <p className="text-xs text-gray-11 mt-2">
                      Ordem: {question.order}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditQuestion(question)}
                    >
                      <Edit className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteQuestion(question.id)}
                      className="text-red-10 hover:text-red-11"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Question Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-1 rounded-lg border border-gray-6 p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-12">
                  {editingQuestion ? "Editar Pergunta" : "Nova Pergunta"}
                </h2>
                <button
                  onClick={() => {
                    setShowModal(false);
                    setEditingQuestion(null);
                    setQuestionForm({
                      question: "",
                      type: "text",
                      options: [],
                      isRequired: false,
                      order: 0,
                    });
                  }}
                  className="text-gray-11 hover:text-gray-12"
                >
                  <X className="size-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-12 mb-2">
                    Pergunta *
                  </label>
                  <Input
                    value={questionForm.question}
                    onChange={(e) =>
                      setQuestionForm({
                        ...questionForm,
                        question: e.target.value,
                      })
                    }
                    placeholder="Ex: Você já participou de maratonas antes?"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-12 mb-2">
                    Tipo *
                  </label>
                  <select
                    value={questionForm.type}
                    onChange={(e) =>
                      setQuestionForm({
                        ...questionForm,
                        type: e.target.value as any,
                        options:
                          e.target.value === "text" ? [] : questionForm.options,
                      })
                    }
                    className="w-full rounded-lg border border-gray-6 bg-transparent px-3 py-2 text-sm text-gray-12 focus:outline-none focus:ring-2 focus:ring-primary-11/50 focus:border-primary-11"
                  >
                    <option value="text">Texto Livre</option>
                    <option value="select">Seleção (Dropdown)</option>
                    <option value="multiple_choice">Escolha Única</option>
                    <option value="true_false">Múltipla Escolha</option>
                    <option value="number">Número</option>
                  </select>
                </div>

                {(questionForm.type === "select" ||
                  questionForm.type === "multiple_choice" ||
                  questionForm.type === "true_false") && (
                    <div>
                      <label className="block text-sm font-medium text-gray-12 mb-2">
                        Opções *
                      </label>
                      <div className="space-y-2 mb-2">
                        {questionForm.options.map((option, index) => (
                          <div key={index} className="flex gap-2">
                            <Input
                              value={option}
                              onChange={(e) => {
                                const newOptions = [...questionForm.options];
                                newOptions[index] = e.target.value;
                                setQuestionForm({
                                  ...questionForm,
                                  options: newOptions,
                                });
                              }}
                              placeholder={`Opção ${index + 1}`}
                              className="flex-1"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveOption(index)}
                              className="text-red-10 hover:text-red-11"
                            >
                              <X className="size-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Input
                          value={newOption}
                          onChange={(e) => setNewOption(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddOption();
                            }
                          }}
                          placeholder="Nova opção..."
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleAddOption}
                        >
                          <PlusCircle className="size-4" />
                        </Button>
                      </div>
                    </div>
                  )}

                <div>
                  <label className="block text-sm font-medium text-gray-12 mb-2">
                    Ordem
                  </label>
                  <Input
                    type="number"
                    value={questionForm.order}
                    onChange={(e) =>
                      setQuestionForm({
                        ...questionForm,
                        order: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isRequired"
                    checked={questionForm.isRequired}
                    onChange={(e) =>
                      setQuestionForm({
                        ...questionForm,
                        isRequired: e.target.checked,
                      })
                    }
                    className="rounded border-gray-6"
                  />
                  <label
                    htmlFor="isRequired"
                    className="text-sm font-medium text-gray-12"
                  >
                    Pergunta obrigatória
                  </label>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button onClick={handleCreateQuestion} className="flex-1">
                    <Save className="size-4 mr-2" />
                    Salvar
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowModal(false);
                      setEditingQuestion(null);
                      setQuestionForm({
                        question: "",
                        type: "text",
                        options: [],
                        isRequired: false,
                        order: 0,
                      });
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

