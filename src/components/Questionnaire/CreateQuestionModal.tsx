"use client";

import { useState, useEffect } from "react";
import { useCreateQuestionModal } from "@/stores/modalStore";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { Dropdown } from "@/components/Dropdown";
import { Radio } from "@/components/Radio";
import { X, Plus, Trash2, Info, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { organizerService } from "@/services";
import { CreateQuestionRequest } from "@/services/organizer/OrganizerService";
import toast from "react-hot-toast";
import { TrashIcon } from "../Icons/TrashIcon";

type QuestionType = "text" | "true_false" | "number" | "select" | "multiple_choice";

const QUESTION_TYPES: Array<{ label: string; value: QuestionType }> = [
  { label: "Texto", value: "text" },
  { label: "Verdadeiro/falso", value: "true_false" },
  { label: "Número inteiro", value: "number" },
  { label: "Lista", value: "select" },
  { label: "Múltipla escolha", value: "multiple_choice" },
];

export function CreateQuestionModal() {
  const { isOpen, closeCreateQuestionModal, data, onModalSave } = useCreateQuestionModal();
  const [question, setQuestion] = useState("");
  const [type, setType] = useState<QuestionType>("text");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [isRequired, setIsRequired] = useState(true);
  const [appliesTo, setAppliesTo] = useState("Geral");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditing = data?.questionId !== undefined;
  const eventId = data?.eventId;

  // Initialize form when modal opens
  useEffect(() => {
    if (isOpen) {
      if (isEditing && data?.question) {
        // Editing mode - load question data
        const q = data.question;
        setQuestion(q.question);
        setType(q.type);
        setOptions(q.options && q.options.length > 0 ? q.options : ["", ""]);
        setIsRequired(q.isRequired);
      } else {
        // Create mode - reset form
        setQuestion("");
        setType("text");
        setOptions(["", ""]);
        setIsRequired(true);
        setAppliesTo("Geral");
      }
    }
  }, [isOpen, isEditing, data]);

  const handleAddOption = () => {
    setOptions([...options, ""]);
  };

  const handleRemoveOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    } else {
      toast.error("É necessário ter pelo menos 2 opções");
    }
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleSave = async () => {
    if (!question.trim()) {
      toast.error("Digite uma pergunta");
      return;
    }

    if (question.length > 25) {
      toast.error("A pergunta deve ter no máximo 25 caracteres");
      return;
    }

    if ((type === "select" || type === "multiple_choice") && options.length < 2) {
      toast.error("Adicione pelo menos 2 opções");
      return;
    }

    if ((type === "select" || type === "multiple_choice")) {
      const validOptions = options.filter(opt => opt.trim() !== "");
      if (validOptions.length < 2) {
        toast.error("Preencha pelo menos 2 opções");
        return;
      }
    }

    if (!eventId) {
      toast.error("Evento não encontrado");
      return;
    }

    setIsSubmitting(true);

    try {
      const questionData: CreateQuestionRequest = {
        question: question.trim(),
        type,
        isRequired,
        options: (type === "select" || type === "multiple_choice")
          ? options.filter(opt => opt.trim() !== "")
          : undefined,
      };

      if (isEditing && data?.questionId) {
        await organizerService.updateQuestion(eventId, data.questionId, questionData);
        toast.success("Pergunta atualizada com sucesso!");
      } else {
        await organizerService.createQuestion(eventId, questionData);
        toast.success("Pergunta criada com sucesso!");
      }

      if (onModalSave) {
        await onModalSave(undefined);
      }

      closeCreateQuestionModal();
    } catch (error: any) {
      console.error("Error saving question:", error);
      toast.error(error.response?.data?.message || "Erro ao salvar pergunta");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!isEditing || !data?.questionId || !eventId) return;

    if (!confirm("Tem certeza que deseja excluir esta pergunta?")) {
      return;
    }

    setIsSubmitting(true);

    try {
      await organizerService.deleteQuestion(eventId, data.questionId);
      toast.success("Pergunta excluída com sucesso!");

      if (onModalSave) {
        await onModalSave(undefined);
      }

      closeCreateQuestionModal();
    } catch (error: any) {
      console.error("Error deleting question:", error);
      toast.error(error.response?.data?.message || "Erro ao excluir pergunta");
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedTypeLabel = QUESTION_TYPES.find(t => t.value === type)?.label || "Selecione o tipo";
  const showListSection = type === "select" || type === "multiple_choice";
  const showTrueFalseSection = type === "true_false";
  const showNumberSection = type === "number";

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/90 z-50"
            onClick={closeCreateQuestionModal}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gray-1 rounded-xl border border-gray-6 w-full max-w-[982px] max-h-[80vh] flex flex-col shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="border-b border-gray-6 flex items-center justify-between px-5 py-3 shrink-0">
                <h2 className="text-gray-12 text-[20px] font-semibold font-dm-sans leading-[1.3]">
                  {isEditing ? "Editar pergunta" : "Criar pergunta"}
                </h2>
                <button
                  onClick={closeCreateQuestionModal}
                  className="text-gray-11 hover:text-gray-12 transition-colors p-1"
                >
                  <X className="size-6" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 min-h-0 overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-6 [&::-webkit-scrollbar-thumb]:rounded-full">
                <div className="flex flex-col gap-9 p-5">
                    {/* Pergunta Input */}
                    <div className="flex flex-col gap-2.5">
                      <div className="flex flex-col gap-2">
                        <label className="text-gray-12 text-base font-normal font-dm-sans leading-[1.3]">
                          Pergunta
                        </label>
                        <div className="relative">
                          <Input
                            type="text"
                            value={question}
                            onChange={(e) => setQuestion(e.target.value)}
                            placeholder="Digite uma pergunta aos participantes"
                            maxLength={25}
                            className="h-12 px-3 pr-24"
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Info className="size-5 text-gray-11" />
                        <span className="text-gray-11 text-base font-normal font-dm-sans leading-[1.3]">
                          Limite de 25 Caracteres
                        </span>
                      </div>
                    </div>

                    {/* Tipo de resposta */}
                    <div className="flex flex-col gap-6">
                      <div className="flex flex-col gap-2 w-[276px]">
                        <label className="text-gray-12 text-base font-normal font-dm-sans leading-[1.3]">
                          Tipo de resposta
                        </label>
                        <Dropdown
                          options={QUESTION_TYPES.map(t => ({
                            id: t.value,
                            label: t.label,
                            onClick: () => setType(t.value)
                          }))}
                          trigger={
                            <div className="border border-gray-7 rounded-lg h-12 px-3 flex items-center justify-between cursor-pointer hover:bg-gray-3 transition-colors">
                              <span className="text-gray-11 text-base font-normal font-dm-sans">
                                {selectedTypeLabel}
                              </span>
                              <ChevronDown className="size-6 text-gray-11" />
                            </div>
                          }
                          width="w-[276px]"
                          position="bottom"
                          align="start"
                        />
                      </div>

                      {/* Lista Section */}
                      {showListSection && (
                        <div className="bg-gray-2 border-[1.5px] border-gray-6 rounded-lg w-full">
                          <div className="p-5 flex flex-col gap-3">
                            <div className="flex flex-col gap-3">
                              <h3 className="text-gray-12 text-lg font-semibold font-manrope leading-[1.1]">
                                Lista
                              </h3>
                              <p className="text-gray-11 text-base font-normal font-dm-sans leading-[1.3]">
                                Objetivo: participante escolhe uma opção num dropdown. Adicione pelo menos 2 opções para o participante escolher
                              </p>
                            </div>
                          </div>

                          {/* Options Table */}
                          <div className="flex flex-col">
                            {/* Header */}
                            <div className="bg-gray-3 border-t border-b border-gray-6 h-11 flex items-center">
                              <div className="flex-1 px-4">
                                <span className="text-gray-12 text-sm font-medium font-inter leading-[1.3]">
                                  {type === "select" ? "Opções da lista" : "Opções de múltipla escolha"}
                                </span>
                              </div>
                              <div className="border-l border-gray-6 h-full flex items-center justify-center px-4 w-[74px]">
                                <span className="text-gray-12 text-sm font-medium font-inter leading-[1.3]">
                                  Ações
                                </span>
                              </div>
                            </div>

                            {/* Options List */}
                            {options.map((option, index) => (
                              <div
                                key={index}
                                className="border-b border-gray-6 h-[52px] flex items-center"
                              >
                                <div className="flex-1 px-4">
                                  <input
                                    type="text"
                                    value={option}
                                    onChange={(e) => handleOptionChange(index, e.target.value)}
                                    placeholder="Digite aqui a opção"
                                    className="h-auto border-0 bg-transparent px-0 focus:ring-0 text-sm font-medium font-inter text-gray-12 focus:outline-none focus:border-0"
                                  />
                                </div>
                                <div className="flex items-center justify-center px-4 w-[74px]">
                                  <button
                                    onClick={() => handleRemoveOption(index)}
                                    className="bg-red-2 border-[1.5px] border-red-6 rounded-lg size-9 flex items-center justify-center hover:bg-red-3 transition-colors"
                                  >
                                    <TrashIcon className="size-5 text-red-12" />
                                  </button>
                                </div>
                              </div>
                            ))}

                            {/* Add Option Button */}
                            <div className="p-4 flex justify-center">
                              <button
                                onClick={handleAddOption}
                                className="flex items-center gap-1 h-11 px-11 text-gray-11 text-base font-semibold font-dm-sans hover:text-gray-12 transition-colors"
                              >
                                <Plus className="size-6" />
                                Adicionar opção
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Verdadeiro/Falso Section */}
                      {showTrueFalseSection && (
                        <div className="bg-gray-2 border-[1.5px] border-gray-6 rounded-lg w-full p-5">
                          <div className="flex flex-col gap-3">
                            <h3 className="text-gray-12 text-lg font-semibold font-manrope leading-[1.1]">
                              Verdadeiro/Falso
                            </h3>
                            <p className="text-gray-11 text-base font-normal font-dm-sans leading-[1.3]">
                              Objetivo: participante escolhe entre verdadeiro ou falso
                            </p>
                            <div className="flex gap-4 mt-2">
                              <div className="flex items-center gap-2">
                                <Radio
                                  checked={true}
                                  onChange={() => {}}
                                  name="true_false"
                                  disabled
                                  className="size-6"
                                />
                                <span className="text-gray-12 text-sm font-normal font-dm-sans leading-[1.3]">
                                  Verdadeiro
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Radio
                                  checked={false}
                                  onChange={() => {}}
                                  name="true_false"
                                  disabled
                                  className="size-6"
                                />
                                <span className="text-gray-12 text-sm font-normal font-dm-sans leading-[1.3]">
                                  Falso
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Número Inteiro Section */}
                      {showNumberSection && (
                        <div className="bg-gray-2 border-[1.5px] border-gray-6 rounded-lg w-full p-5">
                          <div className="flex flex-col gap-3">
                            <h3 className="text-gray-12 text-lg font-semibold font-manrope leading-[1.1]">
                              Número inteiro
                            </h3>
                            <p className="text-gray-11 text-base font-normal font-dm-sans leading-[1.3]">
                              Objetivo: participante digita um número inteiro como resposta
                            </p>
                            <div className="mt-2">
                              <Input
                                type="number"
                                placeholder="Ex: 25"
                                disabled
                                className="h-12 px-3 max-w-[200px]"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Obrigatório/Opcional */}
                    <div className="flex flex-col gap-3">
                      <label className="text-gray-12 text-base font-normal font-dm-sans leading-[1.3]">
                        Participante é obrigado a responder?
                      </label>
                      <div className="flex gap-2.5">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <Radio
                            checked={isRequired}
                            onChange={(e) => setIsRequired(true)}
                            name="required"
                            value="required"
                            className="size-6"
                          />
                          <span className="text-gray-12 text-sm font-normal font-dm-sans leading-[1.3]">
                            Obrigatório
                          </span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <Radio
                            checked={!isRequired}
                            onChange={(e) => setIsRequired(false)}
                            name="required"
                            value="optional"
                            className="size-6"
                          />
                          <span className="text-gray-12 text-sm font-normal font-dm-sans leading-[1.3]">
                            Opcional
                          </span>
                        </label>
                      </div>
                    </div>

                    {/* Aplicar em quais ingressos */}
                    <div className="flex flex-col gap-2 w-[276px]">
                      <label className="text-gray-12 text-base font-normal font-dm-sans leading-[1.3]">
                        Aplicar em quais ingressos?
                      </label>
                      <Dropdown
                        options={[
                          { id: "geral", label: "Geral", onClick: () => setAppliesTo("Geral") }
                        ]}
                        trigger={
                          <div className="border border-gray-7 rounded-lg h-12 px-3 flex items-center justify-between cursor-pointer hover:bg-gray-3 transition-colors">
                            <span className="text-gray-11 text-base font-normal font-dm-sans">
                              {appliesTo}
                            </span>
                            <ChevronDown className="size-6 text-gray-11" />
                          </div>
                        }
                        width="w-[276px]"
                        position="bottom"
                        align="start"
                      />
                    </div>
                  </div>
              </div>

              {/* Footer */}
              <div className="border-t border-gray-6 flex items-center justify-end gap-3 px-6 py-4 shrink-0">
                <Button
                  variant="outline"
                  onClick={closeCreateQuestionModal}
                  disabled={isSubmitting}
                  className="border-gray-6 text-gray-11 px-4 py-2"
                >
                  Cancelar
                </Button>
                {isEditing && (
                  <Button
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={isSubmitting}
                    className="bg-red-11 hover:bg-red-10 text-red-2 px-6 py-2"
                  >
                    Deletar pergunta
                  </Button>
                )}
                <Button
                  onClick={handleSave}
                  disabled={isSubmitting || !question.trim()}
                  className="bg-primary-11 hover:bg-primary-10 disabled:bg-gray-6 disabled:cursor-not-allowed text-primary-2 px-6 py-2"
                >
                  {isSubmitting
                    ? "Salvando..."
                    : isEditing
                      ? "Confirmar e editar"
                      : "Confirmar e criar"}
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
