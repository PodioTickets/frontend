"use client";

import { useState } from "react";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
} from "@/components/ui/drawer";
import { X, ChevronLeft, ChevronRight, ArrowLeft, Ticket, CreditCard, CheckCircle, Copy } from "lucide-react";
import { PaymentIcon } from 'react-svg-credit-card-payment-icons';
import { PixIcon } from "@/components/Icons/PixIcon";
import { CardIcon } from "@/components/Icons/CardIcon";

interface PaymentItemDetailsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  paymentItem: {
    orderId: string;
    transactionId: string;
    buyer: {
      name: string;
      email: string;
      avatar: string | null;
    };
    releaseDate?: string;
    nextReleaseDate?: string;
    paymentMethod: string;
    value: number;
    installment?: string | null;
    cardBrand?: string;
    cardLast4?: string;
  };
  eventName?: string;
  categoryName?: string;
  type?: "installment" | "awaiting";
}

// Mock data - substituir com dados reais da API
const mockPaymentDetails = {
  orderId: "#6b82...51d6",
  transactionId: "1240-2414",
  purchaseDate: "18/10/2024",
  paymentDate: "18/10/2024",
  status: "Pendente",
  buyer: {
    name: "Ahmad Ballard",
    email: "NoahSilva@gmail.com",
    avatar: null,
    document: "118.423.912-42",
    phone: "(11) 98765-4321",
  },
  payment: {
    method: "Pix",
    value: 150.0,
    installment: "1/3",
    totalValue: 450.0,
    installments: "3x de R$ 142,00",
    gateway: "Nome do Gateway",
    authorizationCode: "AUTHO4215",
    nsu: "033014525",
    cardBrand: "Mastercard",
    cardLast4: "5678",
  },
  event: {
    name: "Nome do evento",
    organizer: {
      name: "Organizer Text",
      email: "Organizer Text",
      avatar: null,
    },
  },
};

