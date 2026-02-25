"use client";

import { useState, useEffect } from "react";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
} from "@/components/ui/drawer";
import { X, ChevronRight, ArrowLeft, Ticket, CheckCircle, Copy } from "lucide-react";
import { PaymentIcon } from 'react-svg-credit-card-payment-icons';
import { PixIcon } from "@/components/Icons/PixIcon";
import { CardIcon } from "@/components/Icons/CardIcon";
import { organizerService } from "@/services";
import type { PaymentDetails } from "@/services/organizer/OrganizerService";
import toast from "react-hot-toast";
import { Loading } from "@/components/Loading";
import Image from "next/image";
import { getAvatarUrl } from "@/utils/avatar";

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

export function PaymentItemDetailsDrawer({
  isOpen,
  onClose,
  paymentItem,
  eventName = "Maratona 2024",
  categoryName = "Nome da categoria",
  type = "installment",
}: PaymentItemDetailsDrawerProps) {
  const [copied, setCopied] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadPaymentDetails();
    }
  }, [isOpen, paymentItem.transactionId, paymentItem.orderId]);

  const loadPaymentDetails = async () => {
    try {
      setLoading(true);
      let details: PaymentDetails;

      const orderId = paymentItem.orderId
        .replace(/^#/, "") // Remove # no início
        .replace(/\.\.\..*$/, "") // Remove ... e tudo depois
        .trim();

      if (orderId && orderId.length > 10) {
        try {
          details = await organizerService.getPaymentDetailsByPayment(orderId);
          setPaymentDetails(details);
          return;
        } catch (error) {
          // Se falhar, tentar como orderId
          try {
            details = await organizerService.getPaymentDetailsByOrder(orderId);
            setPaymentDetails(details);
            return;
          } catch (error) {
            // Continuar para tentar outras opções
          }
        }
      }

      // Tentar buscar por transactionId (se não estiver formatado e parecer ser um UUID válido)
      // Não usar transactionId se for um ID composto de parcela (geralmente não é um UUID)
      const isLikelyUUID = paymentItem.transactionId &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(paymentItem.transactionId);

      if (paymentItem.transactionId && !paymentItem.transactionId.includes("...") && isLikelyUUID) {
        try {
          details = await organizerService.getPaymentDetailsByTransaction(paymentItem.transactionId);
          setPaymentDetails(details);
          return;
        } catch (error) {
          // Continuar para tentar como registrationId
        }
      }

      // Se orderId parece ser um registrationId, tentar buscar por registrationId
      if (orderId && orderId.length > 10) {
        try {
          details = await organizerService.getPaymentDetailsByRegistration(orderId);
          setPaymentDetails(details);
          return;
        } catch (error) {
          // Se falhar, mostrar erro
        }
      }

      throw new Error("Não foi possível encontrar os detalhes do pagamento");
    } catch (error: any) {
      console.error("Error loading payment details:", error);
      toast.error(error.message || "Erro ao carregar detalhes do pagamento");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return "—";
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

  const formatDocument = (document?: string | null) => {
    if (!document) return "—";
    const cleaned = document.replace(/\D/g, "");
    if (cleaned.length === 11) {
      // CPF
      return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
    } else if (cleaned.length === 14) {
      // CNPJ
      return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
    }
    return document;
  };

  const formatPhone = (phone?: string | null) => {
    if (!phone) return "—";
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length === 11) {
      return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
    } else if (cleaned.length === 10) {
      return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
    }
    return phone;
  };

  const formatGender = (gender?: string | null) => {
    if (!gender) return "—";
    const genderMap: { [key: string]: string } = {
      MALE: "Masculino",
      FEMALE: "Feminino",
      OTHER: "Outro",
    };
    return genderMap[gender] || gender;
  };

  const formatPaymentMethod = (method: string) => {
    const methodMap: { [key: string]: string } = {
      CREDIT_CARD: "Cartão de crédito",
      DEBIT_CARD: "Cartão de débito",
      PIX: "Pix",
      BOLETO: "Boleto",
    };
    return methodMap[method] || method;
  };

  const formatInstallments = (installments: number | null, installmentValue: number | null) => {
    if (!installments || !installmentValue) return null;
    const totalValue = installments * installmentValue;
    return `${installments}x de R$ ${(installmentValue / 100).toFixed(2).replace(".", ",")}`;
  };

  const getStatusLabel = (status: string) => {
    const statusMap: { [key: string]: string } = {
      PAID: "Pago",
      PENDING: "Pendente",
      REFUNDED: "Estornado",
      CANCELLED: "Cancelado",
    };
    return statusMap[status] || status;
  };

  const getStatusBadge = (status: string) => {
    if (status === "PAID") {
      return "bg-[#59E373] text-[#141414]";
    }
    return "bg-yellow-10/20 text-yellow-11";
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <Drawer open={isOpen} onOpenChange={onClose} direction="right">
        <DrawerContent className="bg-gray-1 h-full w-full sm:max-w-[970px] border-l border-gray-6">
          <div className="flex items-center justify-center h-full">
            <Loading />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  if (!paymentDetails) {
    return null;
  }

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
              <span className="text-gray-12">{paymentDetails.orderId}</span>
            </div>

            {/* Buyer Section */}
            <div className="mb-5">
              <p className="text-[18px] text-gray-12 font-family-dm-sans font-medium mb-3">Informações do comprador</p>
              <div className="grid grid-cols-3 gap-4">
                <div className="flex flex-col gap-2 py-2">
                  <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-12">
                    Nome
                  </p>
                  <p className="font-family-dm-sans font-medium text-[16px] leading-[1.3] text-gray-12">
                    {paymentDetails.buyer.fullName}
                  </p>
                </div>
                <div className="flex flex-col gap-2 py-2">
                  <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-12">
                    Email
                  </p>
                  <p className="font-family-dm-sans font-medium text-[16px] leading-[1.3] text-gray-12">
                    {paymentDetails.buyer.email}
                  </p>
                </div>
                <div className="flex flex-col gap-2 py-2">
                  <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-12">
                    CPF
                  </p>
                  <p className="font-family-dm-sans font-medium text-[16px] leading-[1.3] text-gray-12">
                    {formatDocument(paymentDetails.buyer.documentNumber)}
                  </p>
                </div>
                <div className="flex flex-col gap-2 py-2">
                  <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-12">
                    Data de nascimento
                  </p>
                  <p className="font-family-dm-sans font-medium text-[16px] leading-[1.3] text-gray-12">
                    {paymentDetails.buyer.dateOfBirth ? formatDate(paymentDetails.buyer.dateOfBirth).split(" - ")[0] : "—"}
                  </p>
                </div>
                <div className="flex flex-col gap-2 py-2">
                  <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-12">
                    Telefone
                  </p>
                  <p className="font-family-dm-sans font-medium text-[16px] leading-[1.3] text-gray-12">
                    {formatPhone(paymentDetails.buyer.phone)}
                  </p>
                </div>
                <div className="flex flex-col gap-2 py-2">
                  <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-12">
                    Telefone de emergência
                  </p>
                  <p className="font-family-dm-sans font-medium text-[16px] leading-[1.3] text-gray-12">
                    {formatPhone(paymentDetails.buyer.reservePhone) || "—"}
                  </p>
                </div>
                <div className="flex flex-col gap-2 py-2">
                  <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-12">
                    Sexo
                  </p>
                  <p className="font-family-dm-sans font-medium text-[16px] leading-[1.3] text-gray-12">
                    {formatGender(paymentDetails.buyer.gender)}
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
                      {paymentDetails.event.name}
                    </p>
                    <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-11">
                      {paymentDetails.event.category || categoryName}
                    </p>
                  </div>
                </div>
                {paymentDetails.event.organizer && (
                  <>
                    <div className="h-full w-px bg-gray-6" />
                    <div className="flex items-center gap-2">
                      {paymentDetails.event.organizer.avatar ? (
                        <div className="size-8 rounded-full overflow-hidden bg-gray-6 flex items-center justify-center shrink-0">
                          <Image
                            src={getAvatarUrl(paymentDetails.event.organizer.avatar)}
                            alt={paymentDetails.event.organizer.name}
                            width={32}
                            height={32}
                            className="rounded-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="size-8 rounded-full bg-gray-6 flex items-center justify-center shrink-0">
                          <span className="text-gray-12 font-semibold text-sm">
                            {paymentDetails.event.organizer.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div className="flex flex-col gap-2">
                        <p className="font-family-dm-sans font-semibold text-[16px] leading-[1.3] text-gray-12">
                          {paymentDetails.event.organizer.name}
                        </p>
                        <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-11">
                          {paymentDetails.event.organizer.email}
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Payment Section */}
            <div className="mb-5">
              {/* Payment Method Card */}
              <div className="bg-gray-2 border border-gray-6 rounded-lg p-4 flex items-center justify-between mb-4">
                <div className="flex gap-4 items-center flex-1">
                  <div className="size-[36px] flex items-center justify-center shrink-0">
                    {paymentDetails.payment.method === "PIX" ? (
                      <PixIcon className="size-9 text-gray-12" />
                    ) : paymentDetails.payment.cardBrand ? (
                      <PaymentIcon
                        type={paymentDetails.payment.cardBrand as any}
                        className="size-9"
                      />
                    ) : (
                      <CardIcon className="size-9 text-gray-12" />
                    )}
                  </div>
                  <div className="flex flex-col gap-3">
                    <p className="font-family-dm-sans font-semibold text-[18px] leading-[1.3] text-gray-12">
                      {paymentDetails.payment.method === "PIX"
                        ? "Pix"
                        : paymentDetails.payment.cardBrand && paymentDetails.payment.last4Digits
                          ? `${paymentDetails.payment.cardBrand} **** ${paymentDetails.payment.last4Digits}`
                          : formatPaymentMethod(paymentDetails.payment.method)}
                    </p>
                    <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-12">
                      {formatPaymentMethod(paymentDetails.payment.method)}
                    </p>
                  </div>
                </div>
                <div className={`flex gap-1 items-center justify-center px-4 py-2 rounded-lg ${getStatusBadge(paymentDetails.payment.status)}`}>
                  <CheckCircle className="size-6" />
                  <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3]">
                    {getStatusLabel(paymentDetails.payment.status)}
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
                    R$ {(paymentDetails.payment.totalAmount / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="flex flex-col gap-[15px] py-3">
                  <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-12">
                    Data da compra
                  </p>
                  <p className="font-family-dm-sans font-medium text-[16px] leading-[1.3] text-gray-12">
                    {formatDate(paymentDetails.payment.purchaseDate)}
                  </p>
                </div>
                <div className="flex flex-col gap-[15px] py-3">
                  <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-12">
                    Código de autorização
                  </p>
                  <p className="font-family-dm-sans font-medium text-[16px] leading-[1.3] text-gray-12">
                    {paymentDetails.payment.authorizationCode || "—"}
                  </p>
                </div>
                <div className="flex flex-col gap-[15px] py-3">
                  <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-12">
                    Gateway
                  </p>
                  <p className="font-family-dm-sans font-medium text-[16px] leading-[1.3] text-gray-12">
                    {paymentDetails.payment.gateway}
                  </p>
                </div>
                {paymentDetails.payment.installments && (
                  <div className="flex flex-col gap-[15px] py-3">
                    <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-12">
                      Parcelamento
                    </p>
                    <p className="font-family-dm-sans font-medium text-[16px] leading-[1.3] text-gray-12">
                      {formatInstallments(paymentDetails.payment.installments, paymentDetails.payment.installmentValue) || "—"}
                    </p>
                  </div>
                )}
                <div className="flex flex-col gap-[8px] py-3">
                  <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-12">
                    ID da transação
                  </p>
                  <div className="flex gap-1 items-center">
                    <p className="font-family-dm-sans font-medium text-[16px] leading-[1.3] text-gray-12">
                      {paymentDetails.transactionId}
                    </p>
                    <button
                      onClick={() => handleCopy(paymentDetails.transactionId)}
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
                {paymentDetails.coupon && (
                  <div className="flex flex-col gap-[15px] py-4">
                    <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-12">
                      Cupom utilizado
                    </p>
                    <div className="flex items-center gap-1">
                      <Ticket className="size-6 text-yellow-12" />
                      <p className="font-family-dm-sans font-semibold text-[14px] leading-[1.3] text-yellow-12">
                        {paymentDetails.coupon.code}
                      </p>
                    </div>
                  </div>
                )}
                <div className="flex flex-col gap-[15px] py-4">
                  <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-12">
                    NSU
                  </p>
                  <p className="font-family-dm-sans font-medium text-[16px] leading-[1.3] text-gray-12">
                    {paymentDetails.payment.nsu || "—"}
                  </p>
                </div>
                <div className="flex flex-col gap-[15px] py-4">
                  <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-12">
                    IP
                  </p>
                  <p className="font-family-dm-sans font-medium text-[16px] leading-[1.3] text-gray-12">
                    {paymentDetails.payment.transactionIp || "—"}
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
