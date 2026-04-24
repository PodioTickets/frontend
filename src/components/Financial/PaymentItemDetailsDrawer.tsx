"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
} from "@/components/ui/drawer";
import { X, ChevronRight, ArrowLeft, Ticket, CheckCircle, Copy, FileText } from "lucide-react";
import { PaymentIcon } from "react-svg-credit-card-payment-icons";
import { PixIcon } from "@/components/Icons/PixIcon";
import { CardIcon } from "@/components/Icons/CardIcon";
import { organizerService } from "@/services";
import type { PaymentDetails } from "@/services/organizer/OrganizerService";
import toast from "react-hot-toast";
import { Loading } from "@/components/Loading";
import Image from "next/image";
import { getAvatarUrl } from "@/utils/avatar";
import { Pagination } from "@/components/Pagination";
import { XCircleIcon } from "lucide-react";
import { TicketIcon } from "../Icons/TicketIcon";

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

const PARTICIPANTS_PER_PAGE = 4;

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
  const [ticketsPage, setTicketsPage] = useState(1);

  useEffect(() => {
    if (!isOpen) {
      setPaymentDetails(null);
      setTicketsPage(1);
      return;
    }
    loadPaymentDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, paymentItem.orderId]);

  const loadPaymentDetails = async () => {
    try {
      setLoading(true);
      const orderId = paymentItem.orderId
        .replace(/^#/, "")
        .replace(/\.\.\..*$/, "")
        .trim();
      const details = await organizerService.getPaymentDetailsByOrder(orderId);
      setPaymentDetails(details);
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
      return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
    } else if (cleaned.length === 14) {
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
    const map: Record<string, string> = { MALE: "Masculino", FEMALE: "Feminino", OTHER: "Outro" };
    return map[gender] || gender;
  };

  const formatPaymentMethod = (method: string) => {
    const map: Record<string, string> = {
      CREDIT_CARD: "Cartão de crédito",
      DEBIT_CARD: "Cartão de débito",
      PIX: "Pix",
      BOLETO: "Boleto",
    };
    return map[method] || method;
  };

  const formatInstallments = (installments: number | null, installmentValue: number | null) => {
    if (!installments || !installmentValue) return null;
    return `${installments}x de R$ ${(installmentValue / 100).toFixed(2).replace(".", ",")}`;
  };

  const getStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      PAID: "Pago",
      PENDING: "Pendente",
      REFUNDED: "Estornado",
      CANCELLED: "Cancelado",
    };
    return map[status] || status;
  };

  const getStatusBadge = (status: string) => {
    if (status === "PAID") return "bg-primary-11 text-primary-1";
    if (status === "PENDING") return "bg-yellow-11 text-white";
    if (status === "REFUNDED" || status === "CANCELLED") return "bg-red-11 text-gray-1";
    return "bg-primary-11 text-primary-1";
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Build participants list from `registrations`
  const participants = useMemo(() => {
    if (!paymentDetails?.registrations?.length) return [];
    return paymentDetails.registrations.map((reg) => ({
      id: reg.id,
      registrationCode: reg.id ? reg.id.slice(0, 8) : "—",
      name: reg.name || "Participante",
      email: reg.email || "",
      ticketName: reg.ticket?.name || "—",
      categoryName: reg.ticketCategory?.name || "Ingresso avulso",
    }));
  }, [paymentDetails]);

  const totalTicketPages = Math.ceil(participants.length / PARTICIPANTS_PER_PAGE);
  const safeTicketsPage = Math.min(ticketsPage, Math.max(1, totalTicketPages));
  const paginatedParticipants = participants.slice(
    (safeTicketsPage - 1) * PARTICIPANTS_PER_PAGE,
    safeTicketsPage * PARTICIPANTS_PER_PAGE
  );

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

  const { buyer, payment, event, coupon } = paymentDetails;

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
          <div className="p-5 flex flex-col gap-5">
            {/* Breadcrumb */}
            <div className="flex items-center gap-1 text-[14px] text-gray-11 font-family-dm-sans flex-wrap">
              <span>Eventos</span>
              <ChevronRight className="size-3 text-gray-11 shrink-0" />
              <span>Financeiro</span>
              <ChevronRight className="size-3 text-gray-11 shrink-0" />
              <span className="text-gray-12">Comprovante de pagamento</span>
            </div>

            {/* Order ID */}
            <div className="flex items-center gap-1 text-[16px] font-family-dm-sans">
              <span className="text-gray-11">ID do pedido:</span>
              <span className="text-gray-12 font-medium">{paymentDetails.orderId}</span>
            </div>

            {/* Buyer Section */}
            <div>
              <p className="text-[18px] text-gray-12 font-manrope font-bold mb-3">
                Informações do comprador
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-4">
                {[
                  { label: "Nome", value: buyer.fullName || `${buyer.firstName} ${buyer.lastName}`.trim() || "—" },
                  { label: "Email", value: buyer.email || "—" },
                  { label: "CPF", value: formatDocument(buyer.documentNumber) },
                  {
                    label: "Data de nascimento",
                    value: buyer.dateOfBirth ? formatDate(buyer.dateOfBirth).split(" - ")[0] : "—",
                  },
                  { label: "Telefone", value: formatPhone(buyer.phone) },
                  { label: "Telefone de emergência", value: formatPhone(buyer.reservePhone) },
                  { label: "Sexo", value: formatGender(buyer.gender) },
                ].map(({ label, value }) => (
                  <div key={label} className="flex flex-col gap-1 py-2">
                    <p className="font-family-dm-sans font-normal text-[14px] leading-[1.3] text-gray-11">
                      {label}
                    </p>
                    <p className="font-family-dm-sans font-medium text-[15px] leading-[1.3] text-gray-12">
                      {value}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Event Section */}
            <div>
              <p className="text-[18px] text-gray-12 font-manrope font-bold mb-3">Evento</p>
              <div className="bg-gray-2 border border-gray-6 rounded-lg p-4 flex items-center gap-4">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-primary-4 flex items-center justify-center shrink-0">
                    <Ticket className="size-5 text-gray-12" />
                  </div>
                  <div className="flex flex-col gap-1 min-w-0">
                    <p className="font-family-dm-sans font-semibold text-[15px] leading-[1.3] text-gray-12 truncate">
                      {event.name}
                    </p>
                    {event.category && (
                      <p className="font-family-dm-sans font-normal text-[13px] leading-[1.3] text-gray-11 truncate">
                        {event.category}
                      </p>
                    )}
                  </div>
                </div>
                {event.organizer && (
                  <>
                    <div className="h-8 w-px bg-gray-6 shrink-0" />
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {event.organizer.avatar ? (
                        <div className="size-8 rounded-full overflow-hidden bg-gray-6 shrink-0">
                          <Image
                            src={getAvatarUrl(event.organizer.avatar)}
                            alt={event.organizer.name}
                            width={32}
                            height={32}
                            className="rounded-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="size-8 rounded-full bg-gray-6 flex items-center justify-center shrink-0">
                          <span className="text-gray-12 font-semibold text-sm">
                            {event.organizer.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div className="flex flex-col gap-1 min-w-0">
                        <p className="font-family-dm-sans font-semibold text-[15px] leading-[1.3] text-gray-12 truncate">
                          {event.organizer.name}
                        </p>
                        <p className="font-family-dm-sans font-normal text-[13px] leading-[1.3] text-gray-11 truncate">
                          {event.organizer.email}
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Payment Method Card */}
            <div className="bg-gray-2 border border-gray-6 rounded-lg p-4 flex items-center justify-between gap-4">
              <div className="flex gap-4 items-center flex-1">
                <div className="size-[36px] flex items-center justify-center shrink-0">
                  {payment.method === "PIX" ? (
                    <PixIcon className="size-9 text-gray-12" />
                  ) : payment.cardBrand ? (
                    <PaymentIcon type={payment.cardBrand as any} className="size-9" />
                  ) : (
                    <CardIcon className="size-9 text-gray-12" />
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <p className="font-family-dm-sans font-semibold text-[16px] leading-[1.3] text-gray-12">
                    {payment.method === "PIX"
                      ? "Pix"
                      : payment.cardBrand && payment.last4Digits
                        ? `${payment.cardBrand} **** ${payment.last4Digits}`
                        : formatPaymentMethod(payment.method)}
                  </p>
                  <p className="font-family-dm-sans font-normal text-[14px] leading-[1.3] text-gray-11">
                    {formatPaymentMethod(payment.method)}
                  </p>
                </div>
              </div>
              <div className={`flex gap-1 items-center justify-center px-3 py-1.5 rounded-lg text-[14px] font-family-dm-sans shrink-0 ${getStatusBadge(payment.status)}`}>
                {payment.status === "PAID" ? (
                  <CheckCircle className="size-4" />
                ) : (
                  <XCircleIcon className="size-4" />
                )}
                <span>{getStatusLabel(payment.status)}</span>
              </div>
            </div>

            {/* Transaction Details */}
            <div className="bg-gray-2 border border-gray-6 rounded-lg p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
              {[
                {
                  label: "Valor total",
                  value: `R$ ${(payment.totalAmount / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
                },
                { label: "Data da compra", value: formatDate(payment.purchaseDate) },
                { label: "Código de autorização", value: payment.authorizationCode || "—" },
                { label: "Gateway", value: payment.gateway },
                {
                  label: "Parcelamento",
                  value: formatInstallments(payment.installments ?? null, payment.installmentValue ?? null) || "À vista",
                },
                { label: "NSU", value: payment.nsu || "—" },
                { label: "IP", value: payment.transactionIp || "—" },
              ].map(({ label, value }) => (
                <div key={label} className="flex flex-col gap-2 py-3">
                  <p className="font-family-dm-sans font-normal text-[14px] leading-[1.3] text-gray-11">
                    {label}
                  </p>
                  <p className="font-family-dm-sans font-medium text-[15px] leading-[1.3] text-gray-12">
                    {value}
                  </p>
                </div>
              ))}

              {/* Transaction ID with copy */}
              <div className="flex flex-col gap-2 py-3">
                <p className="font-family-dm-sans font-normal text-[14px] leading-[1.3] text-gray-11">
                  ID da transação
                </p>
                <div className="flex gap-1 items-center">
                  <p className="font-family-dm-sans font-medium text-[15px] leading-[1.3] text-gray-12 truncate max-w-[150px]">
                    {paymentDetails.transactionId}
                  </p>
                  <button
                    onClick={() => handleCopy(paymentDetails.transactionId)}
                    className="size-5 flex items-center justify-center rounded-lg hover:bg-gray-3 transition-colors shrink-0"
                  >
                    {copied ? (
                      <CheckCircle className="size-4 text-primary-11" />
                    ) : (
                      <Copy className="size-4 text-gray-11" />
                    )}
                  </button>
                </div>
              </div>

              {/* Coupon */}
              {coupon && (
                <div className="flex flex-col gap-2 py-3">
                  <p className="font-family-dm-sans font-normal text-[14px] leading-[1.3] text-gray-11">
                    Cupom utilizado
                  </p>
                  <div className="flex items-center gap-1">
                    <Ticket className="size-4 text-yellow-12" />
                    <p className="font-family-dm-sans font-semibold text-[14px] leading-[1.3] text-yellow-12">
                      {coupon.code}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {participants.length > 0 && (
              <div className="bg-gray-2 border-[1.5px] border-gray-6 rounded-lg overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-5 border-b border-gray-6">
                  <p className="font-manrope font-bold text-[18px] leading-[1.1] text-gray-12">
                    Ingressos vinculados a este pedido
                  </p>
                  <div className="flex gap-1 items-center">
                    <span className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-11">
                      Total ingressos:
                    </span>
                    <span className="font-family-dm-sans font-bold text-[16px] leading-[1.3] text-gray-12">
                      {participants.length}
                    </span>
                  </div>
                </div>

                {/* Column Headers */}
                <div className="bg-gray-3 border-b border-t border-gray-6 flex h-[44px] items-center">
                  <div className="w-[120px] px-4 shrink-0">
                    <p className="font-inter font-medium text-[14px] leading-[1.3] text-gray-12">
                      ID inscrição
                    </p>
                  </div>
                  <div className="w-[273px] px-4 shrink-0">
                    <p className="font-inter font-medium text-[14px] leading-[1.3] text-gray-12">
                      Participante
                    </p>
                  </div>
                  <div className="flex-1 min-w-0 px-4">
                    <p className="font-inter font-medium text-[14px] leading-[1.3] text-gray-12">
                      Ticket
                    </p>
                  </div>
                  <div className="flex-1 min-w-0 px-4 border-r border-gray-6 flex justify-end">
                    <p className="font-inter font-medium text-[14px] leading-[1.3] text-gray-12">
                      Ações
                    </p>
                  </div>
                </div>

                {/* Rows */}
                <div className="flex flex-col">
                  {paginatedParticipants.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center border-b border-gray-6 last:border-b-0 bg-gray-1"
                    >
                      {/* ID inscrição */}
                      <div className="w-[120px] px-4 py-3 shrink-0">
                        <p className="font-family-dm-sans font-semibold text-[14px] leading-[1.3] text-gray-12 truncate">
                          {p.registrationCode}
                        </p>
                      </div>

                      {/* Participante */}
                      <div className="w-[273px] px-4 py-3 flex gap-[10px] items-center shrink-0">
                        <div className="size-9 rounded-lg bg-gray-6 flex items-center justify-center shrink-0 overflow-hidden">
                          <span className="text-gray-12 font-semibold text-sm">
                            {(p.name || "P").charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex flex-col gap-1 min-w-0 flex-1">
                          <p className="font-family-dm-sans font-semibold text-[14px] leading-[1.3] text-gray-12 truncate">
                            {p.name}
                          </p>
                          <p className="font-family-dm-sans font-normal text-[14px] leading-[1.3] text-gray-11 truncate">
                            {p.email}
                          </p>
                        </div>
                      </div>

                      {/* Ticket */}
                      <div className="flex-1 min-w-0 px-4 py-3 flex flex-col gap-1">
                        <p className="font-family-dm-sans font-normal text-[14px] leading-[1.3] text-gray-11 truncate">
                          {p.categoryName}
                        </p>
                        <p className="font-inter font-semibold text-[14px] leading-[1.3] text-gray-12 truncate">
                          {p.ticketName}
                        </p>
                      </div>

                      {/* Ações */}
                      <div className="flex-1 min-w-0 px-4 py-2 flex justify-end">
                        <button
                          type="button"
                          className="bg-gray-2 border border-gray-6 rounded-lg size-8 flex items-center justify-center hover:bg-gray-3 transition-colors cursor-pointer shrink-0"
                          title="Ver comprovante"
                        >
                          <TicketIcon className="size-4 text-gray-11" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <Pagination
                  currentPage={safeTicketsPage}
                  totalPages={totalTicketPages}
                  onPageChange={setTicketsPage}
                />
              </div>
            )}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
