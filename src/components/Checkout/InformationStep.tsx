"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { ImageWithInitialFallback } from "@/components/ImageWithInitialFallback";
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
import { DatePickerWithConfirm } from "../DateOfBirthPicker/DatePickerWithConfirm";
import { Checkbox } from "../CheckBox";
import type { Question } from "@/interfaces/event";
import { eventService, userService } from "@/services";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { organizerService } from "@/services";
import { queryKeys } from "@/services/cache/QueryClient";
import { useDeleteParticipantModal } from "@/stores/modalStore";
import { useCheckoutTimer } from "@/contexts/CheckoutTimerContext";
import { useCheckoutReservation } from "@/hooks/useCheckoutReservation";
import { UserAutocomplete } from "../UserAutocomplete";
import type { LinkedUser } from "@/hooks/useLinkedUsers";
import toast from "react-hot-toast";
import { Loading } from "../Loading";
import { getCpfValidationMessage, isValidCPF } from "@/utils/cpf";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

interface InformationStepProps {
  event: Event;
  onNext: () => void;
  onBack: () => void;
  isSubmitting?: boolean;
  previewQuestions?: Question[];
  previewMode?: boolean;
}

interface ParticipantWithTicket {
  ticketId: string;
  ticket: Ticket;
  categoryName: string;
  participantIndex: number;
  isExpanded: boolean;
}

