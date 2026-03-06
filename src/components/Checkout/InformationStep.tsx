"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import Image from "next/image";
import { ArrowButton } from "../ArrowButton";
import type { Event } from "@/interfaces/event";
import { Button } from "../Button";
import { useCheckout } from "@/contexts/CheckoutContext";
import { TrashIcon } from "../Icons/TrashIcon";
import type { Ticket } from "@/hooks/useTickets";
import { useTickets } from "@/hooks/useTickets";
import { useTicketCategories } from "@/hooks/useTicketCategories";
import { PencilIcon } from "../Icons/PencilIcon";
import { Dropdown } from "../Dropdown";
import { DateOfBirthPicker } from "../DateOfBirthPicker";
import { Checkbox } from "../CheckBox";
import type { Question } from "@/interfaces/event";
import { eventService } from "@/services";
import { useQuery } from "@tanstack/react-query";
import { organizerService } from "@/services";
import { queryKeys } from "@/services/cache/QueryClient";
import { useDeleteParticipantModal } from "@/stores/modalStore";
import { UserAutocomplete } from "../UserAutocomplete";
import type { LinkedUser } from "@/hooks/useLinkedUsers";
import { useLinkedUsers } from "@/hooks/useLinkedUsers";
import { userService } from "@/services";
import toast from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import { Loading } from "../Loading";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

interface InformationStepProps {
  event: Event;
  onNext: () => void;
  onBack: () => void;
}

interface ParticipantWithTicket {
  ticketId: string;
  ticket: Ticket;
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

  const eventId = event?.id;

  // Buscar tickets e categorias do servidor
  const { tickets, loading: ticketsLoading } = useTickets(eventId, !!eventId);
  const { categories, loading: categoriesLoading } = useTicketCategories(eventId, !!eventId);

  const loading = ticketsLoading || categoriesLoading;
  const { openDeleteParticipantModal } = useDeleteParticipantModal();
  const { linkedUsers } = useLinkedUsers();
  const { user: currentUser } = useAuth();
  const [expandedParticipants, setExpandedParticipants] = useState<
    Record<number, boolean>
  >({
    0: true,
  });

  const [showAllTicketsModal, setShowAllTicketsModal] = useState(false);

  // Estado para armazenar respostas das perguntas por participante
  // Inicializar com dados do contexto
  const [questionAnswers, setQuestionAnswers] = useState<
    Record<number, Record<string, string | string[]>>
  >(() => {
    const initial: Record<number, Record<string, string | string[]>> = {};
    participants.forEach((participant, index) => {
      if (participant.questionAnswers) {
        initial[index] = participant.questionAnswers;
      }
    });
    return initial;
  });

  // Sincronizar questionAnswers quando participants mudarem (ex: carregamento do storage)
  // Usar ref para evitar loops infinitos
  const isUpdatingFromContextRef = useRef(false);

  useEffect(() => {
    if (isUpdatingFromContextRef.current) {
      isUpdatingFromContextRef.current = false;
      return;
    }

    const updated: Record<number, Record<string, string | string[]>> = {};
    participants.forEach((participant, index) => {
      if (participant.questionAnswers) {
        updated[index] = participant.questionAnswers;
      }
    });

    // Só atualizar se houver diferenças
    setQuestionAnswers((prev) => {
      const hasChanges = Object.keys(updated).some(
        (index) => JSON.stringify(prev[Number(index)]) !== JSON.stringify(updated[Number(index)])
      );
      if (!hasChanges && Object.keys(prev).length === Object.keys(updated).length) {
        return prev;
      }
      return { ...prev, ...updated };
    });
  }, [participants]);

  // Estado para rastrear quais participantes foram selecionados da lista de usuários vinculados
  // Isso evita tentar salvar novamente usuários que já estão vinculados
  const [selectedLinkedUserIds, setSelectedLinkedUserIds] = useState<
    Record<number, string>
  >({});

  // Estado para rastrear quais participantes já foram salvos
  const [savedParticipantIds, setSavedParticipantIds] = useState<
    Record<number, boolean>
  >({});

  // Estado para rastrear quais participantes foram salvos clicando em "Salvar e próximo"
  const [savedParticipants, setSavedParticipants] = useState<
    Record<number, boolean>
  >({});

