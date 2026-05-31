"use client";
import { Button } from "../Button";
import type { Event } from "@/interfaces/event";
import { ArrowButton } from "../ArrowButton";
import { ChevronDown } from "lucide-react";
import { ImageWithInitialFallback } from "@/components/ImageWithInitialFallback";
import { Dropdown, DropdownOption } from "../Dropdown";
import { useState, useMemo, useEffect, useRef } from "react";
import { useCheckout } from "@/contexts/CheckoutContext";
import { useCheckoutTimer } from "@/contexts/CheckoutTimerContext";
import { useCheckoutReservation } from "@/hooks/useCheckoutReservation";
import { buildProductsPatchPayload } from "@/lib/checkoutParticipants";
import {
  ticketUnitPriceForPrePaymentCents,
  isHiddenPrePaymentCoupon,
} from "@/lib/orderAutoCouponDisplay";
import {
  computeCouponDiscount,
  formatCouponLineLabel,
  formatVoucherLineLabel,
} from "@/lib/orderCouponDiscount";
import type { Ticket } from "@/hooks/useTickets";
import { buildParticipantTicketSlots } from "@/lib/checkoutProductStep";
import { useSubscriptionData } from "@/hooks/useSubscriptionData";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loading } from "../Loading";
import { MobileSummaryBar } from "./MobileSummaryBar";
import { ImageCarouselModal } from "./ImageCarouselModal";
import {
  type Product,
  formatPrice,
  previewVariationListPriceLabelForProduct,
  formatProductCardBasePriceLabel,
  variationSectionTitle,
  billableReaisForProductSelection,
  getVariationKey,
  parseVariationKey,
  formatDateShort,
  maskCPF,
  formatDate,
} from "./SubscriptionStep.utils";

