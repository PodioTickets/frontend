"use client";

import { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import { ArrowButton } from "../ArrowButton";
import type { Event } from "@/interfaces/event";
import { Button } from "../Button";
import { useCheckout } from "@/contexts/CheckoutContext";
import { TrashIcon } from "../Icons/TrashIcon";
import { mockKits, type Race } from "@/constants/kits";
import { PencilIcon } from "../Icons/PencilIcon";
import { Dropdown } from "../Dropdown";
import { DateOfBirthPicker } from "../DateOfBirthPicker";
import { Checkbox } from "../CheckBox";
import type { Question } from "@/interfaces/event";
import { eventService } from "@/services";
import { useApiQuery } from "@/hooks/base/useApiQuery";
import { useDeleteParticipantModal } from "@/stores/modalStore";
import { UserAutocomplete } from "../UserAutocomplete";
import type { LinkedUser } from "@/hooks/useLinkedUsers";
import { useLinkedUsers } from "@/hooks/useLinkedUsers";
import { userService } from "@/services";
import toast from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";

interface InformationStepProps {
  event: Event;
  onNext: () => void;
  onBack: () => void;
}

interface ParticipantWithRace {
  raceId: string;
  race: Race;
  participantIndex: number;
  isExpanded: boolean;
}

export function InformationStep({
  event,
  onNext,
  onBack,
}: InformationStepProps) {
  const {
    raceQuantities,
    participants,
    updateParticipant,
    removeParticipant,
    updateRaceQuantity,
  } = useCheckout();
  const { openDeleteParticipantModal } = useDeleteParticipantModal();
  const { linkedUsers } = useLinkedUsers();
  const { user: currentUser } = useAuth();
  const [expandedParticipants, setExpandedParticipants] = useState<
    Record<number, boolean>
  >({
    0: true,
  });

  // Estado para armazenar respostas das perguntas por participante
  const [questionAnswers, setQuestionAnswers] = useState<
    Record<number, Record<string, string | string[]>>
  >({});

  // Estado para rastrear quais participantes foram selecionados da lista de usuários vinculados
  // Isso evita tentar salvar novamente usuários que já estão vinculados
  const [selectedLinkedUserIds, setSelectedLinkedUserIds] = useState<
    Record<number, string>
  >({});

  // Estado para rastrear quais participantes já foram salvos
  const [savedParticipantIds, setSavedParticipantIds] = useState<
    Record<number, boolean>
  >({});

  // Criar lista de participantes baseada nas races selecionadas
  const participantsWithRaces = useMemo(() => {
    const result: ParticipantWithRace[] = [];
    let participantIndex = 0;

    mockKits.forEach((kit) => {
      kit.races.forEach((race) => {
        const quantity = raceQuantities[race.id] || 0;
        for (let i = 0; i < quantity; i++) {
          result.push({
            raceId: race.id,
            race,
            participantIndex: participantIndex++,
            isExpanded: false,
          });
        }
      });
    });

    return result;
  }, [raceQuantities]);

  // Garantir que o array de participantes tenha pelo menos o número necessário de elementos
  useEffect(() => {
    const totalParticipantsNeeded = participantsWithRaces.length;
    if (totalParticipantsNeeded > 0 && participants.length < totalParticipantsNeeded) {
      // Expandir o array de participantes se necessário
      // Usar updateParticipant para cada índice faltante, que já cria o participante se não existir
      for (let i = participants.length; i < totalParticipantsNeeded; i++) {
        updateParticipant(i, {
          name: "",
          cpf: "",
          email: "",
          birthDate: "",
          phone: "",
          gender: "",
          emergencyPhone: "",
          emergencyContactName: "",
          hasEmergencyContact: false,
        });
      }
    }
  }, [participantsWithRaces.length, participants.length, updateParticipant]);

  // Calculate totals same way as ModalitiesStep
  const { totalParticipants, totalPrice } = useMemo(() => {
    let participants = 0;
    let total = 0;

    mockKits.forEach((kit) => {
      kit.races.forEach((race) => {
        const quantity = raceQuantities[race.id] || 0;
        if (quantity > 0) {
          participants += quantity;
          total += race.price * quantity;
        }
      });
    });

    return { totalParticipants: participants, totalPrice: total };
  }, [raceQuantities]);

  // Agrupa ingressos por race para exibição
  const groupedTickets = useMemo(() => {
    const grouped: Array<{
      quantity: number;
      raceName: string;
      distance: string;
      price: number;
      total: number;
    }> = [];

    mockKits.forEach((kit) => {
      kit.races.forEach((race) => {
        const quantity = raceQuantities[race.id] || 0;
        if (quantity > 0) {
          grouped.push({
            quantity,
            raceName: race.name,
            distance: race.distance,
            price: race.price,
            total: race.price * quantity,
          });
        }
      });
    });

    return grouped;
  }, [raceQuantities]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);
  };

  const toggleParticipant = async (index: number) => {
    // Garantir que o participante existe (fallback caso o useEffect não tenha executado)
    // O updateParticipant já cria o participante se não existir, mas vamos garantir
    let participant = participants[index];
    
    if (!participant) {
      // Criar participante vazio se não existir
      updateParticipant(index, {
        name: "",
        cpf: "",
        email: "",
        birthDate: "",
        phone: "",
        gender: "",
        emergencyPhone: "",
        emergencyContactName: "",
        hasEmergencyContact: false,
      });
      // Usar um objeto vazio temporário para continuar
      participant = {
        name: "",
        cpf: "",
        email: "",
        birthDate: "",
        phone: "",
        gender: "",
        emergencyPhone: "",
        emergencyContactName: "",
        hasEmergencyContact: false,
      };
    }
    
    // Verificar se está tentando fechar (participante já está expandido)
    const isCurrentlyExpanded = expandedParticipants[index];
    
    // Se está tentando fechar E o participante está completo, tentar salvar
    if (isCurrentlyExpanded && isParticipantComplete(index)) {
      // Limpar CPF (remover formatação) para comparação
      const cleanCPF = (participant.cpf || "").replace(/\D/g, "");
      const participantEmail = (participant.email || "").trim().toLowerCase();

      // Verificar se o participante já está na lista de usuários vinculados
      const isAlreadyLinked = linkedUsers.some((linkedUser) => {
        const linkedUserCPF = (linkedUser.documentNumber || "").replace(/\D/g, "");
        const linkedUserEmail = (linkedUser.email || "").trim().toLowerCase();
        
        // Comparar por CPF ou email
        return (
          (cleanCPF && linkedUserCPF && cleanCPF === linkedUserCPF) ||
          (participantEmail && linkedUserEmail && participantEmail === linkedUserEmail)
        );
      });

      // Verificar se é o próprio usuário atual
      const isCurrentUser = currentUser && (
        (cleanCPF && currentUser.documentNumber && cleanCPF === currentUser.documentNumber.replace(/\D/g, "")) ||
        (participantEmail && currentUser.email && participantEmail === currentUser.email.trim().toLowerCase())
      );

      // Se já está vinculado ou é o próprio usuário, não tentar vincular novamente
      if (isAlreadyLinked || isCurrentUser) {
        // Marcar como já vinculado para evitar tentativas futuras
        if (isAlreadyLinked) {
          const linkedUser = linkedUsers.find((linkedUser) => {
            const linkedUserCPF = (linkedUser.documentNumber || "").replace(/\D/g, "");
            const linkedUserEmail = (linkedUser.email || "").trim().toLowerCase();
            return (
              (cleanCPF && linkedUserCPF && cleanCPF === linkedUserCPF) ||
              (participantEmail && linkedUserEmail && participantEmail === linkedUserEmail)
            );
          });
          
          if (linkedUser) {
            setSelectedLinkedUserIds((prev) => ({
              ...prev,
              [index]: linkedUser.id,
            }));
          }
        }
        
        // Não precisa fazer nada, já está vinculado
        // Apenas fecha o participante
      } else if (!selectedLinkedUserIds[index] && !savedParticipantIds[index]) {
        // Se não está vinculado, criar/vincular usuário
        try {
          // Separar nome em firstName e lastName
          const nameParts = (participant.name || "").trim().split(" ");
          const firstName = nameParts[0] || "";
          const lastName = nameParts.slice(1).join(" ") || "";

          // Normalizar gênero para o formato esperado pelo backend (minúsculas)
          // O dropdown usa labels como "Masculino", "Feminino", etc., mas o backend espera minúsculas
          let normalizedGender = (participant.gender || "").trim();
          const genderLower = normalizedGender.toLowerCase();
          
          // Mapear valores possíveis para os formatos esperados pelo backend
          if (genderLower === "masculino") {
            normalizedGender = "masculino";
          } else if (genderLower === "feminino") {
            normalizedGender = "feminino";
          } else if (genderLower === "outro") {
            normalizedGender = "outro";
          } else if (genderLower === "prefiro não dizer" || genderLower === "prefiro-nao-dizer" || genderLower === "prefiro-nao-informar") {
            normalizedGender = "prefiro-nao-dizer";
          } else {
            // Se não for um dos valores esperados, usar o valor em minúsculas
            normalizedGender = genderLower || "";
          }

          const response = await userService.createOrLinkUser({
            firstName,
            lastName,
            email: participant.email || "",
            documentNumber: cleanCPF,
            phone: (participant.phone || "").replace(/\D/g, ""),
            dateOfBirth: participant.birthDate || "",
            gender: normalizedGender,
          });

          if (response.success && response.data) {
            // Marcar como salvo
            setSavedParticipantIds((prev) => ({
              ...prev,
              [index]: true,
            }));

            // Se foi criado ou vinculado, marcar também como selecionado para evitar duplicação
            if (response.data.wasCreated || response.data.wasLinked) {
              setSelectedLinkedUserIds((prev) => ({
                ...prev,
                [index]: response.data!.id,
              }));
            }

            toast.success(
              response.data.wasCreated
                ? "Usuário criado e vinculado com sucesso!"
                : "Usuário vinculado com sucesso!"
            );
          } else {
            toast.error(response.error || "Erro ao salvar usuário");
            return; // Não fecha o participante se houver erro
          }
        } catch (error) {
          console.error("Erro ao salvar usuário:", error);
          toast.error("Erro ao salvar usuário. Tente novamente.");
          return; // Não fecha o participante se houver erro
        }
      }
    }

    // Fechar/abrir o participante (sempre permite abrir, só valida ao fechar)
    setExpandedParticipants((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const handleInputChange = (
    index: number,
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    updateParticipant(index, { [name]: value });
  };

  const handleCPFChange = (index: number, value: string) => {
    const masked = maskCPF(value);
    updateParticipant(index, { cpf: masked });
  };

  const handlePhoneChange = (
    index: number,
    field: "phone" | "emergencyPhone",
    value: string
  ) => {
    const masked = maskPhone(value);
    updateParticipant(index, { [field]: masked });
  };

  const formatDate = (date: string) => {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(new Date(date));
  };

  const formatDateShort = (date: string) => {
    if (!date) return "";
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(date));
  };

  const formatAgeLimit = (ageLimit?: { min?: number; max?: number }) => {
    if (!ageLimit) return null;
    if (ageLimit.min && ageLimit.max) {
      return `de ${ageLimit.min} a ${ageLimit.max} anos`;
    }
    if (ageLimit.min) {
      return `a partir de ${ageLimit.min} anos`;
    }
    if (ageLimit.max) {
      return `até ${ageLimit.max} anos`;
    }
    return null;
  };

  const isParticipantComplete = (index: number) => {
    const participant = participants[index];
    if (!participant) return false;
    
    // Verificar se os campos obrigatórios estão preenchidos (não vazios)
    const name = participant.name?.trim();
    const cpf = participant.cpf?.trim();
    const email = participant.email?.trim();
    const birthDate = participant.birthDate?.trim();
    const phone = participant.phone?.trim();
    const gender = participant.gender?.trim();
    
    return !!(
      name &&
      cpf &&
      email &&
      birthDate &&
      phone &&
      gender
    );
  };

  const handleDeleteParticipant = (
    participantIndex: number,
    raceId: string
  ) => {
    openDeleteParticipantModal({
      participantIndex,
      raceId,
      onConfirm: () => {
        // Remover o participante
        removeParticipant(participantIndex);

        // Atualizar a quantidade da race correspondente
        const currentQuantity = raceQuantities[raceId] || 0;
        if (currentQuantity > 0) {
          updateRaceQuantity(raceId, currentQuantity - 1);
        }
      },
    });
  };

  // Mask functions (same as RegisterModal)
  const maskCPF = (value: string) => {
    // Remove tudo que não é dígito
    const numbers = value.replace(/\D/g, "");
    // Aplica a máscara
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 6)
      return `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
    if (numbers.length <= 9)
      return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(
        6
      )}`;
    return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(
      6,
      9
    )}-${numbers.slice(9, 11)}`;
  };

  const maskPhone = (value: string) => {
    // Remove tudo que não é dígito
    const numbers = value.replace(/\D/g, "");
    // Aplica a máscara (99) 99999-9999
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 7)
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(
      7,
      11
    )}`;
  };

  // Mask CPF for display (partial masking)
  const maskCPFDisplay = (cpf: string) => {
    if (!cpf) return "";
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.***.***-$4");
  };

  const sexoOptions = [
    { id: "masculino", label: "Masculino" },
    { id: "feminino", label: "Feminino" },
    { id: "outro", label: "Outro" },
    { id: "prefiro-nao-dizer", label: "Prefiro não dizer" },
  ];

  // Helper to get gender display value (handles both old IDs and new labels)
  const getGenderDisplayValue = (gender: string) => {
    if (!gender) return "";
    // Check if it's already a label
    const option = sexoOptions.find((opt) => opt.label === gender);
    if (option) return option.label;
    // Check if it's an old ID format
    const optionById = sexoOptions.find((opt) => opt.id === gender);
    if (optionById) return optionById.label;
    // Handle old "prefiro-nao-informar" format
    if (gender === "prefiro-nao-informar") {
      return "Prefiro não dizer";
    }
    return gender;
  };

  // Buscar perguntas do evento via API
  const { data: questions = [], isLoading: isLoadingQuestions } = useApiQuery<
    Question[]
  >(
    ["event-questions", event.id],
    () => eventService.getEventQuestions(event.id),
    {
      enabled: !!event.id,
    }
  );

  // Ordenar perguntas por ordem
  const sortedQuestions = useMemo(() => {
    return [...questions].sort((a, b) => a.order - b.order);
  }, [questions]);

  const updateQuestionAnswer = (
    participantIndex: number,
    questionId: string,
    answer: string | string[]
  ) => {
    setQuestionAnswers((prev) => ({
      ...prev,
      [participantIndex]: {
        ...prev[participantIndex],
        [questionId]: answer,
      },
    }));
  };

  // Obter resposta de pergunta
  const getQuestionAnswer = (
    participantIndex: number,
    questionId: string
  ): string | string[] => {
    return questionAnswers[participantIndex]?.[questionId] || "";
  };

  // Renderizar campo de pergunta baseado no tipo
  const renderQuestionField = (
    question: Question,
    participantIndex: number
  ) => {
    const answer = getQuestionAnswer(participantIndex, question.id);
    const isRequired = question.isRequired;

    switch (question.type) {
      case "text":
        return (
          <div className="flex flex-col gap-2">
            <label className="text-base font-normal text-gray-12 font-dm-sans">
              {question.question}
              {isRequired && <span className="text-red-9 ml-1">*</span>}
            </label>
            <input
              type="text"
              value={typeof answer === "string" ? answer : ""}
              onChange={(e) =>
                updateQuestionAnswer(
                  participantIndex,
                  question.id,
                  e.target.value
                )
              }
              className="w-full h-12 px-3 rounded-lg border border-gray-6 bg-transparent text-gray-12 focus:outline-none focus:border-primary-10 focus:bg-gray-3 transition-colors font-dm-sans text-base placeholder:text-gray-11"
              placeholder="Digite sua resposta"
            />
          </div>
        );

      case "select":
        return (
          <div className="flex flex-col gap-2">
            <label className="text-base font-normal text-gray-12 font-dm-sans">
              {question.question}
              {isRequired && <span className="text-red-9 ml-1">*</span>}
            </label>
            <div className="w-full">
              <Dropdown
                width="w-full"
                className="z-60"
                trigger={(open: boolean) => (
                  <div className="border border-gray-7 rounded-lg h-12 flex items-center justify-between px-3 w-full hover:bg-gray-3 transition-colors cursor-pointer">
                    <div className="flex gap-1 items-center flex-1 min-w-0">
                      <span className="font-normal text-base leading-[1.3] text-gray-11 font-dm-sans truncate">
                        {typeof answer === "string" && answer
                          ? answer
                          : "Selecione"}
                      </span>
                    </div>
                    <ArrowButton isOpen={open} />
                  </div>
                )}
                options={
                  question.options?.map((opt) => ({
                    id: opt,
                    label: opt,
                  })) || []
                }
                onSelect={(option) =>
                  updateQuestionAnswer(
                    participantIndex,
                    question.id,
                    option.label
                  )
                }
              />
            </div>
          </div>
        );

      case "radio":
        return (
          <div className="flex flex-col gap-2">
            <label className="text-base font-normal text-gray-12 font-dm-sans">
              {question.question}
              {isRequired && <span className="text-red-9 ml-1">*</span>}
            </label>
            <div className="flex flex-col gap-3">
              {question.options?.map((option) => {
                const isSelected =
                  typeof answer === "string" && answer === option;
                return (
                  <label
                    key={option}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <div
                      className={`size-6 rounded-full border-[1.5px] flex items-center justify-center transition-colors ${
                        isSelected
                          ? "bg-primary-11 border-primary-11"
                          : "bg-transparent border-gray-6"
                      }`}
                    >
                      {isSelected && (
                        <div className="size-2.5 rounded-full bg-primary-2" />
                      )}
                    </div>
                    <input
                      type="radio"
                      name={`question-${question.id}-${participantIndex}`}
                      value={option}
                      checked={isSelected}
                      onChange={() =>
                        updateQuestionAnswer(
                          participantIndex,
                          question.id,
                          option
                        )
                      }
                      className="sr-only"
                    />
                    <span className="text-sm text-gray-12 font-dm-sans">
                      {option}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        );

      case "checkbox":
        return (
          <div className="flex flex-col gap-2">
            <label className="text-base font-normal text-gray-12 font-dm-sans">
              {question.question}
              {isRequired && <span className="text-red-9 ml-1">*</span>}
            </label>
            <div className="flex flex-col gap-3">
              {question.options?.map((option) => {
                const selectedAnswers = Array.isArray(answer)
                  ? answer
                  : answer
                  ? [answer]
                  : [];
                const isChecked = selectedAnswers.includes(option);
                return (
                  <label
                    key={option}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={(checked) => {
                        const currentAnswers = Array.isArray(answer)
                          ? answer
                          : answer
                          ? [answer]
                          : [];
                        if (checked) {
                          updateQuestionAnswer(participantIndex, question.id, [
                            ...currentAnswers,
                            option,
                          ]);
                        } else {
                          updateQuestionAnswer(
                            participantIndex,
                            question.id,
                            currentAnswers.filter((a) => a !== option)
                          );
                        }
                      }}
                    />
                    <span className="text-sm text-gray-12 font-dm-sans">
                      {option}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <div className="w-full flex items-start gap-11 pb-24 md:pb-0">
        {/* Coluna esquerda - Formulários */}
        <div className="flex-1 flex flex-col gap-2 md:gap-6">
          <div className="w-full ">
            <div className="hidden md:flex items-center gap-2 text-2xl font-bold">
              <button
                className="cursor-pointer rotate-180 size-8 flex items-center justify-center rounded-full border border-gray-6"
                onClick={onBack}
              >
                <ArrowButton isOpen={false} />
              </button>
              <p className="text-2xl font-bold">Informações básicas</p>
            </div>
            <p className="text-sm text-gray-11 md:mt-4">
              Para quem serão os ingressos? Preencha os dados principais de cada
              participante.
            </p>
          </div>

          <div className="w-full">
            <div className="hidden md:flex gap-2 items-stretch rounded-xl overflow-hidden bg-gray-2 shadow-[0_5px_10px_rgba(0,0,0,0.3)] mb-10">
              <div className="h-[200px] w-1/4 relative shrink-0">
                <Image
                  src={event.bannerUrl}
                  alt={event.name}
                  fill
                  className="object-cover rounded-tr-xl rounded-br-xl"
                />
              </div>

              <div className="flex flex-col justify-center px-4 py-6 border-r border-gray-6 flex-1 min-w-0">
                <div className="flex flex-col gap-4">
                  <p className="text-base text-gray-11">Seu pedido:</p>
                  <h1 className="text-xl font-bold text-gray-12 h-[36px] leading-tight">
                    {event.name}
                  </h1>
                  <p className="text-base font-medium text-gray-12">
                    Do dia {formatDate(event.eventDate)}
                  </p>
                </div>
              </div>

              <div className="w-2/5 shrink-0 flex flex-col justify-center px-4 py-6">
                <div className="flex flex-col gap-5 pb-6">
                  {groupedTickets.map((ticket, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between text-base text-gray-12"
                    >
                      <p className="font-semibold">
                        ({ticket.quantity}x) {ticket.raceName}:
                      </p>
                      <p className="font-bold">
                        {formatPrice(ticket.total)}
                      </p>
                    </div>
                  ))}
                  <div className="flex items-center justify-between text-base text-gray-12">
                    <p className="font-semibold">Taxa de serviço:</p>
                    <p className="font-bold">
                      {formatPrice(event.serviceFee || 0)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xl font-bold text-gray-12 border-t border-gray-6 pt-6">
                  <p>Total:</p>
                  <p>{formatPrice(totalPrice + (event.serviceFee || 0))}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Cards de participantes */}
          {participantsWithRaces.map(
            ({ race, participantIndex, raceId }, index) => {
              const participant = participants[participantIndex] || {
                name: "",
                cpf: "",
                email: "",
                birthDate: "",
                phone: "",
                gender: "",
                emergencyPhone: "",
                emergencyContactName: "",
                hasEmergencyContact: false,
              };
              const isExpanded =
                expandedParticipants[participantIndex] ?? false;
              const isComplete = isParticipantComplete(participantIndex);
              const ageLimitText = formatAgeLimit(race.ageLimit);

              return (
                <div
                  key={`${race.id}-${index}`}
                  className={`flex flex-col w-full rounded-lg border border-gray-6 ${
                    !isExpanded ? "overflow-hidden" : ""
                  }`}
                >
                  <div
                    className={`flex items-start  justify-between w-full px-4 py-3 ${
                      !isExpanded
                        ? "hover:bg-gray-2 transition-colors cursor-pointer"
                        : ""
                    }`}
                    onClick={
                      !isExpanded
                        ? () => toggleParticipant(participantIndex)
                        : undefined
                    }
                  >
                    <div className="flex flex-col gap-2 flex-1 w-full relative">
                      <div
                        className={`transition-all duration-300 ease-in-out ${
                          !isExpanded
                            ? "max-h-[200px] opacity-100"
                            : "max-h-0 opacity-0"
                        }`}
                      >
                        <div
                          className={`flex items-start justify-between w-full relative ${
                            participant.name ? "min-h-[100px]" : ""
                          }`}
                        >
                          <div className="flex flex-col gap-3">
                            <div className="flex flex-col">
                              <p className="text-sm font-medium text-gray-12">
                                {participant.name ||
                                  `Participante ${index + 1}`}
                              </p>
                              <p className="font-bold text-2xl text-gray-12 mb-2">
                                {race.name}
                              </p>
                            </div>
                            <div
                              className={`flex items-center gap-2 p-2 ${
                                participant.name
                                  ? "border border-gray-6 rounded-xl mt-4 md:mt-0"
                                  : ""
                              }`}
                            >
                              {participant.name && (
                                <div className="size-10 rounded-full bg-gray-6 flex items-center justify-center shrink-0">
                                  <span className="text-sm font-bold text-gray-12">
                                    {participant.name.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                              )}

                              <div className="flex flex-col gap-1">
                                <span className="text-sm font-bold text-gray-12">
                                  {participant.name}
                                </span>
                                {participant.birthDate && (
                                  <p className="text-sm text-gray-11 flex items-center gap-2">
                                    {formatDateShort(participant.birthDate)}
                                    {participant.gender && (
                                      <>
                                        <span className="size-1 bg-gray-11 rounded-full" />
                                        {participant.gender}
                                      </>
                                    )}
                                    {participant.cpf && (
                                      <>
                                        <span className="size-1 bg-gray-11 rounded-full" />
                                        {maskCPFDisplay(participant.cpf)}
                                      </>
                                    )}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col justify-between items-end gap-2 absolute top-0 right-0 h-full">
                            <div
                              className={`flex md:flex-row flex-col items-end md:items-center gap-2 transition-all duration-300 ease-in-out ${
                                !isExpanded ? "opacity-100" : "opacity-0"
                              }`}
                            >
                              <div
                                className={`px-3 py-1 rounded-full text-sm font-medium transition-opacity duration-300 flex items-center justify-center ${
                                  isComplete
                                    ? "bg-primary-3 text-primary-12"
                                    : "bg-yellow-3 text-yellow-12"
                                }`}
                              >
                                {isComplete ? "Concluído" : "Pendente"}
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleParticipant(participantIndex);
                                }}
                                className="p-2 rounded-lg border border-gray-6 hover:bg-gray-2 transition-colors cursor-pointer"
                              >
                                <PencilIcon className="size-4 text-gray-12 cursor-pointer" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteParticipant(
                                    participantIndex,
                                    raceId
                                  );
                                }}
                                className="p-2 hidden md:block rounded-lg border border-red-6 hover:bg-red-1 transition-colors cursor-pointer"
                              >
                                <TrashIcon className="size-4 text-red-6 cursor-pointer" />
                              </button>
                            </div>
                            <h1 className="hidden md:block text-xl font-bold text-gray-12">
                              R${" "}
                              {(event.price + event.serviceFee || 0).toFixed(2)}
                            </h1>
                          </div>
                        </div>
                      </div>

                      {/* Conteúdo expandido */}
                      <div
                        className={`transition-all duration-300 ease-in-out ${
                          isExpanded
                            ? "max-h-[2000px] opacity-100"
                            : "max-h-0 opacity-0 pointer-events-none"
                        }`}
                      >
                        <div className="flex items-start justify-between w-full relative z-10">
                          <div className="flex flex-col gap-2 pb-3">
                            <p className="text-sm text-gray-11">
                              Participante {index + 1}
                            </p>
                            <h1 className="text-lg font-bold">{race.name}</h1>
                            {ageLimitText && (
                              <div className="bg-yellow-3 text-yellow-12 rounded-full px-3 py-2 w-fit text-sm">
                                Limite de idade: {ageLimitText}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center h-full gap-2 relative z-20">
                            <div
                              className={`px-3 py-1 rounded-full text-sm font-medium transition-opacity duration-300 ${
                                isComplete
                                  ? "bg-primary-3 text-primary-12"
                                  : "bg-yellow-3 text-yellow-12"
                              }`}
                            >
                              {isComplete ? "Concluído" : "Pendente"}
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                toggleParticipant(participantIndex);
                              }}
                              className="p-2  flex items-center justify-center rounded-lg border border-gray-6 hover:bg-gray-2 active:bg-gray-2 transition-colors cursor-pointer touch-manipulation"
                              type="button"
                            >
                              <PencilIcon className="size-4 text-gray-12 pointer-events-none" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteParticipant(
                                  participantIndex,
                                  raceId
                                );
                              }}
                              className="p-2 rounded-lg border border-red-6 hover:bg-red-1 active:bg-red-1 transition-colors cursor-pointer touch-manipulation"
                              type="button"
                            >
                              <TrashIcon className="size-4 text-red-6 cursor-pointer pointer-events-none" />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mg:gap-4 mt-4">
                          <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium text-gray-12">
                              Nome
                            </label>
                            <UserAutocomplete
                              value={participant.name}
                              onChange={(value) =>
                                updateParticipant(participantIndex, { name: value })
                              }
                              onSelectUser={(user: LinkedUser) => {
                                // Preencher automaticamente os campos quando um usuário é selecionado
                                // Formatar CPF se necessário
                                const formattedCPF = user.documentNumber
                                  ? maskCPF(user.documentNumber.replace(/\D/g, ""))
                                  : "";
                                
                                // Formatar telefone se necessário (pode vir sem formatação da API)
                                const formattedPhone = user.phone
                                  ? maskPhone(user.phone.replace(/\D/g, ""))
                                  : "";
                                
                                // Normalizar gênero (pode vir em diferentes formatos)
                                let normalizedGender = user.gender || "";
                                if (normalizedGender) {
                                  // Verificar se é um dos valores esperados
                                  const genderLower = normalizedGender.toLowerCase();
                                  if (genderLower === "masculino") {
                                    normalizedGender = "Masculino";
                                  } else if (genderLower === "feminino") {
                                    normalizedGender = "Feminino";
                                  } else if (genderLower === "outro") {
                                    normalizedGender = "Outro";
                                  } else if (genderLower === "prefiro-nao-dizer" || genderLower === "prefiro-nao-informar") {
                                    normalizedGender = "Prefiro não dizer";
                                  }
                                }
                                
                                updateParticipant(participantIndex, {
                                  name: `${user.firstName} ${user.lastName}`.trim(),
                                  email: user.email || "",
                                  cpf: formattedCPF,
                                  phone: formattedPhone,
                                  birthDate: user.dateOfBirth || "",
                                  gender: normalizedGender,
                                });

                                // Marcar que este participante foi selecionado da lista (já está vinculado)
                                setSelectedLinkedUserIds((prev) => ({
                                  ...prev,
                                  [participantIndex]: user.id,
                                }));
                              }}
                              placeholder="Digite o nome ou selecione um usuário"
                              className="w-full"
                            />
                          </div>
                          <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium text-gray-12">
                              Email
                            </label>
                            <input
                              type="email"
                              name="email"
                              value={participant.email}
                              onChange={(e) =>
                                handleInputChange(participantIndex, e)
                              }
                              className="w-full px-4 py-3 rounded-lg border border-gray-6 bg-gray-2 text-gray-12 focus:outline-none focus:border-primary-10 transition-colors"
                              placeholder="Digite seu email"
                            />
                          </div>
                          <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium text-gray-12">
                              CPF
                            </label>
                            <input
                              type="text"
                              name="cpf"
                              value={participant.cpf}
                              onChange={(e) =>
                                handleCPFChange(
                                  participantIndex,
                                  e.target.value
                                )
                              }
                              maxLength={14}
                              className="w-full px-4 py-3 rounded-lg border border-gray-6 bg-gray-2 text-gray-12 focus:outline-none focus:border-primary-10 transition-colors"
                              placeholder="000.000.000-00"
                            />
                          </div>
                          <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium text-gray-12">
                              Data de nascimento
                            </label>
                            <DateOfBirthPicker
                              value={participant.birthDate || undefined}
                              icon={false}
                              onChange={(value) =>
                                updateParticipant(participantIndex, {
                                  birthDate: value,
                                })
                              }
                              placeholder="00/00/0000"
                            />
                          </div>
                          <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium text-gray-12">
                              Telefone
                            </label>
                            <input
                              type="tel"
                              name="phone"
                              value={participant.phone}
                              onChange={(e) =>
                                handlePhoneChange(
                                  participantIndex,
                                  "phone",
                                  e.target.value
                                )
                              }
                              maxLength={15}
                              className="w-full px-4 py-3 rounded-lg border border-gray-6 bg-gray-2 text-gray-12 focus:outline-none focus:border-primary-10 transition-colors"
                              placeholder="(00) 99999-9999"
                            />
                          </div>
                          <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium text-gray-12">
                              Sexo
                            </label>
                            <div className="w-full">
                              <Dropdown
                                width="w-full"
                                className="z-60"
                                trigger={(open: boolean) => (
                                  <div className="border border-gray-6 rounded-lg h-12 flex items-center justify-between px-3 w-full hover:bg-gray-3 transition-colors cursor-pointer">
                                    <div className="flex gap-1 items-center flex-1 min-w-0">
                                      <span className="font-normal text-base leading-[1.3] text-gray-11 font-dm-sans truncate">
                                        {getGenderDisplayValue(
                                          participant.gender
                                        ) || "Selecione"}
                                      </span>
                                    </div>
                                    <ArrowButton isOpen={open} />
                                  </div>
                                )}
                                options={sexoOptions}
                                onSelect={(option) =>
                                  updateParticipant(participantIndex, {
                                    gender: option.label,
                                  })
                                }
                              />
                            </div>
                          </div>
                        </div>

                        {/* Seção de Contato de Emergência */}
                        <div className="flex flex-col gap-3 mt-4 w-full">
                          <p className="text-base font-normal text-gray-12 font-dm-sans leading-[1.3]">
                            Deseja adicionar um número de emergência ?
                          </p>
                          <div className="flex gap-2.5 items-start">
                            <div className="flex gap-2 items-center">
                              <Checkbox
                                checked={
                                  participant.hasEmergencyContact === true
                                }
                                onCheckedChange={() => {
                                  updateParticipant(participantIndex, {
                                    hasEmergencyContact: true,
                                  });
                                }}
                              />
                              <label
                                className="text-sm font-normal text-gray-12 font-dm-sans cursor-pointer leading-[1.3]"
                                onClick={() => {
                                  updateParticipant(participantIndex, {
                                    hasEmergencyContact: true,
                                  });
                                }}
                              >
                                Sim
                              </label>
                            </div>
                            <div className="flex gap-2 items-center">
                              <Checkbox
                                checked={
                                  participant.hasEmergencyContact === false
                                }
                                onCheckedChange={() => {
                                  updateParticipant(participantIndex, {
                                    hasEmergencyContact: false,
                                  });
                                }}
                              />
                              <label
                                className="text-sm font-normal text-gray-12 font-dm-sans cursor-pointer leading-[1.3]"
                                onClick={() => {
                                  updateParticipant(participantIndex, {
                                    hasEmergencyContact: false,
                                    emergencyContactName: "",
                                    emergencyPhone: "",
                                  });
                                }}
                              >
                                Não
                              </label>
                            </div>
                          </div>

                          {/* Campos de contato de emergência - mostrados apenas quando "Sim" é selecionado */}
                          {participant.hasEmergencyContact === true ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4 mt-4">
                              <div className="flex flex-col gap-2">
                                <label className="text-base font-normal text-gray-12 font-dm-sans">
                                  Nome do contato de emergência
                                </label>
                                <input
                                  type="text"
                                  name="emergencyContactName"
                                  value={
                                    (participant as any).emergencyContactName ||
                                    ""
                                  }
                                  onChange={(e) =>
                                    handleInputChange(participantIndex, e)
                                  }
                                  className="w-full h-12 px-3 rounded-lg border border-gray-6 bg-transparent text-gray-12 focus:outline-none focus:border-primary-10 transition-colors font-dm-sans text-base placeholder:text-gray-11"
                                  placeholder="Nome do contato"
                                />
                              </div>
                              <div className="flex flex-col gap-2">
                                <label className="text-base font-normal text-gray-12 font-dm-sans">
                                  Telefone de emergência
                                </label>
                                <input
                                  type="tel"
                                  name="emergencyPhone"
                                  value={
                                    (participant as any).emergencyPhone || ""
                                  }
                                  onChange={(e) =>
                                    handlePhoneChange(
                                      participantIndex,
                                      "emergencyPhone",
                                      e.target.value
                                    )
                                  }
                                  maxLength={15}
                                  className="w-full h-12 px-3 rounded-lg border border-gray-6 bg-transparent text-gray-12 focus:outline-none focus:border-primary-10 transition-colors font-dm-sans text-base placeholder:text-gray-11"
                                  placeholder="(00) 99999-9999"
                                />
                              </div>
                            </div>
                          ) : null}
                        </div>
                        {sortedQuestions.length > 0 && (
                          <>
                            <div className="w-full h-px bg-gray-6 my-6" />
                            <div className="flex flex-col gap-6">
                              <h2 className="text-2xl font-extrabold text-gray-12 font-manrope">
                                Perguntas do Organizador
                              </h2>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                {sortedQuestions.map((question) => (
                                  <div
                                    key={question.id}
                                    className="min-w-[313px]"
                                  >
                                    {renderQuestionField(
                                      question,
                                      participantIndex
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </>
                        )}

                        <div className="flex items-center justify-between gap-2 mt-10">
                          <h1 className="text-xl font-bold text-gray-12">
                            R$ {event.price?.toFixed(2) || "0,00"}
                          </h1>
                          <Button
                            onClick={() => toggleParticipant(participantIndex)}
                            variant="default"
                            className="font-bold"
                          >
                            Salvar e próximo
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            }
          )}

          {/* Botão Confirmar dados */}
          <div className="hidden md:flex items-center justify-center w-full mt-6">
            <Button
              onClick={onNext}
              disabled={
                participantsWithRaces.length === 0 ||
                !participantsWithRaces.every(({ participantIndex }) =>
                  isParticipantComplete(participantIndex)
                )
              }
              variant="default"
              className="w-1/4 font-bold"
            >
              Confirmar dados
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Footer Summary - Same style as ModalitiesStep */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-2 border-t border-gray-6 shadow-lg px-4 py-4 z-50 md:hidden">
        <div className="flex items-end justify-between text-gray-12 font-family-dm-sans">
          <div className="flex flex-col gap-2">
            <h1 className="text-base font-bold">{event.name}</h1>
            <p className="text-sm">
              Participantes:{" "}
              <span className="font-semibold">{totalParticipants}</span>
            </p>
            {groupedTickets.map((ticket, index) => (
              <p key={index} className="text-sm">
                ({ticket.quantity}x) {ticket.raceName}:{" "}
                <span className="font-semibold">
                  {formatPrice(ticket.total)}
                </span>
              </p>
            ))}
            <p className="text-sm">
              Taxa de serviço:{" "}
              <span className="font-semibold">
                {formatPrice(event.serviceFee || 0)}
              </span>
            </p>
            <p className="text-base">
              Valor total:{" "}
              <span className="font-bold">
                {formatPrice(totalPrice + (event.serviceFee || 0))}
              </span>
            </p>
          </div>
          <Button
            onClick={onNext}
            disabled={
              participantsWithRaces.length === 0 ||
              !participantsWithRaces.every(({ participantIndex }) =>
                isParticipantComplete(participantIndex)
              )
            }
          >
            Confirmar dados
          </Button>
        </div>
      </div>
    </>
  );
}