  // Separar tickets com categoria dos avulsos
  const { categorizedTickets, uncategorizedTickets } = useMemo(() => {
    const categorized: Array<{ id: string; name: string; tickets: Ticket[] }> = [];
    const uncategorized: Ticket[] = [];

    // Mapear categorias por ID
    const categoryMap = new Map(categories.map((cat) => [cat.id, cat.name]));

    // Agrupar tickets por categoria
    const ticketsByCategory: Record<string, Ticket[]> = {};
    tickets.forEach((ticket) => {
      const categoryId = ticket.groupId;
      if (categoryId && categoryMap.has(categoryId)) {
        if (!ticketsByCategory[categoryId]) {
          ticketsByCategory[categoryId] = [];
        }
        ticketsByCategory[categoryId].push(ticket);
      } else {
        uncategorized.push(ticket);
      }
    });

    // Processar categorias com tickets
    categories.forEach((category) => {
      const categoryTickets = ticketsByCategory[category.id] || [];
      if (categoryTickets.length > 0) {
        categorized.push({
          id: category.id,
          name: category.name,
          tickets: categoryTickets.filter((ticket) => {
            try {
              const price = parseFloat(ticket.price.replace(/[^\d,]/g, "").replace(",", "."));
              return !isNaN(price) && price > 0;
            } catch {
              return false;
            }
          }),
        });
      }
    });

    // Filtrar tickets avulsos válidos
    const validUncategorized = uncategorized.filter((ticket) => {
      try {
        const price = parseFloat(ticket.price.replace(/[^\d,]/g, "").replace(",", "."));
        return !isNaN(price) && price > 0;
      } catch {
        return false;
      }
    });

    return {
      categorizedTickets: categorized,
      uncategorizedTickets: validUncategorized,
    };
  }, [tickets, categories]);

  const getTicketPrice = (ticket: Ticket): number => {
    try {
      return parseFloat(ticket.price.replace(/[^\d,]/g, "").replace(",", "."));
    } catch {
      return 0;
    }
  };

  // Criar lista de participantes baseada nos tickets selecionados
  const participantsWithRaces = useMemo(() => {
    const result: ParticipantWithTicket[] = [];
    let participantIndex = 0;

    // Tickets com categoria
    categorizedTickets.forEach((category) => {
      category.tickets.forEach((ticket) => {
        const quantity = raceQuantities[ticket.id] || 0;
        for (let i = 0; i < quantity; i++) {
          result.push({
            ticketId: ticket.id,
            ticket,
            participantIndex: participantIndex++,
            isExpanded: false,
          });
        }
      });
    });

    // Tickets avulsos
    uncategorizedTickets.forEach((ticket) => {
      const quantity = raceQuantities[ticket.id] || 0;
      for (let i = 0; i < quantity; i++) {
        result.push({
          ticketId: ticket.id,
          ticket,
          participantIndex: participantIndex++,
          isExpanded: false,
        });
      }
    });

    return result;
  }, [raceQuantities, categorizedTickets, uncategorizedTickets]);

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

  // Limpar estado de salvos quando a quantidade de participantes mudar
  useEffect(() => {
    // Remover participantes salvos que não existem mais
    setSavedParticipants((prev) => {
      const validIndices = new Set(
        participantsWithRaces.map(({ participantIndex }) => participantIndex)
      );
      const updated: Record<number, boolean> = {};
      Object.keys(prev).forEach((key) => {
        const index = Number(key);
        if (validIndices.has(index)) {
          updated[index] = prev[index];
        }
      });
      return updated;
    });
  }, [participantsWithRaces]);

  // Calculate totals same way as ModalitiesStep
  const { totalParticipants, totalPrice } = useMemo(() => {
    let participants = 0;
    let total = 0;

    // Tickets com categoria
    categorizedTickets.forEach((category) => {
      category.tickets.forEach((ticket) => {
        const quantity = raceQuantities[ticket.id] || 0;
        if (quantity > 0) {
          participants += quantity;
          total += getTicketPrice(ticket) * quantity;
        }
      });
    });

    // Tickets avulsos
    uncategorizedTickets.forEach((ticket) => {
      const quantity = raceQuantities[ticket.id] || 0;
      if (quantity > 0) {
        participants += quantity;
        total += getTicketPrice(ticket) * quantity;
      }
    });

    return { totalParticipants: participants, totalPrice: total };
  }, [raceQuantities, categorizedTickets, uncategorizedTickets]);

