"use client";

import { EventInfo } from "./EventInfo";
import { Button } from "../Button";
import type { Event } from "@/constants/events";
import { ArrowButton } from "../ArrowButton";
import Image from "next/image";
import { MessageIcon } from "../Icons/MessageIcon";
import { TrashIcon } from "../Icons/TrashIcon";
import { Dropdown, DropdownOption } from "../Dropdown";
import { useState } from "react";

interface SubscriptionStepProps {
  event: Event;
  onNext: () => void;
  onBack: () => void;
}

const sizeOptions: DropdownOption[] = [
  { id: "pp", label: "PP" },
  { id: "p", label: "P" },
  { id: "m", label: "M" },
  { id: "g", label: "G" },
  { id: "gg", label: "GG" },
  { id: "xgg", label: "XGG" },
];

export function SubscriptionStep({
  event,
  onNext,
  onBack,
}: SubscriptionStepProps) {
  const [selectedSizes, setSelectedSizes] = useState<
    Record<number, string | null>
  >({});

  const handleSizeSelect = (index: number) => (option: DropdownOption) => {
    setSelectedSizes((prev) => ({
      ...prev,
      [index]: option.id || null,
    }));
  };
  return (
    <>
      <div className="w-full flex items-start justify-between gap-11">
        <div className="max-w-2/3 w-full">
          <div className="flex flex-col gap-6">
            <div className="w-full">
              <div className="flex items-center gap-2 text-2xl font-bold">
                <button
                  className="cursor-pointer rotate-180 size-8 flex items-center justify-center rounded-full border border-gray-6"
                  onClick={onBack}
                >
                  <ArrowButton isOpen={false} />
                </button>
                <p className="text-2xl font-bold">Ficha de inscrição</p>
              </div>
              <p className="text-sm text-gray-11 mt-4">
                Revise seu pedido e conclua com cartão, Pix ou boleto. Os
                ingressos são liberados após aprovação.
              </p>
            </div>
            <div className="rounded-lg border border-gray-5 p-4">
              <h2 className="text-[20px] font-extrabold mb-4">
                Participante 1
              </h2>
              <div className="flex items-center justify-between gap-2 rounded-lg p-3 border border-gray-6">
                <div className="flex items-center gap-2">
                  <Image
                    src={event.image}
                    alt={event.title}
                    width={100000}
                    height={100000}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-12">
                      Henrique Pereire da Silva
                    </p>
                    <p className="text-sm text-gray-11 flex items-center gap-2">
                      03/03/2004{" "}
                      <div className="size-1 bg-black rounded-full" />
                      Masculino
                      <div className="size-1 bg-black rounded-full" />
                      118.***.***-85
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <h1 className="font-bold">Produtos do kit (obrigatório)</h1>

                <div className="grid grid-cols-2 gap-4">
                  {Array.from({ length: 2 }).map((_, index) => (
                    <div className="flex flex-col gap-2 border border-gray-6 rounded-lg p-4">
                      <div className="flex items-center gap-2">
                        <Image
                          src={"/images/camisa.png"}
                          alt="Camisa do kit inscrição - 3K Caminhada"
                          width={100000}
                          height={100000}
                          className="w-[100px] h-[100px] object-cover rounded-lg"
                          draggable={false}
                        />
                        <div className="flex flex-col justify-between h-full gap-2">
                          <p className="text-gray-12 font-semibold truncate">
                            Kit inscrição - 3K Caminhada
                          </p>
                          <p className="text-gray-11 font-semibold">Grátis</p>
                        </div>
                      </div>
                      <div className="flex flex-col justify-between h-full gap-2 border-t border-gray-6 pt-2">
                        <p className="text-gray-12">Escolha o tamanho</p>
                        <Dropdown
                          options={sizeOptions}
                          dataAttribute={`size-${index}`}
                          width="w-full"
                          maxHeight="max-h-[200px]"
                          selectedIds={
                            selectedSizes[index] ? [selectedSizes[index]!] : []
                          }
                          onSelect={handleSizeSelect(index)}
                          trigger={() => (
                            <div className="w-full p-2 border border-gray-6 rounded-lg cursor-pointer hover:border-gray-8 transition-colors">
                              <p className="text-sm text-gray-12">
                                {selectedSizes[index]
                                  ? sizeOptions.find(
                                      (size) => size.id === selectedSizes[index]
                                    )?.label
                                  : "Selecione o tamanho"}
                              </p>
                            </div>
                          )}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="max-w-1/3 w-full">
          <div className="rounded-xl overflow-hidden bg-gray-2 shadow-[0_5px_10px_rgba(0,0,0,0.3)] h-full">
            <div className="p-4">
              <h1 className="text-lg font-bold">Participantes</h1>

              <div className="flex flex-col gap-2 mt-4 rounded-lg p-3 border border-gray-6">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Image
                      src={event.image}
                      alt={event.title}
                      width={100000}
                      height={100000}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-12">
                        Henrique Pereire da Silva
                      </p>
                      <p className="text-sm text-gray-11 flex items-center gap-2">
                        03/03/2004{" "}
                        <div className="size-1 bg-black rounded-full" />
                        Masculino
                        <div className="size-1 bg-black rounded-full" />
                        118.***.***-85
                      </p>
                    </div>
                  </div>

                  <div className="cursor-pointer p-2 rounded-xl border-[0.5px] border-red-6">
                    <TrashIcon className="size-4" />
                  </div>
                </div>
                <div className="flex flex-col w-full mt-2 gap-2 border-y border-gray-6 py-4">
                  <p className="text-sm font-medium text-gray-12 flex items-center justify-between w-full">
                    Valor dos ingressos:{" "}
                    <span className="text-gray-12 font-bold">R$ 100,00</span>
                  </p>
                  <p className="text-sm font-medium text-gray-12 flex items-center justify-between w-full">
                    Taxa de serviço:{" "}
                    <span className="text-gray-12 font-bold">R$ 39,85</span>
                  </p>
                </div>

                <div className="flex items-center justify-between w-full">
                  <p className="text-sm font-medium bg-yellow-3 text-yellow-12 flex items-center justify-center rounded-full p-2 px-4">
                    Pendente
                  </p>
                  <Button
                    onClick={() => {}}
                    variant="ghost"
                    size="sm"
                    className="border border-gray-6"
                  >
                    Editar
                  </Button>
                </div>
              </div>

              <div className="flex flex-col w-full mt-4 gap-2">
                <p className="text-sm font-medium text-gray-11 flex items-center justify-between w-full">
                  Taxa de serviço:{" "}
                  <span className="text-gray-12">R$ 39,85</span>
                </p>
              </div>

              <h1 className="text-lg font-bold text-gray-12 flex items-center justify-between w-full mt-4 border-t border-gray-6 pt-4">
                Total: <span className="text-gray-12">R$ 139,85</span>
              </h1>

              <Button onClick={onNext} className="w-full mt-8 font-bold">
                Salvar e próximo
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
