"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { ArrowButton } from "../ArrowButton";
import type { Event } from "@/interfaces/event";
import { Button } from "../Button";
import { useCheckout } from "@/contexts/CheckoutContext";
import { TrashIcon } from "../Icons/TrashIcon";
import { mockKits, type Race } from "@/constants/kits";
import { PencilIcon } from "../Icons/PencilIcon";

interface InformationStepProps {
  event: Event;
  onNext: () => void;
  onBack: () => void;
}

interface ParticipantWithRace {
  raceId: string;
  race: Race;
  participantIndex: number;
  isExpanded: boolean;
}

export function InformationStep({
  event,
  onNext,
  onBack,
}: InformationStepProps) {
  const { raceQuantities, participants, updateParticipant, removeParticipant } =
    useCheckout();
  const [expandedParticipants, setExpandedParticipants] = useState<
    Record<number, boolean>
  >({
    0: true,
  });

  // Criar lista de participantes baseada nas races selecionadas
  const participantsWithRaces = useMemo(() => {
    const result: ParticipantWithRace[] = [];
    let participantIndex = 0;

    mockKits.forEach((kit) => {
      kit.races.forEach((race) => {
        const quantity = raceQuantities[race.id] || 0;
        for (let i = 0; i < quantity; i++) {
          result.push({
            raceId: race.id,
            race,
            participantIndex: participantIndex++,
            isExpanded: false,
          });
        }
      });
    });

    return result;
  }, [raceQuantities]);

  const toggleParticipant = (index: number) => {
    setExpandedParticipants((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const handleInputChange = (
    index: number,
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    updateParticipant(index, { [name]: value });
  };

  const formatDate = (date: string) => {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(new Date(date));
  };

  const formatDateShort = (date: string) => {
    if (!date) return "";
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(date));
  };

  const formatAgeLimit = (ageLimit?: { min?: number; max?: number }) => {
    if (!ageLimit) return null;
    if (ageLimit.min && ageLimit.max) {
      return `de ${ageLimit.min} a ${ageLimit.max} anos`;
    }
    if (ageLimit.min) {
      return `a partir de ${ageLimit.min} anos`;
    }
    if (ageLimit.max) {
      return `até ${ageLimit.max} anos`;
    }
    return null;
  };

  const isParticipantComplete = (index: number) => {
    const participant = participants[index];
    if (!participant) return false;
    return !!(
      participant.name &&
      participant.cpf &&
      participant.email &&
      participant.birthDate &&
      participant.phone &&
      participant.gender
    );
  };

  const maskCPF = (cpf: string) => {
    if (!cpf) return "";
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.***.***-$4");
  };

  return (
    <div className="w-full flex items-start gap-11">
      {/* Coluna esquerda - Formulários */}
      <div className="flex-1 flex flex-col gap-6">
        <div className="w-full">
          <div className="flex items-center gap-2 text-2xl font-bold">
            <button
              className="cursor-pointer rotate-180 size-8 flex items-center justify-center rounded-full border border-gray-6"
              onClick={onBack}
            >
              <ArrowButton isOpen={false} />
            </button>
            <p className="text-2xl font-bold">Informações básicas</p>
          </div>
          <p className="text-sm text-gray-11 mt-4">
            Para quem serão os ingressos? Preencha os dados principais de cada
            participante.
          </p>
        </div>

        <div className="w-full">
          <div className="flex gap-2 items-stretch rounded-xl overflow-hidden bg-gray-2 shadow-[0_5px_10px_rgba(0,0,0,0.3)] mb-10">
            <div className="h-[200px] w-1/4 relative shrink-0">
              <Image
                src={event.bannerUrl}
                alt={event.name}
                fill
                className="object-cover rounded-tr-xl rounded-br-xl"
              />
            </div>

            <div className="flex flex-col justify-center px-4 py-6 border-r border-gray-6 flex-1 min-w-0">
              <div className="flex flex-col gap-4">
                <p className="text-base text-gray-11">Seu pedido:</p>
                <h1 className="text-xl font-bold text-gray-12 h-[36px] leading-tight">
                  {event.name}
                </h1>
                <p className="text-base font-medium text-gray-12">
                  Do dia {formatDate(event.eventDate)}
                </p>
              </div>
            </div>

            <div className="w-2/5 shrink-0 flex flex-col justify-center px-4 py-6">
              <div className="flex flex-col gap-5 pb-6">
                <div className="flex items-center justify-between text-base text-gray-12">
                  <p className="font-semibold">Valor dos ingressos:</p>
                  <p className="font-bold">
                    R$ {event.price?.toFixed(2) || "0,00"}
                  </p>
                </div>
                <div className="flex items-center justify-between text-base text-gray-12">
                  <p className="font-semibold">Taxa de serviço:</p>
                  <p className="font-bold">
                    R$ {event.serviceFee?.toFixed(2) || "0,00"}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between text-xl font-bold text-gray-12 border-t border-gray-6 pt-6">
                <p>Total:</p>
                <p>R$ {(event.price + event.serviceFee || 0).toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Cards de participantes */}
        {participantsWithRaces.map(({ race, participantIndex }, index) => {
          const participant = participants[participantIndex] || {
            name: "",
            cpf: "",
            email: "",
            birthDate: "",
            phone: "",
            gender: "",
          };
          const isExpanded = expandedParticipants[participantIndex] ?? false;
          const isComplete = isParticipantComplete(participantIndex);
          const ageLimitText = formatAgeLimit(race.ageLimit);

          return (
            <div
              key={`${race.id}-${index}`}
              className="flex flex-col w-full rounded-lg border border-gray-5 overflow-hidden"
            >
              <div
                className={`flex items-start justify-between w-full px-4 py-3 ${
                  !isExpanded
                    ? "hover:bg-gray-2 transition-colors cursor-pointer"
                    : ""
                }`}
                onClick={
                  !isExpanded
                    ? () => toggleParticipant(participantIndex)
                    : undefined
                }
              >
                <div className="flex flex-col gap-2 flex-1 w-full">
                  <div
                    className={`overflow-hidden transition-all duration-300 ease-in-out ${
                      !isExpanded
                        ? "max-h-[200px] opacity-100"
                        : "max-h-0 opacity-0"
                    }`}
                  >
                    <p className="font-bold text-2xl text-gray-12 mb-2">
                      {race.name}
                    </p>
                    <div className="flex items-center gap-3">
                      {participant.name && (
                        <div className="w-12 h-12 rounded-full bg-gray-5 flex items-center justify-center shrink-0">
                          <span className="text-sm font-bold text-gray-12">
                            {participant.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div className="flex flex-col gap-1">
                        <p className="text-sm font-medium text-gray-12">
                          {participant.name || `Participante ${index + 1}`}
                        </p>
                        {participant.birthDate && (
                          <p className="text-sm text-gray-11 flex items-center gap-2">
                            {formatDateShort(participant.birthDate)}
                            {participant.gender && (
                              <>
                                <span className="size-1 bg-gray-11 rounded-full" />
                                {participant.gender}
                              </>
                            )}
                            {participant.cpf && (
                              <>
                                <span className="size-1 bg-gray-11 rounded-full" />
                                {maskCPF(participant.cpf)}
                              </>
                            )}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Conteúdo expandido */}
                  <div
                    className={`overflow-hidden transition-all duration-300 ease-in-out ${
                      isExpanded
                        ? "max-h-[2000px] opacity-100"
                        : "max-h-0 opacity-0"
                    }`}
                  >
                    <div className="flex flex-col gap-2 pb-3">
                      <p className="text-sm text-gray-11">
                        Participante {index + 1}
                      </p>
                      <h1 className="text-lg font-bold">{race.name}</h1>
                      {ageLimitText && (
                        <div className="bg-yellow-3 text-yellow-12 rounded-full px-3 py-2 w-fit text-sm">
                          Limite de idade: {ageLimitText}
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-gray-12">
                          Nome
                        </label>
                        <input
                          type="text"
                          name="name"
                          value={participant.name}
                          onChange={(e) =>
                            handleInputChange(participantIndex, e)
                          }
                          className="w-full px-4 py-3 rounded-lg border border-gray-5 bg-gray-2 text-gray-12 focus:outline-none focus:border-primary-10 transition-colors"
                          placeholder="Digite seu nome completo"
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-gray-12">
                          Email
                        </label>
                        <input
                          type="email"
                          name="email"
                          value={participant.email}
                          onChange={(e) =>
                            handleInputChange(participantIndex, e)
                          }
                          className="w-full px-4 py-3 rounded-lg border border-gray-5 bg-gray-2 text-gray-12 focus:outline-none focus:border-primary-10 transition-colors"
                          placeholder="Digite seu email"
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-gray-12">
                          CPF
                        </label>
                        <input
                          type="text"
                          name="cpf"
                          value={participant.cpf}
                          onChange={(e) =>
                            handleInputChange(participantIndex, e)
                          }
                          className="w-full px-4 py-3 rounded-lg border border-gray-5 bg-gray-2 text-gray-12 focus:outline-none focus:border-primary-10 transition-colors"
                          placeholder="000.000.000-00"
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-gray-12">
                          Data de nascimento
                        </label>
                        <input
                          type="date"
                          name="birthDate"
                          value={participant.birthDate}
                          onChange={(e) =>
                            handleInputChange(participantIndex, e)
                          }
                          className="w-full px-4 py-3 rounded-lg border border-gray-5 bg-gray-2 text-gray-12 focus:outline-none focus:border-primary-10 transition-colors"
                          placeholder="00/00/0000"
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-gray-12">
                          Telefone
                        </label>
                        <input
                          type="tel"
                          name="phone"
                          value={participant.phone}
                          onChange={(e) =>
                            handleInputChange(participantIndex, e)
                          }
                          className="w-full px-4 py-3 rounded-lg border border-gray-5 bg-gray-2 text-gray-12 focus:outline-none focus:border-primary-10 transition-colors"
                          placeholder="(00) 9 0000-0000"
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-gray-12">
                          Sexo
                        </label>
                        <select
                          name="gender"
                          value={participant.gender}
                          onChange={(e) =>
                            handleInputChange(participantIndex, e)
                          }
                          className="w-full px-4 py-3 rounded-lg border border-gray-5 bg-gray-2 text-gray-12 focus:outline-none focus:border-primary-10 transition-colors"
                        >
                          <option value="">Selecione</option>
                          <option value="masculino">Masculino</option>
                          <option value="feminino">Feminino</option>
                          <option value="outro">Outro</option>
                          <option value="prefiro-nao-informar">
                            Prefiro não informar
                          </option>
                        </select>
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-gray-12">
                          Telefone de emergência
                        </label>
                        <input
                          type="tel"
                          name="emergencyPhone"
                          value={(participant as any).emergencyPhone || ""}
                          onChange={(e) =>
                            handleInputChange(participantIndex, e)
                          }
                          className="w-full px-4 py-3 rounded-lg border border-gray-5 bg-gray-2 text-gray-12 focus:outline-none focus:border-primary-10 transition-colors"
                          placeholder="Opcional"
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-2 mt-4">
                      <Button
                        onClick={() => toggleParticipant(participantIndex)}
                        variant="default"
                        className="font-bold"
                      >
                        Salvar e próximo
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="flex items-center h-full gap-2 shrink-0">
                  {!isExpanded && (
                    <>
                      <div
                        className={`px-3 py-1 rounded-full text-sm font-medium transition-opacity duration-300 ${
                          isComplete
                            ? "bg-primary-11 text-primary-2"
                            : "bg-yellow-3 text-yellow-12"
                        }`}
                      >
                        {isComplete ? "Concluído" : "Pendente"}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleParticipant(participantIndex);
                        }}
                        className="p-2 rounded-lg border border-gray-6 hover:bg-gray-2 transition-colors cursor-pointer"
                      >
                        <PencilIcon className="size-4 text-gray-12 cursor-pointer" />
                      </button>
                    </>
                  )}
                  {isExpanded && (
                    <div
                      className={`flex flex-col gap-2 transition-all duration-300 ease-in-out ${
                        isExpanded ? "opacity-100" : "opacity-0"
                      }`}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleParticipant(participantIndex);
                        }}
                        className="p-2 rounded-lg border border-gray-6 hover:bg-gray-2 transition-colors cursor-pointer"
                      >
                        <PencilIcon className="size-4 text-gray-12 cursor-pointer" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeParticipant(participantIndex);
                        }}
                        className="p-2 rounded-lg border border-red-6 hover:bg-red-1 transition-colors cursor-pointer"
                      >
                        <TrashIcon className="size-4 text-red-6 cursor-pointer" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Botão Confirmar dados */}
        <div className="flex items-center justify-center w-full mt-6">
          <Button
            onClick={onNext}
            disabled={
              participantsWithRaces.length === 0 ||
              !participantsWithRaces.every(({ participantIndex }) =>
                isParticipantComplete(participantIndex)
              )
            }
            variant="default"
            className="w-1/4 font-bold"
          >
            Confirmar dados
          </Button>
        </div>
      </div>
    </div>
  );
}