  // Agrupa ingressos para exibição
  const groupedTickets = useMemo(() => {
    const grouped: Array<{
      quantity: number;
      raceName: string;
      distance: string;
      price: number;
      total: number;
    }> = [];

    // Tickets com categoria
    categorizedTickets.forEach((category) => {
      category.tickets.forEach((ticket) => {
        const quantity = raceQuantities[ticket.id] || 0;
        if (quantity > 0) {
          const distance = ticket.distance ? `${ticket.distance}${ticket.distanceUnit || "K"}` : "";
          grouped.push({
            quantity,
            raceName: ticket.name,
            distance,
            price: getTicketPrice(ticket),
            total: getTicketPrice(ticket) * quantity,
          });
        }
      });
    });

    // Tickets avulsos
    uncategorizedTickets.forEach((ticket) => {
      const quantity = raceQuantities[ticket.id] || 0;
      if (quantity > 0) {
        const distance = ticket.distance ? `${ticket.distance}${ticket.distanceUnit || "K"}` : "";
        grouped.push({
          quantity,
          raceName: ticket.name,
          distance,
          price: getTicketPrice(ticket),
          total: getTicketPrice(ticket) * quantity,
        });
      }
    });

    return grouped;
  }, [raceQuantities, categorizedTickets, uncategorizedTickets]);

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

