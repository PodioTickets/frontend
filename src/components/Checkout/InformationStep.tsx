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
import {
  orderTotalForPrePaymentCents,
  ticketUnitPriceForPrePaymentCents,
} from "@/lib/orderAutoCouponDisplay";
import { queryKeys } from "@/services/cache/QueryClient";
import { useDeleteParticipantModal } from "@/stores/modalStore";
import { useCheckoutTimer } from "@/contexts/CheckoutTimerContext";
import { useCheckoutReservation } from "@/hooks/useCheckoutReservation";
import { UserAutocomplete } from "../UserAutocomplete";
import { MobileSummaryBar } from "./MobileSummaryBar";
import type { LinkedUser } from "@/hooks/useLinkedUsers";
import toast from "react-hot-toast";
import { Loading } from "../Loading";
import { getCpfValidationMessage, isValidCPF } from "@/utils/cpf";
import { isBrazilianCountry } from "@/validators/Auth.validator";
import { COUNTRIES_PT_BR } from "@/data/countries";
import { FlagIcon } from "../Icons/FlagIcon";
import {
  formatPhoneForCountry,
  getPhonePlaceholderForCountry,
  getPhoneMaxLengthForCountry,
  getPhoneDigitsForBackend,
  isPhoneValidForCountry,
} from "@/utils/phone";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X } from "lucide-react";
import { isAutoCoupon } from "@/lib/orderAutoCouponDisplay";
import { formatCouponLineLabel } from "@/lib/orderCouponDiscount";
import { useAuth } from "@/hooks/useAuth";

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

/**
 * Dropdown de nacionalidade pra o card de participante.
 * Mesma UX do dropdown usado no RegisterModal / /user/page.tsx — busca client-side
 * com normalização de acentos. Encapsulado aqui pra evitar duplicação dos handlers
 * de outside-click e estado em cada card.
 */