export function PaymentItemDetailsDrawer({
  isOpen,
  onClose,
  paymentItem,
  eventName = "Maratona 2024",
  categoryName = "Nome da categoria",
  type = "installment",
}: PaymentItemDetailsDrawerProps) {
  const [copied, setCopied] = useState(false);

  const getStatusBadge = (status: string) => {
    if (status === "Pago" || status === "Concluído") {
      return "bg-[#59E373] text-[#141414]";
    }
    return "bg-yellow-10/20 text-yellow-11";
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      const day = date.getDate().toString().padStart(2, "0");
      const month = (date.getMonth() + 1).toString().padStart(2, "0");
      const year = date.getFullYear();
      const hours = date.getHours().toString().padStart(2, "0");
      const minutes = date.getMinutes().toString().padStart(2, "0");
      return `${day}/${month}/${year} - ${hours}:${minutes}`;
    } catch {
      return dateString;
    }
  };

  return (
    <Drawer open={isOpen} onOpenChange={onClose} direction="right">
      <DrawerContent className="bg-gray-1 h-full w-full sm:max-w-[970px] border-l border-gray-6">
        {/* Header */}
        <DrawerHeader className="border-b border-gray-6 px-5 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="size-8 flex items-center justify-center border border-gray-6 rounded-lg hover:bg-gray-3 transition-colors cursor-pointer"
              >
                <ArrowLeft className="size-5 text-gray-12" />
              </button>
              <h2 className="font-family-dm-sans font-semibold text-[20px] leading-[1.3] text-gray-12">
                Comprovante do pagamento
              </h2>
            </div>
            <DrawerClose asChild>
              <button className="size-8 flex items-center justify-center rounded-lg hover:bg-gray-3 transition-colors cursor-pointer">
                <X className="size-6 text-gray-11" />
              </button>
            </DrawerClose>
          </div>
        </DrawerHeader>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-5">
            {/* Breadcrumb */}
            <div className="mb-5 flex items-center gap-2 text-base text-gray-11 font-family-dm-sans">
              <span>Eventos</span>
              <ChevronRight className="size-3 text-gray-11" />
              <span>Total a ser repassado</span>
              <ChevronRight className="size-3 text-gray-11" />
              <span>Detalhes do repasse</span>
              <ChevronRight className="size-3 text-gray-12" />
              <span className="text-gray-12">Comprovante de pagamento</span>
            </div>

            {/* Order ID */}
            <div className="mb-5 flex items-center gap-2 text-base text-gray-11 font-family-dm-sans">
              <span>ID do pedido:</span>
              <span className="text-gray-12">{paymentItem.orderId}</span>
            </div>

            {/* Buyer Section */}
            <div className="">
              <p className="text-[18px] text-gray-12 font-family-dm-sans font-medium mb-3">Informações do comprador</p>
              <div className="grid grid-cols-3 gap-4">
                <div className="flex flex-col gap-2 py-2">
                  <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-12">
                    Nome
                  </p>
                  <p className="font-family-dm-sans font-medium text-[16px] leading-[1.3] text-gray-12">
                    {paymentItem.buyer.name}
                  </p>
                </div>
                <div className="flex flex-col gap-2 py-2">
                  <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-12">
                    Email
                  </p>
                  <p className="font-family-dm-sans font-medium text-[16px] leading-[1.3] text-gray-12">
                    {paymentItem.buyer.email}
                  </p>
                </div>
                <div className="flex flex-col gap-2 py-2">
                  <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-12">
                    CPF
                  </p>
                  <p className="font-family-dm-sans font-medium text-[16px] leading-[1.3] text-gray-12">
                    {mockPaymentDetails.buyer.document}
                  </p>
                </div>
                <div className="flex flex-col gap-2 py-2">
                  <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-12">
                    Data de nascimento
                  </p>
                  <p className="font-family-dm-sans font-medium text-[16px] leading-[1.3] text-gray-12">
                    —
                  </p>
                </div>
                <div className="flex flex-col gap-2 py-2">
                  <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-12">
                    Telefone
                  </p>
                  <p className="font-family-dm-sans font-medium text-[16px] leading-[1.3] text-gray-12">
                    {mockPaymentDetails.buyer.phone}
                  </p>
                </div>
                <div className="flex flex-col gap-2 py-2">
                  <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-12">
                    Telefone de emergência
                  </p>
                  <p className="font-family-dm-sans font-medium text-[16px] leading-[1.3] text-gray-12">
                    Opcional
                  </p>
                </div>
                <div className="flex flex-col gap-2 py-2">
                  <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-12">
                    Sexo
                  </p>
                  <p className="font-family-dm-sans font-medium text-[16px] leading-[1.3] text-gray-12">
                    —
                  </p>
                </div>
              </div>
            </div>

            {/* Event Section */}
            <div className="mb-5">
              <p className="text-[18px] text-gray-12 font-family-dm-sans font-medium mb-3">Evento</p>
              <div className="bg-gray-2 border border-gray-6 rounded-lg p-4 flex items-center justify-between">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-primary-4 flex items-center justify-center shrink-0">
                    <Ticket className="size-6 text-gray-12" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <p className="font-family-dm-sans text-[16px] leading-[1.3] text-gray-12">
                      {eventName}
                    </p>
                    <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-11">
                      {categoryName}
                    </p>
                  </div>
                </div>
                <div className="h-full w-px bg-gray-6" />
                <div className="flex items-center gap-2">
                  <div className="size-8 rounded-full bg-gray-6 flex items-center justify-center shrink-0">
                    <span className="text-gray-12 font-semibold text-sm">
                      {mockPaymentDetails.event.organizer.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex flex-col gap-2">
                    <p className="font-family-dm-sans font-semibold text-[16px] leading-[1.3] text-gray-12">
                      {mockPaymentDetails.event.organizer.name}
                    </p>
                    <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-11">
                      {mockPaymentDetails.event.organizer.email}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Section */}
            <div className="mb-5">
              {/* Payment Method Card */}
              <div className="bg-gray-2 border border-gray-6 rounded-lg p-4 flex items-center justify-between mb-4">
                <div className="flex gap-4 items-center flex-1">
                  <div className="size-[36px] flex items-center justify-center shrink-0">
                    {paymentItem.paymentMethod === "Pix" ? (
                      <PixIcon className="size-9 text-gray-12" />
                    ) : paymentItem.cardBrand ? (
                      <PaymentIcon
                        type={paymentItem.cardBrand as any}
                        className="size-9"
                      />
                    ) : (
                      <CardIcon className="size-9 text-gray-12" />
                    )}
                  </div>
                  <div className="flex flex-col gap-3">
                    <p className="font-family-dm-sans font-semibold text-[18px] leading-[1.3] text-gray-12">
                      {paymentItem.paymentMethod === "Pix"
                        ? paymentItem.paymentMethod
                        : paymentItem.cardBrand && paymentItem.cardLast4
                          ? `${paymentItem.cardBrand} **** ${paymentItem.cardLast4}`
                          : paymentItem.paymentMethod}
                    </p>
                    <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-12">
                      {paymentItem.paymentMethod === "Pix" ? "Pix" : "Cartão de crédito"}
                    </p>
                  </div>
                </div>
                <div className="bg-primary-11 flex gap-1 items-center justify-center px-4 py-2 rounded-lg">
                  <CheckCircle className="size-6 text-primary-1" />
                  <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-primary-1">
                    Pago
                  </p>
                </div>
              </div>

              {/* Transaction Details */}
              <div className="bg-gray-2 border border-gray-6 rounded-lg p-4 grid grid-cols-3">
                <div className="flex flex-col gap-[15px] py-3">
                  <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-12">
                    Valor total
                  </p>
                  <p className="font-family-dm-sans font-medium text-[16px] leading-[1.3] text-gray-12">
                    R$ {paymentItem.value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="flex flex-col gap-[15px] py-3">
                  <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-12">
                    Data da compra
                  </p>
                  <p className="font-family-dm-sans font-medium text-[16px] leading-[1.3] text-gray-12">
                    {formatDate(mockPaymentDetails.purchaseDate) || "—"}
                  </p>
                </div>
                <div className="flex flex-col gap-[15px] py-3">
                  <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-12">
                    Código de autorização
                  </p>
                  <p className="font-family-dm-sans font-medium text-[16px] leading-[1.3] text-gray-12">
                    {mockPaymentDetails.payment.authorizationCode}
                  </p>
                </div>
                <div className="flex flex-col gap-[15px] py-3">
                  <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-12">
                    Gateway
                  </p>
                  <p className="font-family-dm-sans font-medium text-[16px] leading-[1.3] text-gray-12">
                    {mockPaymentDetails.payment.gateway}
                  </p>
                </div>
                {paymentItem.installment && (
                  <div className="flex flex-col gap-[15px] py-3">
                    <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-12">
                      Parcelamento
                    </p>
                    <p className="font-family-dm-sans font-medium text-[16px] leading-[1.3] text-gray-12">
                      {mockPaymentDetails.payment.installments}
                    </p>
                  </div>
                )}
                <div className="flex flex-col gap-[8px] py-3">
                  <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-12">
                    ID da transação
                  </p>
                  <div className="flex gap-1 items-center">
                    <p className="font-family-dm-sans font-medium text-[16px] leading-[1.3] text-gray-12">
                      {paymentItem.transactionId}
                    </p>
                    <button
                      onClick={() => handleCopy(paymentItem.transactionId)}
                      className="size-5 flex items-center justify-center rounded-lg hover:bg-gray-3 transition-colors"
                    >
                      {copied ? (
                        <CheckCircle className="size-4 text-green-11" />
                      ) : (
                        <Copy className="size-4 text-gray-11" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="flex flex-col gap-[15px] py-4">
                  <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-12">
                    Cupom utilizado
                  </p>
                  <div className="flex items-center gap-1">
                    <Ticket className="size-6 text-yellow-12" />
                    <p className="font-family-dm-sans font-semibold text-[14px] leading-[1.3] text-yellow-12">
                      PODIO10
                    </p>
                  </div>
                </div>
                <div className="flex flex-col gap-[15px] py-4">
                  <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-12">
                    NSU
                  </p>
                  <p className="font-family-dm-sans font-medium text-[16px] leading-[1.3] text-gray-12">
                    {mockPaymentDetails.payment.nsu}
                  </p>
                </div>
                <div className="flex flex-col gap-[15px] py-4">
                  <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-12">
                    IP
                  </p>
                  <p className="font-family-dm-sans font-medium text-[16px] leading-[1.3] text-gray-12">
                    {mockPaymentDetails.payment.nsu}
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
