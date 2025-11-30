"use client";

import { useState } from "react";
import Image from "next/image";
import { ArrowButton } from "../ArrowButton";
import { EventInfo } from "./EventInfo";
import type { Event } from "@/constants/events";
import { Button } from "../Button";
import { useCheckout } from "@/contexts/CheckoutContext";

interface InformationStepProps {
  event: Event;
  onNext: () => void;
  onBack: () => void;
}

export function InformationStep({
  event,
  onNext,
  onBack,
}: InformationStepProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const { participants, updateParticipant } = useCheckout();
  const participantIndex = 0; // First participant
  const formData = participants[participantIndex] || {
    name: "",
    cpf: "",
    email: "",
    birthDate: "",
    phone: "",
    gender: "",
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    updateParticipant(participantIndex, { [name]: value });
  };

  return (
    <>
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

      <div className="flex items-stretch mt-4 justify-start w-full shadow-[0_5px_10px_rgba(0,0,0,0.3)] rounded-lg overflow-hidden">
        <div className="w-2/6 h-auto relative">
          <Image
            src={event.image}
            alt={event.title}
            fill
            draggable={false}
            className="object-cover"
          />
        </div>

        <div className="p-4 py-6 w-2/5 flex flex-col justify-between">
          <p className="text-sm text-gray-11">Seu pedido:</p>
          <h1 className="text-lg font-bold">{event.title}</h1>
          <p className="font-medium text-gray-12 mt-6">
            Do dia 13 - 15 Dez 2025
          </p>
        </div>

        <div className="p-4 py-6 w-2/5 flex flex-col justify-between border-l border-gray-6">
          <p className="font-semibold text-gray-12 flex items-center justify-between">
            Valor dos ingressos: <span>R$ 100,00</span>
          </p>
          <p className="font-semibold text-gray-12 flex items-center justify-between mt-4">
            Taxa de serviço: <span>R$ 39,85</span>
          </p>

          <div className="w-full h-px bg-gray-6 my-5" />
          <p className="text-[20px] font-bold text-gray-12">Total: R$ 139,85</p>
        </div>
      </div>

      <div className="flex flex-col w-full rounded-lg border border-gray-5 overflow-hidden mt-6">
        <div
          className="flex items-center justify-between w-full px-4 py-3 cursor-pointer hover:bg-gray-2 transition-colors"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex flex-col items-start justify-center gap-2">
            <p className="text-sm text-gray-11">Participante 1</p>
            <h1 className="text-lg font-bold">Kit inscrição - 3K Caminhada</h1>

            <h1 className="text-sm bg-yellow-3 rounded-full px-3 py-2 text-yellow-12">
              Limite de idade: de 9 a 11 anos
            </h1>
          </div>

          <ArrowButton isOpen={isExpanded} />
        </div>

        {isExpanded && (
          <div className="px-4 py-4 animate-in fade-in slide-in-from-top-2 duration-200">
            <form className="grid grid-cols-3 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-12">
                  Nome completo *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-lg border border-gray-5 bg-gray-2 text-gray-12 focus:outline-none focus:border-primary-10 transition-colors"
                  placeholder="Digite o nome completo"
                  required
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-12">
                  CPF *
                </label>
                <input
                  type="text"
                  name="cpf"
                  value={formData.cpf}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-lg border border-gray-5 bg-gray-2 text-gray-12 focus:outline-none focus:border-primary-10 transition-colors"
                  placeholder="000.000.000-00"
                  required
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-12">
                  Data de nascimento *
                </label>
                <input
                  type="date"
                  name="birthDate"
                  value={formData.birthDate}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-lg border border-gray-5 bg-gray-2 text-gray-12 focus:outline-none focus:border-primary-10 transition-colors"
                  required
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-12">
                  E-mail *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-lg border border-gray-5 bg-gray-2 text-gray-12 focus:outline-none focus:border-primary-10 transition-colors"
                  placeholder="seu@email.com"
                  required
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-12">
                  Telefone *
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-lg border border-gray-5 bg-gray-2 text-gray-12 focus:outline-none focus:border-primary-10 transition-colors"
                  placeholder="(00) 00000-0000"
                  required
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-12">
                  Gênero
                </label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleInputChange}
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
            </form>
          </div>
        )}
      </div>

      <div className="flex items-center justify-center w-full mt-6">
        <Button
          onClick={onNext}
          disabled={
            !formData.name ||
            !formData.cpf ||
            !formData.email ||
            !formData.phone ||
            !formData.gender ||
            !formData.birthDate
          }
          variant="default"
          className="w-1/4"
        >
          Confirmar dados
        </Button>
      </div>
    </>
  );
}