    // Se está abrindo o participante para edição, remover do estado de salvos
    if (!isCurrentlyExpanded) {
      setSavedParticipants((prev) => {
        const updated = { ...prev };
        delete updated[index];
        return updated;
      });
    }

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
    ticketId: string
  ) => {
    openDeleteParticipantModal({
      participantIndex,
      raceId: ticketId,
      onConfirm: () => {
        // Remover o participante
        removeParticipant(participantIndex);

        // Remover do estado de salvos
        setSavedParticipants((prev) => {
          const updated = { ...prev };
          delete updated[participantIndex];
          return updated;
        });

        // Atualizar a quantidade do ticket correspondente
        const currentQuantity = raceQuantities[ticketId] || 0;
        if (currentQuantity > 0) {
          updateRaceQuantity(ticketId, currentQuantity - 1);
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

  // Buscar perguntas do evento via API - já vem no formato correto com isRequired, order, etc.
  const { data: questions = [], isLoading: isLoadingQuestions } = useQuery<Question[]>({
    queryKey: queryKeys.events.questions(eventId || ""),
    queryFn: async () => {
      if (!eventId) return [];
      try {
        const loadedQuestions = await organizerService.getQuestions(eventId);
        return Array.isArray(loadedQuestions) ? loadedQuestions : [];
      } catch (error) {
        console.error("Error loading questions:", error);
        return [];
      }
    },
    enabled: !!eventId,
  });

  // Ordenar perguntas por ordem
  const sortedQuestions = useMemo(() => {
    if (!questions || questions.length === 0) return [];
    return [...questions].sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [questions]);


  const updateQuestionAnswer = (
    participantIndex: number,
    questionId: string,
    answer: string | string[]
  ) => {
    isUpdatingFromContextRef.current = true;
    setQuestionAnswers((prev) => {
      const updated = {
        ...prev,
        [participantIndex]: {
          ...prev[participantIndex],
          [questionId]: answer,
        },
      };

      // Salvar no contexto
      updateParticipant(participantIndex, {
        questionAnswers: updated[participantIndex],
      });

      return updated;
    });
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
            <label className="text-base font-normal text-gray-12 font-family-dm-sans">
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
              className="w-full h-12 px-3 rounded-lg border border-gray-6 bg-transparent text-gray-12 focus:outline-none focus:border-primary-10 focus:bg-gray-3 transition-colors font-family-dm-sans text-base placeholder:text-gray-11"
              placeholder="Digite sua resposta"
            />
          </div>
        );

      case "select":
        return (
          <div className="flex flex-col gap-2">
            <label className="text-base font-normal text-gray-12 font-family-dm-sans">
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
                      <span className="font-normal text-base leading-[1.3] text-gray-11 font-family-dm-sans truncate">
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

      case "multiple_choice":
        return (
          <div className="flex flex-col gap-2">
            <label className="text-base font-normal text-gray-12 font-family-dm-sans">
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
                      className={`size-6 rounded-full border-[1.5px] flex items-center justify-center transition-colors ${isSelected
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
                    <span className="text-sm text-gray-12 font-family-dm-sans">
                      {option}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        );

      case "true_false":
        const trueFalseOptions = ["Verdadeiro", "Falso"];
        return (
          <div className="flex flex-col gap-2">
            <label className="text-base font-normal text-gray-12 font-family-dm-sans">
              {question.question}
              {isRequired && <span className="text-red-9 ml-1">*</span>}
            </label>
            <div className="flex flex-col gap-3">
              {trueFalseOptions.map((option) => {
                const isSelected = typeof answer === "string" && answer === option;
                return (
                  <label
                    key={option}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(checked) =>
                        updateQuestionAnswer(participantIndex, question.id, checked ? option : "")
                      }
                    />
                    <span className="text-sm text-gray-12 font-family-dm-sans">
                      {option}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        );

      case "number":
        return (
          <div className="flex flex-col gap-2">
            <label className="text-base font-normal text-gray-12 font-family-dm-sans">
              {question.question}
              {isRequired && <span className="text-red-9 ml-1">*</span>}
            </label>
            <input
              type="number"
              value={typeof answer === "string" ? answer : ""}
              onChange={(e) =>
                updateQuestionAnswer(
                  participantIndex,
                  question.id,
                  e.target.value
                )
              }
              className="w-full h-12 px-3 rounded-lg border border-gray-6 bg-transparent text-gray-12 focus:outline-none focus:border-primary-10 focus:bg-gray-3 transition-colors font-family-dm-sans text-base placeholder:text-gray-11"
              placeholder="Digite um número"
            />
          </div>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return <Loading />;
  }

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
              <div className="h-auto w-1/3 relative shrink-0">
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
                  {groupedTickets.slice(0, 3).map((ticket, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between text-base text-gray-12"
                    >
                      <p className="font-semibold">
                        ({ticket.quantity}x) {ticket.distance ? `${ticket.distance} ` : ""}{ticket.raceName}:
                      </p>
                      <p className="font-bold">
                        {formatPrice(ticket.total)}
                      </p>
                    </div>
                  ))}
                  {groupedTickets.length > 3 && (
                    <button
                      onClick={() => setShowAllTicketsModal(true)}
                      className="text-base text-primary-11 font-semibold hover:text-primary-12 transition-colors text-left"
                    >
                      Ver mais {groupedTickets.length - 3} ingresso{groupedTickets.length - 3 > 1 ? "s" : ""}
                    </button>
                  )}
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
            ({ ticket, participantIndex, ticketId }, index) => {
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
              const ageLimitText = formatAgeLimit(ticket.ageLimit);

              return (
                <div
                  key={`${ticket.id}-${index}`}
                  className={`flex flex-col w-full rounded-lg border border-gray-6 ${!isExpanded ? "overflow-hidden" : ""
                    }`}
                >
                  <div
                    className={`flex items-start  justify-between w-full px-4 py-3 ${!isExpanded
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
                        className={`transition-all duration-300 ease-in-out ${!isExpanded
                          ? "max-h-[200px] opacity-100"
                          : "max-h-0 opacity-0"
                          }`}
                      >
                        <div
                          className={`flex items-start justify-between w-full relative ${participant.name ? "min-h-[100px]" : ""
                            }`}
                        >
                          <div className="flex flex-col gap-3">
                            <div className="flex flex-col">
                              <p className="text-sm font-medium text-gray-12">
                                {participant.name ||
                                  `Participante ${index + 1}`}
                              </p>
                              <p className="font-bold text-2xl text-gray-12 mb-2">
                                {ticket.name}
                              </p>
                            </div>
                            <div
                              className={`flex items-center gap-2 p-2 ${participant.name
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
                              className={`flex md:flex-row flex-col items-end md:items-center gap-2 transition-all duration-300 ease-in-out ${!isExpanded ? "opacity-100" : "opacity-0"
                                }`}
                            >
                              <div
                                className={`px-3 py-1 rounded-full text-sm font-medium transition-opacity duration-300 flex items-center justify-center ${isComplete
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
                                    ticketId
                                  );
                                }}
                                className="p-2 hidden md:block rounded-lg border border-red-6 hover:bg-red-1 transition-colors cursor-pointer"
                              >
                                <TrashIcon className="size-4 text-red-6 cursor-pointer" />
                              </button>
                            </div>
                            <h1 className="hidden md:block text-xl font-bold text-gray-12">
                              {formatPrice(getTicketPrice(ticket) + (event.serviceFee || 0))}
                            </h1>
                          </div>
                        </div>
                      </div>

                      {/* Conteúdo expandido */}
                      <div
                        className={`transition-all duration-300 ease-in-out ${isExpanded
                          ? "max-h-[2000px] opacity-100"
                          : "max-h-0 opacity-0 pointer-events-none"
                          }`}
                      >
                        <div className="flex items-start justify-between w-full relative z-10">
                          <div className="flex flex-col gap-2 pb-3">
                            <p className="text-sm text-gray-11">
                              Participante {index + 1}
                            </p>
                            <h1 className="text-lg font-bold">{ticket.name}</h1>
                            {ageLimitText && (
                              <div className="bg-yellow-3 text-yellow-12 rounded-full px-3 py-2 w-fit text-sm">
                                Limite de idade: {ageLimitText}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center h-full gap-2 relative z-20">
                            <div
                              className={`px-3 py-1 rounded-full text-sm font-medium transition-opacity duration-300 ${isComplete
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
                                  ticketId
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
                                  
                                  // Converter valores em inglês para português
                                  if (genderLower === "male" || genderLower === "masculino") {
                                    normalizedGender = "Masculino";
                                  } else if (genderLower === "female" || genderLower === "feminino") {
                                    normalizedGender = "Feminino";
                                  } else if (genderLower === "other" || genderLower === "outro") {
                                    normalizedGender = "Outro";
                                  } else if (genderLower === "prefiro-nao-dizer" || genderLower === "prefiro-nao-informar" || genderLower === "prefer not to say") {
                                    normalizedGender = "Prefiro não dizer";
                                  } else {
                                    // Se não for reconhecido, tentar mapear para o label correspondente
                                    const genderOption = sexoOptions.find(
                                      (opt) => opt.id.toLowerCase() === genderLower || opt.label.toLowerCase() === genderLower
                                    );
                                    normalizedGender = genderOption ? genderOption.label : normalizedGender;
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
                                      <span className="font-normal text-base leading-[1.3] text-gray-11 font-family-dm-sans truncate">
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
                          <p className="text-base font-normal text-gray-12 font-family-dm-sans leading-[1.3]">
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
                                className="text-sm font-normal text-gray-12 font-family-dm-sans cursor-pointer leading-[1.3]"
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
                                className="text-sm font-normal text-gray-12 font-family-dm-sans cursor-pointer leading-[1.3]"
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
                                <label className="text-base font-normal text-gray-12 font-family-dm-sans">
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
                                  className="w-full h-12 px-3 rounded-lg border border-gray-6 bg-transparent text-gray-12 focus:outline-none focus:border-primary-10 transition-colors font-family-dm-sans text-base placeholder:text-gray-11"
                                  placeholder="Nome do contato"
                                />
                              </div>
                              <div className="flex flex-col gap-2">
                                <label className="text-base font-normal text-gray-12 font-family-dm-sans">
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
                                  className="w-full h-12 px-3 rounded-lg border border-gray-6 bg-transparent text-gray-12 focus:outline-none focus:border-primary-10 transition-colors font-family-dm-sans text-base placeholder:text-gray-11"
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
                            {formatPrice(getTicketPrice(ticket))}
                          </h1>
                          <Button
                            onClick={() => {
                              // Marcar participante como salvo
                              setSavedParticipants((prev) => ({
                                ...prev,
                                [participantIndex]: true,
                              }));
                              // Fechar o participante
                              toggleParticipant(participantIndex);
                            }}
                            variant="default"
                            className="font-bold"
                            disabled={!isParticipantComplete(participantIndex)}
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
                  isParticipantComplete(participantIndex) && savedParticipants[participantIndex]
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
                isParticipantComplete(participantIndex) && savedParticipants[participantIndex]
              )
            }
          >
            Confirmar dados
          </Button>
        </div>
      </div>

      {/* Modal para mostrar todos os ingressos */}
      <AnimatePresence>
        {showAllTicketsModal && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/50 z-50"
              onClick={() => setShowAllTicketsModal(false)}
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
              <div className="bg-gray-1 rounded-xl border border-gray-6 w-full max-w-[600px] max-h-[90vh] flex flex-col shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-6">
                  <h2 className="text-xl font-bold text-gray-12">Todos os ingressos</h2>
                  <button
                    onClick={() => setShowAllTicketsModal(false)}
                    className="p-2 hover:bg-gray-3 rounded-lg transition-colors"
                  >
                    <X className="size-5 text-gray-11" />
                  </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                  <div className="flex flex-col gap-4">
                    {groupedTickets.map((ticket, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between text-base text-gray-12 pb-4 border-b border-gray-6 last:border-b-0 last:pb-0"
                      >
                        <p className="font-semibold">
                          ({ticket.quantity}x) {ticket.distance ? `${ticket.distance} ` : ""}{ticket.raceName}:
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
                    <div className="flex items-center justify-between text-xl font-bold text-gray-12 pt-4 border-t border-gray-6">
                      <p>Total:</p>
                      <p>{formatPrice(totalPrice + (event.serviceFee || 0))}</p>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-6">
                  <Button
                    onClick={() => setShowAllTicketsModal(false)}
                    className="w-full"
                  >
                    Fechar
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
