"use client";
import { Button } from "../Button";
import type { Event } from "@/interfaces/event";
import { ArrowButton } from "../ArrowButton";
import Image from "next/image";
import { TrashIcon } from "../Icons/TrashIcon";
import { Dropdown, DropdownOption } from "../Dropdown";
import { useState, useMemo } from "react";
import { useCheckout } from "@/contexts/CheckoutContext";
import { mockKits, type Race } from "@/constants/kits";

interface SubscriptionStepProps {
  event: Event;
  onNext: () => void;
  onBack: () => void;
}

interface KitProduct {
  id: string;
  name: string;
  image: string;
  price: number;
  isRequired: boolean;
}

const sizeOptions: DropdownOption[] = [
  { id: "pp", label: "PP" },
  { id: "p", label: "P" },
  { id: "m", label: "M" },
  { id: "g", label: "G" },
  { id: "gg", label: "GG" },
  { id: "xgg", label: "XGG" },
];

// Mock de produtos do kit (obrigatórios)
const requiredProducts: KitProduct[] = [
  {
    id: "camiseta",
    name: "Camiseta",
    image: "/images/camisa.png",
    price: 0,
    isRequired: true,
  },
  {
    id: "mochila",
    name: "Mochila",
    image: "/images/mochila.png",
    price: 0,
    isRequired: true,
  },
];

// Mock de produtos adicionais (opcionais)
const additionalProducts: KitProduct[] = [
  {
    id: "camiseta-regata",
    name: "ITEM EXTRA - Camiseta Regata - Compra Opcional",
    image: "/images/camisa.png",
    price: 29.9,
    isRequired: false,
  },
  {
    id: "camiseta-preta",
    name: "(EXTRA) - Camiseta Exclusiva Preta - Compra Opcional",
    image: "/images/camisa.png",
    price: 29.9,
    isRequired: false,
  },
  {
    id: "viseira",
    name: "ITEM EXTRA - Viseira - Compra Opcional",
    image: "/images/camisa.png",
    price: 29.9,
    isRequired: false,
  },
  {
    id: "meia-azul",
    name: "(EXTRA) Meia azul personalizada - Compra Opcional",
    image: "/images/camisa.png",
    price: 29.9,
    isRequired: false,
  },
  {
    id: "meia-laranja",
    name: "(EXTRA) Meia laranja personalizada - Compra Opcional",
    image: "/images/camisa.png",
    price: 29.9,
    isRequired: false,
  },
];

