"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { X, Ticket, CheckCircle, Copy, XCircleIcon } from "lucide-react";
import { PaymentIcon } from "react-svg-credit-card-payment-icons";
import { PixIcon } from "@/components/Icons/PixIcon";
import { CardIcon } from "@/components/Icons/CardIcon";
import { organizerService } from "@/services";
import type { PaymentDetails } from "@/services/organizer/OrganizerService";
import toast from "react-hot-toast";
import { Loading } from "@/components/Loading";
import { Pagination } from "@/components/Pagination";
import { TicketIcon } from "../Icons/TicketIcon";
import { PaymentDetailsMobile, type MobileParticipantItem } from "./PaymentDetailsMobile";

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
    if (status === "REFUNDED") return "bg-red-11 text-gray-1";
    if (status === "CANCELLED" || status === "FAILED") return "bg-red-11 text-gray-1";
    if (status === "CHARGEBACK") return "bg-orange-11 text-white";
    return "bg-primary-11 text-primary-1";
  };

  /** CEP formatado (00000-000) ou retorna cru se não tiver 8 dígitos. */
  const formatBillingCep = (code?: string | null) => {
    if (!code) return "";
    const d = String(code).replace(/\D/g, "");
    if (d.length === 8) return `${d.slice(0, 5)}-${d.slice(5)}`;
    return String(code).trim();
  };

  /** Só a data (dd/mm/yyyy) — `formatDate` inclui hora, que não cabe em "Data de nascimento". */
  const formatBirthDate = (dateString?: string | null) => {
    if (!dateString) return "—";
    try {
      const date = new Date(dateString);
      const day = date.getDate().toString().padStart(2, "0");
      const month = (date.getMonth() + 1).toString().padStart(2, "0");
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return dateString;
    }
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
          <DrawerTitle className="sr-only">Comprovante do pagamento</DrawerTitle>
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

  /* Props normalizadas pro mobile — derivar a partir do paymentDetails
   * (mesmo shape do desktop) num lugar só pra evitar dessincronia. */
  const mobileParticipants: MobileParticipantItem[] = paginatedParticipants.map((p) => ({
    id: p.id,
    name: p.name,
    email: p.email,
    ticketName: p.ticketName,
    categoryName: p.categoryName,
  }));

  const mobileBuyerFields = [
    {
      label: "Nome",
      value:
        buyer.fullName ||
        `${buyer.firstName ?? ""} ${buyer.lastName ?? ""}`.trim() ||
        "—",
    },
    { label: "Email", value: buyer.email || "—" },
    { label: "CPF", value: formatDocument(buyer.documentNumber) },
    {
      label: "Data de nascimento:",
      value: buyer.dateOfBirth ? formatDate(buyer.dateOfBirth).split(" - ")[0] : "—",
    },
    { label: "Telefone:", value: formatPhone(buyer.phone) },
    { label: "Sexo", value: formatGender(buyer.gender) },
    { label: "Telefone de emergência", value: formatPhone(buyer.reservePhone) },
  ];

  return (
    <Drawer open={isOpen} onOpenChange={onClose} direction="right">
      <DrawerContent className="bg-gray-1 h-full w-full sm:max-w-[970px] border-l border-gray-6">
        <DrawerTitle className="sr-only">Comprovante do pagamento</DrawerTitle>

        {/* Mobile body — fiel ao Figma 2770:51521 */}
        <PaymentDetailsMobile
          eventName={event.name}
          onClose={onClose}
          orderId={paymentDetails.orderId}
          buyerFields={mobileBuyerFields}
          paymentMethod={payment.method}
          cardBrand={payment.cardBrand ?? undefined}
          last4Digits={payment.last4Digits ?? undefined}
          paymentStatus={payment.status}
          paymentStatusLabel={getStatusLabel(payment.status)}
          totalAmount={payment.totalAmount}
          purchaseDate={formatDate(payment.purchaseDate)}
          gateway={payment.gateway}
          authorizationCode={payment.authorizationCode ?? undefined}
          transactionId={paymentDetails.transactionId}
          installmentsLabel={
            formatInstallments(payment.installments ?? null, payment.installmentValue ?? null) ||
            (payment.method !== "PIX" ? "À vista" : undefined)
          }
          nsu={payment.nsu ?? undefined}
          transactionIp={payment.transactionIp ?? undefined}
          couponCode={coupon?.code ?? undefined}
          participants={mobileParticipants}
          currentPage={safeTicketsPage}
          totalPages={totalTicketPages}
          onPageChange={setTicketsPage}
          copied={copied}
          onCopy={handleCopy}
        />

        {/* Desktop header — padrão do PaymentDetailsModal (Inscrições): só título + close. */}
        <DrawerHeader className="hidden md:block border-b border-gray-6 px-5 py-3">
          <div className="flex items-center justify-between">
            <h2 className="font-family-dm-sans font-semibold text-[20px] leading-[1.3] text-gray-12">
              Detalhes de pagamento
            </h2>
            <DrawerClose asChild>
              <button className="size-8 flex items-center justify-center rounded-lg hover:bg-gray-3 transition-colors cursor-pointer">
                <X className="size-5 text-gray-11" />
              </button>
            </DrawerClose>
          </div>
        </DrawerHeader>

        {/* Desktop content — mesma estrutura do PaymentDetailsModal (Inscrições). */}
        <div className="hidden md:block flex-1 overflow-y-auto">
          <div className="p-5 flex flex-col gap-4">

            {/* Order ID */}
            <div className="flex gap-1 items-center">
              <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-11">
                ID do pedido:
              </p>
              <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-12">
                #{paymentDetails.orderId}
              </p>
            </div>

            {/* Informações do comprador — grid 3 colunas */}
            <div className="flex flex-col gap-2">
              <h3 className="font-manrope font-bold text-[18px] leading-[1.1] text-gray-12">
                Informações do comprador
              </h3>
              <div className="grid grid-cols-3">
                {[
                  {
                    label: "Nome",
                    value:
                      buyer.fullName ||
                      `${buyer.firstName ?? ""} ${buyer.lastName ?? ""}`.trim() ||
                      "—",
                  },
                  { label: "Email", value: buyer.email || "—" },
                  { label: "Telefone:", value: formatPhone(buyer.phone) },
                  { label: "CPF", value: formatDocument(buyer.documentNumber) },
                  { label: "Data de nascimento:", value: formatBirthDate(buyer.dateOfBirth) },
                  { label: "Sexo", value: formatGender(buyer.gender) },
                ].map(({ label, value }) => (
                  <div key={label} className="flex flex-col py-2">
                    <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-12">
                      {label}
                    </p>
                    <p className="font-family-dm-sans font-medium text-[16px] leading-[1.3] text-gray-12">
                      {value}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Endereço de cobrança — grid 3 colunas (Rua ocupa 2) */}
            <div className="flex flex-col gap-2">
              <h3 className="font-manrope font-bold text-[18px] leading-[1.1] text-gray-12">
                Endereço de cobrança
              </h3>
              {paymentDetails.billingAddress ? (
                <div className="grid grid-cols-3">
                  {[
                    { label: "País", value: paymentDetails.billingAddress.country || "—" },
                    { label: "CEP", value: formatBillingCep(paymentDetails.billingAddress.postalCode) || "—" },
                    { label: "Estado", value: paymentDetails.billingAddress.stateUf || "—" },
                    { label: "Cidade", value: paymentDetails.billingAddress.city || "—" },
                    { label: "Bairro", value: paymentDetails.billingAddress.neighborhood || "—" },
                    { label: "Número", value: paymentDetails.billingAddress.number || "—" },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex flex-col py-2">
                      <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-12">
                        {label}
                      </p>
                      <p className="font-family-dm-sans font-medium text-[16px] leading-[1.3] text-gray-12">
                        {value}
                      </p>
                    </div>
                  ))}
                  <div className="col-span-2 flex flex-col py-2">
                    <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-12">
                      Rua
                    </p>
                    <p className="font-family-dm-sans font-medium text-[16px] leading-[1.3] text-gray-12">
                      {paymentDetails.billingAddress.street || "—"}
                    </p>
                  </div>
                  <div className="flex flex-col py-2">
                    <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-12">
                      Complemento
                    </p>
                    <p className="font-family-dm-sans font-medium text-[16px] leading-[1.3] text-gray-12">
                      {paymentDetails.billingAddress.complement?.trim() || "—"}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="font-family-dm-sans text-base leading-[1.3] text-gray-11">
                  Sem endereço de cobrança registrado neste pedido.
                </p>
              )}
            </div>

            {/* Payment Method Card */}
            <div className="flex flex-col gap-3">
              <div className="bg-gray-2 border border-gray-6 rounded-lg p-4 flex items-center justify-between">
                <div className="flex gap-4 items-center flex-1">
                  <div className="size-[36px] relative shrink-0 flex items-center justify-center">
                    {payment.method === "PIX" ? (
                      <PixIcon className="size-9 text-gray-12" />
                    ) : payment.cardBrand ? (
                      <PaymentIcon type={payment.cardBrand as any} className="size-9" />
                    ) : (
                      <CardIcon className="size-9 text-gray-12" />
                    )}
                  </div>
                  <div className="flex flex-col">
                    <p className="font-family-dm-sans font-semibold text-[18px] leading-[1.3] text-gray-12">
                      {payment.method === "PIX"
                        ? "Pix"
                        : payment.cardBrand && payment.last4Digits
                          ? `${payment.cardBrand} **** ${payment.last4Digits}`
                          : formatPaymentMethod(payment.method)}
                    </p>
                    <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-12">
                      {payment.method === "PIX" ? "Pagamento instantâneo" : formatPaymentMethod(payment.method)}
                    </p>
                  </div>
                </div>
                <div className={`flex gap-1 items-center justify-center px-4 py-2 rounded ${getStatusBadge(payment.status)}`}>
                  {payment.status === "PAID" ? (
                    <CheckCircle className="size-6" />
                  ) : (
                    <XCircleIcon className="size-6" />
                  )}
                  <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3]">
                    {getStatusLabel(payment.status)}
                  </p>
                </div>
              </div>

              {/* Transaction Details — grid 3 colunas */}
              <div className="bg-gray-2 border border-gray-6 rounded-lg p-4 grid grid-cols-3">
                {[
                  {
                    label: "Valor total pago",
                    value: `R$ ${(payment.totalAmount / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
                  },
                  { label: "Data da compra", value: formatDate(payment.purchaseDate) },
                  { label: "Código de autorização", value: payment.authorizationCode || "—" },
                  { label: "Gateway", value: payment.gateway },
                  {
                    label: "Parcelamento",
                    value:
                      formatInstallments(payment.installments ?? null, payment.installmentValue ?? null) ||
                      "À vista",
                  },
                ].map(({ label, value }) => (
                  <div key={label} className="flex flex-col gap-[15px] py-3">
                    <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-12">
                      {label}
                    </p>
                    <p className="font-family-dm-sans font-medium text-[16px] leading-[1.3] text-gray-12">
                      {value}
                    </p>
                  </div>
                ))}

                {/* ID da transação com copy */}
                <div className="flex flex-col gap-[8px] py-3">
                  <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-12">
                    ID da transação
                  </p>
                  <div className="flex gap-1 items-center">
                    <p className="font-family-dm-sans font-medium text-[16px] leading-[1.3] text-gray-12 truncate max-w-[180px]">
                      {paymentDetails.transactionId}
                    </p>
                    <button
                      onClick={() => handleCopy(paymentDetails.transactionId)}
                      className="size-5 flex items-center justify-center rounded-lg hover:bg-gray-3 transition-colors shrink-0"
                      aria-label="Copiar ID da transação"
                    >
                      {copied ? (
                        <CheckCircle className="size-4 text-primary-11" />
                      ) : (
                        <Copy className="size-4 text-gray-11" />
                      )}
                    </button>
                  </div>
                </div>

                {payment.nsu && (
                  <div className="flex flex-col gap-[15px] py-4">
                    <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-12">
                      NSU
                    </p>
                    <p className="font-family-dm-sans font-medium text-[16px] leading-[1.3] text-gray-12">
                      {payment.nsu}
                    </p>
                  </div>
                )}

                {payment.transactionIp && (
                  <div className="flex flex-col gap-[15px] py-4">
                    <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-12">
                      IP
                    </p>
                    <p className="font-family-dm-sans font-medium text-[16px] leading-[1.3] text-gray-12">
                      {payment.transactionIp}
                    </p>
                  </div>
                )}

                {coupon && (
                  <div className="flex flex-col gap-[15px] py-4">
                    <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-12">
                      Cupom utilizado
                    </p>
                    <div className="flex items-center gap-1">
                      <Ticket className="size-5 text-yellow-12 shrink-0" />
                      <p className="font-family-dm-sans font-medium text-[16px] leading-[1.3] text-yellow-12">
                        {coupon.code}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Tickets List — header de tabela */}
            {participants.length > 0 && (
              <div className="bg-gray-2 border-[1.5px] border-gray-6 rounded-lg flex flex-col">
                <div className="flex items-center justify-between p-4">
                  <h3 className="font-manrope font-semibold text-[18px] leading-[1.1] text-gray-12">
                    Ingressos vinculados a este pedido
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
                      Ingresso
                    </p>
                  </div>
                  <div className="flex-1 min-w-0 px-4 border-r border-gray-6 flex justify-end">
                    <p className="font-inter font-medium text-[14px] leading-[1.3] text-gray-12">
                      Ações
                    </p>
                  </div>
                </div>

                {/* Table Rows */}
                <div className="flex flex-col">
                  {paginatedParticipants.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center h-[60px] border-b border-gray-6 last:border-b-0 bg-gray-1"
                    >
                      <div className="w-[120px] px-4 shrink-0">
                        <p className="font-family-dm-sans font-semibold text-[14px] leading-[1.3] text-gray-12 truncate">
                          #{p.registrationCode}
                        </p>
                      </div>
                      <div className="w-[273px] px-4 flex gap-[10px] items-center shrink-0">
                        <div className="size-9 rounded-lg bg-gray-6 flex items-center justify-center shrink-0">
                          <span className="text-gray-12 font-semibold text-sm">
                            {(p.name || "P").charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex flex-col min-w-0 flex-1">
                          <p className="font-family-dm-sans font-semibold text-[14px] leading-[1.3] text-gray-12 truncate">
                            {p.name}
                          </p>
                          <p className="font-family-dm-sans font-normal text-[14px] leading-[1.3] text-gray-11 truncate">
                            {p.email}
                          </p>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0 px-4 flex flex-col">
                        <p className="font-family-dm-sans font-normal text-[14px] leading-[1.3] text-gray-11 truncate">
                          {p.categoryName}
                        </p>
                        <p className="font-inter font-semibold text-[14px] leading-[1.3] text-gray-12 truncate">
                          {p.ticketName}
                        </p>
                      </div>
                      <div className="flex-1 min-w-0 px-4 py-2 flex justify-end">
                        <button
                          type="button"
                          aria-label="Informações do participante"
                          title="Informações do participante"
                          className="bg-gray-2 border border-gray-6 rounded-lg size-8 flex items-center justify-center hover:bg-gray-3 transition-colors cursor-pointer shrink-0"
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