export function InformationStep({
  event,
  onNext,
  onBack,
  isSubmitting = false,
  previewQuestions,
  previewMode = false,
}: InformationStepProps) {
  const {
    raceQuantities,
    participants,
    updateParticipant,
    removeParticipant,
    updateRaceQuantity,
  } = useCheckout();

  const eventId = event?.id;
  const { clearTimer, orderId } = useCheckoutTimer();
  const { patchParticipants } = useCheckoutReservation();
  const queryClient = useQueryClient();

  // Buscar tickets e categorias do servidor
  const { tickets, loading: ticketsLoading } = useTickets(eventId, !!eventId);
  const { categories, loading: categoriesLoading } = useTicketCategories(eventId, !!eventId);

  const loading = ticketsLoading || categoriesLoading;
  const { openDeleteParticipantModal } = useDeleteParticipantModal();
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

  // Estado para rastrear quais participantes foram auto-preenchidos via seleção de usuário vinculado
  const [selectedLinkedUserIds, setSelectedLinkedUserIds] = useState<
    Record<number, string>
  >({});

  // Estado para rastrear quais participantes foram salvos clicando em "Salvar e próximo"
  const [savedParticipants, setSavedParticipants] = useState<
    Record<number, boolean>
  >({});

  // Snapshot dos dados do participante no momento em que foi salvo — usado para detectar mudanças
  const [savedSnapshots, setSavedSnapshots] = useState<
    Record<number, { participant: Record<string, string>; questionAnswers: Record<string, string | string[]> }>
  >({});

  // Erros de validação por participante e campo (ex: { 0: { name: "Informe nome e sobrenome", email: "Campo obrigatório" } })
  const [fieldErrors, setFieldErrors] = useState<
    Record<number, Record<string, string>>
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
            categoryName: category.name,
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
          categoryName: "",
          participantIndex: participantIndex++,
          isExpanded: false,
        });
      }
    });

    return result;
  }, [raceQuantities, categorizedTickets, uncategorizedTickets]);

  // Detecta remoção de todos os ingressos: cancela reserva no servidor e volta
  const hadParticipantsRef = useRef(false);
  const hasCancelledRef = useRef(false);

  useEffect(() => {
    if (participantsWithRaces.length > 0) hadParticipantsRef.current = true;
  }, [participantsWithRaces.length]);

  useEffect(() => {
    if (previewMode || loading || !hadParticipantsRef.current || hasCancelledRef.current) return;
    if (participantsWithRaces.length === 0) {
      hasCancelledRef.current = true;
      clearTimer();
      onBack();
    }
  }, [participantsWithRaces.length, loading, previewMode, clearTimer, onBack]);

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
      /** Nome da categoria (ingressos em grupo); vazio para avulsos. */
      categoryName: string;
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
            categoryName: category.name,
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
          categoryName: "",
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

  const toggleParticipant = (index: number) => {
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

    if (isCurrentlyExpanded && isParticipantComplete(index)) {
      const cleanCPF = (participant.cpf || "").replace(/\D/g, "");
      if (cleanCPF.length === 11 && !isValidCPF(participant.cpf || "")) {
        toast.error("CPF inválido");
        return;
      }
    }

    // Fechar/abrir o participante (sempre permite abrir, só valida ao fechar)
    setExpandedParticipants((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const clearParticipantFieldError = (participantIndex: number, field: string) => {
    setFieldErrors((prev) => {
      const participantErrors = prev[participantIndex];
      if (!participantErrors || !participantErrors[field]) return prev;
      const next = { ...participantErrors };
      delete next[field];
      return { ...prev, [participantIndex]: Object.keys(next).length ? next : {} };
    });
  };

  const handleInputChange = (
    index: number,
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    clearParticipantFieldError(index, name);
    updateParticipant(index, { [name]: value });
  };

  const handleCPFChange = async (index: number, value: string) => {
    clearParticipantFieldError(index, "cpf");
    const masked = maskCPF(value);
    updateParticipant(index, { cpf: masked });

    const clean = masked.replace(/\D/g, "");
    if (clean.length === 11 && isValidCPF(masked)) {
      try {
        const user = await userService.getUserByCpf(clean);
        if (user) {
          const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ");
          updateParticipant(index, {
            name: fullName,
            email: user.email || "",
            phone: user.phone ? maskPhone(user.phone) : "",
            birthDate: user.dateOfBirth || "",
            gender: user.gender || "",
          });
        }
      } catch {
        // silently ignore — não bloqueia o preenchimento manual
      }
    }
  };

  const handlePhoneChange = (
    index: number,
    field: "phone" | "emergencyPhone",
    value: string
  ) => {
    if (field === "phone") clearParticipantFieldError(index, "phone");
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

  // Mapa reativo: participantIndex → isDirty (recalculado sempre que participants/questionAnswers/snapshots mudarem)
  const participantDirtyMap = useMemo(() => {
    const map: Record<number, boolean> = {};
    Object.keys(savedSnapshots).forEach((key) => {
      const index = Number(key);
      const snapshot = savedSnapshots[index];
      if (!snapshot) {
        map[index] = true;
        return;
      }
      const p = participants[index];
      const sp = snapshot.participant;
      const fieldsDirty =
        (p?.name || "") !== sp.name ||
        (p?.cpf || "") !== sp.cpf ||
        (p?.email || "") !== sp.email ||
        (p?.birthDate || "") !== sp.birthDate ||
        (p?.phone || "") !== sp.phone ||
        (p?.gender || "") !== sp.gender;
      const currentQA = questionAnswers[index] || {};
      map[index] = fieldsDirty || JSON.stringify(currentQA) !== JSON.stringify(snapshot.questionAnswers);
    });
    return map;
  }, [savedSnapshots, participants, questionAnswers]);

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

    // Nome deve ter pelo menos 2 palavras (nome e sobrenome)
    const nameParts = name ? name.split(/\s+/).filter(Boolean) : [];
    const hasFullName = nameParts.length >= 2;

    const cpfOk =
      !!cpf &&
      getCpfValidationMessage(cpf) === null;

    const basicFieldsComplete = !!(
      name &&
      hasFullName &&
      cpfOk &&
      email &&
      birthDate &&
      phone &&
      gender
    );

    if (!basicFieldsComplete) return false;

    // Verificar se todas as perguntas obrigatórias foram respondidas
    const requiredQuestions = sortedQuestions.filter((q) => q.isRequired);
    const allRequiredQuestionsAnswered = requiredQuestions.every((question) => {
      const answer = getQuestionAnswer(index, question.id);
      if (Array.isArray(answer)) {
        return answer.length > 0;
      }
      return typeof answer === "string" && answer.trim() !== "";
    });

    return allRequiredQuestionsAnswered;
  };

  // Retorna erros de validação por campo para um participante (para exibir no formulário)
  const getParticipantValidationErrors = (
    index: number,
    ageLimit?: { min?: number; max?: number }
  ): Record<string, string> => {
    const participant = participants[index];
    const errors: Record<string, string> = {};
    if (!participant) return errors;

    const name = participant.name?.trim();
    const cpf = participant.cpf?.trim();
    const email = participant.email?.trim();
    const birthDate = participant.birthDate?.trim();
    const phone = participant.phone?.trim();
    const gender = participant.gender?.trim();

    if (!name) {
      errors.name = "Nome completo é obrigatório";
    } else {
      const nameParts = name.split(/\s+/).filter(Boolean);
      if (nameParts.length < 2) {
        errors.name = "Informe nome completo";
      }
    }

    if (!email) {
      errors.email = "Email é obrigatório";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = "Informe um email válido";
    }

    const cpfMsg = getCpfValidationMessage(cpf);
    if (cpfMsg) {
      errors.cpf = cpfMsg;
    }

    if (!birthDate) {
      errors.birthDate = "Data de nascimento é obrigatória";
    } else if (ageLimit && (ageLimit.min || ageLimit.max)) {
      const referenceDate = event?.eventDate ? new Date(event.eventDate) : new Date();
      const birth = new Date(birthDate);
      const age = Math.floor(
        (referenceDate.getTime() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
      );
      if (ageLimit.min && age < ageLimit.min) {
        errors.birthDate = `Idade mínima para este ingresso é ${ageLimit.min} anos`;
      } else if (ageLimit.max && age > ageLimit.max) {
        errors.birthDate = `Idade máxima para este ingresso é ${ageLimit.max} anos`;
      }
    }

    if (!phone) {
      errors.phone = "Telefone é obrigatório";
    } else if ((phone || "").replace(/\D/g, "").length < 10) {
      errors.phone = "Informe um telefone válido";
    }

    if (!gender) {
      errors.gender = "Selecione o sexo";
    }

    // Perguntas obrigatórias
    const requiredQuestions = sortedQuestions.filter((q) => q.isRequired);
    requiredQuestions.forEach((question) => {
      const answer = getQuestionAnswer(index, question.id);
      const isEmpty = Array.isArray(answer)
        ? answer.length === 0
        : typeof answer !== "string" || answer.trim() === "";
      if (isEmpty) {
        errors[`question_${question.id}`] = "Campo obrigatório";
      }
    });

    return errors;
  };

  const handleDeleteParticipant = (
    participantIndex: number,
    ticketId: string
  ) => {
    openDeleteParticipantModal({
      participantIndex,
      raceId: ticketId,
      onConfirm: () => {
        const currentQuantity = raceQuantities[ticketId] || 0;
        const newQuantity = Math.max(0, currentQuantity - 1);

        // Atualiza estado local imediatamente
        removeParticipant(participantIndex);

        setSavedParticipants((prev) => {
          const updated = { ...prev };
          delete updated[participantIndex];
          return updated;
        });
        setFieldErrors((prev) => {
          const updated = { ...prev };
          delete updated[participantIndex];
          return updated;
        });

        updateRaceQuantity(ticketId, newQuantity);

        // Devolve a vaga reservada no servidor via PATCH /participants
        if (orderId) {
          const mapGender = (value?: string) => {
            if (!value) return undefined;
            const v = value.toLowerCase();
            if (v.startsWith("m")) return "MALE" as const;
            if (v.startsWith("f")) return "FEMALE" as const;
            if (v.includes("prefere") || v.includes("prefer")) return "PREFER_NOT_TO_SAY" as const;
            return "OTHER" as const;
          };

          const remaining = participants.filter((_, i) => i !== participantIndex);

          const payload = {
            participants: remaining.map((p) => {
              const mapped: {
                name: string; cpf: string; email: string;
                birthDate: string; phone: string;
                gender?: "MALE" | "FEMALE" | "OTHER" | "PREFER_NOT_TO_SAY";
                emergencyContactName?: string; emergencyPhone?: string;
                hasEmergencyContact?: boolean;
                questionAnswers?: Array<{ questionId: string; answer: string | boolean | number }>;
              } = {
                name: p.name,
                cpf: p.cpf.replace(/\D/g, ""),
                email: p.email,
                birthDate: p.birthDate,
                phone: p.phone?.replace(/\D/g, "") || "",
              };
              const gender = mapGender(p.gender);
              if (gender) mapped.gender = gender;
              if (p.emergencyContactName?.trim()) mapped.emergencyContactName = p.emergencyContactName.trim();
              if (p.emergencyPhone?.trim()) mapped.emergencyPhone = p.emergencyPhone.replace(/\D/g, "");
              if (p.hasEmergencyContact) mapped.hasEmergencyContact = true;
              if (p.questionAnswers && Object.keys(p.questionAnswers).length > 0) {
                mapped.questionAnswers = Object.entries(p.questionAnswers).map(
                  ([questionId, answer]) => ({
                    questionId,
                    answer: Array.isArray(answer) ? JSON.stringify(answer) : (answer as string | boolean | number),
                  }),
                );
              }
              return mapped;
            }),
          };

          patchParticipants(orderId, payload).catch(() => {
            toast.error("Erro ao devolver a vaga. Tente novamente.");
          });
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

  const previewQuestionList = previewQuestions;
  const usePreviewQuestionList = previewQuestionList !== undefined;

  const { data: questionsFromApi = [] } = useQuery<Question[]>({
    queryKey: queryKeys.events.questions(eventId || ""),
    queryFn: async () => {
      if (!eventId) return [];
      try {
        const loadedQuestions = await organizerService.getQuestions(eventId);
        return loadedQuestions
      } catch (error) {
        console.error("Error loading questions:", error);
        return [];
      }
    },
    enabled: !!eventId && !usePreviewQuestionList,
  });

  const questionsSource = usePreviewQuestionList
    ? previewQuestionList
    : questionsFromApi;

  // Ordenar perguntas por ordem
  const sortedQuestions = useMemo(() => {
    if (!questionsSource || questionsSource.length === 0) return [];
    return [...questionsSource].sort(
      (a, b) => (a.order || 0) - (b.order || 0),
    );
  }, [questionsSource]);


  const updateQuestionAnswer = (
    participantIndex: number,
    questionId: string,
    answer: string | string[]
  ) => {
    isUpdatingFromContextRef.current = true;

    // Calcular novo estado fora do updater
    const newAnswers = {
      ...questionAnswers[participantIndex],
      [questionId]: answer,
    };

    // Atualizar estado local
    setQuestionAnswers((prev) => ({
      ...prev,
      [participantIndex]: newAnswers,
    }));

    // Salvar no contexto (fora do updater para evitar erro de setState durante render)
    updateParticipant(participantIndex, {
      questionAnswers: newAnswers,
    });
  };

  // Obter resposta de pergunta
  const getQuestionAnswer = (
    participantIndex: number,
    questionId: string
  ): string | string[] => {
    const v = questionAnswers[participantIndex]?.[questionId];
    if (v === undefined || v === null) return "";
    return v;
  };

  // Renderizar campo de pergunta baseado no tipo
  const renderQuestionField = (
    question: Question,
    participantIndex: number
  ) => {
    const answer = getQuestionAnswer(participantIndex, question.id);
    const isRequired = question.isRequired;

    switch (question.type) {
      case "text": {
        const questionError = fieldErrors[participantIndex]?.[`question_${question.id}`];
        return (
          <div className="flex flex-col gap-2">
            <label className="text-base font-normal text-gray-12 font-family-dm-sans">
              {question.question}
              {isRequired && <span className="text-red-9 ml-1">*</span>}
            </label>
            {question.description && (
              <label className="text-sm font-normal text-gray-11 font-family-dm-sans mb-2 -mt-2">
                {question.description ?? ""}
              </label>
            )}
            <input
              type="text"
              value={typeof answer === "string" ? answer : ""}
              onChange={(e) => {
                clearParticipantFieldError(participantIndex, `question_${question.id}`);
                updateQuestionAnswer(participantIndex, question.id, e.target.value);
              }}
              className={`w-full h-12 px-3 rounded-lg border bg-transparent text-gray-12 focus:outline-none focus:bg-gray-3 transition-colors font-family-dm-sans text-base placeholder:text-gray-11 ${questionError ? "border-red-6 focus:border-red-10" : "border-gray-6 focus:border-primary-10"}`}
              placeholder="Digite sua resposta"
            />
            {questionError && <p className="text-sm text-red-11">{questionError}</p>}
          </div>
        );
      }

      case "select": {
        const questionError = fieldErrors[participantIndex]?.[`question_${question.id}`];
        const selectedOptions: string[] = Array.isArray(answer)
          ? answer
          : typeof answer === "string" && answer.trim()
            ? [answer]
            : [];
        return (
          <div className="flex flex-col gap-2">
            <label className="text-base font-normal text-gray-12 font-family-dm-sans">
              {question.question}
              {isRequired && <span className="text-red-9 ml-1">*</span>}
            </label>
            {question.description && (
              <label className="text-sm font-normal text-gray-11 font-family-dm-sans mb-2 -mt-2">
                {question.description ?? ""}
              </label>
            )}
            <div className="flex flex-col gap-3">
              {question.options?.map((option) => {
                const isSelected = selectedOptions.includes(option);
                return (
                  <label
                    key={option}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(checked) => {
                        clearParticipantFieldError(participantIndex, `question_${question.id}`);
                        const next = checked
                          ? [...selectedOptions, option]
                          : selectedOptions.filter((o) => o !== option);
                        updateQuestionAnswer(participantIndex, question.id, next);
                      }}
                    />
                    <span className="text-sm text-gray-12 font-family-dm-sans">
                      {option}
                    </span>
                  </label>
                );
              })}
            </div>
            {questionError && <p className="text-sm text-red-11">{questionError}</p>}
          </div>
        );
      }

      case "multiple_choice": {
        const questionError = fieldErrors[participantIndex]?.[`question_${question.id}`];
        return (
          <div className="flex flex-col gap-2">
            <label className="text-base font-normal text-gray-12 font-family-dm-sans">
              {question.question}
              {isRequired && <span className="text-red-9 ml-1">*</span>}
            </label>
            {question.description && (
              <label className="text-sm font-normal text-gray-11 font-family-dm-sans mb-2 -mt-2">
                {question.description ?? ""}
              </label>
            )}
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
                      onChange={() => {
                        clearParticipantFieldError(participantIndex, `question_${question.id}`);
                        updateQuestionAnswer(participantIndex, question.id, option);
                      }}
                      className="sr-only"
                    />
                    <span className="text-sm text-gray-12 font-family-dm-sans">
                      {option}
                    </span>
                  </label>
                );
              })}
            </div>
            {questionError && <p className="text-sm text-red-11">{questionError}</p>}
          </div>
        );
      }

      case "true_false": {
        const questionError = fieldErrors[participantIndex]?.[`question_${question.id}`];
        const trueFalseOptions = ["Verdadeiro", "Falso"];
        return (
          <div className="flex flex-col gap-2">
            <label className="text-base font-normal text-gray-12 font-family-dm-sans">
              {question.question}
              {isRequired && <span className="text-red-9 ml-1">*</span>}
            </label>
            {question.description && (
              <label className="text-sm font-normal text-gray-11 font-family-dm-sans mb-2 -mt-2">
                {question.description ?? ""}
              </label>
            )}
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
                      onCheckedChange={(checked) => {
                        clearParticipantFieldError(participantIndex, `question_${question.id}`);
                        updateQuestionAnswer(participantIndex, question.id, checked ? option : "");
                      }}
                    />
                    <span className="text-sm text-gray-12 font-family-dm-sans">
                      {option}
                    </span>
                  </label>
                );
              })}
            </div>
            {questionError && <p className="text-sm text-red-11">{questionError}</p>}
          </div>
        );
      }

      case "number": {
        const questionError = fieldErrors[participantIndex]?.[`question_${question.id}`];
        return (
          <div className="flex flex-col gap-2">
            <label className="text-base font-normal text-gray-12 font-family-dm-sans">
              {question.question}
              {isRequired && <span className="text-red-9 ml-1">*</span>}
            </label>
            {question.description && (
              <label className="text-sm font-normal text-gray-11 font-family-dm-sans mb-2 -mt-2">
                {question.description ?? ""}
              </label>
            )}
            <input
              type="number"
              value={typeof answer === "string" ? answer : ""}
              onChange={(e) => {
                clearParticipantFieldError(participantIndex, `question_${question.id}`);
                updateQuestionAnswer(participantIndex, question.id, e.target.value);
              }}
              className={`w-full h-12 px-3 rounded-lg border bg-transparent text-gray-12 focus:outline-none focus:bg-gray-3 transition-colors font-family-dm-sans text-base placeholder:text-gray-11 ${questionError ? "border-red-6 focus:border-red-10" : "border-gray-6 focus:border-primary-10"}`}
              placeholder="Digite um número"
            />
            {questionError && <p className="text-sm text-red-11">{questionError}</p>}
          </div>
        );
      }

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
          {!previewMode && (
            <div className="w-full">
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
          )}

          <div className="w-full">
            <div className="hidden md:flex gap-2 items-stretch rounded-xl overflow-hidden bg-gray-2 shadow-[0_5px_10px_rgba(0,0,0,0.3)] mb-10">
              <div className="h-auto w-1/3 relative shrink-0 min-h-[200px]">
                <ImageWithInitialFallback
                  src={event.bannerUrl}
                  alt={event.name}
                  name={event.name}
                  fallbackId={event.id}
                  fill
                  sizes="(max-width: 768px) 33vw, 320px"
                  className="size-full rounded-tr-xl rounded-br-xl border-transparent border-0"
                  letterClassName="text-5xl"
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
                <div className="flex flex-col gap-2 pb-6">
                  {groupedTickets.slice(0, 3).map((ticket, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between text-base text-gray-12"
                    >
                      <div className="flex flex-col">
                        <p className="text-gray-11 text-xs truncate"> {ticket.categoryName ? (
                          ticket.categoryName
                        ) : "Ingresso Avulso"}</p>
                        <p className="font-semibold text-gray-12 text-base truncate">
                          ({ticket.quantity}x){" "}
                          {ticket.raceName ? `${ticket.raceName} ` : ""}
                        </p>
                      </div>
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
            ({ ticket, categoryName, participantIndex, ticketId }, index) => {
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
              const isComplete = !!savedParticipants[participantIndex] && !participantDirtyMap[participantIndex];
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
                              <p className="text-sm text-gray-11 font-family-dm-sans mt-2">
                                {categoryName.trim() || "Ingresso avulso"}
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
                                type="button"
                                title="Editar"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleParticipant(participantIndex);
                                }}
                                className="p-2 rounded-lg border border-gray-6 hover:bg-gray-2 transition-colors cursor-pointer"
                              >
                                <PencilIcon className="size-4 text-gray-12 cursor-pointer" />
                              </button>
                              <button
                                type="button"
                                title="Deletar"
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
                            <div>
                              <p className="text-sm text-gray-11 font-family-dm-sans">
                                {categoryName.trim() || "Ingresso avulso"}
                              </p>
                              <h1 className="text-lg font-bold">{ticket.name}</h1>
                            </div>
                            {ageLimitText && (
                              <div className="bg-yellow-3 text-yellow-12 rounded-full px-3 py-2 w-fit text-xs">
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
                              title="Editar"
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
                              title="Deletar"
                            >
                              <TrashIcon className="size-4 text-red-6 cursor-pointer pointer-events-none" />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mg:gap-4 mt-4">
                          <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium text-gray-12">
                              Nome completo
                            </label>
                            <UserAutocomplete
                              value={participant.name}
                              disabled={previewMode}
                              onChange={(value) => {
                                clearParticipantFieldError(participantIndex, "name");
                                updateParticipant(participantIndex, { name: value });
                              }}
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
                              placeholder="Digite nome completo ou selecione um usuário"
                              className={`w-full ${fieldErrors[participantIndex]?.name ? "border-red-6 rounded-lg" : ""}`}
                            />
                            {fieldErrors[participantIndex]?.name && (
                              <p className="text-sm text-red-11">{fieldErrors[participantIndex].name}</p>
                            )}
                          </div>
                          <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium text-gray-12">
                              Email
                            </label>
                            <input
                              type="email"
                              name="email"
                              value={participant.email}
                              disabled={previewMode}
                              onChange={(e) =>
                                handleInputChange(participantIndex, e)
                              }
                              className={`w-full px-4 py-3 rounded-lg border bg-gray-2 text-gray-12 focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${fieldErrors[participantIndex]?.email ? "border-red-6 focus:border-red-10" : "border-gray-6 focus:border-primary-10"}`}
                              placeholder="Digite seu email"
                            />
                            {fieldErrors[participantIndex]?.email && (
                              <p className="text-sm text-red-11">{fieldErrors[participantIndex].email}</p>
                            )}
                          </div>
                          <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium text-gray-12">
                              CPF
                            </label>
                            <input
                              type="text"
                              name="cpf"
                              value={participant.cpf}
                              disabled={previewMode}
                              onChange={(e) =>
                                handleCPFChange(
                                  participantIndex,
                                  e.target.value
                                )
                              }
                              maxLength={14}
                              className={`w-full px-4 py-3 rounded-lg border bg-gray-2 text-gray-12 focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${fieldErrors[participantIndex]?.cpf ? "border-red-6 focus:border-red-10" : "border-gray-6 focus:border-primary-10"}`}
                              placeholder="000.000.000-00"
                            />
                            {fieldErrors[participantIndex]?.cpf && (
                              <p className="text-sm text-red-11">{fieldErrors[participantIndex].cpf}</p>
                            )}
                          </div>
                          <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium text-gray-12">
                              Data de nascimento
                            </label>
                            <div className={previewMode ? "opacity-50 pointer-events-none" : ""}>
                              <DatePickerWithConfirm
                                value={participant.birthDate || null}
                                onChange={(date) => {
                                  clearParticipantFieldError(participantIndex, "birthDate");
                                  const birthDate = date
                                    ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
                                    : "";
                                  updateParticipant(participantIndex, { birthDate });
                                }}
                                error={!!fieldErrors[participantIndex]?.birthDate}
                              />
                            </div>
                            {fieldErrors[participantIndex]?.birthDate && (
                              <p className="text-sm text-red-11">{fieldErrors[participantIndex].birthDate}</p>
                            )}
                          </div>
                          <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium text-gray-12">
                              Telefone
                            </label>
                            <input
                              type="tel"
                              name="phone"
                              value={participant.phone}
                              disabled={previewMode}
                              onChange={(e) =>
                                handlePhoneChange(
                                  participantIndex,
                                  "phone",
                                  e.target.value
                                )
                              }
                              maxLength={15}
                              className={`w-full px-4 py-3 rounded-lg border bg-gray-2 text-gray-12 focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${fieldErrors[participantIndex]?.phone ? "border-red-6 focus:border-red-10" : "border-gray-6 focus:border-primary-10"}`}
                              placeholder="(00) 99999-9999"
                            />
                            {fieldErrors[participantIndex]?.phone && (
                              <p className="text-sm text-red-11">{fieldErrors[participantIndex].phone}</p>
                            )}
                          </div>
                          <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium text-gray-12">
                              Sexo
                            </label>
                            <div className={`w-full ${previewMode ? "opacity-50 pointer-events-none" : ""}`}>
                              <Dropdown
                                width="w-full"
                                className="z-60"
                                trigger={(open: boolean) => (
                                  <div className={`rounded-lg h-12 flex items-center justify-between px-3 w-full hover:bg-gray-3 transition-colors cursor-pointer border ${fieldErrors[participantIndex]?.gender ? "border-red-6" : "border-gray-6"}`}>
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
                                onSelect={(option) => {
                                  clearParticipantFieldError(participantIndex, "gender");
                                  updateParticipant(participantIndex, {
                                    gender: option.label,
                                  });
                                }}
                              />
                            </div>
                            {fieldErrors[participantIndex]?.gender && (
                              <p className="text-sm text-red-11">{fieldErrors[participantIndex].gender}</p>
                            )}
                          </div>
                        </div>

                        {/* Seção de Contato de Emergência */}
                        <div className={`flex flex-col gap-3 mt-4 w-full ${previewMode ? "opacity-50 pointer-events-none" : ""}`}>
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
                            onClick={async () => {
                              const errors = getParticipantValidationErrors(participantIndex, ticket.ageLimit);
                              if (Object.keys(errors).length > 0) {
                                setFieldErrors((prev) => ({ ...prev, [participantIndex]: errors }));
                                setExpandedParticipants((prev) => ({ ...prev, [participantIndex]: true }));
                                toast.error("Preencha todos os campos obrigatórios corretamente.");
                                return;
                              }
                              setFieldErrors((prev) => {
                                const next = { ...prev };
                                delete next[participantIndex];
                                return next;
                              });
                              const p = participants[participantIndex];
                              setSavedSnapshots((prev) => ({
                                ...prev,
                                [participantIndex]: {
                                  participant: {
                                    name: p?.name || "",
                                    cpf: p?.cpf || "",
                                    email: p?.email || "",
                                    birthDate: p?.birthDate || "",
                                    phone: p?.phone || "",
                                    gender: p?.gender || "",
                                  },
                                  questionAnswers: { ...(questionAnswers[participantIndex] || {}) },
                                },
                              }));
                              setSavedParticipants((prev) => ({ ...prev, [participantIndex]: true }));
                              toggleParticipant(participantIndex);

                              // Salvar como linked-user em background e atualizar lista
                              if (p?.cpf && p?.name) {
                                const nameParts = (p.name || "").trim().split(/\s+/);
                                const firstName = nameParts[0] || "";
                                const lastName = nameParts.slice(1).join(" ") || "";
                                userService.createOrLinkUser({
                                  firstName,
                                  lastName,
                                  email: p.email || "",
                                  documentNumber: (p.cpf || "").replace(/\D/g, ""),
                                  phone: (p.phone || "").replace(/\D/g, ""),
                                  dateOfBirth: p.birthDate || "",
                                  gender: p.gender || "",
                                }).then(() => {
                                  queryClient.invalidateQueries({ queryKey: ["linked-users"] });
                                }).catch(() => {});
                              }
                            }}
                            disabled={savedParticipants[participantIndex] && !participantDirtyMap[participantIndex] || previewMode}
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
              onClick={() => {
                if (participantsWithRaces.length === 0) return;
                const allErrors: Record<number, Record<string, string>> = {};
                let firstInvalidIndex: number | null = null;
                participantsWithRaces.forEach(({ participantIndex }) => {
                  const errors = getParticipantValidationErrors(participantIndex);
                  if (Object.keys(errors).length > 0) {
                    allErrors[participantIndex] = errors;
                    if (firstInvalidIndex === null) firstInvalidIndex = participantIndex;
                  }
                });
                if (Object.keys(allErrors).length > 0) {
                  setFieldErrors(allErrors);
                  if (firstInvalidIndex !== null) {
                    setExpandedParticipants((prev) => ({ ...prev, [firstInvalidIndex!]: true }));
                  }
                  toast.error("Preencha todos os campos obrigatórios de todos os participantes.");
                  return;
                }
                if (!participantsWithRaces.every(({ participantIndex }) => savedParticipants[participantIndex])) {
                  toast.error("Clique em \"Salvar e próximo\" em cada participante antes de confirmar.");
                  return;
                }
                onNext();
              }}
              disabled={previewMode || isSubmitting}
              isLoading={isSubmitting}
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
                ({ticket.quantity}x){" "}
                {ticket.categoryName ? (
                  <span className="text-gray-11">{ticket.categoryName} · </span>
                ) : null}
                {ticket.distance ? `${ticket.distance} ` : ""}
                {ticket.raceName}:{" "}
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
            onClick={() => {
              if (participantsWithRaces.length === 0) return;
              const allErrors: Record<number, Record<string, string>> = {};
              let firstInvalidIndex: number | null = null;
              participantsWithRaces.forEach(({ participantIndex }) => {
                const errors = getParticipantValidationErrors(participantIndex);
                if (Object.keys(errors).length > 0) {
                  allErrors[participantIndex] = errors;
                  if (firstInvalidIndex === null) firstInvalidIndex = participantIndex;
                }
              });
              if (Object.keys(allErrors).length > 0) {
                setFieldErrors(allErrors);
                if (firstInvalidIndex !== null) {
                  setExpandedParticipants((prev) => ({ ...prev, [firstInvalidIndex!]: true }));
                }
                toast.error("Preencha todos os campos obrigatórios de todos os participantes.");
                return;
              }
              if (!participantsWithRaces.every(({ participantIndex }) => savedParticipants[participantIndex])) {
                toast.error("Clique em \"Salvar e próximo\" em cada participante antes de confirmar.");
                return;
              }
              onNext();
            }}
            isLoading={isSubmitting}
            disabled={isSubmitting}
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
                          ({ticket.quantity}x){" "}
                          {ticket.categoryName ? (
                            <span className="text-gray-11">{ticket.categoryName} · </span>
                          ) : null}
                          {ticket.distance ? `${ticket.distance} ` : ""}
                          {ticket.raceName}:
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
