"use client";

import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { useCreateQuestionModal, useDeleteQuestionModal } from "@/stores/modalStore";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { Radio } from "@/components/Radio";
import { X, Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { organizerService } from "@/services";
import { CreateQuestionRequest } from "@/services/organizer/OrganizerService";
import toast from "react-hot-toast";
import { TrashIcon } from "../Icons/TrashIcon";
import { SelectTicketsModal } from "../Coupon/SelectTicketsModal";
import { ArrowButton } from "../ArrowButton";
import { Dropdown } from "../Dropdown";
import { cn } from "@/utils/cn";

const PENDING_QUESTION_PREFIX = "__pending_question__";

function isPendingQuestionId(id: string | undefined): boolean {
  return !!id && id.startsWith(PENDING_QUESTION_PREFIX);
}

export type QuestionModalLocalPayload =
  | { kind: "create"; questionData: CreateQuestionRequest }
  | { kind: "update"; questionId: string; questionData: CreateQuestionRequest }
  | { kind: "delete"; questionId: string };

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
  const { openDeleteQuestionModal } = useDeleteQuestionModal();
  const [question, setQuestion] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<QuestionType>("text");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [isRequired, setIsRequired] = useState(true);
  const [appliesTo, setAppliesTo] = useState<"all" | "specific">("all");
  const [selectedTicketIds, setSelectedTicketIds] = useState<string[]>([]);
  const [showSelectTicketsModal, setShowSelectTicketsModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMdUp, setIsMdUp] = useState(true);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editingDescription, setEditingDescription] = useState("");
  const descriptionRef = useRef("");

  useLayoutEffect(() => {
    setIsMdUp(window.matchMedia("(min-width: 768px)").matches);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const onChange = () => setIsMdUp(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const isEditing = data?.questionId !== undefined;
  const eventId = data?.eventId;
  const deferPersistence = data?.deferPersistence === true;

  // Initialize form when modal opens
  useEffect(() => {
    if (isOpen) {
      if (isEditing && data?.question) {
        // Editing mode - load question data
        const q = data.question;
        setQuestion(q.question);
        setDescription(q.description ?? "");
        descriptionRef.current = q.description ?? "";
        setType(q.type);
        setOptions(q.options && q.options.length > 0 ? q.options : ["", ""]);
        setIsRequired(q.isRequired);
        const appliesToData = (q as any).appliesTo;
        if (appliesToData === "all" || !appliesToData) {
          setAppliesTo("all");
          setSelectedTicketIds([]);
        } else if (Array.isArray(appliesToData)) {
          const ticketIds = appliesToData.map((ticket: any) =>
            typeof ticket === "string" ? ticket : ticket.id
          );
          setAppliesTo(ticketIds.length > 0 ? "specific" : "all");
          setSelectedTicketIds(ticketIds);
        } else {
          setAppliesTo("all");
          setSelectedTicketIds([]);
        }
      } else {
        // Create mode - reset form
        setQuestion("");
        setDescription("");
        descriptionRef.current = "";
        setType("text");
        setOptions(["", ""]);
        setIsRequired(true);
        setAppliesTo("all");
        setSelectedTicketIds([]);
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

  const handleSaveDescription = () => {
    descriptionRef.current = editingDescription;
    setDescription(editingDescription);
    setIsEditingDescription(false);
  };

  const handleCancelDescription = () => {
    setIsEditingDescription(false);
  };

  const handleSave = async () => {
    if (!question.trim()) {
      toast.error("Digite uma pergunta");
      return;
    }

    if (question.length > 200) {
      toast.error("A pergunta deve ter no máximo 200 caracteres");
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

    if (appliesTo === "specific" && selectedTicketIds.length === 0) {
      toast.error("Selecione pelo menos um ingresso");
      return;
    }

    setIsSubmitting(true);

    try {
      const questionData: CreateQuestionRequest = {
        question: question.trim(),
        description: descriptionRef.current.trim() || undefined,
        type,
        isRequired,
        options: (type === "select" || type === "multiple_choice")
          ? options.filter(opt => opt.trim() !== "")
          : undefined,
        appliesTo:
          appliesTo === "specific" && selectedTicketIds.length > 0
            ? selectedTicketIds
            : "all",
      };

      if (deferPersistence) {
        if (!isEditing) {
          if (onModalSave) {
            await onModalSave({ kind: "create", questionData } satisfies QuestionModalLocalPayload);
          }
          toast.success("Pergunta adicionada. Salve as alterações para confirmar.");
          closeCreateQuestionModal();
          return;
        }
        if (isPendingQuestionId(data?.questionId)) {
          if (onModalSave) {
            await onModalSave({
              kind: "update",
              questionId: data!.questionId!,
              questionData,
            } satisfies QuestionModalLocalPayload);
          }
          toast.success("Pergunta atualizada. Salve as alterações para confirmar.");
          closeCreateQuestionModal();
          return;
        }
      }

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

    setIsSubmitting(true);

    try {
      if (deferPersistence && isPendingQuestionId(data.questionId)) {
        if (onModalSave) {
          await onModalSave({
            kind: "delete",
            questionId: data.questionId,
          } satisfies QuestionModalLocalPayload);
        }
        toast.success("Pergunta removida.");
        closeCreateQuestionModal();
        return;
      }

      await organizerService.deleteQuestion(eventId, data.questionId);
      toast.success("Pergunta deletada com sucesso!");

      if (onModalSave) {
        await onModalSave(undefined);
      }

      closeCreateQuestionModal();
    } catch (error: any) {
      console.error("Error deleting question:", error);
      toast.error(error.response?.data?.message || "Erro ao deletar pergunta");
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedTypeLabel = QUESTION_TYPES.find(t => t.value === type)?.label || "Selecione o tipo";
  const showListSection = type === "select" || type === "multiple_choice";
  const showTrueFalseSection = type === "true_false";
  const showNumberSection = type === "number";

  const panelMotion = isMdUp
    ? {
      initial: { opacity: 0, scale: 0.95, y: 20 },
      animate: { opacity: 1, scale: 1, y: 0 },
      exit: { opacity: 0, scale: 0.95, y: 20 },
    }
    : {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
    };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 bg-black/90"
              onClick={closeCreateQuestionModal}
            />

            {/* Modal */}
            <motion.div
              {...panelMotion}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="fixed inset-0 z-50 flex items-center justify-center max-md:items-stretch max-md:justify-stretch md:p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className={cn(
                  "flex w-full max-w-[982px] flex-col overflow-hidden border border-gray-6 bg-gray-1 shadow-2xl pt-16 md:pt-0",
                  "max-h-[80vh] rounded-xl",
                  "max-md:h-dvh max-md:max-h-dvh max-md:max-w-none max-md:rounded-none max-md:border-0",
                )}
              >
                {/* Header */}
                <div
                  className={cn(
                    "flex shrink-0 items-center justify-between border-b border-gray-6",
                    "max-md:h-[52px] max-md:bg-gray-2 max-md:px-4 md:px-5 md:py-3",
                  )}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-2 md:contents">
                    <button
                      type="button"
                      onClick={closeCreateQuestionModal}
                      className="flex size-8 shrink-0 items-center justify-center rounded-[52px] md:border border-gray-6 transition-colors hover:bg-gray-3 md:hidden rotate-180"
                      aria-label="Fechar"
                    >
                      <ArrowButton isOpen={false} />
                    </button>
                    <h2
                      className={cn(
                        "truncate leading-[1.3] text-gray-12",
                        "max-md:font-manrope max-md:text-base max-md:font-extrabold",
                        "md:font-family-dm-sans md:text-[20px] md:font-semibold",
                      )}
                    >
                      {isEditing ? "Editar pergunta" : "Criar pergunta"}
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={closeCreateQuestionModal}
                    className="hidden p-1 text-gray-11 transition-colors hover:text-gray-12 md:block"
                    aria-label="Fechar"
                  >
                    <X className="size-6" />
                  </button>
                </div>

                {/* Content */}
                <div className="min-h-0 flex-1 overflow-y-auto [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-6 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar]:w-2">
                  <div className="flex flex-col gap-8 p-4 max-md:gap-8 md:gap-9 md:p-5">
                    {/* Pergunta Input */}
                    <div className="flex flex-col gap-2">
                      <div className="flex flex-col gap-2">
                        <label className="font-family-dm-sans text-base font-normal leading-[1.3] text-gray-12">
                          Pergunta
                        </label>
                        <Input
                          type="text"
                          value={question}
                          onChange={(e) => setQuestion(e.target.value)}
                          placeholder="Digite uma pergunta aos participantes"
                          maxLength={200}
                          className="h-12 px-3 pr-24"
                        />
                      </div>
                      {isEditingDescription ? (
                        <input
                          type="text"
                          value={editingDescription}
                          onChange={(e) => { setEditingDescription(e.target.value); descriptionRef.current = e.target.value; }}
                          onBlur={handleSaveDescription}
                          onKeyDown={(e) => {
                            e.stopPropagation();
                            if (e.key === "Enter") handleSaveDescription();
                            else if (e.key === "Escape") handleCancelDescription();
                          }}
                          placeholder="Adicione uma observação para o cliente..."
                          className="w-full border-0 border-b border-gray-6 bg-transparent font-family-dm-sans text-sm font-normal leading-[1.3] text-gray-11 focus:border-primary-8 focus:outline-none"
                          autoFocus
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingDescription(description);
                            setIsEditingDescription(true);
                          }}
                          className="w-full text-left font-family-dm-sans text-sm font-normal leading-[1.3] text-gray-11 hover:text-gray-12"
                        >
                          {description || "Adicione uma observação para o cliente..."}
                        </button>
                      )}
                    </div>

                    {/* Tipo de resposta */}
                    <div className="flex flex-col gap-6">
                      <div className="flex w-full max-w-none flex-col gap-2 md:w-[276px]">
                        <label className="font-family-dm-sans text-base font-normal leading-[1.3] text-gray-12">
                          <span className="md:hidden">Tipo de resposta desejada</span>
                          <span className="hidden md:inline">Tipo de resposta</span>
                        </label>
                        <Dropdown
                          options={QUESTION_TYPES.map(t => ({
                            id: t.value,
                            label: t.label,
                            onClick: () => setType(t.value)
                          }))}
                          trigger={
                            <div className="flex h-12 cursor-pointer items-center justify-between rounded-lg border border-gray-6 px-3 transition-colors hover:bg-gray-3">
                              <span className="font-family-dm-sans text-base font-normal text-gray-11">
                                {selectedTypeLabel}
                              </span>
                              <ArrowButton isOpen={false} />
                            </div>
                          }
                          onSelect={(option) => setType(option.id as QuestionType)}
                          width="w-full md:w-[276px]"
                        />
                      </div>

                      {/* Lista / múltipla escolha — opções */}
                      {showListSection && (
                        <div className="bg-gray-2 border-[1.5px] border-gray-6 rounded-lg w-full">
                          <div className="p-5 flex flex-col gap-3">
                            <div className="flex flex-col gap-3">
                              <h3 className="text-gray-12 text-lg font-semibold font-manrope leading-[1.1]">
                                {type === "select" ? "Lista" : "Múltipla escolha"}
                              </h3>
                              <p className="text-gray-11 text-base font-normal font-family-dm-sans leading-[1.3]">
                                {type === "select"
                                  ? "O participante pode marcar mais de uma opção entre as que você cadastrar. Adicione pelo menos 2 opções."
                                  : "O participante escolhe apenas uma opção entre as listadas. Adicione pelo menos 2 opções."}
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
                                    type="button"
                                    title="Remover opção"
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
                                className="flex items-center gap-1 h-11 px-11 text-gray-11 text-base font-semibold font-family-dm-sans hover:text-gray-12 transition-colors"
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
                            <p className="text-gray-11 text-base font-normal font-family-dm-sans leading-[1.3]">
                              Objetivo: participante escolhe entre verdadeiro ou falso
                            </p>
                            <div className="flex gap-4 mt-2">
                              <div className="flex items-center gap-2">
                                <Radio
                                  checked={true}
                                  onChange={() => { }}
                                  name="true_false"
                                  disabled
                                  className="size-6"
                                />
                                <span className="text-gray-12 text-sm font-normal font-family-dm-sans leading-[1.3]">
                                  Verdadeiro
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Radio
                                  checked={false}
                                  onChange={() => { }}
                                  name="true_false"
                                  disabled
                                  className="size-6"
                                />
                                <span className="text-gray-12 text-sm font-normal font-family-dm-sans leading-[1.3]">
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
                            <p className="text-gray-11 text-base font-normal font-family-dm-sans leading-[1.3]">
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
                      <label className="font-family-dm-sans text-base font-normal leading-[1.3] text-gray-12">
                        Participante é obrigado a responder?
                      </label>
                      <div className="flex flex-wrap gap-6 max-md:gap-10">
                        <label className="flex cursor-pointer items-center gap-2">
                          <Radio
                            checked={isRequired}
                            onChange={() => setIsRequired(true)}
                            name="required"
                            value="required"
                            className="size-6"
                          />
                          <span className="font-family-dm-sans text-sm font-normal leading-[1.3] text-gray-12">
                            Obrigatório
                          </span>
                        </label>
                        <label className="flex cursor-pointer items-center gap-2">
                          <Radio
                            checked={!isRequired}
                            onChange={() => setIsRequired(false)}
                            name="required"
                            value="optional"
                            className="size-6"
                          />
                          <span className="font-family-dm-sans text-sm font-normal leading-[1.3] text-gray-12">
                            Opcional
                          </span>
                        </label>
                      </div>
                    </div>

                    {/* Aplicação aos ingressos */}
                    <div className="flex flex-col gap-3">
                      <label className="font-family-dm-sans text-base font-normal leading-[1.3] text-gray-12">
                        Quer aplicar essa pergunta a todos os ingressos?
                      </label>
                      <div className="flex flex-wrap gap-6 max-md:gap-10">
                        <label className="flex cursor-pointer items-center gap-2">
                          <Radio
                            checked={appliesTo === "all"}
                            onChange={() => {
                              setAppliesTo("all");
                              setSelectedTicketIds([]);
                            }}
                            name="apply-question-tickets"
                            className="size-6"
                          />
                          <span className="font-family-dm-sans text-sm font-normal leading-[1.3] text-gray-12">
                            Sim
                          </span>
                        </label>
                        <label className="flex cursor-pointer items-center gap-2">
                          <Radio
                            checked={appliesTo === "specific"}
                            onChange={() => setAppliesTo("specific")}
                            name="apply-question-tickets"
                            className="size-6"
                          />
                          <span className="font-family-dm-sans text-sm font-normal leading-[1.3] text-gray-12">
                            Não
                          </span>
                        </label>
                      </div>
                      {appliesTo === "specific" && (
                        <div className="flex w-full max-w-none flex-col gap-2 md:max-w-[276px]">
                          <label className="font-family-dm-sans text-base font-normal leading-[1.3] text-gray-12">
                            Aplicar em quais ingressos?
                          </label>
                          <button
                            type="button"
                            onClick={() => setShowSelectTicketsModal(true)}
                            className="flex h-12 w-full cursor-pointer items-center justify-between rounded-lg border border-gray-6 px-3 text-left transition-colors hover:bg-gray-3"
                          >
                            <span className="font-family-dm-sans text-base font-normal text-gray-11">
                              {selectedTicketIds.length > 0
                                ? `${selectedTicketIds.length} ingresso${selectedTicketIds.length > 1 ? "s" : ""} selecionado${selectedTicketIds.length > 1 ? "s" : ""}`
                                : "Selecione os ingressos"}
                            </span>
                            <ArrowButton />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div
                  className={cn(
                    "flex shrink-0 flex-col gap-3 border-t border-gray-6",
                    "max-md:bg-gray-1 max-md:p-4 max-md:pb-[max(1rem,env(safe-area-inset-bottom))]",
                    "md:flex-row md:items-center md:justify-between md:gap-3 md:px-6 md:py-4",
                  )}
                >
                  {isEditing && (
                    <Button
                      variant="destructive"
                      onClick={() => openDeleteQuestionModal({ onConfirm: handleDelete })}
                      disabled={isSubmitting}
                      className="max-md:h-12 max-md:w-full md:w-auto"
                    >
                      Deletar pergunta
                    </Button>
                  )}

                  <div
                    className={cn(
                      "flex items-center gap-3",
                      "max-md:w-full max-md:gap-2",
                      !isEditing && "md:ml-auto",
                    )}
                  >
                    <Button
                      variant="outline"
                      onClick={closeCreateQuestionModal}
                      disabled={isSubmitting}
                      className={cn(
                        "border-gray-6 px-4 py-2 text-gray-12",
                        "max-md:h-12 max-md:flex-1",
                      )}
                    >
                      <span className="md:hidden">Fechar</span>
                      <span className="hidden md:inline">Cancelar</span>
                    </Button>

                    <Button
                      onClick={handleSave}
                      disabled={isSubmitting || !question.trim()}
                      className={cn(
                        "disabled:cursor-not-allowed disabled:bg-opacity-50",
                        "max-md:h-12 max-md:flex-1",
                      )}
                    >
                      {isSubmitting ? (
                        "Salvando..."
                      ) : (
                        <>
                          <span className="md:hidden">
                            {isEditing ? "Salvar pergunta" : "Confirmar e criar"}
                          </span>
                          <span className="hidden md:inline">Salvar pergunta</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      <SelectTicketsModal
        isOpen={showSelectTicketsModal}
        onClose={() => setShowSelectTicketsModal(false)}
        onConfirm={(ticketIds) => {
          setSelectedTicketIds(ticketIds);
        }}
        eventId={eventId || null}
        selectedTicketIds={appliesTo === "specific" ? selectedTicketIds : []}
      />
    </>
  );
}
