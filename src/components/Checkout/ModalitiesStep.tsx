"use client";

import { TicketCategoryCard } from "./TicketCategoryCard";
import { EventInfo } from "./EventInfo";
import type { Event } from "@/interfaces/event";
import { Fragment } from "react/jsx-runtime";
import { useMemo } from "react";
import { useCheckout } from "@/contexts/CheckoutContext";
import { useCheckoutTimer } from "@/contexts/CheckoutTimerContext";
import { useCheckoutReservation } from "@/hooks/useCheckoutReservation";
import { useQuery } from "@tanstack/react-query";
import { useTickets } from "@/hooks/useTickets";
import { useTicketCategories } from "@/hooks/useTicketCategories";
import { Loading } from "../Loading";
import { MobileSummaryBar } from "./MobileSummaryBar";
import type { Ticket } from "@/hooks/useTickets";
import { parseEventKitSelectionDisplay } from "@/lib/eventKitSelectionDisplay";
import { ticketUnitPriceForPrePaymentCents } from "@/lib/orderAutoCouponDisplay";
import {
  computeTicketPricingWithCoupon,
  computeTicketPricingWithDiscount,
  computeVoucherTicketsDiscount,
  couponPreviewToOrderCoupon,
  formatCouponLineLabel,
  formatVoucherLineLabel,
} from "@/lib/orderCouponDiscount";
import type { CouponPreviewResult } from "@/lib/orderCouponDiscount";
import { useAuth } from "@/hooks/useAuth";
import { useLoginModal } from "@/stores/modalStore";
import { usePendingCouponSnapshot } from "@/hooks/usePendingCoupon";
import { useCouponPreview } from "@/hooks/useCouponPreview";
import { useAgeCouponEligibility } from "@/hooks/useAgeCouponEligibility";
import { computeAgeCouponTicketDiscount, formatAgeCouponLineLabel } from "@/lib/ageCoupon";

interface ModalitiesStepProps {
  event: Event;
  onNext: () => void;
  isSubmitting?: boolean;
}