function NationalitySelect({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (country: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const options = useMemo(
    () =>
      COUNTRIES_PT_BR.map((name) => ({
        id: name
          .toLowerCase()
          .normalize("NFD")
          .replace(/\p{Diacritic}/gu, "")
          .replace(/\s+/g, "-"),
        label: name,
      })),
    [],
  );

  const normalize = (s: string) =>
    s.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");

  const filtered = useMemo(() => {
    if (!search.trim()) return options;
    const q = normalize(search);
    return options.filter((opt) => normalize(opt.label).includes(q));
  }, [options, search]);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      const el = ref.current;
      if (el && !el.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div className="w-full relative" ref={ref}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          setOpen((v) => !v);
          if (!open) setSearch("");
        }}
        className="border border-gray-6 rounded-lg h-12 flex items-center justify-between px-3 w-full hover:bg-gray-3 transition-colors cursor-pointer text-left disabled:opacity-50 disabled:cursor-not-allowed bg-gray-2"
      >
        <div className="flex gap-1 items-center flex-1 min-w-0">
          <FlagIcon className="w-5 h-5 text-gray-11 shrink-0" />
          <span
            className={`font-normal text-base leading-[1.3] font-family-dm-sans truncate ${value ? "text-gray-12" : "text-gray-11"}`}
          >
            {value || "Selecione"}
          </span>
        </div>
        <div className="flex-none -scale-y-100 shrink-0">
          <ArrowButton isOpen={open} />
        </div>
      </button>
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 z-60 bg-gray-1 border border-gray-6 rounded-lg shadow-lg overflow-hidden">
          <div className="p-2 border-b border-gray-6">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-11" />
              <input
                type="text"
                placeholder="Pesquisar país"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onMouseDown={(e) => e.stopPropagation()}
                className="w-full h-9 pl-8 pr-3 rounded-md border border-gray-6 bg-gray-2 text-sm font-family-dm-sans text-gray-12 placeholder:text-gray-10 focus:outline-none focus:ring-2 focus:ring-primary-8 focus:border-transparent"
              />
            </div>
          </div>
          <div className="max-h-[220px] overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-gray-6 [&::-webkit-scrollbar-thumb]:rounded-full">
            {filtered.length === 0 ? (
              <div className="px-3 py-4 text-sm text-gray-11 font-family-dm-sans text-center">
                Nenhum país encontrado
              </div>
            ) : (
              filtered.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => {
                    onChange(option.label);
                    setOpen(false);
                    setSearch("");
                  }}
                  className="w-full px-3 py-2.5 text-left text-sm font-family-dm-sans text-gray-12 hover:bg-gray-3 transition-colors"
                >
                  {option.label}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
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
  const { clearTimer, orderId, currentOrder: timerCurrentOrder } = useCheckoutTimer();
  const { patchParticipants, getOrder } = useCheckoutReservation();
  const queryClient = useQueryClient();
  const { user: authUser } = useAuth();

  /**
   * Nacionalidade default pra novos participantes — herda do `country` do user
   * logado (JWT profile, ver memory: project_document_internationalization).
   * "Brasil" como fallback quando o user não tem country no payload.
   */
  const userDefaultNationality = authUser?.country?.trim() || "Brasil";

  // Buscar tickets e categorias do servidor
  const { tickets, loading: ticketsLoading } = useTickets(eventId, !!eventId, false, true);
  const { categories, loading: categoriesLoading } = useTicketCategories(eventId, !!eventId);

  const loading = ticketsLoading || categoriesLoading;
  const { openDeleteParticipantModal } = useDeleteParticipantModal();
  const [expandedParticipants, setExpandedParticipants] = useState<
    Record<number, boolean>
  >({
    0: true,
  });

  const [showAllTicketsModal, setShowAllTicketsModal] = useState(false);

  // Limpa timers de debounce do lookup de documento ao desmontar — evita
  // chamadas async tentando atualizar state depois do unmount.
  useEffect(() => {
    return () => {
      Object.values(docLookupTimersRef.current).forEach(clearTimeout);
      docLookupTimersRef.current = {};
    };
  }, []);

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

  /* Hidrata nacionalidade quando o `authUser` chega DEPOIS do mount inicial.
   * Cenário: primeiro render tem `authUser=null` (useAuth async) → useEffect
   * de criação de participantes (mais abaixo) usa "Brasil" como default →
   * quando o profile chega com `country: "Estados Unidos"`, esse effect
   * sobrescreve participantes que ainda têm a default e não foram salvos.
   * Roda apenas uma vez (ref) — depois disso, alterações de nacionalidade
   * são exclusivas do usuário. */
  const nationalityHydrationRef = useRef(false);
  useEffect(() => {
    if (nationalityHydrationRef.current) return;
    const country = authUser?.country?.trim();
    if (!country || country === "Brasil") return;
    if (participants.length === 0) return;

    participants.forEach((p, i) => {
      if (!p) return;
      if (savedParticipants[i]) return;
      const current = (p.nationality || "").trim();
      if (current && current !== "Brasil") return;
      updateParticipant(i, { nationality: country });
    });
    nationalityHydrationRef.current = true;
  }, [authUser?.country, participants, savedParticipants, updateParticipant]);

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
              return !isNaN(price) && price >= 0;
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
        return !isNaN(price) && price >= 0;
      } catch {
        return false;
      }
    });

    return {
      categorizedTickets: categorized,
      uncategorizedTickets: validUncategorized,
    };
  }, [tickets, categories]);

  // ---- Order autoritativa (backend) ---------------------------------------
  // Mesmo princípio aplicado no SubscriptionStep: preço/taxa/total exibidos
  // vêm da reserva criada pelo backend. Cálculo local fica só como fallback
  // enquanto a query carrega — evita divergir do que o usuário pagará.
  const { data: orderData } = useQuery({
    queryKey: ["checkout-order", orderId],
    queryFn: async () => (orderId ? getOrder(orderId) : null),
    enabled: !!orderId,
    // Checkout exige 100% server-driven: nada de cache.
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
  });

  const orderTicketPriceById = useMemo(() => {
    const m = new Map<string, number>();
    orderData?.tickets.forEach((t) => {
      // Pré-pagamento: ignora cupons automáticos (QUANTITY/AGE) — o desconto
      // só deve aparecer no resumo da PaymentStep.
      const cents = ticketUnitPriceForPrePaymentCents(t, orderData?.coupon);
      m.set(t.ticketId, cents / 100);
    });
    return m;
  }, [orderData]);

  const getTicketPrice = (ticket: Ticket): number => {
    const fromOrder = orderTicketPriceById.get(ticket.id);
    if (typeof fromOrder === "number") return fromOrder;
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
          nationality: userDefaultNationality,
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

  // Taxa de serviço — autoritativa da order. Fallback ao cálculo local
  // (% do evento sobre tickets) só enquanto a query carrega.
  const serviceFee = useMemo(() => {
    if (orderData?.pricing) return orderData.pricing.serviceFee / 100;
    return totalPrice * ((event.participantFeePercent ?? 0) / 100);
  }, [orderData, totalPrice, event.participantFeePercent]);

  // Total a exibir — `pricing.total` (= `finalAmount`) já considera
  // tickets + serviceFee + descontos aplicados. Pré-pagamento adicionamos de
  // volta o desconto de cupom automático pra não confundir o usuário.
  const totalAmount = useMemo(() => {
    const preCouponCents = orderTotalForPrePaymentCents(
      orderData?.pricing,
      orderData?.coupon,
    );
    if (preCouponCents != null) return preCouponCents / 100;
    return totalPrice + serviceFee;
  }, [orderData, totalPrice, serviceFee]);

  // Cupom aplicado (badge + linha de desconto). Cupons automáticos
  // (QUANTITY/AGE) ficam escondidos pré-pagamento — o resumo só revela o
  // valor lá. Pra DISCOUNT manual (incluindo o vindo de link `?coupon=`),
  // mostramos imediatamente pra dar feedback ao usuário.
  //
  // Prioriza `currentOrder` do CheckoutTimerContext: ele é populado pela
  // response do `patchCoupon` (que garante `applyToProducts`). O GET /orders
  // pode omitir esse campo em algumas versões do backend.
  const appliedCoupon = timerCurrentOrder?.coupon ?? orderData?.coupon ?? null;
  const showCouponDiscount = !!appliedCoupon && !isAutoCoupon(appliedCoupon);
  const couponDiscountAmount = useMemo(() => {
    if (!showCouponDiscount) return 0;
    return (orderData?.pricing?.couponDiscount ?? 0) / 100;
  }, [orderData, showCouponDiscount]);

  // Agrupa ingressos para exibição
  const groupedTickets = useMemo(() => {
    const grouped: Array<{
      quantity: number;
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
        nationality: userDefaultNationality,
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
        nationality: userDefaultNationality,
        emergencyPhone: "",
        emergencyContactName: "",
        hasEmergencyContact: false,
      };
    }

    // Verificar se está tentando fechar (participante já está expandido)
    const isCurrentlyExpanded = expandedParticipants[index];

    /* Estrangeiros (passaporte/RNE) não passam por checagem de CPF — qualquer
     * combinação de caracteres é válida pra eles. */
    const participantIsBr = isBrazilianCountry(participant.nationality);
    if (isCurrentlyExpanded && isParticipantComplete(index) && participantIsBr) {
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

  /* Timers de debounce do lookup por participante. Pra brasileiros o lookup
   * dispara síncrono assim que o CPF fica completo (11 dígitos válidos). Pra
   * estrangeiros não há boundary natural — usamos debounce de 500ms a partir
   * do último keystroke pra evitar 1 request por tecla. */
  const docLookupTimersRef = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

  /* Popula nome/email/telefone/birthDate/gênero a partir de um usuário
   * retornado pelo lookup. Extraído pra reuso entre fluxo BR e estrangeiro. */
  const applyLookedUpUser = (
    index: number,
    looked: { firstName?: string; lastName?: string; email?: string; phone?: string; dateOfBirth?: string; gender?: string },
  ) => {
    const fullName = [looked.firstName, looked.lastName].filter(Boolean).join(" ");
    const nationality = participants[index]?.nationality;
    updateParticipant(index, {
      name: fullName,
      email: looked.email || "",
      phone: looked.phone ? formatPhoneForCountry(looked.phone, nationality) : "",
      birthDate: looked.dateOfBirth || "",
      gender: looked.gender || "",
    });
  };

  const handleCPFChange = async (index: number, value: string) => {
    clearParticipantFieldError(index, "cpf");
    const participantIsBr = isBrazilianCountry(participants[index]?.nationality);

    // Cancela qualquer lookup pendente do participante — input mudou
    if (docLookupTimersRef.current[index]) {
      clearTimeout(docLookupTimersRef.current[index]);
      delete docLookupTimersRef.current[index];
    }

    if (!participantIsBr) {
      /* Estrangeiro: documento livre (passaporte/RNE), sem máscara.
       * Lookup com debounce 500ms quando length >= 4 — backend
       * (findUserByCpf) aceita doc estrangeiro via inferDocumentType. */
      const trimmed = value.slice(0, 30).trim();
      updateParticipant(index, { cpf: trimmed });

      if (trimmed.length >= 4) {
        docLookupTimersRef.current[index] = setTimeout(async () => {
          try {
            const user = await userService.getUserByCpf(trimmed);
            if (user) applyLookedUpUser(index, user);
          } catch {
            // silently ignore — não bloqueia o preenchimento manual
          } finally {
            delete docLookupTimersRef.current[index];
          }
        }, 500);
      }
      return;
    }

    // Brasileiro: aplica máscara + lookup síncrono quando 11 dígitos válidos
    const masked = maskCPF(value);
    updateParticipant(index, { cpf: masked });

    const clean = masked.replace(/\D/g, "");
    if (clean.length === 11 && isValidCPF(masked)) {
      try {
        const user = await userService.getUserByCpf(clean);
        if (user) applyLookedUpUser(index, user);
      } catch {
        // silently ignore — não bloqueia o preenchimento manual
      }
    }
  };

  /* Limpa o campo de documento ao alternar nacionalidade — caso contrário um
   * CPF mascarado vira "documento" cru (ou vice-versa) e confunde validação. */
  const handleNationalityChange = (index: number, nextNationality: string) => {
    const current = participants[index];
    const wasBr = isBrazilianCountry(current?.nationality);
    const willBeBr = isBrazilianCountry(nextNationality);
    clearParticipantFieldError(index, "cpf");
    if (wasBr !== willBeBr) {
      updateParticipant(index, { nationality: nextNationality, cpf: "" });
    } else {
      updateParticipant(index, { nationality: nextNationality });
    }
  };

  const handlePhoneChange = (
    index: number,
    field: "phone" | "emergencyPhone",
    value: string
  ) => {
    if (field === "phone") clearParticipantFieldError(index, "phone");
    /* Máscara por país (libphonenumber-js). Cada participante pode ter
     * nacionalidade própria, então deriva do participants[index]. */
    const nationality = participants[index]?.nationality;
    const masked = formatPhoneForCountry(value, nationality);
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
        (p?.gender || "") !== sp.gender ||
        (p?.nationality || "Brasil") !== (sp.nationality || "Brasil") ||
        String(p?.hasEmergencyContact ?? false) !== (sp.hasEmergencyContact ?? "false") ||
        (p?.emergencyContactName || "") !== (sp.emergencyContactName || "") ||
        (p?.emergencyPhone || "") !== (sp.emergencyPhone || "");
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
    const participantIsBr = isBrazilianCountry(participant.nationality);

    // Nome deve ter pelo menos 2 palavras (nome e sobrenome)
    const nameParts = name ? name.split(/\s+/).filter(Boolean) : [];
    const hasFullName = nameParts.length >= 2;

    /* Brasileiros: exige CPF válido. Estrangeiros: documento entre 4 e 30 chars
     * (mesmo range usado no buildRegisterStep1bSchema). */
    const docOk = participantIsBr
      ? !!cpf && getCpfValidationMessage(cpf) === null
      : !!cpf && cpf.length >= 4 && cpf.length <= 30;

    const basicFieldsComplete = !!(
      name &&
      hasFullName &&
      docOk &&
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
    ageLimit?: { min?: number; max?: number },
    ticketGender?: string
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
    const participantIsBr = isBrazilianCountry(participant.nationality);

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

    /* Brasileiros: valida formato CPF. Estrangeiros: aceita 4-30 chars
     * (passaporte, RNE, identidade estrangeira). */
    if (participantIsBr) {
      const cpfMsg = getCpfValidationMessage(cpf);
      if (cpfMsg) {
        errors.cpf = cpfMsg;
      }
    } else {
      if (!cpf) {
        errors.cpf = "Documento é obrigatório";
      } else if (cpf.length < 4) {
        errors.cpf = "Documento deve ter pelo menos 4 caracteres";
      } else if (cpf.length > 30) {
        errors.cpf = "Documento deve ter no máximo 30 caracteres";
      }
    }

    if (!birthDate) {
      errors.birthDate = "Data de nascimento é obrigatória";
    } else if (ageLimit && (ageLimit.min || ageLimit.max)) {
      // Idade exigida é a que o participante terá NO DIA DO EVENTO, não hoje.
      // Ex.: ingresso 18+ e evento em 2026-12-15 → nascido em 2008-12-15 está
      // OK (faz 18 no dia), mesmo que hoje ainda tenha 17.
      // Comparação Y/M/D direta (sem 365.25 ms) evita off-by-one quando
      // aniversário coincide com a data do evento. Parse manual evita o
      // off-by-one de timezone que `new Date("YYYY-MM-DD")` causa em fusos
      // a oeste de UTC.
      const parseYmd = (
        iso: string,
      ): { y: number; m: number; d: number } | null => {
        const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (!match) return null;
        return { y: Number(match[1]), m: Number(match[2]), d: Number(match[3]) };
      };
      const fallbackToday = () => {
        const now = new Date();
        return { y: now.getFullYear(), m: now.getMonth() + 1, d: now.getDate() };
      };
      const ref =
        (event?.eventDate ? parseYmd(event.eventDate) : null) ?? fallbackToday();
      const birth = parseYmd(birthDate);
      if (birth) {
        let age = ref.y - birth.y;
        if (ref.m < birth.m || (ref.m === birth.m && ref.d < birth.d)) {
          age--;
        }
        if (ageLimit.min && age < ageLimit.min) {
          errors.birthDate = `Idade mínima para este ingresso é ${ageLimit.min} anos no dia do evento`;
        } else if (ageLimit.max && age > ageLimit.max) {
          errors.birthDate = `Idade máxima para este ingresso é ${ageLimit.max} anos no dia do evento`;
        }
      }
    }

    if (!phone) {
      errors.phone = "Telefone é obrigatório";
    } else if (!isPhoneValidForCountry(phone, participant.nationality)) {
      // Validação por país (libphonenumber-js) — substitui o `< 10` fixo, que
      // barrava números válidos de países com menos dígitos (Portugal=9, etc.).
      errors.phone = "Informe um telefone válido";
    }

    if (!gender) {
      errors.gender = "Selecione o sexo";
    } else if (ticketGender && ticketGender.toLowerCase() !== "all") {
      const tg = ticketGender.toLowerCase();
      const pg = gender.toLowerCase();
      const isMaleTicket = tg.startsWith("m");
      const isFemaleTicket = tg.startsWith("f");
      const participantIsMale = pg.startsWith("m");
      const participantIsFemale = pg.startsWith("f");
      if (isMaleTicket && !participantIsMale) {
        errors.gender = "Este ingresso é exclusivo para participantes do sexo masculino";
      } else if (isFemaleTicket && !participantIsFemale) {
        errors.gender = "Este ingresso é exclusivo para participantes do sexo feminino";
      }
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
              /* Brasileiros: doc clean (só dígitos). Estrangeiros: doc cru
               * (preserva letras de passaporte/RNE). Backend usa
               * documentType pra normalizar via cleanDocumentNumber. */
              const participantIsBr = isBrazilianCountry(p.nationality);
              const docForBackend = participantIsBr
                ? (p.cpf || "").replace(/\D/g, "")
                : (p.cpf || "").trim();
              const mapped: {
                name: string;
                documentType: "CPF" | "PASSPORT";
                documentNumber: string;
                email: string;
                birthDate: string; phone: string;
                country?: string;
                gender?: "MALE" | "FEMALE" | "OTHER" | "PREFER_NOT_TO_SAY";
                emergencyContactName?: string; emergencyPhone?: string;
                hasEmergencyContact?: boolean;
                questionAnswers?: Array<{ questionId: string; answer: string | boolean | number }>;
              } = {
                name: p.name,
                documentType: participantIsBr ? "CPF" : "PASSPORT",
                documentNumber: docForBackend,
                email: p.email,
                birthDate: p.birthDate,
                phone: p.phone ? getPhoneDigitsForBackend(p.phone, p.nationality) : "",
                /* Nacionalidade escolhida pelo participante no checkout — backend
                 * salva no receiptSnapshot.participant.country e usa pra formatar
                 * telefone e decidir label do documento no PDF/email. */
                country: p.nationality || undefined,
              };
              const gender = mapGender(p.gender);
              if (gender) mapped.gender = gender;
              if (p.emergencyContactName?.trim()) mapped.emergencyContactName = p.emergencyContactName.trim();
              if (p.emergencyPhone?.trim()) mapped.emergencyPhone = getPhoneDigitsForBackend(p.emergencyPhone, p.nationality);
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

          patchParticipants(orderId, payload)
            .then((res) => {
              if (res.couponAutoRemoved) {
                toast("Cupom de quantidade removido: carrinho abaixo do mínimo exigido.", { icon: "ℹ️" });
              }
            })
            .catch(() => {
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

  /* Mask CPF for display (partial masking).
   * Brasileiros: mascarado parcialmente (XXX.***.***-XX).
   * Estrangeiros: exibe o documento integral — passaporte/RNE não tem padrão
   * de mascaramento aceito universalmente. */
  const maskCPFDisplay = (cpf: string, isBr: boolean = true) => {
    if (!cpf) return "";
    if (!isBr) return cpf;
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
    // Checkout exige 100% server-driven: nada de cache.
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
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
                Quem vai participar? Preencha os dados de cada participante.
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

              <div className="flex flex-col justify-center items-center px-4 border-r border-gray-6 flex-1 min-w-0">
                <div className="flex flex-col gap-4">
                  <p className="text-base text-gray-11">Seu pedido:</p>
                  <h1 className="text-xl font-bold text-gray-12 leading-tight">
                    {event.name}
                  </h1>
                </div>
              </div>

              <div className="w-2/5 shrink-0 flex flex-col justify-center px-4 py-6">
                <div className="flex flex-col gap-2 pb-6">
                  {groupedTickets.slice(0, 3).map((ticket, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between text-base text-gray-12"
                    >
                      <div className="flex flex-col max-w-[80%]">
                        <p className="text-gray-11 text-xs truncate">{ticket.categoryName ? (
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
                  {appliedCoupon && showCouponDiscount && couponDiscountAmount > 0 && (
                    <>
                      <div className="flex items-center justify-between text-base text-gray-12">
                        <p className="font-semibold">Subtotal:</p>
                        <p className="font-bold">{formatPrice(totalPrice)}</p>
                      </div>
                      <div className="flex items-center justify-between text-base text-gray-12">
                        <p className="font-semibold">
                          {formatCouponLineLabel(appliedCoupon)}:
                        </p>
                        <p className="font-bold">
                          -{formatPrice(couponDiscountAmount)}
                        </p>
                      </div>
                    </>
                  )}
                  {serviceFee > 0 && (
                    <div className="flex items-center justify-between text-base text-gray-12">
                      <p className="font-semibold">Taxa de serviço:</p>
                      <p className="font-bold">
                        {formatPrice(serviceFee)}
                      </p>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between text-xl font-bold text-gray-12 border-t border-gray-6 pt-6">
                  <p>Total:</p>
                  <p>{formatPrice(totalAmount)}</p>
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
                nationality: userDefaultNationality,
                emergencyPhone: "",
                emergencyContactName: "",
                hasEmergencyContact: false,
              };
              const participantIsBr = isBrazilianCountry(participant.nationality);
              const docLabel = participantIsBr ? "CPF" : "Documento";
              const docPlaceholder = participantIsBr ? "000.000.000-00" : "12345...";
              const docMaxLength = participantIsBr ? 14 : 30;
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
                                        {maskCPFDisplay(participant.cpf, isBrazilianCountry(participant.nationality))}
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
                              {formatPrice(getTicketPrice(ticket))}
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
                        <div
                          className="flex items-start justify-between w-full relative z-10 cursor-pointer"
                          role="button"
                          tabIndex={0}
                          onClick={() => toggleParticipant(participantIndex)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              toggleParticipant(participantIndex);
                            }
                          }}
                        >
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
                            <div className="relative">
                              <UserAutocomplete
                                value={participant.name}
                                disabled={previewMode}
                                onDeleteUser={async (userId) => {
                                  await userService.removeLinkedUser(userId);
                                  queryClient.invalidateQueries({ queryKey: ["linked-users"] });
                                }}
                                onChange={(value) => {
                                  clearParticipantFieldError(participantIndex, "name");
                                  updateParticipant(participantIndex, { name: value });
                                  // Se o usuário editar manualmente, desvincular linked user
                                  if (selectedLinkedUserIds[participantIndex]) {
                                    setSelectedLinkedUserIds((prev) => {
                                      const next = { ...prev };
                                      delete next[participantIndex];
                                      return next;
                                    });
                                  }
                                }}
                                onSelectUser={(user: LinkedUser) => {
                                  /* `formattedPhone` recalculado depois que sabemos a
                                   * nacionalidade herdada — máscara depende dela. */

                                  let normalizedGender = user.gender || "";
                                  if (normalizedGender) {
                                    const genderLower = normalizedGender.toLowerCase();
                                    if (genderLower === "male" || genderLower === "masculino") {
                                      normalizedGender = "Masculino";
                                    } else if (genderLower === "female" || genderLower === "feminino") {
                                      normalizedGender = "Feminino";
                                    } else if (genderLower === "other" || genderLower === "outro") {
                                      normalizedGender = "Outro";
                                    } else if (genderLower === "prefiro-nao-dizer" || genderLower === "prefiro-nao-informar" || genderLower === "prefer not to say") {
                                      normalizedGender = "Prefiro não dizer";
                                    } else {
                                      const genderOption = sexoOptions.find(
                                        (opt) => opt.id.toLowerCase() === genderLower || opt.label.toLowerCase() === genderLower
                                      );
                                      normalizedGender = genderOption ? genderOption.label : normalizedGender;
                                    }
                                  }

                                  /* Deriva nacionalidade do linked user:
                                   * - `country` quando vier (mainUser + linked herdam do main).
                                   * - Fallback por `documentType` quando o country não foi carregado
                                   *   (CPF → Brasil, PASSPORT → mantém atual pra usuário escolher).
                                   * Default: Brasil. */
                                  const inheritedNationality =
                                    user.country?.trim() ||
                                    (user.documentType === "PASSPORT"
                                      ? participant.nationality || ""
                                      : "Brasil");
                                  const userIsBr = isBrazilianCountry(inheritedNationality);

                                  /* Documento: pra brasileiro aplica máscara CPF (igual handleCPFChange).
                                   * Pra estrangeiro mantém cru (preserva letras de passaporte). */
                                  const docValue = user.documentNumber || "";
                                  const docFormatted = userIsBr
                                    ? maskCPF(docValue)
                                    : docValue.slice(0, 30);

                                  /* Telefone formatado conforme país herdado. */
                                  const formattedPhone = user.phone
                                    ? formatPhoneForCountry(user.phone, inheritedNationality)
                                    : "";

                                  updateParticipant(participantIndex, {
                                    name: `${user.firstName} ${user.lastName}`.trim(),
                                    email: user.email || "",
                                    phone: formattedPhone,
                                    birthDate: user.dateOfBirth || "",
                                    gender: normalizedGender,
                                    nationality: inheritedNationality,
                                    cpf: docFormatted,
                                  });
                                  clearParticipantFieldError(participantIndex, "cpf");

                                  setSelectedLinkedUserIds((prev) => ({
                                    ...prev,
                                    [participantIndex]: user.id,
                                  }));
                                }}
                                placeholder="Digite seu nome completo"
                                className={`w-full ${selectedLinkedUserIds[participantIndex] ? "pr-9" : ""} ${fieldErrors[participantIndex]?.name ? "border-red-6 rounded-lg" : ""}`}
                              />
                            </div>
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
                              Nacionalidade
                            </label>
                            <NationalitySelect
                              value={participant.nationality || "Brasil"}
                              disabled={previewMode}
                              onChange={(country) => handleNationalityChange(participantIndex, country)}
                            />
                          </div>
                          <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium text-gray-12">
                              {docLabel}
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
                              maxLength={docMaxLength}
                              className={`w-full px-4 py-3 rounded-lg border bg-gray-2 text-gray-12 focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${fieldErrors[participantIndex]?.cpf ? "border-red-6 focus:border-red-10" : "border-gray-6 focus:border-primary-10"}`}
                              placeholder={docPlaceholder}
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
                              maxLength={getPhoneMaxLengthForCountry(participant.nationality)}
                              className={`w-full px-4 py-3 rounded-lg border bg-gray-2 text-gray-12 focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${fieldErrors[participantIndex]?.phone ? "border-red-6 focus:border-red-10" : "border-gray-6 focus:border-primary-10"}`}
                              placeholder={getPhonePlaceholderForCountry(participant.nationality)}
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
                                  maxLength={getPhoneMaxLengthForCountry(participant.nationality)}
                                  className="w-full h-12 px-3 rounded-lg border border-gray-6 bg-transparent text-gray-12 focus:outline-none focus:border-primary-10 transition-colors font-family-dm-sans text-base placeholder:text-gray-11"
                                  placeholder={getPhonePlaceholderForCountry(participant.nationality)}
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
                              const errors = getParticipantValidationErrors(participantIndex, ticket.ageLimit, ticket.gender);
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
                                    nationality: p?.nationality || userDefaultNationality,
                                    hasEmergencyContact: String(p?.hasEmergencyContact ?? false),
                                    emergencyContactName: p?.emergencyContactName || "",
                                    emergencyPhone: p?.emergencyPhone || "",
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
                                const genderOption = sexoOptions.find(
                                  (opt) => opt.label === p.gender || opt.id === p.gender?.toLowerCase()
                                );
                                userService.createOrLinkUser({
                                  firstName,
                                  lastName,
                                  email: p.email || "",
                                  documentNumber: (p.cpf || "").replace(/\D/g, ""),
                                  phone: (p.phone || "").replace(/\D/g, ""),
                                  dateOfBirth: p.birthDate || "",
                                  gender: genderOption?.id || p.gender || "",
                                }).then(() => {
                                  queryClient.invalidateQueries({ queryKey: ["linked-users"] });
                                }).catch(() => { });
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
                participantsWithRaces.forEach(({ participantIndex, ticket }) => {
                  const errors = getParticipantValidationErrors(participantIndex, ticket.ageLimit, ticket.gender);
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
      <MobileSummaryBar
        eventName={event.name}
        totalParticipants={totalParticipants}
        tickets={groupedTickets.map((t) => ({
          categoryName: t.categoryName,
          name: t.raceName,
          quantity: t.quantity,
          total: t.total,
        }))}
        subtotal={totalPrice}
        discount={
          appliedCoupon && showCouponDiscount && couponDiscountAmount > 0
            ? { label: formatCouponLineLabel(appliedCoupon), amount: couponDiscountAmount }
            : null
        }
        serviceFee={serviceFee}
        total={totalAmount}
        cta={{
          label: "Confirmar dados",
          loading: isSubmitting,
          disabled: isSubmitting,
          onClick: () => {
            if (participantsWithRaces.length === 0) return;
            const allErrors: Record<number, Record<string, string>> = {};
            let firstInvalidIndex: number | null = null;
            participantsWithRaces.forEach(({ participantIndex, ticket }) => {
              const errors = getParticipantValidationErrors(participantIndex, ticket.ageLimit, ticket.gender);
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
          },
        }}
      />

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
                    {appliedCoupon && showCouponDiscount && couponDiscountAmount > 0 && (
                      <>
                        <div className="flex items-center justify-between text-base text-gray-12">
                          <p className="font-semibold">Subtotal:</p>
                          <p className="font-bold">{formatPrice(totalPrice)}</p>
                        </div>
                        <div className="flex items-center justify-between text-base text-gray-12">
                          <p className="font-semibold">
                            {formatCouponLineLabel(appliedCoupon)}:
                          </p>
                          <p className="font-bold">
                            -{formatPrice(couponDiscountAmount)}
                          </p>
                        </div>
                      </>
                    )}
                    {serviceFee > 0 && (
                      <div className="flex items-center justify-between text-base text-gray-12">
                        <p className="font-semibold">Taxa de serviço:</p>
                        <p className="font-bold">
                          {formatPrice(serviceFee)}
                        </p>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-xl font-bold text-gray-12 pt-4 border-t border-gray-6">
                      <p>Total:</p>
                      <p>{formatPrice(totalAmount)}</p>
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
