"use client";

import { KitCard } from "./KitCard";
import { EventInfo } from "./EventInfo";
import type { Event } from "@/interfaces/event";
import type { Kit } from "@/constants/kits";
import { mockKits } from "@/constants/kits";
import { Fragment } from "react/jsx-runtime";
import { useMemo } from "react";
import { useCheckout } from "@/contexts/CheckoutContext";
import { Button } from "../Button";
import { ChevronDown, ChevronUp } from "lucide-react";

interface ModalitiesStepProps {
  event: Event;
  kits: Kit[];
  onNext: () => void;
}

export function ModalitiesStep({ event, kits, onNext }: ModalitiesStepProps) {
  const { raceQuantities } = useCheckout();

  // Calcular total e participantes
  const { totalParticipants, totalPrice } = useMemo(() => {
    let participants = 0;
    let total = 0;

    mockKits.forEach((kit) => {
      kit.races.forEach((race) => {
        const quantity = raceQuantities[race.id] || 0;
        if (quantity > 0) {
          participants += quantity;
          total += race.price * quantity;
        }
      });
    });

    return { totalParticipants: participants, totalPrice: total };
  }, [raceQuantities]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);
  };

  return (
    <>
      {/* Mobile Layout */}
      <div className="w-full md:hidden pb-24 px-0">
        {/* Instruction Card */}
        <div className=" rounded-lg mb-4">
          <h1 className="text-lg font-bold text-gray-12 mb-2">
            Selecione um kit
          </h1>
          <p className="text-sm text-gray-11">
            Escolha sua prova dentro do kit e defina a quantidade de ingressos.
            Você pode ajustar depois em Informações.
          </p>
        </div>

        {/* Kits List */}
        <div className="flex flex-col gap-4">
          {mockKits.length > 0 ? (
            mockKits.map((kit) => <KitCard key={kit.id} kit={kit} />)
          ) : (
            <div className="w-full rounded-lg border border-gray-5 px-4 py-8 text-center ">
              <p className="text-gray-11">
                Nenhum kit disponível para este evento.
              </p>
            </div>
          )}
        </div>

        {/* Fixed Bottom Bar */}
        <div className="fixed bottom-0 left-0 right-0 bg-gray-2 border-t border-gray-6 shadow-lg px-4 py-4 z-50 md:hidden">
          <div className="flex items-center justify-between max-w-[1280px] mx-auto">
            <div className="flex flex-col">
              <p className="text-xs text-gray-11">
                Participantes: {totalParticipants}
              </p>
              <p className="text-base font-bold text-gray-12">
                Total: {formatPrice(totalPrice)}
              </p>
            </div>
            <Button
              onClick={onNext}
              disabled={totalParticipants === 0}
              className="bg-[#5CC870] hover:bg-[#4db860] text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Selecionar
            </Button>
          </div>
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:block w-full">
        <div className="w-full">
          <h1 className="text-2xl font-bold">Selecione um kit</h1>
          <p className="text-sm text-gray-11 mt-4">
            Escolha sua prova dentro do kit e defina a quantidade de ingressos.
            Você pode ajustar depois em Informações.
          </p>
        </div>

        <div className="w-full flex items-start gap-11 mt-6">
          <div className="flex-1 flex flex-col gap-6">
            {mockKits.length > 0 ? (
              mockKits.map((kit, index) => {
                return (
                  <Fragment key={kit.id}>
                    <KitCard kit={kit} />
                    {index < mockKits.length - 1 && (
                      <div className="w-full h-px bg-gray-6" />
                    )}
                  </Fragment>
                );
              })
            ) : (
              <div className="w-full rounded-lg border border-gray-5 px-4 py-8 text-center">
                <p className="text-gray-11">
                  Nenhum kit disponível para este evento.
                </p>
              </div>
            )}
          </div>
          <div className="w-[400px] shrink-0">
            <EventInfo event={event} onNext={onNext} />
          </div>
        </div>
      </div>
    </>
  );
}

