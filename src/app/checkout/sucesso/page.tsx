"use client";

import { PaymentSuccessStep } from "@/components/Checkout/PaymentSuccessStep";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useEvent } from "@/hooks/useEvent";
import { Suspense, useEffect, useState, useMemo } from "react";
import { Loading } from "@/components/Loading";
import { useCheckout } from "@/contexts/CheckoutContext";
import { userService } from "@/services";
import { buildRegistrationProducts } from "@/lib/registrationProducts";
import { trackMetaPixel } from "@/lib/metaPixel";

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CREDIT_CARD: "Cartão de crédito",
  PIX: "Pix",
  DEBIT_CARD: "Cartão de débito",
};

function CheckoutSucessoContent() {
  const searchParams = useSearchParams();
  const eventId = searchParams.get("eventId");
  const orderId = searchParams.get("orderId");
  const { event, loading: isLoading } = useEvent(eventId ?? "");
  const { resetCheckout } = useCheckout();
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [loadingOrder, setLoadingOrder] = useState(false);

  // Buscar detalhes do pedido via API
  useEffect(() => {
    if (!orderId) return;

    const fetchOrderDetails = async () => {
      setLoadingOrder(true);
      try {
        const data = await userService.getOrderDetails(orderId);
        setOrderDetails(data);
      } catch (error) {
        console.error("Erro ao buscar detalhes do pedido:", error);
      } finally {
        setLoadingOrder(false);
      }
    };

    fetchOrderDetails();
  }, [orderId]);

  // Limpar dados do checkout quando a página de sucesso for carregada
  useEffect(() => {
    resetCheckout();
  }, [resetCheckout]);

  // Meta Pixel — Purchase: dispara quando a página de confirmação carrega.
  // Browser-only (sem Conversions API). Dedup PERSISTENTE (localStorage) por
  // pedido → a conversão conta no MÁXIMO 1 vez, mesmo com F5 ou revisita.
  useEffect(() => {
    const orderNumber = orderDetails?.order?.id;
    if (!orderNumber) return;
    trackMetaPixel(
      event?.tracking?.metaPixelId,
      "Purchase",
      {
        currency: "BRL",
        value: (orderDetails?.order?.pricing?.total ?? 0) / 100,
        content_type: "product",
      },
      { onceKey: `purchase:${orderNumber}`, persist: true },
    );
  }, [orderDetails, event?.tracking?.metaPixelId]);

  const successData = useMemo(() => {
    if (!orderDetails) return null;

    const { order, payment, registrations = [] } = orderDetails;

    const paymentMethodLabel = payment?.method
      ? (PAYMENT_METHOD_LABELS[payment.method] ?? payment.method)
      : undefined;

    /* Preço por ingresso: usa o `ticket.unitPrice` autoritativo do backend
     * (centavos, SÓ o ingresso — ver order-details-response-spec.md §5). Antes
     * diluíamos `subtotal / nº inscrições`, o que misturava produtos no preço do
     * ingresso (produto de 1 ingresso aparecia rateado nos 2). Fallback p/ a
     * diluição legada só quando o campo não vier (pedidos antigos). */
    const ticketsHaveUnitPrice = registrations.some(
      (reg: any) => typeof reg?.ticket?.unitPrice === "number",
    );
    const legacyPerTicketPrice =
      registrations.length > 0
        ? (order?.pricing?.subtotal ?? 0) / registrations.length / 100
        : 0;

    const participantsData = registrations.map((reg: any, index: number) => {
      // Produtos normalizados pela MESMA fonte/shape que a tela de ingresso do
      // usuário — a tab de Produtos (ParticipantProductsTab) é compartilhada.
      const { includedProducts, additionalProducts } = buildRegistrationProducts(reg);

      const ticketPrice =
        typeof reg.ticket?.unitPrice === "number"
          ? reg.ticket.unitPrice / 100
          : ticketsHaveUnitPrice
            ? 0 // payload novo, mas este ticket sem unitPrice → não inventa rateio
            : legacyPerTicketPrice;

      return {
        participantIndex: index,
        registrationId: reg.id ?? "",
        ticketName: reg.ticket?.name ?? "Ingresso",
        categoryName: reg.ticket?.category?.name ?? undefined,
        ticketPrice,
        qrCode: reg.qrCode,
        includedProducts,
        additionalProducts,
      };
    });

    const participantsInfo = registrations.map((reg: any) => {
      const p = reg.participant || {};
      return {
        id: p.id || "",
        name: p.fullName || [p.firstName, p.lastName].filter(Boolean).join(" ") || "",
        email: p.email || "",
        cpf: p.documentNumber || "",
        // Decide label do documento (CPF/Documento) e máscara de CPF/telefone —
        // mesma heurística da tela de ingresso (country → documentType → shape).
        documentType: p.documentType ?? null,
        country: p.country ?? null,
        phone: p.phone || "",
        birthDate: p.dateOfBirth || p.birthDate || "",
        gender: (p.gender ?? null) as "MALE" | "FEMALE" | "OTHER" | "PREFER_NOT_TO_SAY" | null,
        emergencyContactName: reg.emergencyContact?.name || "",
        emergencyPhone: reg.emergencyContact?.phone || "",
        questionAnswers: reg.questionAnswers || [],
      };
    });

    const coupon = order?.coupon ?? null;
    const voucher = order?.voucher ?? null;
    // Cupom e voucher são mutuamente exclusivos. Quando há voucher (e não cupom),
    // o `pricing.discount` é o desconto do VOUCHER — roteia pra voucherDiscount,
    // senão a linha de desconto aparece como "Cupom" indevidamente.
    const isVoucherOrder = !!voucher && !coupon;
    const discountReais = (order?.pricing?.discount ?? 0) / 100;
    const couponPercent =
      coupon?.type === "PERCENTAGE" && coupon?.value > 0 ? coupon.value : undefined;

    return {
      orderNumber: order?.id,
      paymentMethod: paymentMethodLabel,
      totalPaid: (order?.pricing?.total ?? 0) / 100,
      participantsData,
      participantsInfo,
      productsSubtotal: (order.pricing.productsSubtotal ?? 0) / 100,
      serviceFee: (order?.pricing?.serviceFee ?? 0) / 100,
      couponDiscount: isVoucherOrder ? 0 : discountReais,
      couponName: coupon?.code ?? undefined,
      couponType: coupon?.couponType as "DISCOUNT" | "QUANTITY" | "AGE" | undefined,
      couponPercent,
      voucherDiscount: isVoucherOrder ? discountReais : 0,
      voucherName: voucher?.code ?? undefined,
      date: payment?.paymentDate,
    };
  }, [orderDetails]);

  if (!eventId) {
    return (
      <div className="w-full max-w-[1280px] mx-auto flex flex-col items-center justify-center min-h-screen gap-4">
        <h1 className="text-2xl font-bold">Evento não especificado</h1>
        <p className="text-gray-11 mb-6">
          Por favor, selecione um evento para continuar com o checkout.
        </p>
        <Link href="/" className="text-primary-10 hover:text-primary-7 transition-colors">
          Voltar para a página inicial
        </Link>
      </div>
    );
  }

  if (isLoading || loadingOrder) {
    return <Loading />;
  }

  if (!event) {
    return (
      <div className="w-full max-w-[1280px] mx-auto flex flex-col items-center justify-center min-h-screen gap-4">
        <h1 className="text-2xl font-bold">Evento não encontrado</h1>
        <p className="text-gray-11 mb-6">
          O evento que você está procurando não existe ou foi removido.
        </p>
        <Link href="/" className="text-primary-10 hover:text-primary-7 transition-colors">
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
          couponName={successData.couponName}
          productsSubtotal={successData.productsSubtotal}
          couponType={successData.couponType}
          couponPercent={successData.couponPercent}
          voucherDiscount={successData.voucherDiscount}
          voucherName={successData.voucherName}
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
