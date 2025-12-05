"use client";

import { Fragment } from "react";
import { KitCard } from "./KitCard";
import { EventInfo } from "./EventInfo";
import type { Event } from "@/interfaces/event";
import type { Kit } from "@/constants/kits";

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
        <p className="text-sm text-gray-11">
          Escolha sua prova dentro do kit e defina a quantidade de ingressos.
          Você pode ajustar depois em Informações.
        </p>
      </div>

      <div className="w-full flex items-start justify-between gap-11">
        <div className="max-w-2/3 w-full flex flex-col gap-4">
          {kits.length > 0 ? (
            kits.map((kit, index) => {
              return (
                <Fragment key={kit.id}>
                  <KitCard kit={kit} />
                  {index < kits.length - 1 && (
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
        <div className="max-w-1/3 w-full">
          <EventInfo event={event} onNext={onNext} />
        </div>
      </div>
    </>
  );
}