export function ModalitiesStep({ event, onNext, isSubmitting = false }: ModalitiesStepProps) {
  const { raceQuantities } = useCheckout();
  const { isAuthenticated } = useAuth();
  const { openLoginModal } = useLoginModal();
  const pendingCoupon = usePendingCouponSnapshot();
  const { data: couponPreview } = useCouponPreview(event?.id, pendingCoupon);
  // Preview pode ser cupom (percentual/fixo) ou voucher (100% OFF por ticket).
  const couponData = couponPreview?.kind === "coupon" ? couponPreview : null;
  const voucherData = couponPreview?.kind === "voucher" ? couponPreview : null;
  /* Sufixo "(X% OFF)" — só pra cupons PERCENTAGE válidos. */
  const couponPercentSuffix =
    couponData && couponData.type === "PERCENTAGE" && couponData.value > 0
      ? ` (${couponData.value}% OFF)`
      : "";

  const handleNext = () => {
    if (!isAuthenticated) {
      openLoginModal();
      return;
    }
    onNext();
  };
  const eventId = event?.id;

  // Elegibilidade do cupom automático de idade (e idade na data do evento pro
  // badge de limite). Só pra logado — anônimo não tem idade pra avaliar.
  const { data: ageEligibility } = useAgeCouponEligibility(eventId, isAuthenticated);
  const userAge = ageEligibility?.age ?? null;

  // Buscar tickets e categorias do servidor
  const { tickets, loading: ticketsLoading } = useTickets(eventId, !!eventId, false, true);
  const { categories, loading: categoriesLoading } = useTicketCategories(eventId, !!eventId);

  const loading = ticketsLoading || categoriesLoading;

  const kitSelectionDisplay = useMemo(
    () => parseEventKitSelectionDisplay(event.kitSelectionDisplay),
    [event.kitSelectionDisplay]
  );

  // Separar tickets com categoria dos avulsos
  const { categorizedTickets, uncategorizedTickets } = useMemo(() => {
    const categorized: Array<{
      id: string;
      name: string;
      description?: string;
      tickets: Ticket[];
    }> = [];
    const uncategorized: Ticket[] = [];

    // Mapear categorias por ID
    const categoryMap = new Map(categories.map((cat) => [cat.id, cat.name]));

    // Agrupar tickets por categoria
    const ticketsByCategory: Record<string, Ticket[]> = {};
    tickets.forEach((ticket) => {
      const categoryId = ticket.groupId;
      if (categoryId && categoryMap.has(categoryId)) {
        // Ticket tem categoria válida
        if (!ticketsByCategory[categoryId]) {
          ticketsByCategory[categoryId] = [];
        }
        ticketsByCategory[categoryId].push(ticket);
      } else {
        // Ticket sem categoria (avulso)
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
          description: category.description,
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

  // ---- Order autoritativa (quando existe) ----------------------------------
  // Esta é a primeira etapa do checkout — a `order` só existe quando o usuário
  // já tinha uma reserva ativa em sessão anterior (orderId persistido em
  // localStorage). Quando existe, usamos o `finalUnitPrice` do backend para
  // o preço unitário do ticket; quando não, parsing local do `ticket.price`.
  // O total geral continua sendo cálculo local pois depende da seleção atual
  // de quantidades, que ainda não foi enviada via `reserveOrder`.
  const { orderId, currentOrder: timerCurrentOrder } = useCheckoutTimer();
  const { getOrder } = useCheckoutReservation();
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

  // Cupom DISCOUNT "selecionado" nesta etapa: aplicado na reserva
  // (`timerCurrentOrder`/`orderData`) OU em preview vindo do link `?coupon=`
  // (`couponPreview`). Cupons automáticos (QUANTITY/AGE) são ignorados aqui — o
  // desconto deles só é revelado no pagamento.
  const appliedCoupon = useMemo(
    () =>
      timerCurrentOrder?.coupon ??
      orderData?.coupon ??
      couponPreviewToOrderCoupon(couponData, pendingCoupon),
    [timerCurrentOrder, orderData, couponData, pendingCoupon],
  );

  // Voucher do link sempre calcula quando presente (mesma regra do EventInfo
  // desktop). O preview de voucher e o de cupom são mutuamente exclusivos — o
  // código do link é um OU outro —, então o voucher tem prioridade aqui.
  const useVoucher = !!voucherData;

  // Ingressos selecionados (id/preço/qtd) — base do voucher e do cupom de idade.
  // Sem `useMemo` de propósito: o React Compiler memoiza, e manter manual aqui
  // conflita com a inferência de `getTicketPrice` (preserve-manual-memoization).
  const selectedTickets: Array<{ id: string; price: number; quantity: number }> = [];
  categorizedTickets.forEach((category) => {
    category.tickets.forEach((ticket) => {
      const quantity = raceQuantities[ticket.id] || 0;
      if (quantity > 0) selectedTickets.push({ id: ticket.id, price: getTicketPrice(ticket), quantity });
    });
  });
  uncategorizedTickets.forEach((ticket) => {
    const quantity = raceQuantities[ticket.id] || 0;
    if (quantity > 0) selectedTickets.push({ id: ticket.id, price: getTicketPrice(ticket), quantity });
  });

  // Desconto do voucher: soma dos ingressos selecionados que ele cobre (100%).
  const voucherDiscount =
    useVoucher && voucherData
      ? computeVoucherTicketsDiscount(voucherData.appliesTo, selectedTickets)
      : 0;

  // Cupom AUTOMÁTICO de idade (elegibilidade do backend). Só entra quando não há
  // voucher nem cupom manual de link — esses são intenção explícita do usuário e
  // têm prioridade. O desconto respeita as condições do endpoint (appliesTo +
  // minCartValue) e some se a seleção não as atender.
  const hasManualCoupon = !!appliedCoupon && appliedCoupon.couponType === "DISCOUNT";
  const ageCoupon =
    !useVoucher && !hasManualCoupon && ageEligibility?.applicable
      ? ageEligibility.appliedCoupon
      : null;
  const ageDiscount = ageCoupon
    ? computeAgeCouponTicketDiscount(ageCoupon, selectedTickets, totalPrice)
    : 0;

  // Preview pros cards: desconta o preço de cada ingresso (strike-through) igual
  // ao cupom de link. Só quando `appliesTo: "all"` — pra um subconjunto de
  // modalidades o desconto por-card não é confiável (o resumo segue correto).
  const ageCouponPreview: CouponPreviewResult | null =
    ageCoupon && (ageCoupon.appliesTo == null || ageCoupon.appliesTo === "all")
      ? {
          kind: "coupon",
          code: "",
          value: ageCoupon.value,
          type: ageCoupon.type,
          couponType: "AGE",
          applyToProducts: ageCoupon.applyToProducts,
        }
      : null;

  // Taxa de serviço + total calculados client-side com a MESMA regra do
  // SubscriptionStep (`/produtos`): a taxa incide sobre o subtotal JÁ
  // DESCONTADO pelo cupom/voucher. Sem desconto, recai sobre o subtotal cheio.
  const pricing = useMemo(
    () =>
      useVoucher
        ? computeTicketPricingWithDiscount(
            voucherDiscount,
            totalPrice,
            event.participantFeePercent ?? 0,
          )
        : ageCoupon
          ? computeTicketPricingWithDiscount(
              ageDiscount,
              totalPrice,
              event.participantFeePercent ?? 0,
            )
          : computeTicketPricingWithCoupon(
              appliedCoupon,
              totalPrice,
              event.participantFeePercent ?? 0,
            ),
    [useVoucher, voucherDiscount, ageCoupon, ageDiscount, appliedCoupon, totalPrice, event.participantFeePercent],
  );
  const serviceFee = pricing.serviceFee;
  const totalWithFee = pricing.total;
  const hasCouponLine = pricing.showCouponDiscount && pricing.couponDiscount > 0;
  // Label da linha de desconto: "Voucher CÓDIGO", "Cupom idade (X% OFF)" ou
  // "Cupom CÓDIGO (...)".
  const discountLineLabel = useVoucher
    ? formatVoucherLineLabel(voucherData?.code)
    : ageCoupon
      ? formatAgeCouponLineLabel(ageCoupon)
      : appliedCoupon
        ? formatCouponLineLabel(appliedCoupon)
        : "";
  // Cupom do link ainda sem desconto calculado ("ao continuar"). Voucher e cupom
  // de idade são calculados client-side, então não usam esse fallback.
  const couponPending = !!pendingCoupon && !voucherData;

  // Agrupa ingressos para exibição
  const groupedTickets = useMemo(() => {
    const grouped: Array<{
      quantity: number;
      ticketName: string;
      categoryName?: string;
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
            ticketName: ticket.name,
            categoryName: category.name,
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
          ticketName: ticket.name,
          distance,
          price: getTicketPrice(ticket),
          total: getTicketPrice(ticket) * quantity,
        });
      }
    });

    return grouped;
  }, [raceQuantities, categorizedTickets, uncategorizedTickets]);

  if (loading) {
    return <Loading />;
  }

  return (
    <>
      {/* Mobile Layout */}
      <div className="w-full md:hidden pb-24 px-0">
        {/* Instruction Card */}
        <div className=" rounded-lg mb-4">
          <p className="text-sm text-gray-11">
            Escolha seu ingresso e defina a quantidade. Você pode ajustar depois em Informações.
          </p>
        </div>

        {/* Categories List */}
        <div className="flex flex-col gap-4">
          {categorizedTickets.length > 0 || uncategorizedTickets.length > 0 ? (
            <>
              {uncategorizedTickets.map((ticket) => (
                <TicketCategoryCard
                  key={ticket.id}
                  tickets={[ticket]}
                  event={event}

                  kitSelectionDisplay={kitSelectionDisplay}
                  userAge={userAge}
                  couponPreviewOverride={ageCouponPreview}
                />
              ))}
              {categorizedTickets.map((category, index) => (
                <TicketCategoryCard
                  key={category.id}
                  categoryId={category.id}
                  categoryName={category.name}
                  categoryDescription={category.description}
                  tickets={category.tickets}
                  index={index}
                  expandedByDefault={index === 0}
                  event={event}

                  kitSelectionDisplay={kitSelectionDisplay}
                  userAge={userAge}
                  couponPreviewOverride={ageCouponPreview}
                />
              ))}
            </>
          ) : (
            <div className="w-full rounded-lg border border-gray-5 px-4 py-8 text-center ">
              <p className="text-gray-11">
                Nenhum ingresso disponível para este evento.
              </p>
            </div>
          )}
        </div>

        {/* Barra de resumo fixa (mobile) — unificada entre os steps do checkout. */}
        <MobileSummaryBar
          eventName={event.name}
          totalParticipants={totalParticipants}
          tickets={groupedTickets.map((t) => ({
            categoryName: t.categoryName,
            name: t.ticketName,
            quantity: t.quantity,
            total: t.total,
          }))}
          subtotal={totalPrice}
          discount={
            hasCouponLine
              ? { label: discountLineLabel, amount: pricing.couponDiscount }
              : null
          }
          pendingDiscountLabel={
            couponPending ? `Cupom ${pendingCoupon}${couponPercentSuffix}` : null
          }
          serviceFee={serviceFee}
          total={totalWithFee}
          cta={{
            label: "Selecionar",
            onClick: handleNext,
            disabled: totalParticipants === 0,
            loading: isSubmitting,
          }}
        />
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:block w-full">
        <div className="w-full">
          <h1 className="text-2xl font-bold">Selecione seus ingressos</h1>
          <p className="text-sm text-gray-11 mt-4">
            Escolha seus ingressos e defina a quantidade. Você pode ajustar depois em Informações.
          </p>
        </div>

        <div className="w-full flex items-start gap-11 mt-6">
          <div className="flex-1 flex flex-col gap-6">
            {categorizedTickets.length > 0 || uncategorizedTickets.length > 0 ? (
              <>
                {uncategorizedTickets.map((ticket, index) => {
                  const isLast = index === uncategorizedTickets.length - 1;
                  return (
                    <Fragment key={ticket.id}>
                      <TicketCategoryCard
                        tickets={[ticket]}
                        event={event}

                        kitSelectionDisplay={kitSelectionDisplay}
                        userAge={userAge}
                        couponPreviewOverride={ageCouponPreview}
                      />
                      {!isLast && <div className="w-full h-px bg-gray-6" />}
                    </Fragment>
                  );
                })}

                {categorizedTickets.map((category, index) => {
                  const isLastCategory = index === categorizedTickets.length - 1;
                  return (
                    <Fragment key={category.id}>
                      <TicketCategoryCard
                        categoryId={category.id}
                        categoryName={category.name}
                        categoryDescription={category.description}
                        tickets={category.tickets}
                        index={index}
                        expandedByDefault={index === 0}
                        event={event}

                        kitSelectionDisplay={kitSelectionDisplay}
                        userAge={userAge}
                        couponPreviewOverride={ageCouponPreview}
                      />
                      {!isLastCategory && (
                        <div className="w-full h-px bg-gray-6" />
                      )}
                    </Fragment>
                  );
                })}
              </>
            ) : (
              <div className="w-full rounded-lg border border-gray-5 px-4 py-8 text-center">
                <p className="text-gray-11">
                  Nenhum ingresso disponível para este evento.
                </p>
              </div>
            )}
          </div>
          <div className="w-[400px] shrink-0">
            <EventInfo
              event={event}
              onNext={handleNext}
              isSubmitting={isSubmitting}
              tickets={tickets}
              categorizedTickets={categorizedTickets}
              uncategorizedTickets={uncategorizedTickets}
              appliedCoupon={appliedCoupon}
            />
          </div>
        </div>
      </div>
    </>
  );
}
