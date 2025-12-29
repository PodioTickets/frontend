"use client";

import { useState, useEffect, useMemo } from "react";
import { OrderSummary } from "./OrderSummary";
import { Button } from "../Button";
import { Dropdown, DropdownOption } from "../Dropdown";
import { VisaIcon } from "../Icons/VisaIcon";
import { MasterCardIcon } from "../Icons/MasterCardIcon";
import { EloIcon } from "../Icons/EloIcon";
import { HelpIcon } from "../Icons/HelpIcon";
import { ArrowButton } from "../ArrowButton";
import { RemoveIcon } from "../Icons/RemoveIcon";
import { TrashIcon } from "../Icons/TrashIcon";
import { PencilIcon } from "../Icons/PencilIcon";
import Image from "next/image";
import { Tooltip, CVVTooltip } from "../Tooltip";
import type { Event } from "@/interfaces/event";
import { useCheckout } from "@/contexts/CheckoutContext";
import { ArrowLeft } from "lucide-react";
import { mockKits } from "@/constants/kits";
import { Input } from "../Input";

interface PaymentStepProps {
  event: Event;
  onBack: () => void;
  onSuccess?: () => void;
}

type PaymentMethod = "credit" | "pix" | "boleto";

interface PaymentOption {
  id: PaymentMethod;
  name: string;
  description: string;
  badge?: string;
  icons?: React.ReactNode;
}

function CreditCardForm({
  installmentOptions,
  selectedInstallments,
  setSelectedInstallments,
  onSuccess,
  cardName,
  setCardName,
  cardNumber,
  setCardNumber,
  cardExpiry,
  setCardExpiry,
  cardCVV,
  setCardCVV,
  isMobile = false,
}: {
  installmentOptions: DropdownOption[];
  selectedInstallments: string;
  setSelectedInstallments: (value: string) => void;
  onSuccess?: () => void;
  cardName?: string;
  setCardName?: (value: string) => void;
  cardNumber?: string;
  setCardNumber?: (value: string) => void;
  cardExpiry?: string;
  setCardExpiry?: (value: string) => void;
  cardCVV?: string;
  setCardCVV?: (value: string) => void;
  isMobile?: boolean;
}) {
  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || "";
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(" ");
    } else {
      return v;
    }
  };

  const formatExpiry = (value: string) => {
    const v = value.replace(/\D/g, "");
    if (v.length >= 2) {
      return v.substring(0, 2) + "/" + v.substring(2, 4);
    }
    return v;
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCardNumber(e.target.value);
    if (setCardNumber) setCardNumber(formatted);
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatExpiry(e.target.value);
    if (setCardExpiry) setCardExpiry(formatted);
  };

  const handleCVVChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").substring(0, 3);
    if (setCardCVV) setCardCVV(value);
  };

  return (
    <div className={`${isMobile ? "flex flex-col gap-4" : "space-y-4"}`}>
      <div className="flex flex-col gap-2 w-full">
        <label className="text-base text-gray-12 font-dm-sans">
          Nome impresso no cartão
        </label>
        <div className="relative">
          <Input
            type="text"
            value={cardName || ""}
            onChange={(e) => setCardName && setCardName(e.target.value)}
            className="bg-gray-2"
            placeholder="Ex: João Ribeiro"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2 w-full">
        <label className="text-base text-gray-12 font-dm-sans">
          Número do cartão
        </label>
        <div className="relative">
          <Input
            type="text"
            value={cardNumber || ""}
            onChange={handleCardNumberChange}
            className="bg-gray-2"
            maxLength={19}
            placeholder="Ex: 5400 7975 6026 4737"
          />
        </div>
      </div>

      <div
        className={`flex ${
          isMobile ? "flex-col gap-4" : "justify-between gap-4"
        } w-full`}
      >
        <div
          className={`${isMobile ? "w-full" : "flex-1"} flex flex-col gap-2`}
        >
          <label className="text-base text-gray-12 font-dm-sans">
            Data de validade
          </label>
          <Input
            type="text"
            value={cardExpiry || ""}
            onChange={handleExpiryChange}
            className="bg-gray-2"
            maxLength={5}
            placeholder="MM/AA"
          />
        </div>
        <div
          className={`${isMobile ? "w-full" : "flex-1"} flex flex-col gap-2`}
        >
          <div className="flex items-center gap-2">
            <label className="text-base text-gray-12 font-dm-sans">CVV</label>
            <Tooltip
              content={<CVVTooltip />}
              position="topRight"
              trigger="hover"
              className="cursor-help"
            >
              <button
                type="button"
                className="text-gray-11 hover:text-gray-12 transition-colors"
              >
                <HelpIcon className="size-4" />
              </button>
            </Tooltip>
          </div>
          <div className="relative w-full">
            <Input
              type="text"
              value={cardCVV || ""}
              onChange={handleCVVChange}
              maxLength={3}
              className="bg-gray-2"
              placeholder="3 dígitos"
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-base text-gray-12 font-dm-sans">Parcelas</label>
        <Dropdown
          options={installmentOptions}
          dataAttribute="installments"
          width="w-full"
          maxHeight="max-h-[200px]"
          selectedIds={[selectedInstallments]}
          onSelect={(option) => setSelectedInstallments(option.id || "1")}
          trigger={() => (
            <div className="w-full h-12 px-3 rounded-lg border border-gray-7 bg-gray-2 text-gray-12 focus:outline-none focus:border-primary-10 transition-colors cursor-pointer hover:border-gray-8 flex items-center justify-between">
              <p className="text-base text-gray-11 font-dm-sans">
                {installmentOptions.find(
                  (opt: DropdownOption) => opt.id === selectedInstallments
                )?.label || "Quanto deseja parcelar?"}
              </p>
              <span className="text-gray-12">›</span>
            </div>
          )}
        />
      </div>
    </div>
  );
}

function PixModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [timeLeft, setTimeLeft] = useState(30 * 60);

  useEffect(() => {
    if (!isOpen) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, onClose]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl mx-4 shadow-2xl w-[730px]">
        <div className="text-[20px] font-bold text-gray-12 flex items-center justify-between border-b border-gray-6 pb-4 p-4">
          <p>Pix gerado com sucesso</p>
          <button className="cursor-pointer" onClick={onClose}>
            <RemoveIcon className="size-4" />
          </button>
        </div>
        <div className="text-center space-y-4 p-4">
          <div className="space-y-2">
            <p className="text-sm text-gray-12 px-4">
              Mantenha esta página aberta. Assim que o banco confirmar o
              pagamento, vamos atualizar automaticamente o status do seu pedido
            </p>

            {/* Countdown */}
            <p className="text-2xl font-bold text-primary-11">
              {String(minutes).padStart(2, "0")}:
              {String(seconds).padStart(2, "0")}
            </p>

            <p className="text-sm text-gray-12">
              Tempo para conclusão do pagamento
            </p>
          </div>

          {/* QR Code */}
          <div className="space-y-4">
            <div className="bg-gray-2 p-8 rounded-lg mx-auto max-w-xs">
              <div className="w-48 h-48 bg-gray-5 rounded-lg mx-auto flex items-center justify-center">
                <span className="text-xs text-gray-11 text-center">
                  QR Code PIX
                </span>
              </div>
            </div>
          </div>

          {/* Botões */}
          <div className="space-y-3 w-1/2 mx-auto mb-8">
            <Button className="w-full py-4 text-lg font-bold">
              Copiar pix
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PixForm({
  onSuccess,
  pixValue,
  isMobile = false,
}: {
  onSuccess?: () => void;
  pixValue?: number;
  isMobile?: boolean;
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleFinalizePurchase = () => {
    setIsModalOpen(true);

    setTimeout(() => {
      if (onSuccess) {
        onSuccess();
      }
    }, 3000);
  };

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
      <div className="flex flex-col gap-4">
        <div className="text-center space-y-4 rounded-lg border border-gray-6 p-4">
          <div className="flex items-center justify-center gap-1">
            <p className="text-base text-gray-12 font-dm-sans">
              Valor à vista:
            </p>
            <p className="text-lg font-bold text-gray-12 font-manrope">
              {formatPrice(pixValue || 301.92)}
            </p>
          </div>
          <p className="text-base text-gray-12 font-dm-sans">
            Prazo de até 30 minutos para compensar
          </p>
        </div>
        <p className="text-base font-medium text-gray-12 text-center font-dm-sans">
          Clique em "finalizar compra" para gerar o PIX
        </p>
        {!isMobile && (
          <Button
            className="w-full py-4 text-lg font-bold"
            onClick={handleFinalizePurchase}
          >
            Finalizar compra
          </Button>
        )}
      </div>

      <PixModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}

function PaymentMethodOption({
  option,
  isSelected,
  onSelect,
}: {
  option: PaymentOption;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <div
      onClick={onSelect}
      className={`flex items-center justify-between p-4 rounded-lg transition-colors cursor-pointer ${
        isSelected
          ? "border border-blue-8 bg-blue-3"
          : "border border-gray-5 hover:bg-gray-2"
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`rounded-full size-4 border-[1.5px] ${
            isSelected
              ? "bg-primary-10 border-primary-10"
              : "bg-transparent border-gray-6"
          }`}
        />
        <span className="text-sm font-semibold font-family-manrope text-gray-12">
          {option.name}{" "}
          {option.badge?.includes("OFF") && (
            <span className="text-xs text-primary-12 font-semibold ml-2 bg-primary-6 px-2 py-1 rounded-full">
              {option.description}
            </span>
          )}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span
          className={`text-xs ${
            option.badge?.includes("OFF")
              ? "text-primary-10 font-semibold hidden"
              : "text-gray-11"
          }`}
        >
          {option.description}
        </span>
        {option.icons}
      </div>
    </div>
  );
}

export function PaymentStep({ event, onBack, onSuccess }: PaymentStepProps) {
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<PaymentMethod>("credit");
  const [selectedInstallments, setSelectedInstallments] = useState<string>("1");

  // Form states
  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCVV, setCardCVV] = useState("");

  // Coupon states
  const [couponCode, setCouponCode] = useState("");
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponDiscount, setCouponDiscount] = useState<number>(0);
  const [isCouponApplied, setIsCouponApplied] = useState(false);

  const { participants, raceQuantities } = useCheckout();

  // Generate participants data for the list
  const participantsData = useMemo(() => {
    const data: Array<{
      participantIndex: number;
      ticketName: string;
      ticketPrice: number;
      additionalProducts?: Array<{
        name: string;
        price: number;
        quantity: number;
      }>;
    }> = [];

    // Mock data for now - in real app, this would come from the checkout context
    participants.forEach((participant, index) => {
      if (participant.name || participant.cpf) {
        data.push({
          participantIndex: index,
          ticketName: "Kit inscrição - 3K Caminhada",
          ticketPrice: 438.34,
          additionalProducts:
            index === 0
              ? [
                  { name: "Camiseta Regata", price: 29.9, quantity: 1 },
                  { name: "Viseira", price: 29.9, quantity: 1 },
                ]
              : undefined,
        });
      }
    });

    // If no participants, show mock data
    if (data.length === 0) {
      return [
        {
          participantIndex: 0,
          ticketName: "Kit inscrição - 3K Caminhada",
          ticketPrice: 438.34,
          additionalProducts: [
            { name: "Camiseta Regata", price: 29.9, quantity: 1 },
            { name: "Viseira", price: 29.9, quantity: 1 },
          ],
        },
        {
          participantIndex: 1,
          ticketName: "Kit inscrição - 3K Caminhada",
          ticketPrice: 438.34,
        },
      ];
    }

    return data;
  }, [participants]);

  const orderItems = [
    {
      name: "Camiseta Regata",
      price: 29.9,
      image: "/images/camisa.png",
      size: "M",
    },
    { name: "Viseira", price: 29.9, image: "/images/mochila.png" },
  ];

  const installmentOptions: DropdownOption[] = [
    { id: "1", label: "1x de R$ 438,34 (à vista)" },
    { id: "2", label: "2x de R$ 219,17 sem juros" },
    { id: "3", label: "3x de R$ 146,11 sem juros" },
    { id: "4", label: "4x de R$ 109,59 sem juros" },
    { id: "5", label: "5x de R$ 87,67 sem juros" },
    { id: "6", label: "6x de R$ 73,06 sem juros" },
    { id: "7", label: "7x de R$ 62,62 sem juros" },
    { id: "8", label: "8x de R$ 54,79 sem juros" },
    { id: "9", label: "9x de R$ 48,70 sem juros" },
    { id: "10", label: "10x de R$ 43,83 sem juros" },
    { id: "11", label: "11x de R$ 39,85 sem juros" },
    { id: "12", label: "12x de R$ 36,53 sem juros" },
  ];

  const paymentOptions: PaymentOption[] = [
    {
      id: "credit",
      name: "Cartão de crédito",
      description: "",
      icons: (
        <div className="flex gap-2 items-center">
          <div className="bg-gray-2 border border-gray-6 rounded h-6 w-[42px] flex items-center justify-center">
            <VisaIcon />
          </div>
          <div className="bg-gray-2 border border-gray-6 rounded h-6 w-[42px] flex items-center justify-center">
            <EloIcon />
          </div>
          <div className="bg-gray-2 border border-gray-6 rounded h-6 w-[42px] flex items-center justify-center">
            <Image
              src="/images/american_express.png"
              alt="Mastercard"
              width={24}
              height={24}
            />
          </div>
          <div className="bg-gray-2 border border-gray-6 rounded h-6 w-[42px] flex items-center justify-center">
            <MasterCardIcon />
          </div>
        </div>
      ),
    },
    {
      id: "pix",
      name: "PIX",
      description: "5% OFF",
      badge: "5% OFF",
    },
  ];

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);
  };

  // Calculate totals same way as ModalitiesStep
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

  const serviceFee = event.serviceFee || 0;
  const additionalProductsTotal = orderItems.reduce(
    (sum, item) => sum + item.price,
    0
  );
  const subtotalValue = totalPrice + serviceFee + additionalProductsTotal;
  const totalValue = subtotalValue - couponDiscount;

  const calculatePixValue = () => {
    const discount = totalValue * 0.05;
    return totalValue - discount;
  };

  // Coupon validation
  const validateCoupon = (code: string): boolean => {
    // Remove espaços e converte para maiúsculo
    const cleanCode = code.trim().replace(/\s/g, "");

    // Verifica se tem 6 dígitos
    if (cleanCode.length !== 6) {
      return false;
    }

    // Verifica se é apenas números
    if (!/^\d+$/.test(cleanCode)) {
      return false;
    }

    // Verifica se é o cupom válido
    return cleanCode === "111111";
  };

  const handleApplyCoupon = () => {
    if (!couponCode.trim()) {
      setCouponError("Por favor, digite um código de cupom");
      setIsCouponApplied(false);
      setCouponDiscount(0);
      return;
    }

    if (validateCoupon(couponCode)) {
      // Cupom válido - aplicar desconto de R$ 40,00
      setCouponError(null);
      setIsCouponApplied(true);
      setCouponDiscount(40);
    } else {
      // Cupom inválido
      setCouponError("Cupom inválido");
      setIsCouponApplied(false);
      setCouponDiscount(0);
    }
  };

  const pixValue = calculatePixValue();
  const additionalProductsCount = orderItems.length;

  const [isParticipantsModalOpen, setIsParticipantsModalOpen] = useState(false);
  const [isModalAnimating, setIsModalAnimating] = useState(false);
  const [expandedProducts, setExpandedProducts] = useState<
    Record<number, boolean>
  >({});

  const openModal = () => {
    setIsParticipantsModalOpen(true);
    // Trigger animation after modal is mounted
    setTimeout(() => {
      setIsModalAnimating(true);
    }, 10);
  };

  const closeModal = () => {
    setIsModalAnimating(false);
    setTimeout(() => {
      setIsParticipantsModalOpen(false);
    }, 300);
  };

  // Generate participants with races dynamically
  const participantsWithRaces = useMemo(() => {
    const result: Array<{
      participantIndex: number;
      participant: (typeof participants)[0];
      race: { id: string; name: string; price: number };
      additionalProducts?: Array<{
        name: string;
        price: number;
        quantity: number;
        size?: string;
        image?: string;
      }>;
    }> = [];
    let participantIndex = 0;

    mockKits.forEach((kit) => {
      kit.races.forEach((race) => {
        const quantity = raceQuantities[race.id] || 0;
        for (let i = 0; i < quantity; i++) {
          const participant = participants[participantIndex];
          if (participant) {
            result.push({
              participantIndex,
              participant,
              race: {
                id: race.id,
                name: race.name,
                price: race.price,
              },
              additionalProducts:
                participantIndex === 0
                  ? [
                      {
                        name: "ITEM EXTRA - Camiseta Regata - Compra Opcional",
                        price: 29.9,
                        quantity: 1,
                        size: "XL",
                        image: "/images/camisa.png",
                      },
                      {
                        name: "ITEM EXTRA - Viseira - Compra Opcional",
                        price: 29.9,
                        quantity: 1,
                        size: "M",
                        image: "/images/mochila.png",
                      },
                    ]
                  : participantIndex === 1
                  ? [
                      {
                        name: "ITEM EXTRA - Camiseta Regata - Compra Opcional",
                        price: 29.9,
                        quantity: 1,
                        size: "M",
                        image: "/images/camisa.png",
                      },
                    ]
                  : undefined,
            });
          }
          participantIndex++;
        }
      });
    });

    return result;
  }, [participants, raceQuantities]);

  const formatDateShort = (date: string) => {
    if (!date) return "";
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(date));
  };

  const maskCPF = (cpf: string) => {
    if (!cpf) return "";
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.***.***-$4");
  };

  return (
    <>
      {/* Mobile Layout */}
      <div className="w-full md:hidden flex flex-col pb-24">
        {/* Instructional Text */}
        <div className="pb-6">
          <p className="text-sm text-gray-11 font-dm-sans">
            Revise seu pedido e conclua com cartão, Pix ou boleto. Os ingressos
            são liberados após aprovação.
          </p>
        </div>

        {/* Payment Methods */}
        <div className="pb-6 flex flex-col gap-3">
          {/* Credit Card Option */}
          <div
            className={`border rounded-lg p-4 transition-colors ${
              selectedPaymentMethod === "credit"
                ? "border-blue-8 bg-blue-3"
                : "border-gray-7 bg-gray-3"
            }`}
            onClick={() => setSelectedPaymentMethod("credit")}
          >
            <div className="flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-3">
                <div
                  className={`rounded-full size-4 border-[1.5px] flex items-center justify-center ${
                    selectedPaymentMethod === "credit"
                      ? "bg-primary-11 border-primary-11"
                      : "bg-transparent border-gray-6"
                  }`}
                ></div>
                <span className="text-base font-semibold text-primary-12 font-manrope">
                  Cartão de crédito
                </span>
              </div>
              <div className="flex gap-1 items-center">
                <div className="bg-gray-1 border border-gray-6 rounded h-6 w-[42px] flex items-center justify-center">
                  <VisaIcon />
                </div>
                <div className="bg-gray-1 border border-gray-6 rounded h-6 w-[42px] flex items-center justify-center">
                  <EloIcon />
                </div>
                <div className="bg-gray-1 border border-gray-6 rounded h-6 w-[42px] flex items-center justify-center">
                  <Image
                    src="/images/american_express.png"
                    alt="American Express"
                    width={24}
                    height={24}
                  />
                </div>
                <div className="bg-gray-1 border border-gray-6 rounded h-6 w-[42px] flex items-center justify-center">
                  <MasterCardIcon />
                </div>
              </div>
            </div>

            {selectedPaymentMethod === "credit" && (
              <div className="mt-4">
                <CreditCardForm
                  installmentOptions={installmentOptions}
                  selectedInstallments={selectedInstallments}
                  setSelectedInstallments={setSelectedInstallments}
                  onSuccess={onSuccess}
                  cardName={cardName}
                  setCardName={setCardName}
                  cardNumber={cardNumber}
                  setCardNumber={setCardNumber}
                  cardExpiry={cardExpiry}
                  setCardExpiry={setCardExpiry}
                  cardCVV={cardCVV}
                  setCardCVV={setCardCVV}
                  isMobile={true}
                />
                <Button
                  onClick={() => {
                    if (!cardName || !cardNumber || !cardExpiry || !cardCVV) {
                      alert("Por favor, preencha todos os campos do cartão");
                      return;
                    }
                    if (onSuccess) {
                      onSuccess();
                    }
                  }}
                  className="w-full mt-4 bg-gray-12 text-gray-1 font-bold font-manrope"
                >
                  Finalizar compra
                </Button>
              </div>
            )}
          </div>

          {/* PIX Option */}
          <div
            className={`border rounded-lg p-4 transition-colors ${
              selectedPaymentMethod === "pix"
                ? "border-blue-8 bg-blue-3"
                : "border-gray-7 bg-gray-3"
            }`}
            onClick={() => setSelectedPaymentMethod("pix")}
          >
            <div className="flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-3">
                <div
                  className={`rounded-full size-4 border-[1.5px] flex items-center justify-center ${
                    selectedPaymentMethod === "pix"
                      ? "bg-primary-11 border-primary-11"
                      : "bg-transparent border-gray-6"
                  }`}
                ></div>
                <span className="text-base font-semibold text-gray-12 font-manrope">
                  PIX
                </span>
                <div className="bg-primary-6 text-primary-12 rounded-xl px-2 py-1">
                  <span className="text-sm font-semibold font-plus-jakarta-sans">
                    5% OFF
                  </span>
                </div>
              </div>
            </div>

            {selectedPaymentMethod === "pix" && (
              <div className="mt-4 flex flex-col gap-4">
                <PixForm
                  onSuccess={onSuccess}
                  pixValue={pixValue}
                  isMobile={true}
                />
                <Button
                  onClick={() => {
                    if (onSuccess) {
                      onSuccess();
                    }
                  }}
                  className="w-full bg-gray-12 text-gray-1 font-bold font-manrope"
                >
                  Gerar QR CODE
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Coupon Section */}
        <div className="pt-6 border-t border-gray-8">
          <div className="flex flex-col gap-3">
            <Input
              type="text"
              placeholder="Código de cupom (opcional)"
              value={couponCode}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "").substring(0, 6);
                setCouponCode(value);
                setCouponError(null);
                if (isCouponApplied) {
                  setIsCouponApplied(false);
                  setCouponDiscount(0);
                }
              }}
              maxLength={6}
              inputMode="numeric"
              className={
                couponError
                  ? "border-red-6"
                  : isCouponApplied
                  ? "border-primary-8 bg-primary-3"
                  : ""
              }
            />
            {couponError && (
              <p className="text-base font-medium text-red-11 font-dm-sans">
                {couponError}
              </p>
            )}
            {isCouponApplied && (
              <p className="text-base font-medium text-primary-11 font-dm-sans">
                Cupom aplicado com sucesso!
              </p>
            )}
            {!isCouponApplied && (
              <Button
                onClick={handleApplyCoupon}
                className="w-full bg-primary-11 text-primary-2 font-bold font-manrope"
              >
                Aplicar cupom
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Footer Summary - Always Visible */}
      <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
        {/* Toggle Button */}
        <div
          className="bg-gray-2 place-self-end w-1/3 border-t border-l border-r border-gray-6 rounded-tl-xl py-2 cursor-pointer transition-transform active:scale-95"
          onClick={openModal}
        >
          <p className="text-sm font-medium text-gray-11 text-center font-dm-sans">
            Mostrar resumo
          </p>
        </div>

        {/* Summary Content - Always Visible */}
        <div className="bg-gray-1 border-t border-gray-6 px-4 py-5">
          <div className="flex flex-wrap gap-4 items-center justify-between mb-4">
            <div className="flex gap-1 items-center">
              <p className="text-sm text-gray-12 font-dm-sans">
                Participantes:
              </p>
              <p className="text-sm font-semibold text-gray-12 font-dm-sans">
                {totalParticipants}
              </p>
            </div>
            <div className="flex gap-1 items-center">
              <p className="text-sm text-gray-12 font-dm-sans">
                Taxa de serviço:
              </p>
              <p className="text-sm font-semibold text-gray-12 font-dm-sans">
                {formatPrice(serviceFee)}
              </p>
            </div>
            {additionalProductsCount > 0 && (
              <div className="flex gap-1 items-center">
                <p className="text-sm text-gray-12 font-dm-sans">
                  Produtos adicionais:
                </p>
                <p className="text-sm font-semibold text-gray-12 font-dm-sans">
                  {additionalProductsCount}
                </p>
              </div>
            )}
            {isCouponApplied && couponDiscount > 0 && (
              <div className="flex gap-1 items-center">
                <p className="text-sm text-gray-12 font-dm-sans">Cupom:</p>
                <p className="text-sm font-semibold text-gray-12 font-dm-sans">
                  -{formatPrice(couponDiscount)}
                </p>
              </div>
            )}
          </div>
          <div className="flex items-center justify-between">
            <div className="flex gap-1 items-center">
              <p className="text-base text-gray-12 font-dm-sans">Total:</p>
              <p className="text-base font-bold text-gray-12 font-manrope">
                {formatPrice(totalValue)}
              </p>
            </div>
            <Button
              onClick={() => {
                if (selectedPaymentMethod === "credit") {
                  if (!cardName || !cardNumber || !cardExpiry || !cardCVV) {
                    alert("Por favor, preencha todos os campos do cartão");
                    return;
                  }
                }
                if (onSuccess) {
                  onSuccess();
                }
              }}
              disabled={totalParticipants === 0}
              className="font-bold font-manrope"
            >
              Finalizar compra
            </Button>
          </div>
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:flex w-full items-start justify-between gap-11">
        <div className="max-w-2/3 w-full">
          <div className="flex flex-col gap-6">
            {/* Cabeçalho */}
            <div className="w-full">
              <div className="flex items-center gap-3 mb-2">
                <button
                  className="cursor-pointer rotate-180 size-8 flex items-center justify-center rounded-full border border-gray-6 hover:bg-gray-2 transition-colors"
                  onClick={onBack}
                >
                  <ArrowButton isOpen={false} />
                </button>
                <h1 className="text-2xl font-bold text-gray-12">
                  Selecione o método de pagamento
                </h1>
              </div>
              <p className="text-sm text-gray-11">
                Revise seu pedido e conclua com cartão, Pix ou boleto. Os
                ingressos são liberados após aprovação.
              </p>
            </div>

            {/* Métodos de Pagamento */}
            <div className="space-y-6">
              {paymentOptions.map((option) => {
                const isNotSelected = selectedPaymentMethod !== option.id;

                if (isNotSelected) {
                  return (
                    <PaymentMethodOption
                      key={option.id}
                      option={option}
                      isSelected={false}
                      onSelect={() => setSelectedPaymentMethod(option.id)}
                    />
                  );
                }

                return (
                  <div key={option.id}>
                    <PaymentMethodOption
                      option={option}
                      isSelected={true}
                      onSelect={() => setSelectedPaymentMethod(option.id)}
                    />

                    <div className="mt-4">
                      {option.id === "credit" && (
                        <>
                          <CreditCardForm
                            installmentOptions={installmentOptions}
                            selectedInstallments={selectedInstallments}
                            setSelectedInstallments={setSelectedInstallments}
                            onSuccess={onSuccess}
                            cardName={cardName}
                            setCardName={setCardName}
                            cardNumber={cardNumber}
                            setCardNumber={setCardNumber}
                            cardExpiry={cardExpiry}
                            setCardExpiry={setCardExpiry}
                            cardCVV={cardCVV}
                            setCardCVV={setCardCVV}
                            isMobile={false}
                          />
                          <Button
                            onClick={() => {
                              if (onSuccess) {
                                onSuccess();
                              }
                            }}
                            className="w-full mt-4 font-bold font-manrope"
                          >
                            Finalizar compra
                          </Button>
                        </>
                      )}
                      {option.id === "pix" && (
                        <PixForm
                          onSuccess={onSuccess}
                          pixValue={pixValue}
                          isMobile={false}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Coluna Direita - Resumo do Pedido */}
        <div className="max-w-1/3 w-full">
          <OrderSummary
            items={orderItems}
            serviceFee={serviceFee}
            total={totalValue}
            couponCode={couponCode}
            couponDiscount={couponDiscount}
            couponError={couponError}
            isCouponApplied={isCouponApplied}
            onApplyCoupon={handleApplyCoupon}
            onCouponChange={(code) => {
              setCouponCode(code);
              setCouponError(null);
              if (isCouponApplied) {
                setIsCouponApplied(false);
                setCouponDiscount(0);
              }
            }}
            participantsData={participantsData}
          />
        </div>
      </div>

      {/* Participants Summary Modal */}
      {isParticipantsModalOpen && (
        <>
          {/* Backdrop */}
          <div
            className={`fixed inset-0 z-50 bg-black/90 md:hidden transition-opacity duration-300 ease-out ${
              isModalAnimating ? "opacity-100" : "opacity-0"
            }`}
            onClick={closeModal}
          />

          {/* Modal Content */}
          <div
            className={`fixed bottom-0 left-0 right-0 z-50 rounded-t-xl max-h-[90vh] flex flex-col md:hidden transition-transform duration-300 ease-out ${
              isModalAnimating ? "translate-y-0" : "translate-y-full"
            }`}
          >
            {/* Close Button */}
            <div className="bg-gray-2 w-1/3 place-self-end border-t border-l border-r border-gray-6 rounded-tl-xl px-4 py-2 flex items-center justify-center shrink-0">
              <button
                onClick={closeModal}
                className="text-sm font-medium text-gray-11 font-dm-sans transition-colors hover:text-gray-12 active:scale-95"
              >
                Fechar resumo
              </button>
            </div>

            {/* Scrollable Content */}
            <div
              className={`flex-1 overflow-y-auto transition-opacity duration-300 ${
                isModalAnimating ? "opacity-100" : "opacity-0"
              }`}
            >
              <div className="bg-gray-1">
                {/* Participants List */}
                <div className="px-4 flex flex-col">
                  {participantsWithRaces.map(
                    (
                      {
                        participantIndex,
                        participant,
                        race,
                        additionalProducts,
                      },
                      index
                    ) => (
                      <div
                        key={participantIndex}
                        className={`py-5 transition-all duration-300 ease-out ${
                          index > 0 ? "border-t border-gray-6" : ""
                        } ${
                          isModalAnimating
                            ? "opacity-100 translate-y-0"
                            : "opacity-0 translate-y-4"
                        }`}
                        style={{
                          transitionDelay: `${index * 50}ms`,
                        }}
                      >
                        <p className="text-base font-semibold text-gray-12 mb-5 font-dm-sans">
                          Participantes {participantIndex + 1}
                        </p>

                        {/* Participant Card */}
                        <div className="border border-gray-6 rounded-xl p-2 mb-4 w-full">
                          <div className="flex items-center gap-2">
                            <div className="size-10 rounded-full bg-gray-5 flex items-center justify-center shrink-0 overflow-hidden">
                              {participant.name ? (
                                <span className="text-sm font-bold text-gray-12">
                                  {participant.name.charAt(0).toUpperCase()}
                                </span>
                              ) : (
                                <Image
                                  src={
                                    event.bannerUrl ||
                                    "/images/default-avatar.png"
                                  }
                                  alt="Participante"
                                  width={40}
                                  height={40}
                                  className="size-10 rounded-full object-cover"
                                />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-12 font-dm-sans">
                                {participant.name ||
                                  `Participante ${participantIndex + 1}`}
                              </p>
                              <div className="flex items-center gap-2 text-xs text-gray-11 font-dm-sans">
                                {participant.birthDate && (
                                  <>
                                    {formatDateShort(participant.birthDate)}
                                    <span className="size-1 bg-gray-11 rounded-full" />
                                  </>
                                )}
                                {participant.gender && (
                                  <>
                                    {participant.gender}
                                    {participant.cpf && (
                                      <span className="size-1 bg-gray-11 rounded-full" />
                                    )}
                                  </>
                                )}
                                {participant.cpf && maskCPF(participant.cpf)}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Race Info */}
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-base font-medium text-gray-12 font-dm-sans">
                            {race.name}
                          </p>
                          <p className="text-base font-bold text-gray-12 font-manrope">
                            {formatPrice(race.price)}
                          </p>
                        </div>

                        {/* Additional Products Summary */}
                        {additionalProducts &&
                          additionalProducts.length > 0 && (
                            <div className="flex items-center justify-between mb-3">
                              <p className="text-base font-semibold text-gray-12 font-manrope">
                                {additionalProducts.length}x Itens adicionais:
                              </p>
                              <p className="text-base font-bold text-gray-12 font-manrope">
                                {formatPrice(
                                  additionalProducts.reduce(
                                    (sum, item) =>
                                      sum + item.price * item.quantity,
                                    0
                                  )
                                )}
                              </p>
                            </div>
                          )}

                        {/* Action Buttons */}
                        {additionalProducts &&
                          additionalProducts.length > 0 && (
                            <div className="flex gap-2 items-center mb-4">
                              <button
                                className="bg-red-2 border-[1.5px] border-red-6 rounded-lg size-9 flex items-center justify-center"
                                onClick={() => {
                                  // Handle delete
                                }}
                              >
                                <TrashIcon className="size-6 text-red-11" />
                              </button>
                              <button
                                className="bg-gray-2 border-[1.5px] border-gray-6 rounded-lg size-9 flex items-center justify-center"
                                onClick={() => {
                                  // Handle edit
                                }}
                              >
                                <PencilIcon className="size-6 text-gray-12" />
                              </button>
                            </div>
                          )}

                        {/* Expanded Additional Products */}
                        {expandedProducts[participantIndex] &&
                          additionalProducts &&
                          additionalProducts.length > 0 && (
                            <div className="mb-4">
                              {additionalProducts.map(
                                (product, productIndex) => (
                                  <div
                                    key={productIndex}
                                    className="bg-gray-2 border border-gray-6 rounded-xl mb-3"
                                  >
                                    {/* Product Header */}
                                    <div className="flex gap-3 p-4 border-b border-gray-6">
                                      <div className="size-[100px] rounded-lg border border-gray-6 overflow-hidden shrink-0">
                                        <Image
                                          src={
                                            product.image ||
                                            "/images/camisa.png"
                                          }
                                          alt={product.name}
                                          width={100}
                                          height={100}
                                          className="w-full h-full object-cover"
                                        />
                                      </div>
                                      <div className="flex flex-col justify-between flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-gray-12 font-dm-sans line-clamp-2">
                                          {product.name}
                                        </p>
                                        <p className="text-base font-semibold text-gray-12 font-manrope">
                                          {formatPrice(product.price)}
                                        </p>
                                      </div>
                                    </div>
                                    {/* Product Size */}
                                    <div className="p-4">
                                      <div className="flex gap-1 items-center">
                                        <p className="text-base text-gray-12 font-dm-sans">
                                          Tamanho:
                                        </p>
                                        <p className="text-base font-semibold text-gray-12 font-manrope">
                                          {product.size || "N/A"}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                )
                              )}
                            </div>
                          )}

                        {/* Show More/Less Button */}
                        {additionalProducts &&
                          additionalProducts.length > 0 && (
                            <button
                              onClick={() => {
                                setExpandedProducts((prev) => ({
                                  ...prev,
                                  [participantIndex]: !prev[participantIndex],
                                }));
                              }}
                              className="text-base font-medium text-gray-11 font-dm-sans underline mb-4"
                            >
                              {expandedProducts[participantIndex]
                                ? "Mostrar menos"
                                : "Mostrar mais"}
                            </button>
                          )}

                        {/* Participant Total */}
                        <div className="flex items-center justify-end">
                          <p className="text-base font-bold text-gray-12 font-manrope">
                            {formatPrice(
                              race.price +
                                (additionalProducts?.reduce(
                                  (sum, item) =>
                                    sum + item.price * item.quantity,
                                  0
                                ) || 0)
                            )}
                          </p>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* Summary Footer - Fixed */}
              <div
                className={`bg-gray-1 border-t border-gray-6 px-4 py-5 shrink-0 transition-opacity duration-300 delay-200 ${
                  isModalAnimating ? "opacity-100" : "opacity-0"
                }`}
              >
                <div className="flex flex-wrap gap-4 items-center justify-between mb-4">
                  <div className="flex gap-1 items-center">
                    <p className="text-sm text-gray-12 font-dm-sans">
                      Participantes:
                    </p>
                    <p className="text-sm font-semibold text-gray-12 font-dm-sans">
                      {totalParticipants}
                    </p>
                  </div>
                  <div className="flex gap-1 items-center">
                    <p className="text-sm text-gray-12 font-dm-sans">
                      Taxa de serviço:
                    </p>
                    <p className="text-sm font-semibold text-gray-12 font-dm-sans">
                      {formatPrice(serviceFee)}
                    </p>
                  </div>
                  {additionalProductsCount > 0 && (
                    <div className="flex gap-1 items-center">
                      <p className="text-sm text-gray-12 font-dm-sans">
                        Produtos adicionais:
                      </p>
                      <p className="text-sm font-semibold text-gray-12 font-dm-sans">
                        {additionalProductsCount}
                      </p>
                    </div>
                  )}
                  {isCouponApplied && couponDiscount > 0 && (
                    <div className="flex gap-1 items-center">
                      <p className="text-sm text-gray-12 font-dm-sans">
                        Cupom:
                      </p>
                      <p className="text-sm font-semibold text-gray-12 font-dm-sans">
                        -{formatPrice(couponDiscount)}
                      </p>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex gap-1 items-center">
                    <p className="text-base text-gray-12 font-dm-sans">
                      Total:
                    </p>
                    <p className="text-base font-bold text-gray-12 font-manrope">
                      {formatPrice(totalValue)}
                    </p>
                  </div>
                  <Button
                    onClick={() => {
                      closeModal();
                      if (selectedPaymentMethod === "credit") {
                        if (
                          !cardName ||
                          !cardNumber ||
                          !cardExpiry ||
                          !cardCVV
                        ) {
                          alert(
                            "Por favor, preencha todos os campos do cartão"
                          );
                          return;
                        }
                      }
                      if (onSuccess) {
                        onSuccess();
                      }
                    }}
                    disabled={totalParticipants === 0}
                    className="bg-primary-11 text-primary-2 font-bold font-manrope"
                  >
                    Finalizar compra
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
