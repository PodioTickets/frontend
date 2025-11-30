"use client";

import CheckoutHeader from "@/components/Checkout/CheckoutHeader";
import { ModalitiesStep } from "@/components/Checkout/ModalitiesStep";
import { InformationStep } from "@/components/Checkout/InformationStep";
import { SubscriptionStep } from "@/components/Checkout/SubscriptionStep";
import { PaymentStep } from "@/components/Checkout/PaymentStep";
import { mockEvents } from "@/constants/events";
import { mockKits } from "@/constants/kits";
import { useState, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckoutProvider } from "@/contexts/CheckoutContext";

function CheckoutContent() {
  const searchParams = useSearchParams();
  const [activeOption, setActiveOption] = useState(1);

  const eventId = searchParams.get("eventId");

  const event = useMemo(() => {
    if (!eventId) return null;
    return mockEvents.find((e) => e.id === eventId);
  }, [eventId]);

  const kits = useMemo(() => {
    if (!eventId) return [];
    return mockKits.filter((kit) => kit.eventId === eventId);
  }, [eventId]);

  if (!eventId) {
    return (
      <div className="w-full max-w-[1760px] mx-auto flex flex-col items-center justify-center min-h-screen gap-4">
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

  if (!event) {
    return (
      <div className="w-full max-w-[1760px] mx-auto flex flex-col items-center justify-center min-h-screen gap-4">
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

  const renderStep = () => {
    switch (activeOption) {
      case 1:
        return (
          <ModalitiesStep
            event={event}
            kits={kits}
            onNext={() => setActiveOption(2)}
          />
        );
      case 2:
        return (
          <InformationStep
            event={event}
            onNext={() => setActiveOption(3)}
            onBack={() => setActiveOption(1)}
          />
        );
      case 3:
        return (
          <SubscriptionStep
            event={event}
            onNext={() => setActiveOption(4)}
            onBack={() => setActiveOption(2)}
          />
        );
      case 4:
        return (
          <PaymentStep event={event} onBack={() => setActiveOption(3)} />
        );
      default:
        return (
          <ModalitiesStep
            event={event}
            kits={kits}
            onNext={() => setActiveOption(2)}
          />
        );
    }
  };

  return (
    <div className="w-full max-w-[1760px] mx-auto gap-4">
      <CheckoutHeader
        activeOption={activeOption}
        setActiveOption={setActiveOption}
      />

      <div className="w-full flex flex-col min-h-screen items-start justify-start gap-4 py-11 px-4">
        {renderStep()}
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <CheckoutProvider>
      <Suspense
        fallback={
          <div className="w-full max-w-[1760px] mx-auto flex items-center justify-center min-h-screen">
            <p className="text-gray-11">Carregando...</p>
          </div>
        }
      >
        <CheckoutContent />
      </Suspense>
    </CheckoutProvider>
  );
}

