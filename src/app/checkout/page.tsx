"use client";

import { ArrowButton } from "@/components/ArrowButton";
import CheckoutHeader from "@/components/Checkout/CheckoutHeader";
import { EventInfo } from "@/components/Checkout/EventInfo";
import { mockEvents } from "@/constants/events";
import { useState, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

function CheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [activeOption, setActiveOption] = useState(1);

  const eventId = searchParams.get("eventId");

  const event = useMemo(() => {
    if (!eventId) return null;
    return mockEvents.find((e) => e.id === eventId);
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

  return (
    <div className="w-full max-w-[1760px] mx-auto gap-4">
      <CheckoutHeader
        activeOption={activeOption}
        setActiveOption={setActiveOption}
      />

      <div className="w-full flex flex-col min-h-screen items-start justify-start gap-4 py-11 px-4">
        <div className="w-full">
          <h1 className="text-2xl font-bold">Selecione um kit</h1>
          <p className="text-sm text-gray-11">
            Escolha sua prova dentro do kit e defina a quantidade de ingressos.
            Você pode ajustar depois em Informações.
          </p>
        </div>

        <div className="w-full flex items-start justify-between gap-4">
          <div className="max-w-2/3 w-full">
            <div className="flex items-center w-full justify-between rounded-lg border border-gray-5 px-4 py-3 cursor-pointer">
              <div className="flex flex-col items-start justify-center gap-2">
                <h1 className="text-lg font-bold">Kit inscrição</h1>
                <p className="text-sm text-gray-11">
                  Apartir de:{" "}
                  <span className="text-gray-12 font-bold">R$ 100,00</span>
                </p>
              </div>

              <ArrowButton isOpen={false} />
            </div>
          </div>
          <div className="max-w-1/3 w-full">
            <EventInfo event={event} onNext={() => setActiveOption(2)} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full max-w-[1760px] mx-auto flex items-center justify-center min-h-screen">
          <p className="text-gray-11">Carregando...</p>
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}

