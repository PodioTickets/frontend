"use client";

import { useState } from "react";
import { Button } from "../Button";
import type { Event } from "@/interfaces/event";
import { ImageWithInitialFallback } from "@/components/ImageWithInitialFallback";
import { useCheckout } from "@/contexts/CheckoutContext";
import { useMemo } from "react";
import type { Ticket } from "@/hooks/useTickets";
import { getEventOrganizer } from "@/utils/organization";
import { ContactOrganizerModal } from "@/components/Event/ContactOrganizerModal";
import { usePendingCouponSnapshot } from "@/hooks/usePendingCoupon";
import { useCouponPreview } from "@/hooks/useCouponPreview";
import { useAgeCouponEligibility } from "@/hooks/useAgeCouponEligibility";
import { useAuth } from "@/hooks/useAuth";
import { computeAgeCouponTicketDiscount, formatAgeCouponLineLabel } from "@/lib/ageCoupon";
import type { OrderCoupon, OrderVoucher } from "@/interfaces/order";
import {
  computeTicketPricingWithCoupon,
  computeTicketPricingWithDiscount,
  computeVoucherTicketsDiscount,
  couponPreviewToOrderCoupon,
  formatCouponLineLabel,
  formatVoucherLineLabel,
} from "@/lib/orderCouponDiscount";

interface EventInfoProps {
  event: Event;
  onNext: () => void;
  isSubmitting?: boolean;
  tickets?: Ticket[];
  categorizedTickets?: Array<{ id: string; name: string; tickets: Ticket[] }>;
  uncategorizedTickets?: Ticket[];
  /** Cupom resolvido pelo `ModalitiesStep` (reserva ou preview do link). Mantém
   *  o resumo desktop em sincronia com o mobile. */
  appliedCoupon?: OrderCoupon | null;
  /** Voucher já aplicado na order (reserva anterior), quando não há voucher de
   *  link. Sem isso o resumo desktop esconde a linha do voucher ao voltar. */
  appliedVoucher?: OrderVoucher | null;
  /** Desconto autoritativo (REAIS) do voucher da order — usado quando o desconto
   *  não vem do preview do link. */
  voucherDiscountOverride?: number;
}

