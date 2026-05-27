"use client";

import CheckoutHeader from "@/components/Checkout/CheckoutHeader";
import { PaymentStep } from "@/components/Checkout/PaymentStep";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useEvent } from "@/hooks/useEvent";
import { Suspense } from "react";
import { Loading } from "@/components/Loading";
import { useCheckoutProductStep } from "@/hooks/useCheckoutProductStep";
import CheckoutPagamentoLoading from "./loading";

function CheckoutPagamentoContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const eventId = searchParams.get("eventId");
  const { event, loading: isLoading } = useEvent(eventId ?? "");
  const { hasSelectableProducts } = useCheckoutProductStep(eventId);

  const handleBack = () => {
    if (!eventId) return;
    // Pula a etapa de Produtos quando ela está oculta (sem escolha do usuário).
    // `null` (indefinido) mantém o destino padrão /produtos, que tem auto-skip.
    const target = hasSelectableProducts === false ? "informacoes" : "produtos";
    router.push(`/checkout/${target}?eventId=${eventId}`);
  };

  const handleSuccess = (orderId: string) => {
    if (eventId) {
      router.push(`/checkout/sucesso?eventId=${eventId}&orderId=${orderId}`);
    }
  };

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
    return <CheckoutPagamentoLoading />;
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

  return (
    <div className="w-full gap-4">
      <CheckoutHeader activeStep={4} />
      <div className="w-full max-w-[1280px] mx-auto flex flex-col min-h-screen items-start justify-start gap-4 py-4 md:py-11 px-4 bg-gray-2 md:bg-transparent">
        <PaymentStep event={event} onBack={handleBack} onSuccess={handleSuccess} />
      </div>
    </div>
  );
}

export default function CheckoutPagamentoPage() {
  return (
    <Suspense fallback={<Loading />}>
      <CheckoutPagamentoContent />
    </Suspense>
  );
}

