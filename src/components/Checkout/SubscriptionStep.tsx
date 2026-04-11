"use client";
import { Button } from "../Button";
import type { Event } from "@/interfaces/event";
import { ArrowButton } from "../ArrowButton";
import { ImageWithInitialFallback } from "@/components/ImageWithInitialFallback";
import { Dropdown, DropdownOption } from "../Dropdown";
import { useState, useMemo, useEffect, useRef } from "react";
import { useCheckout } from "@/contexts/CheckoutContext";
import { useTickets } from "@/hooks/useTickets";
import { useTicketCategories } from "@/hooks/useTicketCategories";
import type { Ticket } from "@/hooks/useTickets";
import { useQuery } from "@tanstack/react-query";
import { organizerService } from "@/services";
import { queryKeys } from "@/services/cache/QueryClient";
import { isSemInteresseVariation } from "@/utils/semInteresseVariation";
import { Loading } from "../Loading";

interface SubscriptionStepProps {
  event: Event;
  onNext: () => void;
  onBack: () => void;
  isSubmitting?: boolean;
}

interface Product {
  id: string;
  name: string;
  image: string | null;
  basePrice: number;
  isRequired: boolean;
  isIncludedInTicket: boolean;
  /** Ex.: "Tamanho", "Cor" — mesmo campo do CreateProductModal / API. */
  variationType?: string | null;
  variations: Array<{
    id?: string;
    name: string;
    price: number;
    stock: number;
  }>;
}

/** API envia valores monetários em centavos (inteiro ou string numérica). */
function productPriceFromApiToReais(value: unknown): number {
  if (value == null || value === "") return 0;
  if (typeof value === "number" && Number.isFinite(value)) return value / 100;
  const s = String(value).trim().replace(",", ".");
  const n = parseFloat(s);
  return Number.isFinite(n) ? n / 100 : 0;
}

// Função para formatar preço (valor em reais)
const formatPrice = (price: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price);
};

/** Preço específico da variação ≠ 0 (0 = “só base”, igual ao modal). */
const variationHasMeaningfulSpecificPriceReais = (priceReais: number): boolean => {
  if (!Number.isFinite(priceReais)) return false;
  return Math.round(priceReais * 100) !== 0;
};

const productAnyVariationHasSpecificPrice = (product: Product): boolean =>
  product.variations.some((v) => variationHasMeaningfulSpecificPriceReais(v.price));

/**
 * Mesma regra da prévia do CreateProductModal: sem preço específico em nenhuma variação,
 * não mostra valores à direita; com pelo menos um, linhas sem preço específico mostram a base;
 * com preço específico: total se variação < base, senão acréscimo sobre a base.
 */
const previewVariationListPriceLabelForProduct = (
  product: Product,
  variationPriceReais: number,
  variationName?: string,
): string | undefined => {
  if (
    variationName != null &&
    isSemInteresseVariation({ name: variationName })
  ) {
    return undefined;
  }
  if (!productAnyVariationHasSpecificPrice(product)) {
    return undefined;
  }
  const base = product.basePrice;
  if (!variationHasMeaningfulSpecificPriceReais(variationPriceReais)) {
    return formatPrice(base);
  }
  const v = variationPriceReais;
  if (v < base) {
    return formatPrice(v);
  }
  return formatPrice(Math.max(0, v - base));
};

/** Preço exibido no card do produto (preço geral / base), alinhado à prévia do modal. */
const formatProductCardBasePriceLabel = (product: Product): string => {
  if (product.isIncludedInTicket) return "Incluso no ingresso";
  return formatPrice(product.basePrice);
};

/** Alinhado ao CreateProductModal: "Escolha a variação - {tipo}" ou "Variações". */
const variationSectionTitle = (product: Product) =>
  `Escolha a variação - ${(product.variationType ?? "").trim() || "Variações"}`;

/**
 * Valor em reais a somar no total do pedido (mesma regra de `previewVariationListPriceLabelForProduct`).
 * Incluso no ingresso: cobra só upgrade (v - base) quando v ≥ base; fora do ingresso: paga v se v < base, senão v (equiv. base + acréscimo).
 */
function billableReaisForProductSelection(
  product: Product,
  selectedVariation: Product["variations"][number] | null,
): number {
  const base = product.basePrice;

  if (!selectedVariation) {
    if (product.isIncludedInTicket) return 0;
    return base;
  }

  if (isSemInteresseVariation(selectedVariation)) {
    return 0;
  }

  const v = selectedVariation.price;

  if (!productAnyVariationHasSpecificPrice(product)) {
    if (product.isIncludedInTicket) return 0;
    return base;
  }

  if (!variationHasMeaningfulSpecificPriceReais(v)) {
    if (product.isIncludedInTicket) return 0;
    return base;
  }

  if (product.isIncludedInTicket) {
    if (v < base) return 0;
    return Math.max(0, v - base);
  }

  if (v < base) return v;
  return v;
}

