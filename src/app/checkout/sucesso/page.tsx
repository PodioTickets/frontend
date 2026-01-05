"use client";

import { PaymentSuccessStep } from "@/components/Checkout/PaymentSuccessStep";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useEvent } from "@/hooks/useEvent";
import { Suspense, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useCheckout } from "@/contexts/CheckoutContext";

function CheckoutSucessoContent() {
  const searchParams = useSearchParams();
  const eventId = searchParams.get("eventId");
  const { event, isLoading } = useEvent(eventId ?? "");
  const { resetCheckout } = useCheckout();

  // Limpar dados do checkout quando a página de sucesso for carregada
  useEffect(() => {
    resetCheckout();
  }, [resetCheckout]);

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
    return (
      <div className="w-full max-w-[1280px] mx-auto flex items-center justify-center min-h-screen">
        <Loader2 className="size-4 animate-spin" />
      </div>
    );
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
      <div className="w-full max-w-[1280px] mx-auto flex flex-col min-h-screen items-start justify-start gap-4 py-4 md:py-11 px-4 bg-gray-2 md:bg-transparent">
        <PaymentSuccessStep event={event} />
      </div>
    </div>
  );
}

export default function CheckoutSucessoPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full max-w-[1280px] mx-auto flex items-center justify-center min-h-screen">
          <Loader2 className="size-4 animate-spin" />
        </div>
      }
    >
      <CheckoutSucessoContent />
    </Suspense>
  );
}

