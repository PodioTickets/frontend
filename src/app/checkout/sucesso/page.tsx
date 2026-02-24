"use client";

import { PaymentSuccessStep } from "@/components/Checkout/PaymentSuccessStep";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useEvent } from "@/hooks/useEvent";
import { Suspense, useEffect, useState, useMemo } from "react";
import { Loading } from "@/components/Loading";
import { useCheckout } from "@/contexts/CheckoutContext";
import type { CheckoutResponse } from "@/interfaces/checkout";

function CheckoutSucessoContent() {
  const searchParams = useSearchParams();
  const eventId = searchParams.get("eventId");
  const { event, loading: isLoading } = useEvent(eventId ?? "");
  const { resetCheckout } = useCheckout();
  const [checkoutResponse, setCheckoutResponse] = useState<CheckoutResponse | null>(null);

  // Buscar dados do checkout do localStorage
  useEffect(() => {
    if (!eventId || typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(`checkout_success_${eventId}`);
      if (stored) {
        const data = JSON.parse(stored);
        setCheckoutResponse(data.checkoutResponse);
      }
    } catch (error) {
      console.error('Erro ao buscar dados do checkout:', error);
    }
  }, [eventId]);

  // Limpar dados do checkout quando a página de sucesso for carregada
  useEffect(() => {
    resetCheckout();
  }, [resetCheckout]);

  // Preparar dados para o PaymentSuccessStep
  const successData = useMemo(() => {
    if (!checkoutResponse) return null;

    // Preparar dados dos participantes com seus tickets e produtos
    // Expandir tickets (um ticket pode ter quantity > 1)
    const expandedTickets: Array<{ ticket: typeof checkoutResponse.tickets[0]; participantIndex: number }> = [];
    checkoutResponse.tickets.forEach((ticket) => {
      for (let i = 0; i < ticket.quantity; i++) {
        expandedTickets.push({
          ticket,
          participantIndex: expandedTickets.length,
        });
      }
    });

    const participantsData = checkoutResponse.participantsDetails.map((participant, index) => {
      // Encontrar o ticket correspondente a este participante
      const ticketInfo = expandedTickets[index];
      const ticket = ticketInfo?.ticket || checkoutResponse.tickets[0];

      // Buscar o registro correspondente para obter o QR Code
      const registration = checkoutResponse.registrations[index];

      // Processar QR Code - vem como string JSON que será usada para gerar o QR Code
      // O QR Code será gerado a partir da string JSON completa
      let qrCodeData: string | undefined = undefined;
      if (registration?.qrCode) {
        // Passar a string JSON diretamente para o componente de QR Code
        qrCodeData = registration.qrCode;
      }

      // Produtos adicionais do participante (não incluídos no ticket)
      const participantProducts = participant.products || [];
      const additionalProducts = participantProducts.length > 0
        ? participantProducts.map(p => {
          // Encontrar o produto completo na lista de produtos
          const productItem = checkoutResponse.products.items.find(item =>
            item.id === p.productId || item.variationId === p.variationId
          );
          return {
            name: productItem?.name || 'Produto',
            price: (productItem?.unitPrice || 0) / 100, // Converter de centavos
            quantity: p.quantity,
            variationName: productItem?.variationName || null,
          };
        })
        : undefined;

      // Produtos incluídos no ticket (para exibição)
      const includedProducts = participant.includedProducts || registration?.participant?.includedProducts || [];

      return {
        participantIndex: index,
        ticketName: ticket?.name || 'Ingresso',
        ticketPrice: (ticket?.price || 0) / 100, // Converter de centavos para reais
        qrCode: qrCodeData, // QR Code como objeto ou string
        additionalProducts: additionalProducts,
        includedProducts: includedProducts.map(ip => ({
          name: ip.productName,
          price: ip.basePrice / 100, // Converter de centavos
          quantity: 1,
          variationName: null,
          isIncluded: true,
        })),
      };
    });

    return {
      orderNumber: checkoutResponse.payment?.transactionId || checkoutResponse.orderNumber, // Usar transactionId como número do pedido
      paymentMethod: checkoutResponse.paymentMethod,
      totalPaid: (checkoutResponse.pricing.total || 0) / 100, // Converter de centavos para reais
      participantsData,
      participantsInfo: checkoutResponse.participantsDetails,
      subtotal: (checkoutResponse.pricing.subtotal || 0) / 100, // Converter de centavos
      additionalProductsTotal: (checkoutResponse.products.subtotal || 0) / 100, // Converter de centavos
      serviceFee: (checkoutResponse.pricing.serviceFee || 0) / 100, // Converter de centavos
      couponDiscount: (checkoutResponse.pricing.couponDiscount || 0) / 100, // Converter de centavos
      voucherDiscount: (checkoutResponse.pricing.voucherDiscount || 0) / 100, // Converter de centavos
      date: checkoutResponse.date,
    };
  }, [checkoutResponse]);

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