export function SubscriptionStep({
  event,
  onNext,
  onBack,
  isSubmitting = false,
}: SubscriptionStepProps) {
  const { raceQuantities, participants, updateParticipant } = useCheckout();
  const eventId = event?.id;

  // Buscar tickets e categorias do servidor
  const { tickets, loading: ticketsLoading } = useTickets(eventId, !!eventId);
  const { categories, loading: categoriesLoading } = useTicketCategories(eventId, !!eventId);

  // Buscar produtos do evento
  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: queryKeys.events.products(eventId || ""),
    queryFn: async () => {
      if (!eventId) return { products: [] };
      return organizerService.getProducts(eventId);
    },
    enabled: !!eventId,
    staleTime: 5 * 60 * 1000,
  });

  const loading = ticketsLoading || categoriesLoading || productsLoading;

  // Separar tickets com categoria dos avulsos
  const { categorizedTickets, uncategorizedTickets } = useMemo(() => {
    const categorized: Array<{ id: string; name: string; tickets: Ticket[] }> = [];
    const uncategorized: Ticket[] = [];

    const categoryMap = new Map(categories.map((cat) => [cat.id, cat.name]));

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

  // Converter produtos da API para o formato interno
  const allProducts = useMemo(() => {
    if (!productsData?.products) {
      return [];
    }

    return productsData.products.map((product: any): Product => ({
      id: product.id,
      name: product.name,
      image: product.image || null,
      basePrice: productPriceFromApiToReais(product.basePrice),
      isRequired: product.isRequired || false,
      isIncludedInTicket: product.isIncludedInTicket || false,
      variationType:
        typeof product.variationType === "string" && product.variationType.trim()
          ? product.variationType.trim()
          : typeof product.variation_type === "string" && product.variation_type.trim()
            ? product.variation_type.trim()
            : null,
      variations: (product.variations || []).map((v: any) => ({
        id: v.id,
        name: v.name,
        price: productPriceFromApiToReais(v.price),
        stock: typeof v.stock === "number" ? v.stock : parseInt(String(v.stock), 10) || 0,
      })),
    }));
  }, [productsData]);

  // Criar mapa de ticketId -> lista de productIds vinculados
  const ticketProductsMap = useMemo(() => {
    const map: Record<string, string[]> = {};

    // Mapear tickets de categorizedTickets
    categorizedTickets.forEach((category) => {
      category.tickets.forEach((ticket) => {
        // ticket.products é um array de IDs de produtos (strings)
        map[ticket.id] = ticket.products || [];
      });
    });

    // Mapear tickets sem categoria
    uncategorizedTickets.forEach((ticket) => {
      map[ticket.id] = ticket.products || [];
    });

    return map;
  }, [categorizedTickets, uncategorizedTickets]);

  // Filtrar produtos por ticket ID
  const getProductsForTicket = (ticketId: string) => {
    const ticketProductIds = ticketProductsMap[ticketId] || [];

    // Se o ticket não tem produtos vinculados, não mostrar nenhum produto
    if (ticketProductIds.length === 0) {
      return [];
    }

    // Filtrar apenas os produtos que estão vinculados a este ticket
    return allProducts.filter((product) => ticketProductIds.includes(product.id));
  };

  // Separar produtos obrigatórios e opcionais (global - usado para cálculos gerais)
  const { requiredProducts, additionalProducts } = useMemo(() => {
    const required: Product[] = [];
    const additional: Product[] = [];

    allProducts.forEach((product) => {
      if (product.isRequired) {
        required.push(product);
      } else {
        additional.push(product);
      }
    });

    return { requiredProducts: required, additionalProducts: additional };
  }, [allProducts]);

  // Obter produtos filtrados por ticket para um participante específico
  const getRequiredProductsForParticipant = (participantIndex: number): Product[] => {
    const participantTicket = participantsWithTickets.find(
      (p) => p.participantIndex === participantIndex
    );
    if (!participantTicket) return [];

    const ticketProducts = getProductsForTicket(participantTicket.ticketId);
    return ticketProducts.filter((p) => p.isRequired);
  };

  const getAdditionalProductsForParticipant = (participantIndex: number): Product[] => {
    const participantTicket = participantsWithTickets.find(
      (p) => p.participantIndex === participantIndex
    );
    if (!participantTicket) return [];

    const ticketProducts = getProductsForTicket(participantTicket.ticketId);
    return ticketProducts.filter((p) => !p.isRequired);
  };

  // Função para obter a chave única da variação selecionada (participante + produto)
  // Usar um separador único que não aparece em UUIDs para evitar problemas com split
  const VARIATION_KEY_SEPARATOR = "::";
  const getVariationKey = (participantIndex: number, productId: string) => {
    return `${participantIndex}${VARIATION_KEY_SEPARATOR}${productId}`;
  };

  // Função para extrair participantIndex e productId de uma chave
  // Suporta tanto o formato novo (com ::) quanto o antigo (com -)
  const parseVariationKey = (key: string): { participantIndex: number; productId: string } => {
    // Tentar formato novo primeiro (com ::)
    const separatorIndex = key.indexOf(VARIATION_KEY_SEPARATOR);
    if (separatorIndex !== -1) {
      return {
        participantIndex: Number(key.substring(0, separatorIndex)),
        productId: key.substring(separatorIndex + VARIATION_KEY_SEPARATOR.length),
      };
    }

    // Fallback para formato antigo (com -) - pegar apenas o primeiro número
    // Formato antigo: "0-9f24fcc6-421b-..." -> ["0", "9f24fcc6", "421b", ...]
    const parts = key.split("-");
    if (parts.length >= 2) {
      const participantIndex = Number(parts[0]);
      // Reconstruir o productId juntando todas as partes exceto a primeira
      const productId = parts.slice(1).join("-");
      return { participantIndex, productId };
    }

    throw new Error(`Invalid variation key format: ${key}`);
  };

  // Inicializar variações selecionadas com dados do contexto
  // Usar um estado vazio inicialmente e carregar via useEffect
  const [selectedVariations, setSelectedVariations] = useState<
    Record<string, string | null>
  >({});
  const [selectedParticipant, setSelectedParticipant] = useState<number>(0);
  const [expandedParticipants, setExpandedParticipants] = useState<
    Record<number, boolean>
  >({
    0: true,
  });
  const [completedParticipants, setCompletedParticipants] = useState<
    Record<number, boolean>
  >({});

  // Sincronizar selectedVariations quando participants mudarem (ex: carregamento do storage)
  // Usar ref para evitar loops infinitos
  const isUpdatingFromContextRef = useRef(false);

  // Sincronizar variações selecionadas com o contexto quando selectedVariations mudar
  useEffect(() => {
    if (isUpdatingFromContextRef.current) {
      isUpdatingFromContextRef.current = false;
      return;
    }

    // Agrupar variações por participante
    const variationsByParticipant: Record<number, Record<string, string | null>> = {};

    Object.keys(selectedVariations).forEach((key) => {
      try {
        const { participantIndex, productId } = parseVariationKey(key);

        if (!variationsByParticipant[participantIndex]) {
          variationsByParticipant[participantIndex] = {};
        }

        variationsByParticipant[participantIndex][productId] = selectedVariations[key];
      } catch (error) {
        // Ignorar chaves inválidas (pode ser formato antigo)
        console.warn("Invalid variation key format:", key);
      }
    });

    // Salvar no contexto para cada participante
    Object.keys(variationsByParticipant).forEach((participantIndexStr) => {
      const participantIndex = Number(participantIndexStr);
      const participantVariations = variationsByParticipant[participantIndex];

      // Só atualizar se houver diferenças
      const currentVariations = participants[participantIndex]?.productVariations || {};
      const hasChanges = JSON.stringify(currentVariations) !== JSON.stringify(participantVariations);

      if (hasChanges) {
        isUpdatingFromContextRef.current = true;
        updateParticipant(participantIndex, {
          productVariations: participantVariations,
        });
      }
    });
  }, [selectedVariations]);

  // Criar lista de participantes baseada nos tickets selecionados
  const participantsWithTickets = useMemo(() => {
    const result: Array<{
      ticketId: string;
      ticket: Ticket;
      participantIndex: number;
    }> = [];
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
        });
      }
    });

    return result;
  }, [raceQuantities, categorizedTickets, uncategorizedTickets]);

  // Sincronizar selectedVariations quando participants ou participantsWithTickets mudarem
  // (carregamento do storage quando volta para a página)
  useEffect(() => {
    if (isUpdatingFromContextRef.current) {
      isUpdatingFromContextRef.current = false;
      return;
    }

    // Carregar variações do contexto usando os participantIndex corretos de participantsWithTickets
    const updated: Record<string, string | null> = {};

    // Criar um mapa de IDs de produtos para facilitar a correspondência
    // Isso ajuda a lidar com IDs truncados salvos no localStorage
    const allProducts = [...requiredProducts, ...additionalProducts];
    const productIdMap = new Map<string, string>();
    allProducts.forEach((product) => {
      // Mapear tanto o ID completo quanto os primeiros 8 caracteres (caso esteja truncado)
      productIdMap.set(product.id, product.id);
      if (product.id.length > 8) {
        productIdMap.set(product.id.substring(0, 8), product.id);
      }
    });

    participantsWithTickets.forEach(({ participantIndex }) => {
      const participant = participants[participantIndex];
      if (participant?.productVariations) {
        Object.keys(participant.productVariations).forEach((savedProductId) => {
          // Tentar encontrar o ID completo do produto
          // Pode ser que o ID salvo esteja truncado (formato antigo)
          const fullProductId = productIdMap.get(savedProductId) ||
            allProducts.find(p => p.id.startsWith(savedProductId))?.id ||
            savedProductId;

          if (fullProductId) {
            const variationKey = getVariationKey(participantIndex, fullProductId);
            updated[variationKey] = participant.productVariations![savedProductId];
          }
        });
      }
    });

    // Só atualizar se houver diferenças significativas
    setSelectedVariations((prev) => {
      const prevKeys = Object.keys(prev).sort();
      const updatedKeys = Object.keys(updated).sort();
      const keysMatch = prevKeys.length === updatedKeys.length &&
        prevKeys.every((key, i) => key === updatedKeys[i]);

      if (keysMatch) {
        const valuesMatch = prevKeys.every((key) => prev[key] === updated[key]);
        if (valuesMatch) {
          return prev;
        }
      }

      // Mesclar mantendo valores existentes que não estão no contexto
      return { ...prev, ...updated };
    });
  }, [participants, participantsWithTickets, requiredProducts, additionalProducts]);

  // Produto obrigatório ou não incluso no ingresso, com uma única variação: pré-seleciona por participante
  useEffect(() => {
    if (loading) return;

    setSelectedVariations((prev) => {
      const additions: Record<string, string> = {};

      for (const { participantIndex, ticketId } of participantsWithTickets) {
        const ticketProductIds = ticketProductsMap[ticketId] || [];
        if (ticketProductIds.length === 0) continue;

        const ticketProducts = allProducts.filter((p) =>
          ticketProductIds.includes(p.id),
        );

        for (const product of ticketProducts) {
          const needsVariationChoice =
            product.isRequired || !product.isIncludedInTicket;
          if (!needsVariationChoice) continue;
          if (product.variations.length !== 1) continue;

          const key = getVariationKey(participantIndex, product.id);
          const current = prev[key];
          if (current != null && String(current).trim() !== "") continue;

          const v = product.variations[0];
          additions[key] = v.id || `${product.id}-0`;
        }
      }

      if (Object.keys(additions).length === 0) return prev;
      return { ...prev, ...additions };
    });
  }, [loading, participantsWithTickets, allProducts, ticketProductsMap]);

  // Calculate totals
  const { totalParticipants, totalPrice } = useMemo(() => {
    let participants = 0;
    let total = 0;

    participantsWithTickets.forEach(({ ticket }) => {
      participants++;
      total += getTicketPrice(ticket);
    });

    return { totalParticipants: participants, totalPrice: total };
  }, [participantsWithTickets]);

  // Agrupa ingressos por ticket para exibição
  const groupedTickets = useMemo(() => {
    const grouped: Array<{
      quantity: number;
      raceName: string;
      distance: string;
      price: number;
      total: number;
    }> = [];

    const ticketMap = new Map<string, { ticket: Ticket; quantity: number }>();

    participantsWithTickets.forEach(({ ticket }) => {
      const existing = ticketMap.get(ticket.id);
      if (existing) {
        existing.quantity++;
      } else {
        ticketMap.set(ticket.id, { ticket, quantity: 1 });
      }
    });

    ticketMap.forEach(({ ticket, quantity }) => {
      grouped.push({
        quantity,
        raceName: ticket.name,
        distance: ticket.distance ? `${ticket.distance} ${ticket.distanceUnit || ""}` : "",
        price: getTicketPrice(ticket),
        total: getTicketPrice(ticket) * quantity,
      });
    });

    return grouped;
  }, [participantsWithTickets]);

  const handleVariationSelect =
    (participantIndex: number, productId: string) =>
      (option: DropdownOption) => {
        const variationKey = getVariationKey(participantIndex, productId);
        const newVariationId = option.id || null;

        // Atualizar apenas o estado local - o useEffect vai sincronizar com o contexto
        setSelectedVariations((prev) => ({
          ...prev,
          [variationKey]: newVariationId,
        }));
      };

  const handleParticipantSelect = (participantIndex: number) => {
    // Colapsar todos os participantes
    const newExpanded: Record<number, boolean> = {};
    // Expandir apenas o selecionado
    newExpanded[participantIndex] = true;
    setExpandedParticipants(newExpanded);
    setSelectedParticipant(participantIndex);
  };

  const toggleParticipant = (participantIndex: number) => {
    setExpandedParticipants((prev) => {
      const isCurrentlyExpanded = prev[participantIndex] || false;
      // Se estiver expandindo, colapsa todos os outros e expande este
      if (!isCurrentlyExpanded) {
        setSelectedParticipant(participantIndex);
        return { [participantIndex]: true };
      }
      // Se estiver colapsando, apenas remove este
      const newState = { ...prev };
      delete newState[participantIndex];
      return newState;
    });
  };

  // Verificar se todos os produtos obrigatórios têm variação selecionada
  const hasAllRequiredVariations = (participantIndex: number): boolean => {
    // Usar apenas os produtos obrigatórios do ticket deste participante
    const participantRequiredProducts = getRequiredProductsForParticipant(participantIndex);
    return participantRequiredProducts.every((product) => {
      const variationKey = getVariationKey(participantIndex, product.id);
      return selectedVariations[variationKey] && selectedVariations[variationKey] !== null;
    });
  };

  // Verificar se todos os produtos obrigatórios têm variação selecionada
  const isParticipantComplete = (participantIndex: number): boolean => {
    // Verificar se já está marcado como concluído
    if (completedParticipants[participantIndex]) {
      return true;
    }
    // Verificar se todos os produtos obrigatórios têm variação selecionada
    return hasAllRequiredVariations(participantIndex);
  };

  // Salvar e marcar participante como concluído
  const handleSaveAndNext = (participantIndex: number) => {
    // Verificar se todos os produtos obrigatórios têm variação
    if (hasAllRequiredVariations(participantIndex)) {
      // Marcar como concluído
      setCompletedParticipants((prev) => ({
        ...prev,
        [participantIndex]: true,
      }));
      // Colapsar este participante
      setExpandedParticipants((prev) => {
        const newState = { ...prev };
        delete newState[participantIndex];
        return newState;
      });
      // Encontrar próximo participante não concluído
      const nextParticipant = participantsWithTickets.find(
        (p) =>
          !completedParticipants[p.participantIndex] &&
          p.participantIndex !== participantIndex
      );
      if (nextParticipant) {
        setSelectedParticipant(nextParticipant.participantIndex);
        setExpandedParticipants((prev) => ({
          ...prev,
          [nextParticipant.participantIndex]: true,
        }));
      }
    }
  };

  const formatDateShort = (date: string) => {
    if (!date) return "";
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(date));
  };

  const maskCPF = (cpf: string) => {
    if (!cpf) return "";
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.***.***-$4");
  };

  // Obter opções de variação para um produto
  const getVariationOptions = (product: Product): DropdownOption[] => {
    if (!product.variations || product.variations.length === 0) {
      return [];
    }
    return product.variations.map((variation, index) => ({
      id: variation.id || `${product.id}-${index}`,
      label: variation.name,
      suffix: previewVariationListPriceLabelForProduct(
        product,
        variation.price,
        variation.name,
      ),
    }));
  };

  // Obter variação selecionada
  const getSelectedVariation = (
    participantIndex: number,
    product: Product,
  ): Product["variations"][number] | null => {
    const variationKey = getVariationKey(participantIndex, product.id);
    const selectedId = selectedVariations[variationKey];
    if (!selectedId) return null;
    return (
      product.variations.find(
        (v, i) => (v.id || `${product.id}-${i}`) === selectedId,
      ) ?? null
    );
  };

  // Calcular total de produtos adicionais selecionados por participante
  const getAdditionalProductsTotal = (participantIndex: number): number => {
    // Usar apenas os produtos adicionais do ticket deste participante
    const participantAdditionalProducts = getAdditionalProductsForParticipant(participantIndex);
    return participantAdditionalProducts.reduce((total, product) => {
      const selectedVariation = getSelectedVariation(participantIndex, product);
      if (!selectedVariation) return total;
      return total + billableReaisForProductSelection(product, selectedVariation);
    }, 0);
  };

  // Calcular total de produtos obrigatórios selecionados por participante
  const getRequiredProductsTotal = (participantIndex: number): number => {
    // Usar apenas os produtos obrigatórios do ticket deste participante
    const participantRequiredProducts = getRequiredProductsForParticipant(participantIndex);
    return participantRequiredProducts.reduce((total, product) => {
      const selectedVariation = getSelectedVariation(participantIndex, product);
      return (
        total + billableReaisForProductSelection(product, selectedVariation)
      );
    }, 0);
  };

  // Calcular total de todos os produtos (obrigatórios + adicionais) por participante
  const getAllProductsTotal = (participantIndex: number): number => {
    return getRequiredProductsTotal(participantIndex) + getAdditionalProductsTotal(participantIndex);
  };

  const formatDate = (date: string) => {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(new Date(date));
  };

  // Calcular total geral de produtos de todos os participantes
  const totalProductsPrice = useMemo(() => {
    return participantsWithTickets.reduce((total, { participantIndex }) => {
      return total + getAllProductsTotal(participantIndex);
    }, 0);
  }, [participantsWithTickets, selectedVariations, allProducts]);

  // Contar quantidade de produtos adicionais selecionados
  const getAdditionalProductsCount = (participantIndex: number): number => {
    // Usar apenas os produtos adicionais do ticket deste participante
    const participantAdditionalProducts = getAdditionalProductsForParticipant(participantIndex);
    return participantAdditionalProducts.filter((product) => {
      const variationKey = getVariationKey(participantIndex, product.id);
      return selectedVariations[variationKey] !== null && selectedVariations[variationKey] !== undefined;
    }).length;
  };

  if (loading) {
    return <Loading />;
  }

  const currentParticipant = participants[selectedParticipant];
  const currentParticipantTicket = participantsWithTickets.find(
    (p) => p.participantIndex === selectedParticipant
  );
  if (!currentParticipant || !currentParticipantTicket) {
    return (
      <div className="w-full flex items-center justify-center py-20">
        <p className="text-gray-11">Nenhum participante encontrado</p>
      </div>
    );
  }

  return (
    <>
      {/* Mobile Layout */}
      <div className="w-full md:hidden flex flex-col pb-24">
        {/* Instructional Text */}
        <div className="pb-4 md:pb-0 md:py-6">
          <p className="text-sm text-gray-11">
            Revise seu pedido e conclua com cartão, Pix ou boleto. Os ingressos
            são liberados após aprovação.
          </p>
        </div>

        {/* Participants List with Expand/Collapse */}
        <div className="pb-6 flex flex-col gap-4">
          {participantsWithTickets.map(({ ticket, participantIndex }, index) => {
            const participant = participants[participantIndex];
            const isExpanded = expandedParticipants[participantIndex] || false;
            const ticketPrice = getTicketPrice(ticket);
            const isCompleted = isParticipantComplete(participantIndex);

            return (
              <div
                key={participantIndex}
                className={`border border-gray-6 rounded-xl  bg-white ${!isExpanded ? "" : ""
                  }`}
              >
                {/* Header - Always Visible */}
                <div
                  className={`p-2 border-b border-gray-6 ${!isExpanded
                    ? "hover:bg-gray-2 transition-colors cursor-pointer"
                    : ""
                    }`}
                  onClick={
                    !isExpanded
                      ? () => handleParticipantSelect(participantIndex)
                      : undefined
                  }
                >
                  <div className="flex items-center gap-2 p-2 border border-gray-6 rounded-xl">
                    <div className="w-10 h-10 rounded-full bg-gray-5 flex items-center justify-center shrink-0 overflow-hidden relative">
                      {participant?.name ? (
                        <span className="text-sm font-bold text-gray-12">
                          {participant.name.charAt(0).toUpperCase()}
                        </span>
                      ) : (
                        <ImageWithInitialFallback
                          src={event.bannerUrl}
                          alt={event.name}
                          name={event.name}
                          fallbackId={event.id}
                          fill
                          sizes="40px"
                          className="size-full"
                          imgClassName="object-cover"
                          letterClassName="text-sm font-bold"
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-12">
                        {participant?.name || `Participante ${index + 1}`}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-gray-11">
                        {participant?.birthDate && (
                          <>
                            {formatDateShort(participant.birthDate)}
                            <span className="size-1 bg-gray-11 rounded-full" />
                          </>
                        )}
                        {participant?.gender && (
                          <>
                            {participant.gender}
                            {participant?.cpf && (
                              <span className="size-1 bg-gray-11 rounded-full" />
                            )}
                          </>
                        )}
                        {participant?.cpf && maskCPF(participant.cpf)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Collapsed View - Summary */}
                <div
                  className={`transition-all duration-300 ease-in-out ${!isExpanded
                    ? "max-h-[200px] opacity-100"
                    : "max-h-0 opacity-0 overflow-hidden"
                    }`}
                >
                  <div className="px-3 py-5 border-b border-gray-6">
                    {getAdditionalProductsCount(participantIndex) > 0 && (
                      <div className="flex items-center justify-between mb-6">
                        <p className="text-sm font-semibold text-gray-12">
                          {getAdditionalProductsCount(participantIndex)}x Itens adicionais:
                        </p>
                        <p className="text-base font-bold text-gray-12">
                          {formatPrice(getAdditionalProductsTotal(participantIndex))}
                        </p>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-gray-12">
                        {ticket.name}
                      </p>
                      <p className="text-base font-bold text-gray-12">
                        {formatPrice(ticketPrice)}
                      </p>
                    </div>
                  </div>

                  <div className="px-3 py-4 flex items-center justify-between">
                    <div
                      className={`px-3 py-1 rounded-full text-sm font-medium ${isCompleted
                        ? "bg-primary-3 text-primary-12"
                        : "bg-yellow-3 text-yellow-12"
                        }`}
                    >
                      {isCompleted ? "Concluído" : "Pendente"}
                    </div>
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleParticipantSelect(participantIndex);
                      }}
                      variant="ghost"
                      size="sm"
                      className="border border-gray-6"
                    >
                      {isCompleted ? "Editar" : "Selecionar"}
                    </Button>
                  </div>
                </div>

                {/* Expanded View - Full Details */}
                <div
                  className={`transition-all duration-300 ease-in-out ${isExpanded
                    ? "max-h-[5000px] opacity-100"
                    : "max-h-0 opacity-0 overflow-hidden pointer-events-none"
                    }`}
                >
                  <div className="p-4 border-b border-gray-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <h2 className="text-lg font-extrabold text-gray-12">
                          Participante {participantIndex + 1}
                        </h2>
                        <div
                          className={`px-3 py-1 rounded-full text-sm font-medium ${isCompleted
                            ? "bg-primary-3 text-primary-12"
                            : "bg-yellow-3 text-yellow-12"
                            }`}
                        >
                          {isCompleted ? "Concluído" : "Pendente"}
                        </div>
                      </div>
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleParticipant(participantIndex);
                        }}
                        variant="ghost"
                        size="sm"
                        className="border border-gray-6"
                      >
                        Minimizar
                      </Button>
                    </div>

                    {/* Participant Items Summary */}
                    <div className="py-5 border-b border-gray-6">
                      {getAdditionalProductsCount(participantIndex) > 0 && (
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-semibold text-gray-12">
                            {getAdditionalProductsCount(participantIndex)}x Itens adicionais:
                          </p>
                          <p className="text-base font-bold text-gray-12">
                            {formatPrice(getAdditionalProductsTotal(participantIndex))}
                          </p>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-gray-12">
                          {ticket.name}
                        </p>
                        <p className="text-base font-bold text-gray-12">
                          {formatPrice(ticketPrice)}
                        </p>
                      </div>
                    </div>

                    {/* Required Products */}
                    <div className="py-4 border-b border-gray-6">
                      <h3 className="text-base font-bold text-gray-12 mb-4">
                        Produtos do kit (obrigatório)
                      </h3>
                      <div className="flex flex-col gap-3">
                        {getRequiredProductsForParticipant(participantIndex).map((product) => (
                          <div
                            key={product.id}
                            className="bg-gray-2 border border-gray-6 rounded-xl"
                          >
                            <div className="flex gap-3 p-4 border-b border-gray-6">
                              <div className="w-[100px] h-[100px] rounded border border-gray-6 shrink-0 relative overflow-hidden">
                                <ImageWithInitialFallback
                                  src={product.image}
                                  alt={product.name}
                                  name={product.name}
                                  fallbackId={product.id}
                                  fill
                                  sizes="100px"
                                  className="size-full border-transparent border-0"
                                  letterClassName="text-2xl font-semibold"
                                />
                              </div>
                              <div className="flex flex-col justify-between flex-1 min-w-0">
                                <p className="text-base font-semibold text-gray-12">
                                  {product.name}
                                </p>
                                <p className="text-sm font-semibold text-gray-11">
                                  {formatProductCardBasePriceLabel(product)}
                                </p>
                              </div>
                            </div>
                            <div className="p-4">
                              <p className="text-base text-gray-12 mb-2">
                                {variationSectionTitle(product)}
                              </p>
                              <Dropdown
                                options={getVariationOptions(product)}
                                dataAttribute={`variation-${product.id}`}
                                width="w-full"
                                maxHeight="max-h-[200px]"
                                selectedIds={
                                  selectedVariations[
                                    getVariationKey(participantIndex, product.id)
                                  ]
                                    ? [
                                      selectedVariations[
                                      getVariationKey(
                                        participantIndex,
                                        product.id
                                      )
                                      ]!,
                                    ]
                                    : []
                                }
                                onSelect={handleVariationSelect(
                                  participantIndex,
                                  product.id
                                )}
                                trigger={() => {
                                  const selected = getSelectedVariation(participantIndex, product);
                                  const variationSideLabel = selected
                                    ? previewVariationListPriceLabelForProduct(
                                      product,
                                      selected.price,
                                      selected.name,
                                    )
                                    : undefined;
                                  return (
                                    <div className="w-full h-12 px-3 py-4 border border-gray-6 rounded-lg cursor-pointer hover:border-gray-8 transition-colors flex items-center justify-between gap-2 min-w-0">
                                      {selected ? (
                                        <>
                                          <p className="text-base text-gray-11 truncate min-w-0">
                                            {selected.name}
                                          </p>
                                          {variationSideLabel != null ? (
                                            <p className="text-base font-bold text-gray-12 shrink-0 tabular-nums">
                                              {variationSideLabel}
                                            </p>
                                          ) : null}
                                        </>
                                      ) : (
                                        <>
                                          <p className="text-base text-gray-11">
                                            Selecione a opção
                                          </p>
                                          <span className="text-gray-12 shrink-0">›</span>
                                        </>
                                      )}
                                    </div>
                                  );
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Optional Products */}
                    {getAdditionalProductsForParticipant(participantIndex).length > 0 && (
                      <div className="py-4">
                        <h3 className="text-base font-bold text-gray-12 mb-4">
                          Produtos adicionais (opcional)
                        </h3>
                        <div className="flex flex-col gap-3">
                          {getAdditionalProductsForParticipant(participantIndex).map((product) => (
                            <div
                              key={product.id}
                              className="bg-gray-2 border border-gray-6 rounded-xl"
                            >
                              <div className="flex gap-3 p-4 border-b border-gray-6">
                                <div className="w-[100px] h-[100px] rounded border border-gray-6 shrink-0 relative overflow-hidden">
                                  <ImageWithInitialFallback
                                    src={product.image}
                                    alt={product.name}
                                    name={product.name}
                                    fallbackId={product.id}
                                    fill
                                    sizes="100px"
                                    className="size-full border-transparent border-0"
                                    letterClassName="text-2xl font-semibold"
                                  />
                                </div>
                                <div className="flex flex-col justify-between flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-gray-12 line-clamp-2">
                                    {product.name}
                                  </p>
                                  <p className="text-base font-semibold text-gray-12">
                                    {formatProductCardBasePriceLabel(product)}
                                  </p>
                                </div>
                              </div>
                              <div className="p-4">
                                <p className="text-base text-gray-12 mb-2">
                                  {variationSectionTitle(product)}
                                </p>
                                <Dropdown
                                  options={getVariationOptions(product)}
                                  dataAttribute={`variation-${product.id}`}
                                  width="w-full"
                                  maxHeight="max-h-[200px]"
                                  selectedIds={
                                    selectedVariations[
                                      getVariationKey(participantIndex, product.id)
                                    ]
                                      ? [
                                        selectedVariations[
                                        getVariationKey(
                                          participantIndex,
                                          product.id
                                        )
                                        ]!,
                                      ]
                                      : []
                                  }
                                  onSelect={handleVariationSelect(
                                    participantIndex,
                                    product.id
                                  )}
                                  trigger={() => {
                                    const selected = getSelectedVariation(participantIndex, product);
                                    const variationSideLabel = selected
                                      ? previewVariationListPriceLabelForProduct(
                                        product,
                                        selected.price,
                                        selected.name,
                                      )
                                      : undefined;
                                    return (
                                      <div className="w-full h-12 px-3 py-4 border border-gray-6 rounded-lg cursor-pointer hover:border-gray-8 transition-colors flex items-center justify-between gap-2 min-w-0">
                                        {selected ? (
                                          <>
                                            <p className="text-base text-gray-11 truncate min-w-0">
                                              {selected.name}
                                            </p>
                                            {variationSideLabel != null ? (
                                              <p className="text-base font-bold text-gray-12 shrink-0 tabular-nums">
                                                {variationSideLabel}
                                              </p>
                                            ) : null}
                                          </>
                                        ) : (
                                          <>
                                            <p className="text-base text-gray-11">
                                              Selecione a opção
                                            </p>
                                            <span className="text-gray-12 shrink-0">›</span>
                                          </>
                                        )}
                                      </div>
                                    );
                                  }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <Button
                      className="w-full mt-4"
                      onClick={() => handleSaveAndNext(participantIndex)}
                      disabled={!hasAllRequiredVariations(participantIndex)}
                    >
                      Salvar e próximo
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
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
                ({ticket.quantity}x) {ticket.distance} {ticket.raceName}:{" "}
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
                {formatPrice(totalPrice + totalProductsPrice + (event.serviceFee || 0))}
              </span>
            </p>
          </div>
          <Button
            onClick={onNext}
            disabled={
              totalParticipants === 0 ||
              !participantsWithTickets.every(({ participantIndex }) =>
                isParticipantComplete(participantIndex)
              )
            }
          >
            Salvar e próximo
          </Button>
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:flex w-full items-start gap-11">
        {/* Coluna esquerda - Produtos */}
        <div className="flex-1 flex flex-col gap-6">
          <div className="w-full">
            <div className="flex items-center gap-2 text-2xl font-bold">
              <button
                className="cursor-pointer rotate-180 size-8 flex items-center justify-center rounded-full border border-gray-6"
                onClick={onBack}
              >
                <ArrowButton isOpen={false} />
              </button>
              <p className="text-2xl font-bold">Ficha de inscrição</p>
            </div>
            <p className="text-sm text-gray-11 mt-4">
              Revise seu pedido e conclua com cartão, Pix ou boleto. Os
              ingressos são liberados após aprovação.
            </p>
          </div>

          {/* Card do participante */}
          <div className="rounded-lg border border-gray-5 p-4">
            <h2 className="text-xl font-extrabold mb-4">
              Participante {selectedParticipant + 1}
            </h2>
            <div className="flex items-center gap-3 rounded-lg p-3 border border-gray-6 mb-6">
              <div className="w-12 h-12 rounded-full bg-gray-5 flex items-center justify-center shrink-0 overflow-hidden relative">
                {currentParticipant.name ? (
                  <span className="text-sm font-bold text-gray-12">
                    {currentParticipant.name.charAt(0).toUpperCase()}
                  </span>
                ) : (
                  <ImageWithInitialFallback
                    src={event.bannerUrl}
                    alt={event.name}
                    name={event.name}
                    fallbackId={event.id}
                    fill
                    sizes="48px"
                    className="size-full border-transparent border-0"
                    imgClassName="object-cover "
                    letterClassName="text-lg font-bold"
                  />
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-12">
                  {currentParticipant.name ||
                    `Participante ${selectedParticipant + 1}`}
                </p>
                <p className="text-sm text-gray-11 flex items-center gap-2 truncate">
                  {currentParticipant.birthDate &&
                    formatDateShort(currentParticipant.birthDate)}
                  {currentParticipant.gender && (
                    <>
                      <span className="size-1 bg-gray-11 rounded-full" />
                      {currentParticipant.gender}
                    </>
                  )}
                  {currentParticipant.cpf && (
                    <>
                      <span className="size-1 bg-gray-11 rounded-full" />
                      {maskCPF(currentParticipant.cpf)}
                    </>
                  )}
                </p>
              </div>
            </div>

            {/* Produtos do kit (obrigatório) */}
            <div className="mb-6">
              <h1 className="text-lg font-bold mb-4">
                Produtos do kit (obrigatório)
              </h1>
              <div className="grid grid-cols-2 gap-4">
                {getRequiredProductsForParticipant(selectedParticipant).map((product) => (
                  <div
                    key={product.id}
                    className="flex flex-col gap-3 border border-gray-6 rounded-lg p-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-[100px] h-[100px] rounded-lg shrink-0 relative overflow-hidden border border-gray-6">
                        <ImageWithInitialFallback
                          src={product.image}
                          alt={product.name}
                          name={product.name}
                          fallbackId={product.id}
                          fill
                          sizes="100px"
                          className="size-full border-transparent border-0"
                          letterClassName="text-2xl font-semibold"
                        />
                      </div>
                      <div className="flex flex-col gap-2 flex-1 min-w-0">
                        <p className="text-sm text-gray-12 font-semibold truncate">
                          {product.name}
                        </p>
                        <p className="text-sm text-gray-11 font-semibold">
                          {formatProductCardBasePriceLabel(product)}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 border-t border-gray-6 pt-3">
                      <p className="text-sm text-gray-12">{variationSectionTitle(product)}</p>
                      <Dropdown
                        options={getVariationOptions(product)}
                        dataAttribute={`variation-${product.id}`}
                        width="w-full"
                        maxHeight="max-h-[200px]"
                        selectedIds={
                          selectedVariations[
                            getVariationKey(selectedParticipant, product.id)
                          ]
                            ? [
                              selectedVariations[
                              getVariationKey(selectedParticipant, product.id)
                              ]!,
                            ]
                            : []
                        }
                        onSelect={handleVariationSelect(
                          selectedParticipant,
                          product.id
                        )}
                        trigger={() => {
                          const selected = getSelectedVariation(selectedParticipant, product);
                          const variationSideLabel = selected
                            ? previewVariationListPriceLabelForProduct(
                              product,
                              selected.price,
                              selected.name,
                            )
                            : undefined;
                          return (
                            <div className="w-full p-2 border border-gray-6 rounded-lg cursor-pointer hover:border-gray-8 transition-colors flex items-center justify-between gap-2 min-w-0">
                              {selected ? (
                                <>
                                  <p className="text-sm text-gray-12 truncate min-w-0">
                                    {selected.name}
                                  </p>
                                  {variationSideLabel != null ? (
                                    <p className="text-sm font-bold text-gray-12 shrink-0 tabular-nums">
                                      {variationSideLabel}
                                    </p>
                                  ) : null}
                                </>
                              ) : (
                                <>
                                  <p className="text-sm text-gray-12">
                                    Selecione a opção
                                  </p>
                                  <span className="text-gray-12 shrink-0">›</span>
                                </>
                              )}
                            </div>
                          );
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Produtos adicionais (opcional) */}
            {getAdditionalProductsForParticipant(selectedParticipant).length > 0 && (
              <div>
                <h1 className="text-lg font-bold mb-4">
                  Produtos adicionais (opcional)
                </h1>
                <div className="grid grid-cols-2 gap-4">
                  {getAdditionalProductsForParticipant(selectedParticipant).map((product) => (
                    <div
                      key={product.id}
                      className="flex flex-col gap-3 border border-gray-6 rounded-lg p-4"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-[100px] h-[100px] rounded-lg shrink-0 relative overflow-hidden border border-gray-6">
                          <ImageWithInitialFallback
                            src={product.image}
                            alt={product.name}
                            name={product.name}
                            fallbackId={product.id}
                            fill
                            sizes="100px"
                            className="size-full border-transparent border-0"
                            letterClassName="text-2xl font-semibold"
                          />
                        </div>
                        <div className="flex flex-col gap-2 flex-1 min-w-0">
                          <p className="text-sm text-gray-12 font-semibold line-clamp-2">
                            {product.name}
                          </p>
                          <p className="text-sm text-gray-12 font-semibold">
                            {formatProductCardBasePriceLabel(product)}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 border-t border-gray-6 pt-3">
                        <p className="text-sm text-gray-12">{variationSectionTitle(product)}</p>
                        <Dropdown
                          options={getVariationOptions(product)}
                          dataAttribute={`variation-${product.id}`}
                          width="w-full"
                          maxHeight="max-h-[200px]"
                          selectedIds={
                            selectedVariations[
                              getVariationKey(selectedParticipant, product.id)
                            ]
                              ? [
                                selectedVariations[
                                getVariationKey(selectedParticipant, product.id)
                                ]!,
                              ]
                              : []
                          }
                          onSelect={handleVariationSelect(
                            selectedParticipant,
                            product.id
                          )}
                          trigger={() => {
                            const selected = getSelectedVariation(selectedParticipant, product);
                            const variationSideLabel = selected
                              ? previewVariationListPriceLabelForProduct(
                                product,
                                selected.price,
                                selected.name,
                              )
                              : undefined;
                            return (
                              <div className="w-full p-2 border border-gray-6 rounded-lg cursor-pointer hover:border-gray-8 transition-colors flex items-center justify-between gap-2 min-w-0">
                                {selected ? (
                                  <>
                                    <p className="text-sm text-gray-12 truncate min-w-0">
                                      {selected.name}
                                    </p>
                                    {variationSideLabel != null ? (
                                      <p className="text-sm font-bold text-gray-12 shrink-0 tabular-nums">
                                        {variationSideLabel}
                                      </p>
                                    ) : null}
                                  </>
                                ) : (
                                  <>
                                    <p className="text-sm text-gray-12">
                                      Selecione a opção
                                    </p>
                                    <span className="text-gray-12 shrink-0">›</span>
                                  </>
                                )}
                              </div>
                            );
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Coluna direita - Participantes e resumo */}
        <div className="w-1/3 shrink-0">
          <div className="rounded-xl overflow-hidden bg-gray-2 shadow-[0_5px_10px_rgba(0,0,0,0.3)]">
            <div className="h-44 w-full relative shrink-0">
              <ImageWithInitialFallback
                src={event.bannerUrl}
                alt={event.name}
                name={event.name}
                fallbackId={event.id}
                fill
                sizes="100%"
                className="size-full border-transparent border-0 object-cover"
                letterClassName="text-5xl"
              />
            </div>

            <div className="flex flex-col justify-center px-4 py-4 border-r border-gray-6 flex-1 min-w-0">
              <div className="flex flex-col gap-2">
                <p className="text-base text-gray-11">Seu pedido:</p>
                <h1 className="text-xl font-bold text-gray-12 leading-tight">
                  {event.name}
                </h1>
                <p className="text-base font-medium text-gray-12">
                  Do dia {formatDate(event.eventDate)}
                </p>
              </div>
            </div>

            <div className="p-4 pt-2">
              <h1 className="text-lg font-bold mb-4">Participantes</h1>
              {/* Lista de participantes */}
              <div className="flex flex-col gap-4">
                {participantsWithTickets.map(
                  ({ ticket, participantIndex }, index) => {
                    const participant = participants[participantIndex];
                    const isSelected = selectedParticipant === participantIndex;
                    const ticketPrice = getTicketPrice(ticket);

                    return (
                      <div
                        key={participantIndex}
                        className={`rounded-lg p-3 border border-gray-6 cursor-pointer transition-colors ${isSelected ? "bg-gray-3" : "hover:bg-gray-3"
                          }`}
                        onClick={() => setSelectedParticipant(participantIndex)}
                      >
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <div className="flex items-center gap-2 flex-1">
                            <div className="w-12 h-12 rounded-full bg-gray-5 flex items-center justify-center shrink-0 overflow-hidden relative">
                              {participant?.name ? (
                                <span className="text-sm font-bold text-gray-12">
                                  {participant.name.charAt(0).toUpperCase()}
                                </span>
                              ) : null}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-12 truncate">
                                {participant?.name ||
                                  `Participante ${index + 1}`}
                              </p>
                              <p className="text-sm text-gray-11 flex items-center gap-2">
                                {participant?.birthDate &&
                                  formatDateShort(participant.birthDate)}
                                {participant?.gender && (
                                  <>
                                    <span className="size-1 bg-gray-11 rounded-full" />
                                    {participant.gender}
                                  </>
                                )}
                                {participant?.cpf && (
                                  <>
                                    <span className="size-1 bg-gray-11 rounded-full" />
                                    {maskCPF(participant.cpf)}
                                  </>
                                )}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Itens do participante */}
                        <div className="flex flex-col gap-2 border-y border-gray-6 py-4 mb-3">
                          <p className="text-sm font-medium text-gray-12 flex items-center justify-between">
                            <span className="flex flex-col gap-0.5">
                              {(ticket.groupId && categories.find(c => c.id === ticket.groupId)?.name) ? (
                                <span className="text-xs font-normal text-gray-11">
                                  {categories.find(c => c.id === ticket.groupId)?.name}
                                </span>
                              ) : (
                                <span className="text-xs font-normal text-gray-11">
                                  Ingresso Avulso
                                </span>
                              )
                              }
                              {ticket.name}
                            </span>
                            <span className="text-gray-12 font-bold shrink-0">
                              {formatPrice(ticketPrice)}
                            </span>
                          </p>
                          {getAdditionalProductsCount(participantIndex) > 0 && (
                            <p className="text-sm font-medium text-gray-12 flex items-center justify-between">
                              {getAdditionalProductsCount(participantIndex)}x Itens adicionais:
                              <span className="text-gray-12 font-bold">
                                {formatPrice(getAdditionalProductsTotal(participantIndex))}
                              </span>
                            </p>
                          )}
                        </div>

                        {/* Status e botão */}
                        <div className="flex items-center justify-between">
                          <p
                            className={`text-sm font-medium rounded-full px-3 py-1 ${isParticipantComplete(participantIndex)
                              ? "bg-primary-3 text-primary-12"
                              : "bg-yellow-3 text-yellow-12"
                              }`}
                          >
                            {isParticipantComplete(participantIndex)
                              ? "Concluído"
                              : "Pendente"}
                          </p>
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedParticipant(participantIndex);
                            }}
                            variant="ghost"
                            size="sm"
                            className="border border-gray-6"
                          >
                            {isParticipantComplete(participantIndex)
                              ? "Editar"
                              : "Selecionar"}
                          </Button>
                        </div>
                      </div>
                    );
                  }
                )}
              </div>

              {/* Resumo do pedido */}
              <div className="flex flex-col gap-2 mt-6">
                <p className="text-sm font-medium text-gray-11 flex items-center justify-between">
                  Taxa de serviço:
                  <span className="text-gray-12">
                    {formatPrice(event.serviceFee || 0)}
                  </span>
                </p>
              </div>

              <div className="flex items-center justify-between text-xl font-bold text-gray-12 mt-4 border-t border-gray-6 pt-4">
                <p>Total:</p>
                <p>
                  {formatPrice(
                    (event.serviceFee || 0) +
                    totalPrice +
                    totalProductsPrice
                  )}
                </p>
              </div>

              <Button
                onClick={onNext}
                className="w-full mt-8 font-bold"
                isLoading={isSubmitting}
                disabled={
                  isSubmitting ||
                  totalParticipants === 0 ||
                  !participantsWithTickets.every(({ participantIndex }) =>
                    isParticipantComplete(participantIndex)
                  )
                }
              >
                Salvar e próximo
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
