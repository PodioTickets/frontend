"use client";

import { PaymentSuccessStep } from "@/components/Checkout/PaymentSuccessStep";
import { useSearchParams } from "next/navigation";
import { useEvent } from "@/hooks/useEvent";
import { Suspense, useEffect, useState } from "react";
import { Loading } from "@/components/Loading";
import { useCheckout } from "@/contexts/CheckoutContext";
import { userService } from "@/services";
import { trackMetaPixel } from "@/lib/metaPixel";

function CheckoutSucessoContent() {
  const searchParams = useSearchParams();
  const eventId = searchParams.get("eventId");
  const orderId = searchParams.get("orderId");
  const { event } = useEvent(eventId ?? "");
  const { resetCheckout } = useCheckout();
  // Só os campos consumidos pelo Meta Pixel (o retorno do serviço é `any`).
  const [orderDetails, setOrderDetails] = useState<{
    order?: { id?: string; pricing?: { total?: number } };
  } | null>(null);

  // Detalhes do pedido são buscados APENAS para a conversão do Meta Pixel — a tela
  // não exibe mais o resumo do pedido. Best-effort: uma falha aqui não bloqueia a
  // confirmação (o comprovante detalhado vai por e-mail).
  useEffect(() => {
    if (!orderId) return;
    userService
      .getOrderDetails(orderId)
      .then(setOrderDetails)
      .catch((error) =>
        console.error("Erro ao buscar detalhes do pedido:", error),
      );
  }, [orderId]);

  // Limpa os dados do checkout ao abrir a confirmação.
  useEffect(() => {
    resetCheckout();
  }, [resetCheckout]);

  // Meta Pixel — Purchase: dispara quando os dados do pedido chegam. Browser-only
  // (sem Conversions API). Dedup PERSISTENTE (localStorage) por pedido → conta no
  // MÁXIMO 1 vez, mesmo com F5 ou revisita.
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

  return (
    <div className="flex min-h-screen w-full flex-col items-center bg-gray-2">
      <PaymentSuccessStep />
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
