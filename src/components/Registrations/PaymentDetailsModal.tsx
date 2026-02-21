"use client";
import { PaymentIcon } from 'react-svg-credit-card-payment-icons';
import { usePaymentDetailsModal } from "@/stores/modalStore";
import { motion, AnimatePresence } from "framer-motion";
import { X, Copy, CheckCircle, Eye, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import Image from "next/image";
import { Button } from "../Button";

export function PaymentDetailsModal() {
  const { isOpen, closePaymentDetailsModal, data } = usePaymentDetailsModal();
  const [copied, setCopied] = useState(false);
  const [ticketsPage, setTicketsPage] = useState(1);

  const registration = data?.registration;

  if (!isOpen || !registration) return null;

  // Mock data para informações de pagamento (substituir com dados reais quando disponível)
  const paymentInfo = {
    cardBrand: "Mastercard",
    cardLast4: "5678",
    paymentMethod: "Cartão de crédito",
    totalAmount: registration.finalAmount || 0,
    purchaseDate: registration.purchaseDate || "",
    gateway: "Nome do Gateway e logo",
    installments: "3x de R$ 142,00",
    authorizationCode: "AUTHO4215",
    transactionId: "psi2_234194ks...",
    coupon: "PODIO10",
    nsu: "033014525",
    ip: "033014525",
  };

  // Mock data para participantes (substituir com dados reais quando disponível)
  const participants = registration.modalities?.map((mod: any, index: number) => ({
    id: `${registration.id}-${index}`,
    registrationId: "1240-2414",
    name: registration.user?.firstName && registration.user?.lastName
      ? `${registration.user.firstName} ${registration.user.lastName}`
      : "Participante",
    email: registration.user?.email || "",
    ticket: mod.modality?.name || "Ticket",
    category: "Nome da categoria",
  })) || [];

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
      return "";
    }
  };

  const formatCPF = (cpf?: string) => {
    if (!cpf) return "";
    const numbers = cpf.replace(/\D/g, "");
    if (numbers.length !== 11) return cpf;
    return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9)}`;
  };

  const formatPhone = (phone?: string) => {
    if (!phone) return "";
    const numbers = phone.replace(/\D/g, "");
    if (numbers.length !== 11) return phone;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 3)} ${numbers.slice(3, 7)}-${numbers.slice(7)}`;
  };

  const formatBirthDate = (dateString?: string) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      const day = date.getDate().toString().padStart(2, "0");
      const month = (date.getMonth() + 1).toString().padStart(2, "0");
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return "";
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);
  };

  const ticketsPerPage = 4;
  const totalPages = Math.ceil(participants.length / ticketsPerPage);
  const paginatedParticipants = participants.slice(
    (ticketsPage - 1) * ticketsPerPage,
    ticketsPage * ticketsPerPage
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 z-50"
            onClick={closePaymentDetailsModal}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gray-1 rounded-[12px] w-full max-w-[1095px] max-h-[90vh] flex flex-col shadow-2xl">
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-6 shrink-0">
                <h2 className="font-family-dm-sans font-semibold text-[20px] leading-[1.3] text-gray-12">
                  Detalhes de pagamento
                </h2>
                <button
                  onClick={closePaymentDetailsModal}
                  className="size-8 flex items-center justify-center rounded-lg hover:bg-gray-3 transition-colors"
                >
                  <X className="size-5 text-gray-11" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto">
                <div className="flex gap-0">
                  {/* Main Content */}
                  <div className="flex-1 p-5 flex flex-col gap-4">
                    {/* Order ID */}
                    <div className="flex gap-1 items-center">
                      <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-11">
                        ID do pedido:
                      </p>
                      <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-12">
                        #{registration.id?.slice(0, 6)}...{registration.id?.slice(-4)}
                      </p>
                    </div>

                    {/* Buyer Information */}
                    <div className="flex flex-col gap-2">
                      <h3 className="font-manrope font-bold text-[18px] leading-[1.1] text-gray-12">
                        Informações do comprador
                      </h3>
                      <div className="grid grid-cols-3">
                        <div className="flex flex-col gap-[15px] py-3">
                          <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-12">
                            Nome
                          </p>
                          <p className="font-family-dm-sans font-medium text-[16px] leading-[1.3] text-gray-12">
                            {registration.user?.firstName && registration.user?.lastName
                              ? `${registration.user.firstName} ${registration.user.lastName}`
                              : "—"}
                          </p>
                        </div>
                        <div className="flex flex-col gap-[15px] py-3">
                          <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-12">
                            Email
                          </p>
                          <p className="font-family-dm-sans font-medium text-[16px] leading-[1.3] text-gray-12">
                            {registration.user?.email || "—"}
                          </p>
                        </div>
                        <div className="flex flex-col gap-[15px] py-3">
                          <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-12">
                            Telefone:
                          </p>
                          <p className="font-family-dm-sans font-medium text-[16px] leading-[1.3] text-gray-12">
                            {formatPhone((registration.user as any)?.phone) || "—"}
                          </p>
                        </div>
                        <div className="flex flex-col gap-[15px] py-3">
                          <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-12">
                            CPF
                          </p>
                          <p className="font-family-dm-sans font-medium text-[16px] leading-[1.3] text-gray-12">
                            {formatCPF(registration.user?.documentNumber) || "—"}
                          </p>
                        </div>
                        <div className="flex flex-col gap-[15px] py-3">
                          <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-12">
                            Data de nascimento:
                          </p>
                          <p className="font-family-dm-sans font-medium text-[16px] leading-[1.3] text-gray-12">
                            {formatBirthDate((registration.user as any)?.dateOfBirth) || "—"}
                          </p>
                        </div>
                        <div className="flex flex-col gap-[15px] py-3">
                          <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-12">
                            Sexo
                          </p>
                          <p className="font-family-dm-sans font-medium text-[16px] leading-[1.3] text-gray-12">
                            {(registration.user as any)?.gender === "male"
                              ? "Masculino"
                              : (registration.user as any)?.gender === "female"
                                ? "Feminino"
                                : (registration.user as any)?.gender || "—"}
                          </p>
                        </div>
                        <div className="flex flex-col gap-[15px] py-3">
                          <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-12">
                            Telefone de emergência
                          </p>
                          <p className="font-family-dm-sans font-medium text-[16px] leading-[1.3] text-gray-12">
                            {formatPhone((registration.user as any)?.reserve_phone) || "Opcional"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Payment Information */}
                    <div className="flex flex-col gap-3">
                      {/* Payment Method Card */}
                      <div className="bg-gray-2 border border-gray-6 rounded-lg p-4 flex items-center justify-between">
                        <div className="flex gap-4 items-center flex-1">
                          <div className="size-[36px] relative shrink-0">
                            <Image
                              src="/banners/card_placeholder.png"
                              alt="Card"
                              fill
                              className="object-cover rounded"
                            />
                          </div>
                          <div className="flex flex-col gap-3">
                            <p className="font-family-dm-sans font-semibold text-[18px] leading-[1.3] text-gray-12">
                              {paymentInfo.cardBrand} **** {paymentInfo.cardLast4}
                            </p>
                            <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-12">
                              {paymentInfo.paymentMethod}
                            </p>
                          </div>
                        </div>
                        <div className="bg-green-11 flex gap-1 items-center justify-center px-4 py-2 rounded">
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
                            {formatPrice(paymentInfo.totalAmount)}
                          </p>
                        </div>
                        <div className="flex flex-col gap-[15px] py-3">
                          <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-12">
                            Data da compra
                          </p>
                          <p className="font-family-dm-sans font-medium text-[16px] leading-[1.3] text-gray-12">
                            {formatDate(paymentInfo.purchaseDate) || "—"}
                          </p>
                        </div>
                        <div className="flex flex-col gap-[15px] py-3">
                          <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-12">
                            Código de autorização
                          </p>
                          <p className="font-family-dm-sans font-medium text-[16px] leading-[1.3] text-gray-12">
                            {paymentInfo.authorizationCode}
                          </p>
                        </div>
                        <div className="flex flex-col gap-[15px] py-3">
                          <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-12">
                            Gateway
                          </p>
                          <p className="font-family-dm-sans font-medium text-[16px] leading-[1.3] text-gray-12">
                            {paymentInfo.gateway}
                          </p>
                        </div>
                        <div className="flex flex-col gap-[15px] py-3">
                          <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-12">
                            Parcelamento
                          </p>
                          <p className="font-family-dm-sans font-medium text-[16px] leading-[1.3] text-gray-12">
                            {paymentInfo.installments}
                          </p>
                        </div>
                        <div className="flex flex-col gap-[8px] py-3">
                          <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-12">
                            ID da transação
                          </p>
                          <div className="flex gap-1 items-center">
                            <p className="font-family-dm-sans font-medium text-[16px] leading-[1.3] text-gray-12">
                              {paymentInfo.transactionId}
                            </p>
                            <button
                              onClick={() => handleCopy(paymentInfo.transactionId)}
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
                            <div className="size-6 flex items-center justify-center">
                              <svg
                                className="size-6 text-yellow-12"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"
                                />
                              </svg>
                            </div>
                            <p className="font-family-dm-sans font-semibold text-[14px] leading-[1.3] text-yellow-12">
                              {paymentInfo.coupon}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col gap-[15px] py-4">
                          <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-12">
                            NSU
                          </p>
                          <p className="font-family-dm-sans font-medium text-[16px] leading-[1.3] text-gray-12">
                            {paymentInfo.nsu}
                          </p>
                        </div>
                        <div className="flex flex-col gap-[15px] py-4">
                          <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-12">
                            IP
                          </p>
                          <p className="font-family-dm-sans font-medium text-[16px] leading-[1.3] text-gray-12">
                            {paymentInfo.ip}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Tickets List */}
                    <div className="bg-gray-2 border-[1.5px] border-gray-6 rounded-lg flex flex-col">
                      {/* Header */}
                      <div className="flex items-center justify-between px-4 py-5 border-b border-gray-6">
                        <h3 className="font-manrope font-semibold text-[18px] leading-[1.1] text-gray-12">
                          Ingressos adquiridos
                        </h3>
                        <div className="flex gap-1 items-center">
                          <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-11">
                            Total ingressos:
                          </p>
                          <p className="font-family-dm-sans font-bold text-[16px] leading-[1.3] text-gray-12">
                            {participants.length}
                          </p>
                        </div>
                      </div>

                      {/* Table Header */}
                      <div className="bg-gray-3 border-b border-t border-gray-6 flex h-[44px] items-center">
                        <div className="w-[120px] px-4">
                          <p className="font-inter font-medium text-[14px] leading-[1.3] text-gray-12">
                            ID inscrição
                          </p>
                        </div>
                        <div className="w-[273px] px-4">
                          <p className="font-inter font-medium text-[14px] leading-[1.3] text-gray-12">
                            Participante
                          </p>
                        </div>
                        <div className="flex-1 px-4">
                          <p className="font-inter font-medium text-[14px] leading-[1.3] text-gray-12">
                            Ticket
                          </p>
                        </div>
                        <div className="flex-1 px-4 border-r border-gray-6 flex justify-end">
                          <p className="font-inter font-medium text-[14px] leading-[1.3] text-gray-12">
                            Ações
                          </p>
                        </div>
                      </div>

                      {/* Table Rows */}
                      <div className="flex flex-col">
                        {paginatedParticipants.map((participant: any) => (
                          <div
                            key={participant.id}
                            className="border-b border-gray-6 flex items-center"
                          >
                            <div className="w-[120px] px-4 py-3">
                              <p className="font-family-dm-sans font-semibold text-[14px] leading-[1.3] text-gray-12 truncate">
                                {participant.registrationId}
                              </p>
                            </div>
                            <div className="w-[273px] px-4 py-3 flex gap-[10px] items-center">
                              <div className="size-9 rounded-lg bg-gray-6 flex items-center justify-center shrink-0">
                                <span className="text-gray-12 font-semibold text-sm">
                                  {participant.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div className="flex flex-col gap-2 min-w-0 flex-1">
                                <p className="font-family-dm-sans font-semibold text-[14px] leading-[1.3] text-gray-12 truncate">
                                  {participant.name}
                                </p>
                                <p className="font-family-dm-sans font-normal text-[14px] leading-[1.3] text-gray-11 truncate">
                                  {participant.email}
                                </p>
                              </div>
                            </div>
                            <div className="flex-1 px-4 py-3 flex flex-col gap-2">
                              <p className="font-family-dm-sans font-normal text-[14px] leading-[1.3] text-gray-11">
                                {participant.category}
                              </p>
                              <p className="font-inter font-semibold text-[14px] leading-[1.3] text-gray-12">
                                {participant.ticket}
                              </p>
                            </div>
                            <div className="flex-1 px-4 py-2 flex justify-end">
                              <button className="bg-gray-2 border border-gray-6 rounded-lg size-8 flex items-center justify-center hover:bg-gray-3 transition-colors">
                                <Eye className="size-4 text-gray-11" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Pagination */}
                      {totalPages > 1 && (
                        <div className="flex items-center justify-end gap-1 px-4 py-5 border-t border-gray-6">
                          <button
                            onClick={() => setTicketsPage((prev) => Math.max(1, prev - 1))}
                            disabled={ticketsPage === 1}
                            className="size-8 flex items-center justify-center border border-gray-6 rounded-lg hover:bg-gray-3 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <ChevronLeft className="size-4" />
                          </button>
                          {Array.from({ length: Math.min(totalPages, 8) }, (_, i) => {
                            const pageNum = i + 1;
                            const isActive = pageNum === ticketsPage;
                            return (
                              <button
                                key={pageNum}
                                onClick={() => setTicketsPage(pageNum)}
                                className={`size-8 flex items-center justify-center border rounded-lg text-[14px] font-family-dm-sans font-medium ${isActive
                                  ? "bg-primary-11 border-primary-11 text-primary-1"
                                  : "border-gray-6 hover:bg-gray-3"
                                  }`}
                              >
                                {pageNum}
                              </button>
                            );
                          })}
                          <button
                            onClick={() => setTicketsPage((prev) => Math.min(totalPages, prev + 1))}
                            disabled={ticketsPage >= totalPages}
                            className="size-8 flex items-center justify-center border border-gray-6 rounded-lg hover:bg-gray-3 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <ChevronRight className="size-4" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Download Button */}
                    <Button variant="outline" className="border-gray-6 rounded-lg text-gray-12 w-fit">
                      Baixar comprovante
                    </Button>
                  </div>

                  {/* Scrollbar */}
                  <div className="w-[9px] relative shrink-0">
                    <div className="absolute inset-0 bg-gray-8 rounded-[32px]" />
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-primary-12 h-[45px] w-[9px] rounded-[32px]" />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
