"use client";

import { PaymentSuccessStep } from "@/components/Checkout/PaymentSuccessStep";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useEvent } from "@/hooks/useEvent";
import { Suspense, useEffect, useState, useMemo } from "react";
import { Loading } from "@/components/Loading";
import { useCheckout } from "@/contexts/CheckoutContext";
import type { OrderResponse } from "@/interfaces/order";

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CREDIT_CARD: "Cartão de crédito",
  PIX: "Pix",
};

function CheckoutSucessoContent() {
  const searchParams = useSearchParams();
  const eventId = searchParams.get("eventId");
  const { event, loading: isLoading } = useEvent(eventId ?? "");
  const { resetCheckout } = useCheckout();
  const [order, setOrder] = useState<OrderResponse | null>(null);

  // Buscar dados do checkout do localStorage
  useEffect(() => {
    if (!eventId || typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(`checkout_success_${eventId}`);
      if (stored) {
        const data = JSON.parse(stored);
        // saveOrderForSuccess salva { order, timestamp }
        setOrder(data.order ?? null);
      }
    } catch (error) {
      console.error('Erro ao buscar dados do checkout:', error);
    }
  }, [eventId]);

  // Limpar dados do checkout quando a página de sucesso for carregada
  useEffect(() => {
    resetCheckout();
  }, [resetCheckout]);

  // Preparar dados para o PaymentSuccessStep a partir do OrderResponse
  const successData = useMemo(() => {
    if (!order) return null;

    // Expandir tickets por quantidade para mapear 1:1 com registrations
    const expandedTickets: Array<{ batchName: string; unitPrice: number }> = [];
    for (const ticket of order.tickets) {
      for (let i = 0; i < ticket.quantity; i++) {
        expandedTickets.push({
          batchName: ticket.batchName ?? "Ingresso",
          unitPrice: ticket.unitPrice,
        });
      }
    }

    const registrations = order.registrations ?? [];

    const participantsData = expandedTickets.map((ticket, index) => {
      const registration = registrations[index];
      return {
        participantIndex: index,
        ticketName: ticket.batchName,
        ticketPrice: ticket.unitPrice / 100,
        qrCode: registration?.qrCode,
      };
    });

    const participantsInfo = registrations
      .filter((r) => r.participant)
      .map((r) => ({
        id: r.participant!.id,
        name: r.participant!.name,
        email: r.participant!.email,
        cpf: "",
        phone: "",
        birthDate: "",
        gender: null as null,
      }));

    const paymentMethodLabel =
      order.payment?.method
        ? (PAYMENT_METHOD_LABELS[order.payment.method] ?? order.payment.method)
        : undefined;

    return {
      orderNumber: order.payment?.transactionId ?? order.orderId,
      paymentMethod: paymentMethodLabel,
      totalPaid: (order.pricing.total ?? 0) / 100,
      participantsData,
      participantsInfo,
      serviceFee: (order.pricing.serviceFee ?? 0) / 100,
      couponDiscount: (order.pricing.couponDiscount ?? 0) / 100,
      voucherDiscount: (order.pricing.voucherDiscount ?? 0) / 100,
      date: order.payment?.paidAt ?? order.reservedAt,
    };
  }, [order]);

  if (!eventId) {
    return (
      <div className="w-full max-w-[1280px] mx-auto flex flex-col items-center justify-center min-h-screen gap-4">
        <h1 className="text-2xl font-bold">Evento não especificado</h1>
        <p className="text-gray-11 mb-6">
          Por favor, selecione um evento para continuar com o checkout.
        </p>
        <Link
          href="/"
          className="text-primary-10 hover:text-primary-7 transition-colors"
        >
          Voltar para a página inicial
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return <Loading />;
  }

  if (!event) {
    return (
      <div className="w-full max-w-[1280px] mx-auto flex flex-col items-center justify-center min-h-screen gap-4">
        <h1 className="text-2xl font-bold">Evento não encontrado</h1>
        <p className="text-gray-11 mb-6">
          O evento que você está procurando não existe ou foi removido.
        </p>
        <Link
          href="/"
          className="text-primary-10 hover:text-primary-7 transition-colors"
        >
          Voltar para a página inicial
        </Link>
      </div>
    );
  }

  if (!successData) {
    return (
      <div className="w-full max-w-[1280px] mx-auto flex flex-col items-center justify-center min-h-screen gap-4">
        <Loading />
      </div>
    );
  }

  return (
    <div className="w-full gap-4">
      <div className="w-full max-w-[1280px] mx-auto flex flex-col min-h-screen items-start justify-start gap-4 py-4 md:py-11 px-4 bg-gray-2 md:bg-transparent">
        <PaymentSuccessStep
          event={event}
          orderNumber={successData.orderNumber}
          paymentMethod={successData.paymentMethod}
          totalPaid={successData.totalPaid}
          participantsData={successData.participantsData}
          participantsInfo={successData.participantsInfo}
          serviceFee={successData.serviceFee}
          couponDiscount={successData.couponDiscount}
          voucherDiscount={successData.voucherDiscount}
          date={successData.date}
        />
      </div>
    </div>
  );
}

export default function CheckoutSucessoPage() {
  return (
    <Suspense fallback={<Loading />}>
      <CheckoutSucessoContent />
    </Suspense>
  );
}