interface SubscriptionStepProps {
  event: Event;
  onNext: () => void;
  onBack: () => void;
  isSubmitting?: boolean;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ProductCardGallery({ product }: { product: Product }) {
  const allImages = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    const add = (src: string | null | undefined) => {
      if (src && !seen.has(src)) { seen.add(src); out.push(src); }
    };
    add(product.image);
    for (const img of product.images ?? []) add(img);
    return out;
  }, [product.image, product.images]);

  const modalItems = useMemo(
    () => allImages.map((src, i) => ({ id: `${product.id}-${i}`, name: product.name, src })),
    [allImages, product.id, product.name],
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const safeIndex = Math.min(currentIndex, Math.max(0, allImages.length - 1));
  const currentSrc = allImages[safeIndex] ?? null;
  const hasMultiple = allImages.length > 1;

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((i) => (i === 0 ? allImages.length - 1 : i - 1));
  };
  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((i) => (i === allImages.length - 1 ? 0 : i + 1));
  };

  return (
    <>
      <div
        className="w-[100px] h-[100px] rounded border border-gray-6 relative overflow-hidden shrink-0 group cursor-pointer"
        onClick={() => setIsModalOpen(true)}
      >
        <ImageWithInitialFallback
          src={currentSrc}
          alt={product.name}
          name={product.name}
          fallbackId={product.id}
          fill
          sizes="100px"
          className="size-full border-0"
          letterClassName="text-2xl font-semibold"
        />
        {hasMultiple && (
          <>
            <button
              type="button"
              onClick={handlePrev}
              className="absolute left-0 top-0 h-full w-7 flex items-center justify-center"
              aria-label="Imagem anterior"
            >
              <div className="rotate-180 scale-75 size-6 bg-gray-4 hover:bg-gray-1 transition-all duration-300 ease-in-out flex items-center justify-center rounded-full">
                <ArrowButton isOpen={false} />
              </div>
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="absolute right-0 top-0 h-full w-7 flex items-center justify-center"
              aria-label="Próxima imagem"
            >
              <div className="scale-75 size-6 bg-gray-4 hover:bg-gray-1 transition-all duration-300 ease-in-out flex items-center justify-center rounded-full">
                <ArrowButton isOpen={false} />
              </div>
            </button>
            <div className="absolute bottom-1 left-0 right-0 flex justify-center gap-1">
              {allImages.map((_, idx) => (
                <span
                  key={idx}
                  className={`block rounded-full transition-all ${idx === safeIndex ? "w-3 h-1.5 bg-white" : "w-1.5 h-1.5 bg-white/50"}`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {modalItems.length > 0 && (
        <ImageCarouselModal
          items={modalItems}
          initialIndex={safeIndex}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          ticketName={product.name}
        />
      )}
    </>
  );
}

function DropdownTrigger({
  selected,
  sideLabel,
  variant,
}: {
  selected: Product["variations"][number] | null;
  sideLabel: string | undefined;
  variant: "mobile" | "desktop";
}) {
  if (variant === "mobile") {
    return (
      <div className="w-full h-12 px-3 py-4 border border-gray-7 rounded-lg cursor-pointer hover:border-gray-8 transition-colors flex items-center justify-between gap-2 min-w-0">
        <p className={`text-base truncate min-w-0 ${selected ? "text-gray-12" : "text-gray-11"}`}>
          {selected ? selected.name : "Selecione a opção"}
        </p>
        <div className="flex items-center gap-2 shrink-0">
          {selected && sideLabel != null ? (
            <p className="text-base font-bold text-gray-12 tabular-nums">{sideLabel}</p>
          ) : null}
          <ChevronDown className="size-5 text-gray-11" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full p-2 border border-gray-6 rounded-lg cursor-pointer hover:border-gray-8 transition-colors flex items-center justify-between gap-2 min-w-0">
      {selected ? (
        <>
          <p className="text-sm text-gray-12 truncate min-w-0">{selected.name}</p>
          {sideLabel != null ? (
            <p className="text-sm font-bold text-gray-12 shrink-0 tabular-nums">{sideLabel}</p>
          ) : null}
        </>
      ) : (
        <>
          <p className="text-sm text-gray-12">Selecione a opção</p>
          <span className="text-gray-12 shrink-0">›</span>
        </>
      )}
    </div>
  );
}

function ProductCard({
  product,
  selectedVariationId,
  variationOptions,
  onSelect,
  selectedVariation,
  variant,
}: {
  product: Product;
  selectedVariationId: string | null | undefined;
  variationOptions: DropdownOption[];
  onSelect: (opt: DropdownOption) => void;
  selectedVariation: Product["variations"][number] | null;
  variant: "mobile" | "desktop";
}) {
  const sideLabel = selectedVariation
    ? previewVariationListPriceLabelForProduct(product, selectedVariation.price, selectedVariation.name)
    : undefined;

  if (variant === "mobile") {
    return (
      <div className="bg-gray-2 border border-gray-6 rounded-xl">
        <div className="flex flex-col gap-3 p-4 border-b border-gray-6">
          {product.isIncludedInTicket && !selectedVariation && (
            <span className="self-start inline-flex items-center gap-1.5 h-[27px] px-3 rounded-xl bg-[#fff7c2] border border-[#f3d673]">
              <span className="size-1.5 rounded-full bg-[#4f3422]" />
              <span className="text-xs font-semibold leading-none text-[#4f3422]">Falta escolher a variação</span>
            </span>
          )}
          <div className="flex gap-3">
            <ProductCardGallery product={product} />
            <div className="flex flex-col justify-between flex-1 min-w-0">
              <p className="text-base font-semibold text-gray-12">{product.name}</p>
              <p className="text-sm font-semibold text-gray-11">
                {formatProductCardBasePriceLabel(product)}
              </p>
            </div>
          </div>
        </div>
        <div className="p-4">
          <p className="text-base text-gray-12 mb-2">{variationSectionTitle(product)}</p>
          <Dropdown
            options={variationOptions}
            dataAttribute={`variation-${product.id}`}
            width="w-full"
            maxHeight="max-h-[200px]"
            selectedIds={selectedVariationId ? [selectedVariationId] : []}
            onSelect={onSelect}
            trigger={() => (
              <DropdownTrigger selected={selectedVariation} sideLabel={sideLabel} variant="mobile" />
            )}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 border border-gray-6 rounded-lg p-4">
      {product.isIncludedInTicket && !selectedVariation && (
        <span className="self-start inline-flex items-center gap-1.5 h-[27px] px-3 rounded-xl bg-[#fff7c2] border border-[#f3d673]">
          <span className="size-1.5 rounded-full bg-[#4f3422]" />
          <span className="text-xs font-semibold leading-none text-[#4f3422]">Falta escolher a variação</span>
        </span>
      )}
      <div className="flex items-start gap-3">
        <ProductCardGallery product={product} />
        <div className="flex flex-col h-[100px] justify-between gap-2 flex-1 min-w-0">
          <p className="text-sm text-gray-12 font-semibold truncate">{product.name}</p>
          <p className="text-sm text-gray-11 font-semibold">
            {formatProductCardBasePriceLabel(product)}
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-2 border-t border-gray-6 pt-3">
        <p className="text-sm text-gray-12">{variationSectionTitle(product)}</p>
        <Dropdown
          options={variationOptions}
          dataAttribute={`variation-${product.id}`}
          width="w-full"
          maxHeight="max-h-[200px]"
          selectedIds={selectedVariationId ? [selectedVariationId] : []}
          onSelect={onSelect}
          trigger={() => (
            <DropdownTrigger selected={selectedVariation} sideLabel={sideLabel} variant="desktop" />
          )}
        />
      </div>
    </div>
  );
}

function ProductsSection({
  title,
  products,
  participantIndex,
  selectedVariations,
  onVariationSelect,
  getVariationOptions,
  getSelectedVariation,
  variant,
}: {
  title: string;
  products: Product[];
  participantIndex: number;
  selectedVariations: Record<string, string | null>;
  onVariationSelect: (participantIndex: number, productId: string) => (opt: DropdownOption) => void;
  getVariationOptions: (product: Product) => DropdownOption[];
  getSelectedVariation: (participantIndex: number, product: Product) => Product["variations"][number] | null;
  variant: "mobile" | "desktop";
}) {
  if (products.length === 0) return null;

  return (
    <div className={variant === "mobile" ? "py-4 border-b border-gray-6" : "mb-6"}>
      <h3 className={variant === "mobile" ? "text-base font-bold text-gray-12 mb-4" : "text-lg font-bold mb-4"}>
        {title}
      </h3>
      <div className={variant === "mobile" ? "flex flex-col gap-3" : "grid grid-cols-2 gap-4"}>
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            selectedVariationId={selectedVariations[getVariationKey(participantIndex, product.id)]}
            variationOptions={getVariationOptions(product)}
            onSelect={onVariationSelect(participantIndex, product.id)}
            selectedVariation={getSelectedVariation(participantIndex, product)}
            variant={variant}
          />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function SubscriptionStep({
  event,
  onNext,
  onBack,
  isSubmitting = false,
}: SubscriptionStepProps) {
  const { raceQuantities, participants, updateParticipant } = useCheckout();
  const eventId = event?.id;

  const {
    loading,
    categories,
    categorizedTickets,
    uncategorizedTickets,
    allProducts,
    ticketProductsMap,
    getProductsForTicket,
    requiredProducts,
    additionalProducts,
  } = useSubscriptionData(eventId);

  // ---- Order autoritativa (backend) ---------------------------------------
  // Os valores de preço/taxa/total exibidos vêm da reserva criada pelo backend.
  // Cálculo local (parsing de `ticket.price`, % do evento) fica apenas como
  // fallback enquanto a query carrega — o estado autoritativo de quanto será
  // cobrado é sempre o do servidor (evita divergência com o que o usuário paga).
  const { orderId, currentOrder: timerCurrentOrder, syncFromOrder } = useCheckoutTimer();
  const { getOrder, patchProducts } = useCheckoutReservation();
  const queryClient = useQueryClient();
  const { data: orderData } = useQuery({
    queryKey: ["checkout-order", orderId],
    queryFn: async () => (orderId ? getOrder(orderId) : null),
    enabled: !!orderId,
    // Checkout exige 100% server-driven: nada de cache.
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
  });

  /* Eager-patch server-driven dos PRODUTOS: ao mudar variação/produto, envia o
   * PATCH /products (mesmo builder do "próximo") com DEBOUNCE e refetch da order
   * — o `pricing` do servidor (taxa/cupom sobre o subtotal com produtos) passa a
   * refletir a escolha sem esperar o "próximo". Guarda por assinatura evita
   * patch idêntico; falha é silenciosa (o "próximo" reenvia). */
  const lastProductsSigRef = useRef<string | null>(null);
  const productsDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!orderId) return;
    const payload = buildProductsPatchPayload(participants);
    const sig = JSON.stringify(payload);
    if (lastProductsSigRef.current === sig) return;
    lastProductsSigRef.current = sig;
    if (productsDebounceRef.current) clearTimeout(productsDebounceRef.current);
    productsDebounceRef.current = setTimeout(() => {
      patchProducts(orderId, payload)
        .then((updated) => {
          syncFromOrder(updated);
          queryClient.invalidateQueries({ queryKey: ["checkout-order", orderId] });
        })
        .catch(() => {
          lastProductsSigRef.current = null; // libera retry
        });
    }, 400);
    return () => {
      if (productsDebounceRef.current) clearTimeout(productsDebounceRef.current);
    };
  }, [orderId, participants, patchProducts, syncFromOrder, queryClient]);

  // Map ticketId → preço unitário (em reais) vindo da order.
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
    // Fallback: parse local da string (ex.: "R$ 199,90") enquanto a order
    // ainda não foi carregada.
    try {
      return parseFloat(ticket.price.replace(/[^\d,]/g, "").replace(",", "."));
    } catch {
      return 0;
    }
  };

  const [selectedVariations, setSelectedVariations] = useState<Record<string, string | null>>({});
  const [selectedParticipant, setSelectedParticipant] = useState<number>(0);
  const [expandedParticipants, setExpandedParticipants] = useState<Record<number, boolean>>({ 0: true });
  const [completedParticipants, setCompletedParticipants] = useState<Record<number, boolean>>({});

  const isUpdatingFromContextRef = useRef(false);

  const participantsWithTickets = useMemo(
    () => buildParticipantTicketSlots(categorizedTickets, uncategorizedTickets, raceQuantities),
    [raceQuantities, categorizedTickets, uncategorizedTickets],
  );

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

  useEffect(() => {
    if (isUpdatingFromContextRef.current) {
      isUpdatingFromContextRef.current = false;
      return;
    }

    const variationsByParticipant: Record<number, Record<string, string | null>> = {};

    Object.keys(selectedVariations).forEach((key) => {
      try {
        const { participantIndex, productId } = parseVariationKey(key);
        if (!variationsByParticipant[participantIndex]) {
          variationsByParticipant[participantIndex] = {};
        }
        variationsByParticipant[participantIndex][productId] = selectedVariations[key];
      } catch {
        console.warn("Invalid variation key format:", key);
      }
    });

    Object.keys(variationsByParticipant).forEach((participantIndexStr) => {
      const participantIndex = Number(participantIndexStr);
      const participantVariations = variationsByParticipant[participantIndex];
      const currentVariations = participants[participantIndex]?.productVariations || {};
      const hasChanges = JSON.stringify(currentVariations) !== JSON.stringify(participantVariations);

      if (hasChanges) {
        isUpdatingFromContextRef.current = true;
        updateParticipant(participantIndex, { productVariations: participantVariations });
      }
    });
  }, [selectedVariations]);

  useEffect(() => {
    if (isUpdatingFromContextRef.current) {
      isUpdatingFromContextRef.current = false;
      return;
    }

    const updated: Record<string, string | null> = {};

    const allProductsList = [...requiredProducts, ...additionalProducts];
    const productIdMap = new Map<string, string>();
    allProductsList.forEach((product) => {
      productIdMap.set(product.id, product.id);
      if (product.id.length > 8) {
        productIdMap.set(product.id.substring(0, 8), product.id);
      }
    });

    participantsWithTickets.forEach(({ participantIndex }) => {
      const participant = participants[participantIndex];
      if (participant?.productVariations) {
        Object.keys(participant.productVariations).forEach((savedProductId) => {
          const fullProductId =
            productIdMap.get(savedProductId) ||
            allProductsList.find((p) => p.id.startsWith(savedProductId))?.id ||
            savedProductId;

          if (fullProductId) {
            const variationKey = getVariationKey(participantIndex, fullProductId);
            updated[variationKey] = participant.productVariations![savedProductId];
          }
        });
      }
    });

    setSelectedVariations((prev) => {
      const prevKeys = Object.keys(prev).sort();
      const updatedKeys = Object.keys(updated).sort();
      const keysMatch =
        prevKeys.length === updatedKeys.length &&
        prevKeys.every((key, i) => key === updatedKeys[i]);

      if (keysMatch) {
        const valuesMatch = prevKeys.every((key) => prev[key] === updated[key]);
        if (valuesMatch) return prev;
      }

      return { ...prev, ...updated };
    });
  }, [participants, participantsWithTickets, requiredProducts, additionalProducts]);

  useEffect(() => {
    if (loading) return;

    setSelectedVariations((prev) => {
      const additions: Record<string, string> = {};

      for (const { participantIndex, ticketId } of participantsWithTickets) {
        const ticketProductIds = ticketProductsMap[ticketId] || [];
        if (ticketProductIds.length === 0) continue;

        const ticketProducts = allProducts.filter((p) => ticketProductIds.includes(p.id));

        for (const product of ticketProducts) {
          const needsVariationChoice = product.isRequired || !product.isIncludedInTicket;
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

  const getVariationOptions = (product: Product): DropdownOption[] => {
    if (!product.variations || product.variations.length === 0) return [];
    return product.variations.map((variation, index) => ({
      id: variation.id || `${product.id}-${index}`,
      label: variation.name,
      suffix: previewVariationListPriceLabelForProduct(product, variation.price, variation.name),
    }));
  };

  const getSelectedVariation = (
    participantIndex: number,
    product: Product,
  ): Product["variations"][number] | null => {
    const variationKey = getVariationKey(participantIndex, product.id);
    const selectedId = selectedVariations[variationKey];
    if (!selectedId) return null;
    return (
      product.variations.find((v, i) => (v.id || `${product.id}-${i}`) === selectedId) ?? null
    );
  };

  const handleVariationSelect =
    (participantIndex: number, productId: string) =>
      (option: DropdownOption) => {
        const variationKey = getVariationKey(participantIndex, productId);
        setSelectedVariations((prev) => ({
          ...prev,
          [variationKey]: option.id || null,
        }));
      };

  const handleParticipantSelect = (participantIndex: number) => {
    setExpandedParticipants({ [participantIndex]: true });
    setSelectedParticipant(participantIndex);
  };

  const toggleParticipant = (participantIndex: number) => {
    setExpandedParticipants((prev) => {
      const isCurrentlyExpanded = prev[participantIndex] || false;
      if (!isCurrentlyExpanded) {
        setSelectedParticipant(participantIndex);
        return { [participantIndex]: true };
      }
      const newState = { ...prev };
      delete newState[participantIndex];
      return newState;
    });
  };

  const hasAllRequiredVariations = (participantIndex: number): boolean => {
    const allParticipantProducts = [
      ...getRequiredProductsForParticipant(participantIndex),
      ...getAdditionalProductsForParticipant(participantIndex),
    ];
    const productsNeedingSelection = allParticipantProducts.filter(
      (p) => p.variations.length > 1
    );
    if (productsNeedingSelection.length === 0) return true;

    const contextVariations = participants[participantIndex]?.productVariations ?? {};

    return productsNeedingSelection.every((product) => {
      const variationKey = getVariationKey(participantIndex, product.id);
      const val = selectedVariations[variationKey] ?? contextVariations[product.id];
      return val != null && val !== "";
    });
  };

  const isParticipantComplete = (participantIndex: number): boolean => {
    if (completedParticipants[participantIndex]) return true;
    return hasAllRequiredVariations(participantIndex);
  };

  /* Existe outro participante PENDENTE além deste? Usado pra decidir o label do
   * botão do card no mobile: "Salvar e próximo" quando há um próximo pra abrir,
   * "Salvar" no último/único. Espelha exatamente o filtro de `nextParticipant`
   * em `handleSaveAndNext` (exclui o atual + os já confirmados + os que já têm
   * todas as variações). */
  const hasNextPendingParticipant = (participantIndex: number): boolean =>
    participantsWithTickets.some((p) => {
      if (p.participantIndex === participantIndex) return false;
      if (completedParticipants[p.participantIndex]) return false;
      return !hasAllRequiredVariations(p.participantIndex);
    });

  /* Ao montar a página, se o primeiro participante já está completo (ex.:
   * todos os produtos têm variação única auto-preenchida pelo effect da linha
   * 495, ou usuário voltou da próxima etapa com seleções salvas), abre o
   * primeiro pendente em vez de manter o 0 expandido. Roda uma única vez por
   * mount — depois disso, navegação entre cards fica nas mãos do usuário
   * (toggle/save-and-next). */
  const initialFocusRef = useRef(false);
  useEffect(() => {
    if (initialFocusRef.current) return;
    if (loading) return;
    if (participantsWithTickets.length === 0) return;

    const firstPending = participantsWithTickets.find(
      (p) => !hasAllRequiredVariations(p.participantIndex)
    );
    if (firstPending && firstPending.participantIndex !== selectedParticipant) {
      setSelectedParticipant(firstPending.participantIndex);
      setExpandedParticipants({ [firstPending.participantIndex]: true });
    }
    initialFocusRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, participantsWithTickets, selectedVariations]);

  /* `advanceOnComplete`: quando NÃO há próximo pendente (último/único
   * participante), avança a etapa via `onNext()`. O desktop usa o default
   * `true` (o botão do resumo é o único meio de avançar). No mobile passamos
   * `false`: o card apenas salva/minimiza e o avanço fica a cargo do botão
   * "Confirmar produtos" do menu fixo. */
  const handleSaveAndNext = (participantIndex: number, advanceOnComplete = true) => {
    if (!isParticipantComplete(participantIndex)) return;

    const newCompleted = { ...completedParticipants, [participantIndex]: true };
    setCompletedParticipants(newCompleted);

    setExpandedParticipants((prev) => {
      const newState = { ...prev };
      delete newState[participantIndex];
      return newState;
    });

    const nextParticipant = participantsWithTickets.find((p) => {
      if (p.participantIndex === participantIndex) return false;
      if (newCompleted[p.participantIndex]) return false;
      return !hasAllRequiredVariations(p.participantIndex);
    });

    if (nextParticipant) {
      setSelectedParticipant(nextParticipant.participantIndex);
      setExpandedParticipants((prev) => ({
        ...prev,
        [nextParticipant.participantIndex]: true,
      }));
    } else if (advanceOnComplete) {
      onNext();
    }

    // Mobile: ao salvar, sobe o scroll da tela (após o reflow do colapso/expansão).
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches) {
      requestAnimationFrame(() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    }
  };

  const getAdditionalProductsTotal = (participantIndex: number): number => {
    const participantAdditionalProducts = getAdditionalProductsForParticipant(participantIndex);
    return participantAdditionalProducts.reduce((total, product) => {
      const selectedVariation = getSelectedVariation(participantIndex, product);
      if (!selectedVariation) return total;
      return total + billableReaisForProductSelection(product, selectedVariation);
    }, 0);
  };

  const getRequiredProductsTotal = (participantIndex: number): number => {
    const participantRequiredProducts = getRequiredProductsForParticipant(participantIndex);
    return participantRequiredProducts.reduce((total, product) => {
      const selectedVariation = getSelectedVariation(participantIndex, product);
      return total + billableReaisForProductSelection(product, selectedVariation);
    }, 0);
  };

  const getAllProductsTotal = (participantIndex: number): number =>
    getRequiredProductsTotal(participantIndex) + getAdditionalProductsTotal(participantIndex);

  const getAdditionalProductsCount = (participantIndex: number): number => {
    const participantAdditionalProducts = getAdditionalProductsForParticipant(participantIndex);
    return participantAdditionalProducts.filter((product) => {
      const variationKey = getVariationKey(participantIndex, product.id);
      return selectedVariations[variationKey] !== null && selectedVariations[variationKey] !== undefined;
    }).length;
  };

  const { totalParticipants, totalPrice } = useMemo(() => {
    let participantsCount = 0;
    let total = 0;
    participantsWithTickets.forEach(({ ticket }) => {
      participantsCount++;
      total += getTicketPrice(ticket);
    });
    return { totalParticipants: participantsCount, totalPrice: total };
  }, [participantsWithTickets]);

  const groupedTickets = useMemo(() => {
    const grouped: Array<{
      quantity: number;
      raceName: string;
      categoryName?: string;
      distance: string;
      price: number;
      total: number;
    }> = [];

    const ticketMap = new Map<string, { ticket: Ticket; quantity: number }>();
    const categoryById = new Map(categories.map((c) => [c.id, c.name]));

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
        categoryName: ticket.groupId ? categoryById.get(ticket.groupId) : undefined,
        distance: ticket.distance ? `${ticket.distance} ${ticket.distanceUnit || ""}` : "",
        price: getTicketPrice(ticket),
        total: getTicketPrice(ticket) * quantity,
      });
    });

    return grouped;
  }, [participantsWithTickets, categories]);

  const totalProductsPrice = useMemo(() => {
    return participantsWithTickets.reduce((total, { participantIndex }) => {
      return total + getAllProductsTotal(participantIndex);
    }, 0);
  }, [participantsWithTickets, selectedVariations, allProducts]);

  // Cupom aplicado + cálculo de desconto. No SubscriptionStep o estado local
  // de produtos é SEMPRE a fonte da verdade — o backend só recebe via
  // `patchProducts` no `handleNext`, então o `pricing.couponDiscount` /
  // `pricing.total` podem refletir um snapshot stale (produto antigo,
  // variação trocada por gratuita, etc.). Calculamos tudo client-side com
  // `computeCouponDiscount` espelhando a regra do backend, e ele reconcilia
  // no save.
  //
  // Prioriza `currentOrder` do CheckoutTimerContext: ele é populado pela
  // response do `patchCoupon` (que tem certeza de incluir `applyToProducts`).
  // O GET /orders pode omitir esse campo em algumas versões do backend, então
  // usamos o snapshot do timer como fonte primária e o orderData como fallback.
  const appliedCoupon = timerCurrentOrder?.coupon ?? orderData?.coupon ?? null;
  // Revela AGE pré-pagamento; só QUANTITY fica escondido. Cupom é UMA linha só
  // (qualquer tipo): valor de `pricing.couponDiscount`, rótulo por `couponType`.
  const showCouponDiscount = !!appliedCoupon && !isHiddenPrePaymentCoupon(appliedCoupon);
  const appliedVoucher = timerCurrentOrder?.voucher ?? orderData?.voucher ?? null;

  // Pricing do servidor (centavos). O backend recomputa a cada PATCH /products
  // (debounce acima) e devolve a linha de cupom + voucher + taxa + total. Usa
  // server sempre que há pricing; o fallback client-side cobre só o load.
  const serverPricing = orderData?.pricing ?? timerCurrentOrder?.pricing ?? null;
  const useServerPricing = !!serverPricing;

  // ── Fallback client-side (só durante o load, antes do 1º pricing) ──
  const couponBreakdown = useMemo(
    () => computeCouponDiscount(appliedCoupon, totalPrice, totalProductsPrice),
    [appliedCoupon, totalPrice, totalProductsPrice],
  );
  const voucherFallback = useMemo(() => {
    if (!appliedVoucher) return 0;
    const cents =
      timerCurrentOrder?.pricing?.voucherDiscount ??
      orderData?.pricing?.voucherDiscount ??
      0;
    return Math.min(totalPrice, Math.max(0, cents / 100));
  }, [appliedVoucher, timerCurrentOrder, orderData, totalPrice]);

  // ── Valores exibidos: SERVER quando há pricing, senão fallback ──
  const couponDiscountAmount = !showCouponDiscount
    ? 0
    : useServerPricing
      ? (serverPricing!.couponDiscount ?? 0) / 100
      : couponBreakdown.totalDiscount;
  const hasCouponLine = !!appliedCoupon && showCouponDiscount && couponDiscountAmount > 0;

  const voucherDiscountAmount = useServerPricing
    ? (serverPricing!.voucherDiscount ?? 0) / 100
    : voucherFallback;
  const hasVoucherLine = !!appliedVoucher && voucherDiscountAmount > 0;

  // Subtotal pós-desconto — base da taxa no FALLBACK ((tickets+produtos) -
  // cupom - voucher), clamp em 0.
  const subtotalAfterCoupon = useMemo(
    () =>
      Math.max(
        0,
        totalPrice + totalProductsPrice - couponDiscountAmount - voucherDiscountAmount,
      ),
    [totalPrice, totalProductsPrice, couponDiscountAmount, voucherDiscountAmount],
  );

  // Taxa e total: no caminho SERVER vêm direto da order; no FALLBACK, recomputa.
  const serviceFee = useServerPricing
    ? (serverPricing!.serviceFee ?? 0) / 100
    : subtotalAfterCoupon * ((event.participantFeePercent ?? 0) / 100);
  const totalAmount = useServerPricing
    ? (serverPricing!.total ?? 0) / 100
    : subtotalAfterCoupon + serviceFee;

  if (loading) return <Loading />;

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
        <div className="pb-4 md:pb-0 md:py-6">
          <p className="text-sm text-gray-11">
            Configure os itens do seu kit antes de seguir para a etapa de conclusão da inscrição.
          </p>
        </div>

        <div className="pb-6 flex flex-col gap-4">
          {participantsWithTickets.map(({ ticket, participantIndex }, index) => {
            const participant = participants[participantIndex];
            const isExpanded = expandedParticipants[participantIndex] || false;
            const ticketPrice = getTicketPrice(ticket);
            const isCompleted = isParticipantComplete(participantIndex);

            return (
              <div
                key={participantIndex}
                className="border border-gray-6 rounded-xl bg-white"
              >
                {/* Header */}
                <div
                  className={`p-2 border-b border-gray-6 ${!isExpanded ? "hover:bg-gray-2 transition-colors cursor-pointer" : ""}`}
                  onClick={!isExpanded ? () => handleParticipantSelect(participantIndex) : undefined}
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

                {/* Collapsed View */}
                <div
                  className={`transition-all duration-300 ease-in-out ${!isExpanded ? "max-h-[200px] opacity-100" : "max-h-0 opacity-0 overflow-hidden"}`}
                >
                  <div className="px-3 py-5 border-b border-gray-6">
                    {getAdditionalProductsCount(participantIndex) > 0 && (
                      <div className="flex items-center justify-between mb-6">
                        <p className="text-sm font-semibold text-gray-12">
                          {getAdditionalProductsCount(participantIndex)}x {getAdditionalProductsCount(participantIndex) > 1 ? "Itens adicionais" : "Item adicional"}:
                        </p>
                        <p className="text-base font-bold text-gray-12">
                          {formatPrice(getAdditionalProductsTotal(participantIndex))}
                        </p>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-gray-12">{ticket.name}</p>
                      <p className="text-base font-bold text-gray-12">{formatPrice(ticketPrice)}</p>
                    </div>
                  </div>
                  <div className="px-3 py-4 flex items-center justify-between">
                    <div
                      className={`px-3 py-1 rounded-full text-sm font-medium ${isCompleted ? "bg-primary-3 text-primary-12" : "bg-yellow-3 text-yellow-12"}`}
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

                {/* Expanded View */}
                <div
                  className={`transition-all duration-300 ease-in-out ${isExpanded ? "max-h-[5000px] opacity-100" : "max-h-0 opacity-0 overflow-hidden pointer-events-none"}`}
                >
                  <div className="p-4 border-b border-gray-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <h2 className="text-lg font-extrabold text-gray-12">
                          Participante {participantIndex + 1}
                        </h2>
                        <div
                          className={`px-3 py-1 rounded-full text-sm font-medium ${isCompleted ? "bg-primary-3 text-primary-12" : "bg-yellow-3 text-yellow-12"}`}
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

                    <div className="py-5 border-b border-gray-6">
                      {getAdditionalProductsCount(participantIndex) > 0 && (
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-semibold text-gray-12">
                            {getAdditionalProductsCount(participantIndex)}x {getAdditionalProductsCount(participantIndex) > 1 ? "Itens adicionais" : "Item adicional"}:
                          </p>
                          <p className="text-base font-bold text-gray-12">
                            {formatPrice(getAdditionalProductsTotal(participantIndex))}
                          </p>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-gray-12">{ticket.name}</p>
                        <p className="text-base font-bold text-gray-12">{formatPrice(ticketPrice)}</p>
                      </div>
                    </div>

                    <ProductsSection
                      title="Produtos do kit"
                      products={getRequiredProductsForParticipant(participantIndex)}
                      participantIndex={participantIndex}
                      selectedVariations={selectedVariations}
                      onVariationSelect={handleVariationSelect}
                      getVariationOptions={getVariationOptions}
                      getSelectedVariation={getSelectedVariation}
                      variant="mobile"
                    />

                    <div className={getAdditionalProductsForParticipant(participantIndex).length > 0 ? "py-4" : ""}>
                      <ProductsSection
                        title="Produtos adicionais"
                        products={getAdditionalProductsForParticipant(participantIndex)}
                        participantIndex={participantIndex}
                        selectedVariations={selectedVariations}
                        onVariationSelect={handleVariationSelect}
                        getVariationOptions={getVariationOptions}
                        getSelectedVariation={getSelectedVariation}
                        variant="mobile"
                      />
                    </div>

                    <Button
                      className="w-full mt-4"
                      onClick={() => handleSaveAndNext(participantIndex, false)}
                      disabled={!isParticipantComplete(participantIndex)}
                    >
                      {hasNextPendingParticipant(participantIndex) ? "Salvar e próximo" : "Salvar"}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile Footer Summary */}
      <MobileSummaryBar
        eventName={event.name}
        totalParticipants={totalParticipants}
        tickets={groupedTickets.map((t) => ({
          categoryName: t.categoryName,
          name: t.raceName,
          quantity: t.quantity,
          total: t.total,
        }))}
        subtotal={totalPrice + totalProductsPrice}
        discount={
          hasCouponLine
            ? { label: formatCouponLineLabel(appliedCoupon!), amount: couponDiscountAmount }
            : hasVoucherLine
              ? { label: formatVoucherLineLabel(appliedVoucher!.code), amount: voucherDiscountAmount }
              : null
        }
        additionalProducts={totalProductsPrice > 0 ? { total: totalProductsPrice } : null}
        serviceFee={serviceFee}
        total={totalAmount}
        cta={{
          label: "Confirmar produtos",
          onClick: onNext,
          /* Desabilitado quando: (a) há algum card de participante ABERTO
           * (força o usuário a salvar/minimizar antes de confirmar); ou (b)
           * algum participante ainda não passou pelo "Salvar e próximo" do card
           * (= `completedParticipants[idx]`). `isParticipantComplete` conta
           * auto-fill de variação única, então exigimos confirmação explícita. */
          disabled:
            totalParticipants === 0 ||
            Object.values(expandedParticipants).some(Boolean) ||
            !participantsWithTickets.every(
              ({ participantIndex }) => completedParticipants[participantIndex],
            ),
        }}
      />

      {/* Desktop Layout */}
      <div className="hidden md:flex w-full items-start gap-11">
        <div className="flex-1 flex flex-col gap-6">
          <div className="w-full">
            <div className="flex items-center gap-2 text-2xl font-bold">
              <button
                className="cursor-pointer rotate-180 size-8 flex items-center justify-center rounded-full border border-gray-6"
                onClick={onBack}
              >
                <ArrowButton isOpen={false} />
              </button>
              <p className="text-2xl font-bold">Selecione seus produtos</p>
            </div>
            <p className="text-sm text-gray-11 mt-4">
              Configure os itens do seu kit antes de seguir para a etapa de conclusão da inscrição.
            </p>
          </div>

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
                  {currentParticipant.name || `Participante ${selectedParticipant + 1}`}
                </p>
                <p className="text-sm text-gray-11 flex items-center gap-2 truncate">
                  {currentParticipant.birthDate && formatDateShort(currentParticipant.birthDate)}
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

            <ProductsSection
              title="Produtos do kit"
              products={getRequiredProductsForParticipant(selectedParticipant)}
              participantIndex={selectedParticipant}
              selectedVariations={selectedVariations}
              onVariationSelect={handleVariationSelect}
              getVariationOptions={getVariationOptions}
              getSelectedVariation={getSelectedVariation}
              variant="desktop"
            />

            <ProductsSection
              title="Produtos adicionais"
              products={getAdditionalProductsForParticipant(selectedParticipant)}
              participantIndex={selectedParticipant}
              selectedVariations={selectedVariations}
              onVariationSelect={handleVariationSelect}
              getVariationOptions={getVariationOptions}
              getSelectedVariation={getSelectedVariation}
              variant="desktop"
            />

          </div>
        </div>

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
                <h1 className="text-xl font-bold text-gray-12 leading-tight">{event.name}</h1>
              </div>
            </div>

            <div className="p-4 pt-2">
              <h1 className="text-lg font-bold mb-4">Participantes</h1>
              <div className="flex flex-col gap-4">
                {participantsWithTickets.map(({ ticket, participantIndex }, index) => {
                  const participant = participants[participantIndex];
                  const isSelected = selectedParticipant === participantIndex;
                  const ticketPrice = getTicketPrice(ticket);

                  return (
                    <div
                      key={participantIndex}
                      className={`rounded-lg p-3 border border-gray-6 cursor-pointer transition-colors ${isSelected ? "bg-gray-3" : "hover:bg-gray-3"}`}
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
                              {participant?.name || `Participante ${index + 1}`}
                            </p>
                            <p className="text-sm text-gray-11 flex items-center gap-2">
                              {participant?.birthDate && formatDateShort(participant.birthDate)}
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

                      <div className="flex flex-col gap-2 border-y border-gray-6 py-4 mb-3">
                        <p className="text-sm font-medium text-gray-12 flex items-center justify-between">
                          <span className="flex flex-col gap-0.5">
                            {ticket.groupId && categories.find((c) => c.id === ticket.groupId)?.name ? (
                              <span className="text-xs font-normal text-gray-11 truncate max-w-[50%]">
                                {categories.find((c) => c.id === ticket.groupId)?.name}
                              </span>
                            ) : (
                              <span className="text-xs font-normal text-gray-11">Ingresso Avulso</span>
                            )}
                            {ticket.name}
                          </span>
                          <span className="text-gray-12 font-bold shrink-0">
                            {formatPrice(ticketPrice)}
                          </span>
                        </p>
                        {getAdditionalProductsCount(participantIndex) > 0 && (
                          <p className="text-sm font-medium text-gray-12 flex items-center justify-between">
                            {getAdditionalProductsCount(participantIndex)}x {getAdditionalProductsCount(participantIndex) > 1 ? "Itens adicionais" : "Item adicional"}:
                            <span className="text-gray-12 font-bold">
                              {formatPrice(getAdditionalProductsTotal(participantIndex))}
                            </span>
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between">
                        <p
                          className={`text-sm font-medium rounded-full px-3 py-1 ${isParticipantComplete(participantIndex) ? "bg-primary-3 text-primary-12" : "bg-yellow-3 text-yellow-12"}`}
                        >
                          {isParticipantComplete(participantIndex) ? "Concluído" : "Pendente"}
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
                          {isParticipantComplete(participantIndex) ? "Editar" : "Selecionar"}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Subtotal só com mais de um ingresso diferente pra somar. */}
              {groupedTickets.length > 1 && (
                <div className="flex flex-col gap-2 mt-6">
                  <p className="text-sm font-medium text-gray-12 flex items-center justify-between">
                    Subtotal:
                    <span className="text-gray-12">{formatPrice(totalPrice + totalProductsPrice)}</span>
                  </p>
                </div>
              )}
              {hasCouponLine && (
                <div className="flex flex-col gap-2 mt-2">
                  <p className="text-sm font-medium text-gray-12 flex items-center justify-between">
                    {formatCouponLineLabel(appliedCoupon!)}:
                    <span className="text-gray-12">-{formatPrice(couponDiscountAmount)}</span>
                  </p>
                </div>
              )}
              {hasVoucherLine && (
                <div className="flex flex-col gap-2 mt-2">
                  <p className="text-sm font-medium text-gray-12 flex items-center justify-between">
                    {formatVoucherLineLabel(appliedVoucher!.code)}:
                    <span className="text-gray-12">-{formatPrice(voucherDiscountAmount)}</span>
                  </p>
                </div>
              )}
              {serviceFee > 0 && (
                <div className={`flex flex-col gap-2 ${hasCouponLine || hasVoucherLine ? "mt-2" : "mt-6"}`}>
                  <p className="text-sm font-medium text-gray-12 flex items-center justify-between">
                    Taxa de serviço:
                    <span className="text-gray-12">{formatPrice(serviceFee)}</span>
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between text-xl font-bold text-gray-12 mt-4 border-t border-gray-6 pt-4">
                <p>Total:</p>
                <p>{formatPrice(totalAmount)}</p>
              </div>

              <Button
                onClick={() => handleSaveAndNext(selectedParticipant)}
                className="w-full mt-8 font-bold"
                isLoading={isSubmitting}
                disabled={isSubmitting || totalParticipants === 0 || !isParticipantComplete(selectedParticipant)}
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