export function EventInfo({ event, onNext, isSubmitting = false, tickets = [], categorizedTickets = [], uncategorizedTickets = [], appliedCoupon = null, appliedVoucher = null, voucherDiscountOverride = 0 }: EventInfoProps) {
  const { raceQuantities } = useCheckout();
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const pendingCoupon = usePendingCouponSnapshot();
  const { data: couponPreview } = useCouponPreview(event.id, pendingCoupon);
  const { isAuthenticated } = useAuth();
  const { data: ageEligibility } = useAgeCouponEligibility(event.id, isAuthenticated);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);
  };

  // Preview pode ser cupom (percentual/fixo) ou voucher (100% OFF por ticket).
  const couponData = couponPreview?.kind === "coupon" ? couponPreview : null;
  const voucherData = couponPreview?.kind === "voucher" ? couponPreview : null;
  // Voucher ativo = já aplicado na order (sempre) OU preview do link quando a
  // order ainda não tem um cupom real (exclusividade cupom/voucher — não deixar
  // o voucher de link sobrepor o cupom autoritativo).
  const useVoucher = !!appliedVoucher || (!!voucherData && !appliedCoupon);

  const couponPercentSuffix = couponData
    ? couponData.type === "PERCENTAGE" && couponData.value > 0
      ? ` (${couponData.value}% OFF)`
      : ` (${formatPrice((couponData.value ?? 0) / 100)} OFF)`
    : "";


  const getTicketPrice = (ticket: Ticket): number => {
    try {
      return parseFloat(ticket.price.replace(/[^\d,]/g, "").replace(",", "."));
    } catch {
      return 0;
    }
  };

  // Agrupa ingressos para exibição
  const groupedTickets = useMemo(() => {
    const grouped: Array<{
      quantity: number;
      ticketName: string;
      categoryName: string;
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
          categoryName: "",
          distance,
          price: getTicketPrice(ticket),
          total: getTicketPrice(ticket) * quantity,
        });
      }
    });

    return grouped;
  }, [raceQuantities, categorizedTickets, uncategorizedTickets]);

  const totalPrice = useMemo(() => {
    let total = 0;

    // Tickets com categoria
    categorizedTickets.forEach((category) => {
      category.tickets.forEach((ticket) => {
        const quantity = raceQuantities[ticket.id] || 0;
        if (quantity > 0) {
          total += getTicketPrice(ticket) * quantity;
        }
      });
    });

    // Tickets avulsos
    uncategorizedTickets.forEach((ticket) => {
      const quantity = raceQuantities[ticket.id] || 0;
      if (quantity > 0) {
        total += getTicketPrice(ticket) * quantity;
      }
    });

    return total;
  }, [raceQuantities, categorizedTickets, uncategorizedTickets]);

  // Desconto do voucher: do preview do link calcula client-side (1 unidade de
  // maior valor entre os selecionados); da order usa o valor autoritativo.
  const voucherDiscount = useMemo(() => {
    if (voucherData) {
      const selected: Array<{ id: string; price: number; quantity: number }> = [];
      categorizedTickets.forEach((category) => {
        category.tickets.forEach((ticket) => {
          const quantity = raceQuantities[ticket.id] || 0;
          if (quantity > 0) selected.push({ id: ticket.id, price: getTicketPrice(ticket), quantity });
        });
      });
      uncategorizedTickets.forEach((ticket) => {
        const quantity = raceQuantities[ticket.id] || 0;
        if (quantity > 0) selected.push({ id: ticket.id, price: getTicketPrice(ticket), quantity });
      });
      return computeVoucherTicketsDiscount(voucherData.appliesTo, selected);
    }
    if (appliedVoucher) return voucherDiscountOverride;
    return 0;
  }, [voucherData, appliedVoucher, voucherDiscountOverride, categorizedTickets, uncategorizedTickets, raceQuantities]);

  // Cupom resolvido: prioriza o vindo do ModalitiesStep (reserva); senão, o
  // preview do link `?coupon=`. Mantém desktop e mobile com o mesmo número.
  const resolvedCoupon = useMemo(
    () => appliedCoupon ?? couponPreviewToOrderCoupon(couponData, pendingCoupon),
    [appliedCoupon, couponData, pendingCoupon],
  );

  // Cupom AUTOMÁTICO de idade — só quando não há voucher nem cupom manual (link).
  // Espelha o ModalitiesStep pra desktop e mobile mostrarem o mesmo desconto.
  const hasManualCoupon = !!resolvedCoupon && resolvedCoupon.couponType === "DISCOUNT";
  const ageCoupon =
    !useVoucher && !hasManualCoupon && ageEligibility?.applicable
      ? ageEligibility.appliedCoupon
      : null;
  const ageDiscount = useMemo(() => {
    if (!ageCoupon) return 0;
    const selected: Array<{ id: string; price: number; quantity: number }> = [];
    categorizedTickets.forEach((category) => {
      category.tickets.forEach((ticket) => {
        const quantity = raceQuantities[ticket.id] || 0;
        if (quantity > 0) selected.push({ id: ticket.id, price: getTicketPrice(ticket), quantity });
      });
    });
    uncategorizedTickets.forEach((ticket) => {
      const quantity = raceQuantities[ticket.id] || 0;
      if (quantity > 0) selected.push({ id: ticket.id, price: getTicketPrice(ticket), quantity });
    });
    return computeAgeCouponTicketDiscount(ageCoupon, selected, totalPrice);
  }, [ageCoupon, categorizedTickets, uncategorizedTickets, raceQuantities, totalPrice]);

  // Taxa de serviço sobre o subtotal JÁ DESCONTADO (mesma regra do /produtos).
  // Voucher e cupom de idade entram como desconto pré-calculado; cupom manual
  // segue o caminho percentual/fixo.
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
              resolvedCoupon,
              totalPrice,
              event.participantFeePercent ?? 0,
            ),
    [useVoucher, voucherDiscount, ageCoupon, ageDiscount, resolvedCoupon, totalPrice, event.participantFeePercent],
  );
  const serviceFee = pricing.serviceFee;
  const hasCouponLine = pricing.showCouponDiscount && pricing.couponDiscount > 0;
  // Label da linha de desconto: "Voucher CÓDIGO", "Cupom idade (X% OFF)" ou "Cupom CÓDIGO (...)".
  const discountLineLabel = useVoucher
    ? formatVoucherLineLabel(voucherData?.code ?? appliedVoucher?.code)
    : ageCoupon
      ? formatAgeCouponLineLabel(ageCoupon)
      : resolvedCoupon
        ? formatCouponLineLabel(resolvedCoupon)
        : "";
  // Cupom do link sem desconto ainda calculado. Voucher é client-side: quando
  // não cobre a seleção (desconto 0), a linha do voucher simplesmente não aparece.
  const couponPending = !!pendingCoupon && !useVoucher;

  const totalParticipants = useMemo(() => {
    let participants = 0;

    // Tickets com categoria
    categorizedTickets.forEach((category) => {
      category.tickets.forEach((ticket) => {
        const quantity = raceQuantities[ticket.id] || 0;
        if (quantity > 0) {
          participants += quantity;
        }
      });
    });

    // Tickets avulsos
    uncategorizedTickets.forEach((ticket) => {
      const quantity = raceQuantities[ticket.id] || 0;
      if (quantity > 0) {
        participants += quantity;
      }
    });

    return participants;
  }, [raceQuantities, categorizedTickets, uncategorizedTickets]);

  return (
    <div className="rounded-xl overflow-hidden bg-gray-2 shadow-[0_5px_10px_rgba(0,0,0,0.3)]">
      <div className="w-full h-[200px] relative">
        <ImageWithInitialFallback
          src={event.bannerUrl}
          alt={event.name}
          name={event.name}
          fallbackId={event.id}
          fill
          sizes="(max-width: 768px) 100vw, 400px"
          className="size-full border-transparent"
          letterClassName="text-5xl"
        />
      </div>

      <div className="p-4">
        <p className="text-sm text-gray-11">Seu pedido:</p>
        <h1 className="text-lg font-bold mb-2">{event.name}</h1>
        <div className="flex flex-col w-full mt-4 gap-2">
          {groupedTickets.length > 0 ? (
            <>
              {groupedTickets.map((ticket, index) => (
                <div
                  key={index}
                  className="text-sm font-semibold text-gray-12 flex items-end justify-between w-full"
                >
                  <div className="flex items-end">
                    <div className="flex flex-col items-start">
                      <span className="text-gray-11 text-xs truncate">{ticket.categoryName ? `${ticket.categoryName}` : "Ingresso Avulso"}</span>
                      <span className="text-gray-12 text-sm truncate">({ticket.quantity}x){" "} {ticket.ticketName}:{" "}</span>
                    </div>
                  </div>
                  <span className="text-gray-12 font-bold">
                    {formatPrice(ticket.total)}
                  </span>
                </div>
              ))}
            </>
          ) : (
            <p className="text-sm text-gray-11 text-center py-2">
              Nenhum ingresso selecionado
            </p>
          )}
        </div>

        {groupedTickets.length > 0 && (
          <>
            {/* Subtotal só quando há mais de um ingresso diferente pra somar. */}
            {groupedTickets.length > 1 && (
              <div className="mt-4 flex items-center justify-between w-full text-sm text-gray-12">
                <p className="font-semibold">Subtotal:</p>
                <p className="font-bold">{formatPrice(totalPrice)}</p>
              </div>
            )}
            {hasCouponLine ? (
              <div className="mt-2 flex items-center justify-between w-full text-sm text-gray-12">
                <p className="font-semibold">{discountLineLabel}:</p>
                <p className="font-bold">-{formatPrice(pricing.couponDiscount)}</p>
              </div>
            ) : couponPending ? (
              <div className="mt-2 flex items-center justify-between w-full text-sm text-gray-12">
                <p className="font-semibold">Cupom {pendingCoupon}:</p>
                <p className="font-bold">{couponPercentSuffix}</p>
              </div>
            ) : null}
            {serviceFee > 0 && (
              <div className="mt-2 flex items-center justify-between w-full text-sm text-gray-12">
                <p className="font-semibold">Taxa de serviço:</p>
                <p className="font-bold">{formatPrice(serviceFee)}</p>
              </div>
            )}
            <h1 className="text-lg font-bold text-gray-12 flex items-center justify-between w-full mt-4 border-t border-gray-6 pt-4">
              Total:{" "}
              <span className="text-gray-12">
                {formatPrice(pricing.total)}
              </span>
            </h1>
          </>
        )}

        <Button
          onClick={onNext}
          className="w-full mt-8 font-bold"
          disabled={totalParticipants === 0}
          isLoading={isSubmitting}
        >
          Proximo
        </Button>
      </div>

      <ContactOrganizerModal
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
        organizerEmail={getEventOrganizer(event)?.email ?? ""}
        eventName={event.name}
      />
    </div>
  );
}
