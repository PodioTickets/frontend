"use client";

import { KitCard } from "./KitCard";
import { EventInfo } from "./EventInfo";
import type { Event } from "@/interfaces/event";
import type { Kit } from "@/constants/kits";
import { mockKits } from "@/constants/kits";
import { Fragment } from "react/jsx-runtime";

interface ModalitiesStepProps {
  event: Event;
  kits: Kit[];
  onNext: () => void;
}

export function ModalitiesStep({ event, kits, onNext }: ModalitiesStepProps) {
  return (
    <>
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
    </>
  );
}