export function SubscriptionStep({
  event,
  onNext,
  onBack,
}: SubscriptionStepProps) {
  const { raceQuantities, participants } = useCheckout();
  const [selectedSizes, setSelectedSizes] = useState<
    Record<string, string | null>
  >({});
  const [selectedParticipant, setSelectedParticipant] = useState<number>(0);

  // Função para obter a chave única do tamanho selecionado (participante + produto)
  const getSizeKey = (participantIndex: number, productId: string) => {
    return `${participantIndex}-${productId}`;
  };

  // Criar lista de participantes baseada nas races selecionadas
  const participantsWithRaces = useMemo(() => {
    const result: Array<{ raceId: string; race: Race; participantIndex: number }> = [];
    let participantIndex = 0;

    mockKits.forEach((kit) => {
      kit.races.forEach((race) => {
        const quantity = raceQuantities[race.id] || 0;
        for (let i = 0; i < quantity; i++) {
          result.push({
            raceId: race.id,
            race,
            participantIndex: participantIndex++,
          });
        }
      });
    });

    return result;
  }, [raceQuantities]);

  const handleSizeSelect = (productId: string) => (option: DropdownOption) => {
    const sizeKey = getSizeKey(selectedParticipant, productId);
    setSelectedSizes((prev) => ({
      ...prev,
      [sizeKey]: option.id || null,
    }));
  };

  const formatDateShort = (date: string) => {
    if (!date) return "";
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(date));
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);
  };

  const maskCPF = (cpf: string) => {
    if (!cpf) return "";
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.***.***-$4");
  };

  const currentParticipant = participants[selectedParticipant];
  const currentParticipantRace = participantsWithRaces.find(
    (p) => p.participantIndex === selectedParticipant
  );
  if (!currentParticipant || !currentParticipantRace) {
    return (
      <div className="w-full flex items-center justify-center py-20">
        <p className="text-gray-11">Nenhum participante encontrado</p>
      </div>
    );
  }

  return (
    <div className="w-full flex items-start gap-11">
      {/* Coluna esquerda - Produtos */}
      <div className="flex-1 flex flex-col gap-6">
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
            Revise seu pedido e conclua com cartão, Pix ou boleto. Os ingressos
            são liberados após aprovação.
          </p>
        </div>

        {/* Card do participante */}
        <div className="rounded-lg border border-gray-5 p-4">
          <h2 className="text-xl font-extrabold mb-4">
            Participante {selectedParticipant + 1}
          </h2>
          <div className="flex items-center gap-3 rounded-lg p-3 border border-gray-6 mb-6">
            <div className="w-12 h-12 rounded-full bg-gray-5 flex items-center justify-center shrink-0">
              {currentParticipant.name ? (
                <span className="text-sm font-bold text-gray-12">
                  {currentParticipant.name.charAt(0).toUpperCase()}
                </span>
              ) : (
                <Image
                  src={event.bannerUrl}
                  alt={currentParticipant.name || "Participante"}
                  width={48}
                  height={48}
                  className="w-12 h-12 rounded-full object-cover"
                />
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-12">
                {currentParticipant.name || `Participante ${selectedParticipant + 1}`}
              </p>
              <p className="text-sm text-gray-11 flex items-center gap-2">
                {currentParticipant.birthDate && formatDateShort(currentParticipant.birthDate)}
                {currentParticipant.gender && (
                  <>
                    <span className="size-1 bg-gray-11 rounded-full" />
                    {currentParticipant.gender}
                  </>
                )}
                {currentParticipant.cpf && (
                  <>
                    <span className="size-1 bg-gray-11 rounded-full" />
                    {maskCPF(currentParticipant.cpf)}
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Produtos do kit (obrigatório) */}
          <div className="mb-6">
            <h1 className="text-lg font-bold mb-4">
              Produtos do kit (obrigatório)
            </h1>
            <div className="grid grid-cols-2 gap-4">
              {requiredProducts.map((product) => (
                <div
                  key={product.id}
                  className="flex flex-col gap-3 border border-gray-6 rounded-lg p-4"
                >
                  <div className="flex items-start gap-3">
                    <Image
                      src={product.image}
                      alt={product.name}
                      width={100}
                      height={100}
                      className="w-[100px] h-[100px] object-cover rounded-lg shrink-0"
                      draggable={false}
                    />
                    <div className="flex flex-col gap-2 flex-1 min-w-0">
                      <p className="text-sm text-gray-12 font-semibold truncate">
                        {product.name}
                      </p>
                      <p className="text-sm text-gray-11 font-semibold">
                        {product.price === 0 ? "Grátis" : formatPrice(product.price)}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 border-t border-gray-6 pt-3">
                    <p className="text-sm text-gray-12">Escolha o tamanho</p>
                    <Dropdown
                      options={sizeOptions}
                      dataAttribute={`size-${product.id}`}
                      width="w-full"
                      maxHeight="max-h-[200px]"
                      selectedIds={
                        selectedSizes[getSizeKey(selectedParticipant, product.id)]
                          ? [selectedSizes[getSizeKey(selectedParticipant, product.id)]!]
                          : []
                      }
                      onSelect={handleSizeSelect(product.id)}
                      trigger={() => (
                        <div className="w-full p-2 border border-gray-6 rounded-lg cursor-pointer hover:border-gray-8 transition-colors flex items-center justify-between">
                          <p className="text-sm text-gray-12">
                            {selectedSizes[getSizeKey(selectedParticipant, product.id)]
                              ? sizeOptions.find(
                                  (size) => size.id === selectedSizes[getSizeKey(selectedParticipant, product.id)]
                                )?.label
                              : "Selecione a opção"}
                          </p>
                          <span className="text-gray-12">›</span>
                        </div>
                      )}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Produtos adicionais (opcional) */}
          <div>
            <h1 className="text-lg font-bold mb-4">
              Produtos adicionais (opcional)
            </h1>
            <div className="grid grid-cols-2 gap-4">
              {additionalProducts.map((product) => (
                <div
                  key={product.id}
                  className="flex flex-col gap-3 border border-gray-6 rounded-lg p-4"
                >
                  <div className="flex items-start gap-3">
                    <Image
                      src={product.image}
                      alt={product.name}
                      width={100}
                      height={100}
                      className="w-[100px] h-[100px] object-cover rounded-lg shrink-0"
                      draggable={false}
                    />
                    <div className="flex flex-col gap-2 flex-1 min-w-0">
                      <p className="text-sm text-gray-12 font-semibold line-clamp-2">
                        {product.name}
                      </p>
                      <p className="text-sm text-gray-12 font-semibold">
                        {formatPrice(product.price)}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 border-t border-gray-6 pt-3">
                    <p className="text-sm text-gray-12">Escolha o tamanho</p>
                    <Dropdown
                      options={sizeOptions}
                      dataAttribute={`size-${product.id}`}
                      width="w-full"
                      maxHeight="max-h-[200px]"
                      selectedIds={
                        selectedSizes[getSizeKey(selectedParticipant, product.id)]
                          ? [selectedSizes[getSizeKey(selectedParticipant, product.id)]!]
                          : []
                      }
                      onSelect={handleSizeSelect(product.id)}
                      trigger={() => (
                        <div className="w-full p-2 border border-gray-6 rounded-lg cursor-pointer hover:border-gray-8 transition-colors flex items-center justify-between">
                          <p className="text-sm text-gray-12">
                            {selectedSizes[getSizeKey(selectedParticipant, product.id)]
                              ? sizeOptions.find(
                                  (size) => size.id === selectedSizes[getSizeKey(selectedParticipant, product.id)]
                                )?.label
                              : "Selecione a opção"}
                          </p>
                          <span className="text-gray-12">›</span>
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

      {/* Coluna direita - Participantes e resumo */}
      <div className="w-1/3 shrink-0">
        <div className="rounded-xl overflow-hidden bg-gray-2 shadow-[0_5px_10px_rgba(0,0,0,0.3)]">
          <div className="p-4">
            <h1 className="text-lg font-bold mb-4">Participantes</h1>

            {/* Lista de participantes */}
            <div className="flex flex-col gap-4">
              {participantsWithRaces.map(({ race, participantIndex }, index) => {
                const participant = participants[participantIndex];
                const isSelected = selectedParticipant === participantIndex;
                const racePrice = race.price || 0;

                return (
                  <div
                    key={participantIndex}
                    className={`rounded-lg p-3 border border-gray-6 cursor-pointer transition-colors ${
                      isSelected ? "bg-gray-3" : "hover:bg-gray-3"
                    }`}
                    onClick={() => setSelectedParticipant(participantIndex)}
                  >
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2 flex-1">
                        <div className="w-12 h-12 rounded-full bg-gray-5 flex items-center justify-center shrink-0">
                          {participant?.name ? (
                            <span className="text-sm font-bold text-gray-12">
                              {participant.name.charAt(0).toUpperCase()}
                            </span>
                          ) : (
                            <Image
                              src={event.bannerUrl}
                              alt={participant?.name || "Participante"}
                              width={48}
                              height={48}
                              className="w-12 h-12 rounded-full object-cover"
                            />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-12 truncate">
                            {participant?.name || `Participante ${index + 1}`}
                          </p>
                          <p className="text-sm text-gray-11 flex items-center gap-2">
                            {participant?.birthDate &&
                              formatDateShort(participant.birthDate)}
                            {participant?.gender && (
                              <>
                                <span className="size-1 bg-gray-11 rounded-full" />
                                {participant.gender}
                              </>
                            )}
                            {participant?.cpf && (
                              <>
                                <span className="size-1 bg-gray-11 rounded-full" />
                                {maskCPF(participant.cpf)}
                              </>
                            )}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Itens do participante */}
                    <div className="flex flex-col gap-2 border-y border-gray-6 py-4 mb-3">
                      <p className="text-sm font-medium text-gray-12 flex items-center justify-between">
                        {race.name}
                        <span className="text-gray-12 font-bold">
                          {formatPrice(racePrice)}
                        </span>
                      </p>
                      {/* Mock de itens adicionais - pode ser removido quando houver dados reais */}
                      <p className="text-sm font-medium text-gray-12 flex items-center justify-between">
                        2x Itens adicionais:
                        <span className="text-gray-12 font-bold">
                          {formatPrice(50)}
                        </span>
                      </p>
                    </div>

                    {/* Status e botão */}
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium bg-yellow-3 text-yellow-12 rounded-full px-3 py-1">
                        Pendente
                      </p>
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedParticipant(participantIndex);
                        }}
                        variant="ghost"
                        size="sm"
                        className="border border-gray-6"
                      >
                        Selecionar
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Resumo do pedido */}
            <div className="flex flex-col gap-2 mt-6">
              <p className="text-sm font-medium text-gray-11 flex items-center justify-between">
                Taxa de serviço:
                <span className="text-gray-12">
                  {formatPrice(event.serviceFee || 0)}
                </span>
              </p>
            </div>

            <div className="flex items-center justify-between text-xl font-bold text-gray-12 mt-4 border-t border-gray-6 pt-4">
              <p>Total:</p>
              <p>
                {formatPrice(
                  (event.serviceFee || 0) +
                    participantsWithRaces.reduce(
                      (sum, { race }) => sum + (race.price || 0),
                      0
                    )
                )}
              </p>
            </div>

            <Button onClick={onNext} className="w-full mt-8 font-bold">
              Salvar e próximo
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
