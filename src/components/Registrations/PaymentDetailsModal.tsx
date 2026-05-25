"use client";
import { PaymentIcon } from 'react-svg-credit-card-payment-icons';
import { usePaymentDetailsModal, useViewRegistrationModal } from "@/stores/modalStore";
import { motion, AnimatePresence } from "framer-motion";
import { X, Copy, CheckCircle, FileText, ChevronLeft, ChevronRight, ChevronDown, XCircleIcon } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { getAvatarUrl } from "@/utils/avatar";
import { Button } from "../Button";
import { organizerService } from "@/services";
import type { PaymentDetails } from "@/services/organizer/OrganizerService";
import { Loading } from "../Loading";
import toast from "react-hot-toast";
import { CheckIcon } from '../Icons/Organizer/CheckIcon';
import { PixIcon } from '../Icons/PixIcon';
import { CardIcon } from '../Icons/CardIcon';
import { ArrowButton } from '../ArrowButton';
import { TicketIcon } from "@/components/Icons/TicketIcon";
import { EventMobileTabs, getEventTabs } from "@/components/Organizer/EventMobileTabs";
import { useOrganizerPermissions } from "@/contexts/OrganizerPermissionsContext";

export function PaymentDetailsModal() {
  const { isOpen, closePaymentDetailsModal, data } = usePaymentDetailsModal();
  const { openViewRegistrationModal } = useViewRegistrationModal();
  const [copied, setCopied] = useState(false);
  const [ticketsPage, setTicketsPage] = useState(1);
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(null);
  const [loading, setLoading] = useState(false);

  const eventId = data?.eventId as string | undefined;
  const eventName = (data?.eventName as string) || "Evento";

  // Obter o ID da registration passada
  const registrationId = useMemo(() => {
    return data?.registrationId || data?.registration?.id || null;
  }, [data]);

  const [registrationData, setRegistrationData] = useState<any>(null);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);
  };

  // Buscar dados quando o modal abrir
  useEffect(() => {
    if (!isOpen || !registrationId) {
      setPaymentDetails(null);
      setRegistrationData(null);
      return;
    }

    // Evitar buscar novamente se já temos os dados para este ID
    if (paymentDetails && registrationData?.id === registrationId && !loading) {
      return;
    }

    const loadData = async () => {
      try {
        setLoading(true);
        // Buscar payment details e registration em paralelo
        const [details, registration] = await Promise.all([
          organizerService.getPaymentDetailsByRegistration(registrationId),
          organizerService.getRegistrationById(registrationId),
        ]);
        setPaymentDetails(details);
        setRegistrationData(registration);
      } catch (error: any) {
        console.error("Error loading payment details:", error);
        toast.error(error.message || "Erro ao carregar detalhes do pagamento");
      } finally {
        setLoading(false);
      }
    };

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, registrationId]);

  if (!isOpen || !registrationId) return null;

  // Usar registrationData em vez de registration
  const registration = registrationData;

  // Se ainda estiver carregando ou não tiver dados, mostrar loading
  if (loading || !registration) {
    return (
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/50 z-50"
              onClick={closePaymentDetailsModal}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="fixed inset-0 flex items-center justify-center z-50 p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-gray-1 rounded-[12px] w-full max-w-[1095px] max-h-[90vh] flex flex-col shadow-2xl p-20">
                <div className="flex items-center justify-center">
                  <Loading />
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    );
  }

  // Método raw do backend — usado pra decidir ícone (não confiar só em cardBrand,
  // que pode vir vazio em débito).
  const rawPaymentMethod = paymentDetails?.payment?.method || "";
  const isCardPayment =
    rawPaymentMethod === "CREDIT_CARD" || rawPaymentMethod === "DEBIT_CARD";
  const isPixPayment = rawPaymentMethod === "PIX";

  // Usar dados reais do paymentDetails
  const paymentInfo = paymentDetails ? {
    cardBrand: paymentDetails.payment?.cardBrand || null,
    cardLast4: paymentDetails.payment?.last4Digits || null,
    paymentMethod: paymentDetails.payment?.method === "CREDIT_CARD"
      ? "Cartão de crédito"
      : paymentDetails.payment?.method === "DEBIT_CARD"
        ? "Cartão de débito"
        : paymentDetails.payment?.method === "PIX"
          ? "PIX"
          : paymentDetails.payment?.method === "BOLETO"
            ? "Boleto"
            : paymentDetails.payment?.method || "Cartão de crédito",
    totalAmount: paymentDetails.payment?.totalAmount || registration?.finalAmount || 0,
    purchaseDate: paymentDetails.payment?.purchaseDate || paymentDetails.payment?.paymentDate || registration?.purchaseDate || "",
    gateway: paymentDetails.payment?.gateway || "Gateway",
    installments: paymentDetails.payment?.installments && paymentDetails.payment?.installmentValue
      ? `${paymentDetails.payment.installments}x de ${formatPrice(paymentDetails.payment.installmentValue / 100)}`
      : "À vista",
    authorizationCode: paymentDetails.payment?.authorizationCode || "—",
    transactionId: paymentDetails.transactionId || "—",
    nsu: paymentDetails.payment?.nsu || "—",
    ip: paymentDetails.payment?.transactionIp || "—",
  } : {
    cardBrand: null,
    cardLast4: null,
    paymentMethod: "—",
    totalAmount: registration?.finalAmount || 0,
    purchaseDate: registration?.purchaseDate || "",
    gateway: "—",
    installments: "—",
    authorizationCode: "—",
    transactionId: "—",
    coupon: "—",
    nsu: "—",
    ip: "—",
  };

  // Label principal do cartão. Débito frequentemente vem sem `cardBrand` mas
  // com `last4Digits` — nesse caso mostramos `**** 1234` ao invés de cair pro
  // texto genérico "Cartão de débito".
  const cardDisplayLabel = (() => {
    if (paymentInfo.cardBrand && paymentInfo.cardLast4) {
      return `${paymentInfo.cardBrand} **** ${paymentInfo.cardLast4}`;
    }
    if (isCardPayment && paymentInfo.cardLast4) {
      return `${paymentInfo.paymentMethod} **** ${paymentInfo.cardLast4}`;
    }
    return paymentInfo.paymentMethod;
  })();

  const coupon = paymentDetails?.coupon ?? null;
  const voucher = paymentDetails?.voucher ?? null;
  const totalDiscount = paymentDetails?.totalDiscount ?? null;
  const hasDiscount = !!(coupon || voucher);
  // Pedido gratuito (cortesia / voucher 100%): esconder método de pagamento e
  // detalhes de transação, que não fazem sentido sem cobrança real.
  const isFreeOrder = (paymentInfo.totalAmount ?? 0) === 0;

  // Usar dados reais do buyer (paymentDetails tem buyer, registration tem user)
  // Combinar dados do buyer com dados do user da registration para campos que podem estar faltando
  const buyer = paymentDetails?.buyer || registration?.user;
  const registrationUser = registration?.user;

  const buyerData = {
    ...buyer,
    ...registrationUser,
    firstName: buyer?.firstName || registrationUser?.firstName,
    lastName: buyer?.lastName || registrationUser?.lastName,
    fullName: buyer?.fullName || registrationUser?.fullName,
    email: buyer?.email || registrationUser?.email,
    phone: buyer?.phone || registrationUser?.phone,
    documentNumber: buyer?.documentNumber || registrationUser?.documentNumber,
    dateOfBirth: buyer?.dateOfBirth || registrationUser?.dateOfBirth,
    gender: buyer?.gender || registrationUser?.gender,
    reservePhone: buyer?.reservePhone || registrationUser?.reservePhone,

  };

  const formatBillingCep = (code?: string | null) => {
    if (!code) return "";
    const d = String(code).replace(/\D/g, "");
    if (d.length === 8) return `${d.slice(0, 5)}-${d.slice(5)}`;
    return String(code).trim();
  };

  const billingAddress = paymentDetails?.billingAddress ?? null;

  const billingAddressMobileRows = billingAddress
    ? [
      { label: "País", value: billingAddress.country || "—" },
      { label: "CEP", value: formatBillingCep(billingAddress.postalCode) || "—" },
      { label: "Estado", value: billingAddress.stateUf || "—" },
      { label: "Cidade", value: billingAddress.city || "—" },
      { label: "Bairro", value: billingAddress.neighborhood || "—" },
      { label: "Número", value: billingAddress.number || "—" },
      { label: "Rua", value: billingAddress.street || "—" },
      {
        label: "Complemento",
        value: billingAddress.complement?.trim() || "—",
      },
    ]
    : [];

  const paymentDetailsWithRegistrations = paymentDetails as PaymentDetails & { registrations?: Array<{ id: string; name: string; email: string; ticket?: { id: string; name: string } | null; ticketCategory?: { id: string; name: string } | null }> };

  const participants = paymentDetailsWithRegistrations?.registrations && Array.isArray(paymentDetailsWithRegistrations.registrations) && paymentDetailsWithRegistrations.registrations.length > 0
    ? paymentDetailsWithRegistrations.registrations.map((reg: any) => ({
      id: reg.id,
      viewRegistrationId: reg.id as string,
      registrationId: reg.id?.slice(0, 8) || "—",
      name: reg.name || "Participante",
      email: reg.email || "",
      avatarUrl: reg.avatarUrl ?? null,
      ticket: reg.ticket?.name || "Ticket",
      category: reg.ticketCategory?.name || "Ingresso avulso",
    }))
    : registration?.ticket ? [{
      id: registration.id,
      viewRegistrationId: registration.id as string,
      registrationId: registration.id?.slice(0, 8) || "—",
      name: buyerData?.firstName && buyerData?.lastName
        ? `${buyerData.firstName} ${buyerData.lastName}`
        : buyerData?.fullName || "Participante",
      email: buyerData?.email || "",
      ticket: registration.ticket?.name || "Ticket",
      category: registration.ticket?.category?.name || "Ingresso avulso",
    }] : registration?.modalities?.map((mod: any, index: number) => ({
      id: `${registration.id}-${index}`,
      viewRegistrationId: registration.id as string,
      registrationId: registration.id?.slice(0, 8) || "—",
      name: buyerData?.firstName && buyerData?.lastName
        ? `${buyerData.firstName} ${buyerData.lastName}`
        : buyerData?.fullName || "Participante",
      email: buyerData?.email || "",
      ticket: mod.modality?.name || registration?.ticket?.name || "Ticket",
      category: registration?.ticket?.category?.name || "Ingresso avulso",
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

  const goToParticipantDetails = (registrationIdForView: string) => {
    if (!registrationId) return;
    const paymentReturnPayload = {
      registrationId,
      eventId,
      eventName,
    };
    // Fechar antes de abrir: ambos usam o mesmo store — closeModal() zera estado e apagaria o viewRegistration se viesse depois.
    closePaymentDetailsModal();
    openViewRegistrationModal({
      registrationId: registrationIdForView,
      eventId,
      eventName,
      returnToPaymentDetails: true,
      paymentDetailsModalData: paymentReturnPayload,
    });
  };

  const ticketsPerPage = 4;
  const totalPages = Math.ceil(participants.length / ticketsPerPage);
  const paginatedParticipants = participants.slice(
    (ticketsPage - 1) * ticketsPerPage,
    ticketsPage * ticketsPerPage
  );

  const getPaymentStatusLabel = (status?: string) => {
    if (!status) return "Pago";
    const statusMap: Record<string, string> = {
      PAID: "Pago",
      PENDING: "Pendente",
      REFUNDED: "Estornado",
      CANCELLED: "Cancelado",
      CHARGEBACK: "Charge-back",
    };
    return statusMap[status] || status;
  };

  const getPaymentStatusColor = (status?: string) => {
    if (!status || status === "PAID") return "bg-primary-11 text-primary-1";
    if (status === "PENDING") return "bg-yellow-11 text-white";
    if (status === "REFUNDED") return "bg-red-11 text-gray-1";
    if (status === "CANCELLED" || status === "FAILED") return "bg-red-11 text-gray-1";
    if (status === "CHARGEBACK") return "bg-orange-11 text-white";
    return "bg-primary-11 text-primary-1";
  };

  const { hasPermission } = useOrganizerPermissions();
  const eventTabs = eventId ? getEventTabs(eventId, hasPermission) : [];

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
            className="fixed inset-0 z-50 flex flex-col md:flex md:items-center md:justify-center p-0 md:p-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Mobile: full-screen layout */}
            <div className="md:hidden flex-1 flex flex-col bg-gray-2 overflow-hidden min-h-0 mt-16 w-full">
              <div className="bg-gray-1 border-b border-gray-6 shrink-0">
                <div className="flex items-center gap-1 h-[52px] px-4">
                  <button
                    type="button"
                    onClick={closePaymentDetailsModal}
                    className="size-8 flex items-center justify-center shrink-0 rounded-lg hover:bg-gray-3 transition-colors -rotate-180"
                    aria-label="Voltar"
                  >
                    <ArrowButton isOpen={false} />
                  </button>
                  <p className="font-manrope font-extrabold text-base leading-[1.1] text-gray-12 truncate flex-1 min-w-0">
                    {eventName}
                  </p>
                </div>
                {eventId && (
                  <EventMobileTabs
                    tabs={eventTabs}
                    activeHref={`/organizer/events/${eventId}/registrations`}
                    onLinkClick={closePaymentDetailsModal}
                    eventId={eventId}
                  />
                )}
              </div>
              <div className="flex-1 overflow-y-auto min-h-0">
                <div className="px-4 py-4 flex flex-col gap-5">
                  {/* Breadcrumbs */}
                  <div className="flex items-center justify-center gap-1 flex-wrap text-sm text-gray-11 font-family-dm-sans">
                    <span>Eventos</span>
                    <ChevronDown className="size-4 -rotate-90 shrink-0" />
                    <span>Inscrições</span>
                    <ChevronDown className="size-4 -rotate-90 shrink-0" />
                    <span className="text-gray-12">Detalhes do pedido</span>
                  </div>
                  <div className="flex flex-col gap-3">
                    <h2 className="font-manrope font-bold text-xl text-gray-12">Detalhes do pedido</h2>
                    <p className="font-family-dm-sans font-normal text-base text-gray-11">
                      ID do pedido: <span className="text-gray-12">#{paymentDetails?.orderId}</span>
                    </p>
                  </div>
                  {/* Buyer info list */}
                  <div className="flex flex-col gap-0">
                    {[
                      { label: "Nome", value: buyerData?.firstName && buyerData?.lastName ? `${buyerData.firstName} ${buyerData.lastName}` : buyerData?.fullName || "—" },
                      { label: "Email", value: buyerData?.email || "—" },
                      { label: "CPF", value: formatCPF(buyerData?.documentNumber || null) || "—" },
                      { label: "Data de nascimento:", value: formatBirthDate(buyerData?.dateOfBirth || null) || "—" },
                      { label: "Telefone:", value: formatPhone(buyerData?.phone || null) || "—" },
                      { label: "Sexo", value: buyerData?.gender === "MALE" || buyerData?.gender === "male" ? "Masculino" : buyerData?.gender === "FEMALE" || buyerData?.gender === "female" ? "Feminino" : buyerData?.gender === "OTHER" || buyerData?.gender === "other" ? "Outro" : buyerData?.gender || "—" },
                      { label: "Telefone de emergência", value: formatPhone(buyerData?.reservePhone || null) || "Opcional" },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex flex-col gap-1 py-4 border-b border-gray-6 last:border-b-0">
                        <p className="font-family-dm-sans font-normal text-base text-gray-12">{label}</p>
                        <p className="font-family-dm-sans font-medium text-base text-gray-12">{value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-col gap-0">
                    <h3 className="font-manrope font-bold text-lg text-gray-12 py-2">
                      Endereço de cobrança
                    </h3>
                    {billingAddressMobileRows.length > 0 ? (
                      billingAddressMobileRows.map(({ label, value }) => (
                        <div
                          key={label}
                          className="flex flex-col gap-1 py-4 border-b border-gray-6 last:border-b-0"
                        >
                          <p className="font-family-dm-sans font-normal text-base text-gray-12">{label}</p>
                          <p className="font-family-dm-sans font-medium text-base text-gray-12">{value}</p>
                        </div>
                      ))
                    ) : (
                      <p className="font-family-dm-sans text-base text-gray-11 py-3">
                        Sem endereço de cobrança registrado neste pedido.
                      </p>
                    )}
                  </div>
                  {!isFreeOrder ? (
                    <>
                      {/* Payment method card */}
                      <div className="bg-gray-1 border border-gray-6 rounded-lg p-4 flex flex-col gap-4">
                        <div className="flex gap-3 items-center justify-between">
                          <div className="flex gap-3 items-center">
                            {isCardPayment ? (
                              <div className="size-10 shrink-0 flex items-center justify-center">
                                {paymentInfo.cardBrand ? (
                                  <PaymentIcon type={paymentInfo.cardBrand as any} className="size-10" />
                                ) : (
                                  <CardIcon className="size-6 text-gray-12" />
                                )}
                              </div>
                            ) : isPixPayment ? (
                              <div className="size-10 shrink-0 flex items-center justify-center">
                                <PixIcon className="size-6 text-gray-12" />
                              </div>
                            ) : (
                              <div className="size-10 shrink-0 flex items-center justify-center">
                                <CardIcon className="size-6 text-gray-12" />
                              </div>
                            )}
                            <div className="flex flex-col gap-0">
                              <p className="font-family-dm-sans font-semibold text-lg text-gray-12">{cardDisplayLabel}</p>
                              <p className="font-family-dm-sans font-normal text-base text-gray-11">{paymentInfo.paymentMethod === "PIX" ? "Pagamento instantâneo" : paymentInfo.paymentMethod}</p>
                            </div>
                          </div>
                          <span className={`flex gap-1 items-center justify-center px-4 py-2 rounded ${getPaymentStatusColor(paymentDetails?.payment?.status)}`}>
                            <CheckIcon className="size-5" />
                            <span className="font-family-dm-sans font-normal text-base">{getPaymentStatusLabel(paymentDetails?.payment?.status)}</span>
                          </span>
                        </div>
                      </div>
                      {/* Transaction details card */}
                      <div className="bg-gray-1 border border-gray-6 rounded-lg p-4 flex flex-col gap-4">
                        {[
                          { label: "Valor total", value: formatPrice(paymentInfo.totalAmount / 100) },
                          { label: "Data da compra", value: formatDate(paymentInfo.purchaseDate) || "—" },
                          { label: "Gateway", value: paymentInfo.gateway },
                          { label: "ID da transação", value: paymentInfo.transactionId, copy: true },
                          { label: "TxID", value: paymentInfo.nsu },
                          { label: "E2E ID (Pix)", value: paymentInfo.transactionId },
                          { label: "IP", value: paymentInfo.ip },
                          ...(coupon ? [{
                            label: "Cupom utilizado",
                            value: [
                              coupon.code,
                              coupon.couponType === "AGE" ? "Por faixa etária" : coupon.couponType === "QUANTITY" ? "Por quantidade" : null,
                              coupon.discountType === "PERCENTAGE" && coupon.discountPercentage != null
                                ? `${coupon.discountPercentage}% de desconto`
                                : coupon.discountValue != null
                                  ? `${formatPrice(coupon.discountValue / 100)} de desconto`
                                  : null,
                            ].filter(Boolean).join(" — "),
                            couponIcon: true,
                          }] : []),
                          ...(voucher ? [{
                            label: "Voucher utilizado",
                            value: [voucher.code, voucher.name].filter(Boolean).join(" — "),
                          }] : []),
                        ].map(({ label, value, copy, couponIcon }: any) => (
                          <div key={label} className="flex flex-col gap-1 py-2">
                            <p className="font-family-dm-sans font-normal text-base text-gray-12">{label}</p>
                            <div className="flex items-center gap-2">
                              {couponIcon && (
                                <svg className="size-4 text-yellow-12 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                                </svg>
                              )}
                              <p className={`font-family-dm-sans font-medium text-base text-gray-12 ${couponIcon ? "text-yellow-12" : ""}`}>{value || "—"}</p>
                              {copy && (
                                <button type="button" onClick={() => handleCopy(value)} className="size-5 flex items-center justify-center shrink-0 rounded hover:bg-gray-3">
                                  {copied ? <CheckCircle className="size-4 text-primary-11" /> : <Copy className="size-4 text-gray-11" />}
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : voucher ? (
                    /* Pedido gratuito com voucher: mostra só a info do voucher */
                    <div className="bg-gray-1 border border-gray-6 rounded-lg p-4 flex flex-col gap-1">
                      <p className="font-family-dm-sans font-normal text-base text-gray-12">
                        Voucher utilizado
                      </p>
                      <p className="font-family-dm-sans font-medium text-base text-gray-12">
                        {[voucher.code, voucher.name].filter(Boolean).join(" — ")}
                      </p>
                    </div>
                  ) : null}
                  {/* Ingressos vinculados — Figma do zero.
                   * Spec:
                   *   - Titulo 18px Manrope 700 line 19.8.
                   *   - Outer card bg gray-2 border 1.5px gray-6 radius 8.
                   *   - Items bg gray-1 px-3 py-4 gap 24. Separador entre items
                   *     via border-b (sem dupla linha).
                   *   - Header: avatar 36px + nome (16/500 DM Sans) + email
                   *     (14/400). Sem bandeira do cartao.
                   *   - Bloco categoria: label 12/400 gray-11 + valor 14/600
                   *     Manrope.
                   *   - Sem display de valor R$ por participante.
                   *   - Divider 1px gray-6.
                   *   - Botao 'Ver ingresso' com TicketIcon 20px + texto 16/700.
                   *   - Paginacao dentro do outer card com border-t gray-6.
                   *     Ativo bg primary-11 + branco. Inativo bg gray-4. */}
                  <div className="flex flex-col gap-5">
                    <h3 className="font-manrope font-bold text-[18px] leading-[19.8px] text-gray-12">
                      Ingressos vinculados a este pedido
                    </h3>
                    <div className="bg-gray-2 border-[1.5px] border-gray-6 rounded-lg overflow-hidden flex flex-col">
                      <div className="flex flex-col">
                        {paginatedParticipants.map((participant: any, idx: number) => (
                          <article
                            key={participant.id}
                            className={`bg-gray-1 px-3 py-4 flex flex-col gap-6 ${
                              idx < paginatedParticipants.length - 1
                                ? "border-b border-gray-6"
                                : ""
                            }`}
                          >
                            <div className="flex flex-col gap-5 w-full">
                              {/* Header: avatar + nome/email — email com gap menor
                               * (mais perto do nome). Avatar usa Image real quando
                               * avatarUrl existir; fallback pra inicial em circulo gray. */}
                              <div className="flex items-center gap-2 w-full">
                                {participant.avatarUrl ? (
                                  <Image
                                    src={getAvatarUrl(participant.avatarUrl) as string}
                                    alt={participant.name}
                                    width={36}
                                    height={36}
                                    className="size-9 rounded-full object-cover shrink-0"
                                  />
                                ) : (
                                  <div className="size-9 rounded-full bg-gray-6 flex items-center justify-center shrink-0 overflow-hidden">
                                    <span className="text-gray-12 font-semibold text-sm font-family-dm-sans">
                                      {(participant.name || "P").charAt(0).toUpperCase()}
                                    </span>
                                  </div>
                                )}
                                <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                                  <p className="font-family-dm-sans font-medium text-[16px] leading-[20.8px] text-gray-12 truncate">
                                    {participant.name}
                                  </p>
                                  <p className="font-family-dm-sans text-[14px] leading-[18.2px] text-gray-11 truncate">
                                    {participant.email}
                                  </p>
                                </div>
                              </div>

                              {/* Bloco categoria + ingresso:
                               * - Linha 1 (onde antes ficava label "Nome da
                               *   categoria"): nome real da categoria, fallback
                               *   "Ingresso avulso" quando ingresso nao pertence
                               *   a categoria.
                               * - Linha 2: nome do ingresso (ticket), 16/bold. */}
                              <div className="flex flex-col gap-1 w-full">
                                <p className="font-family-dm-sans text-[12px] leading-[15.6px] text-gray-11">
                                  {participant.category || "Ingresso avulso"}
                                </p>
                                <p className="font-manrope font-bold text-[16px] leading-[17.6px] text-gray-12 truncate">
                                  {participant.ticket || "—"}
                                </p>
                              </div>
                            </div>

                            {/* Divider */}
                            <div className="h-px bg-gray-6 w-full" />

                            {/* Botao Ver ingresso */}
                            <button
                              type="button"
                              onClick={() =>
                                goToParticipantDetails(
                                  participant.viewRegistrationId || participant.id,
                                )
                              }
                              className="w-full h-11 flex items-center justify-center gap-2 rounded-lg border border-gray-6 hover:bg-gray-3 transition-colors cursor-pointer"
                            >
                              <TicketIcon className="size-5 text-gray-12" />
                              <span className="font-manrope font-bold text-[16px] leading-[17.6px] text-gray-12">
                                Ver ingresso
                              </span>
                            </button>
                          </article>
                        ))}
                      </div>

                      {/* Paginacao dentro do outer card */}
                      {totalPages > 1 && (
                        <div className="flex items-center justify-center px-4 py-5 w-full bg-gray-2 border-t border-gray-6">
                          <div className="flex h-8 items-center gap-0">
                            <button
                              type="button"
                              onClick={() => setTicketsPage((p) => Math.max(1, p - 1))}
                              disabled={ticketsPage === 1}
                              className="size-8 flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                              aria-label="Página anterior"
                            >
                              <ChevronLeft className="size-5 text-gray-11" />
                            </button>
                            <div className="flex items-center gap-1">
                              {Array.from({ length: Math.min(totalPages, 6) }, (_, i) => {
                                const pageNum = i + 1;
                                const isActive = pageNum === ticketsPage;
                                return (
                                  <button
                                    key={pageNum}
                                    type="button"
                                    onClick={() => setTicketsPage(pageNum)}
                                    className={`size-8 flex items-center justify-center rounded-lg font-family-dm-sans font-medium text-[14px] leading-[18.2px] transition-colors cursor-pointer ${
                                      isActive
                                        ? "bg-primary-11 text-primary-1"
                                        : "bg-gray-4 text-gray-12 hover:bg-gray-5"
                                    }`}
                                  >
                                    {pageNum}
                                  </button>
                                );
                              })}
                            </div>
                            <button
                              type="button"
                              onClick={() => setTicketsPage((p) => Math.min(totalPages, p + 1))}
                              disabled={ticketsPage >= totalPages}
                              className="size-8 flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                              aria-label="Próxima página"
                            >
                              <ChevronRight className="size-5 text-gray-11" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Desktop: modal box */}
            <div className="hidden md:flex flex-col bg-gray-1 rounded-[12px] w-full max-w-[1095px] max-h-[90vh] shadow-2xl overflow-hidden">
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
              {loading ? (
                <div className="flex-1 flex items-center justify-center p-8">
                  <Loading />
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto min-h-0">
                  <div className="flex gap-0">
                    {/* Main Content */}
                    <div className="flex-1 p-5 flex flex-col gap-4">
                      {/* Order ID */}
                      <div className="flex gap-1 items-center">
                        <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-11">
                          ID do pedido:
                        </p>
                        <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-12">
                          #{paymentDetails?.orderId}
                        </p>
                      </div>

                      {/* Buyer Information */}
                      <div className="flex flex-col gap-2">
                        <h3 className="font-manrope font-bold text-[18px] leading-[1.1] text-gray-12">
                          Informações do comprador
                        </h3>
                        <div className="grid grid-cols-3">
                          <div className="flex flex-col py-2">
                            <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-12">
                              Nome
                            </p>
                            <p className="font-family-dm-sans font-medium text-[16px] leading-[1.3] text-gray-12">
                              {buyerData?.firstName && buyerData?.lastName
                                ? `${buyerData.firstName} ${buyerData.lastName}`
                                : buyerData?.fullName || "—"}
                            </p>
                          </div>
                          <div className="flex flex-col py-2">
                            <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-12">
                              Email
                            </p>
                            <p className="font-family-dm-sans font-medium text-[16px] leading-[1.3] text-gray-12">
                              {buyerData?.email || "—"}
                            </p>
                          </div>
                          <div className="flex flex-col py-2">
                            <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-12">
                              Telefone:
                            </p>
                            <p className="font-family-dm-sans font-medium text-[16px] leading-[1.3] text-gray-12">
                              {formatPhone(buyerData?.phone || null) || "—"}
                            </p>
                          </div>
                          <div className="flex flex-col py-2">
                            <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-12">
                              CPF
                            </p>
                            <p className="font-family-dm-sans font-medium text-[16px] leading-[1.3] text-gray-12">
                              {formatCPF(buyerData?.documentNumber || null) || "—"}
                            </p>
                          </div>
                          <div className="flex flex-col py-2">
                            <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-12">
                              Data de nascimento:
                            </p>
                            <p className="font-family-dm-sans font-medium text-[16px] leading-[1.3] text-gray-12">
                              {formatBirthDate(buyerData?.dateOfBirth || null) || "—"}
                            </p>
                          </div>
                          <div className="flex flex-col py-2">
                            <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-12">
                              Sexo
                            </p>
                            <p className="font-family-dm-sans font-medium text-[16px] leading-[1.3] text-gray-12">
                              {buyerData?.gender === "MALE" || buyerData?.gender === "male"
                                ? "Masculino"
                                : buyerData?.gender === "FEMALE" || buyerData?.gender === "female"
                                  ? "Feminino"
                                  : buyerData?.gender === "OTHER" || buyerData?.gender === "other"
                                    ? "Outro"
                                    : buyerData?.gender || "—"}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <h3 className="font-manrope font-bold text-[18px] leading-[1.1] text-gray-12">
                          Endereço de cobrança
                        </h3>
                        {billingAddress ? (
                          <div className="grid grid-cols-3">
                            <div className="flex flex-col py-2">
                              <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-12">
                                País
                              </p>
                              <p className="font-family-dm-sans font-medium text-[16px] leading-[1.3] text-gray-12">
                                {billingAddress.country || "—"}
                              </p>
                            </div>
                            <div className="flex flex-col py-2">
                              <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-12">
                                CEP
                              </p>
                              <p className="font-family-dm-sans font-medium text-[16px] leading-[1.3] text-gray-12">
                                {formatBillingCep(billingAddress.postalCode) || "—"}
                              </p>
                            </div>
                            <div className="flex flex-col py-2">
                              <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-12">
                                Estado
                              </p>
                              <p className="font-family-dm-sans font-medium text-[16px] leading-[1.3] text-gray-12">
                                {billingAddress.stateUf || "—"}
                              </p>
                            </div>
                            <div className="flex flex-col py-2">
                              <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-12">
                                Cidade
                              </p>
                              <p className="font-family-dm-sans font-medium text-[16px] leading-[1.3] text-gray-12">
                                {billingAddress.city || "—"}
                              </p>
                            </div>
                            <div className="flex flex-col py-2">
                              <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-12">
                                Bairro
                              </p>
                              <p className="font-family-dm-sans font-medium text-[16px] leading-[1.3] text-gray-12">
                                {billingAddress.neighborhood || "—"}
                              </p>
                            </div>
                            <div className="flex flex-col py-2">
                              <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-12">
                                Número
                              </p>
                              <p className="font-family-dm-sans font-medium text-[16px] leading-[1.3] text-gray-12">
                                {billingAddress.number || "—"}
                              </p>
                            </div>
                            <div className="col-span-2 flex flex-col py-2">
                              <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-12">
                                Rua
                              </p>
                              <p className="font-family-dm-sans font-medium text-[16px] leading-[1.3] text-gray-12">
                                {billingAddress.street || "—"}
                              </p>
                            </div>
                            <div className="flex flex-col py-2">
                              <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-12">
                                Complemento
                              </p>
                              <p className="font-family-dm-sans font-medium text-[16px] leading-[1.3] text-gray-12">
                                {billingAddress.complement?.trim() || "—"}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <p className="font-family-dm-sans text-base leading-[1.3] text-gray-11">
                            Sem endereço de cobrança registrado neste pedido.
                          </p>
                        )}
                      </div>

                      {/* Payment Information */}
                      {!isFreeOrder ? (
                        <div className="flex flex-col gap-3">
                          {/* Payment Method Card */}
                          <div className="bg-gray-2 border border-gray-6 rounded-lg p-4 flex items-center justify-between">
                            <div className="flex gap-4 items-center flex-1">
                              {isCardPayment ? (
                                <div className="size-[36px] relative shrink-0">
                                  {paymentInfo.cardBrand ? (
                                    <PaymentIcon type={paymentInfo.cardBrand as any} className="size-9" />
                                  ) : (
                                    <div className="size-9 flex items-center justify-center border border-gray-6 rounded">
                                      <CardIcon className="size-6" />
                                    </div>
                                  )}
                                </div>
                              ) : isPixPayment ? (
                                <div className="size-[36px] relative shrink-0 flex items-center justify-center border border-gray-6 rounded">
                                  <PixIcon className="size-6" />
                                </div>
                              ) : (
                                <div className="size-[36px] relative shrink-0 flex items-center justify-center border border-gray-6 rounded">
                                  <CardIcon className="size-6" />
                                </div>
                              )}
                              <div className="flex flex-col">
                                <p className="font-family-dm-sans font-semibold text-[18px] leading-[1.3] text-gray-12">
                                  {cardDisplayLabel}
                                </p>
                                <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-12">
                                  {paymentInfo.paymentMethod === "PIX" ? "Pagamento instantâneo" : paymentInfo.paymentMethod}
                                </p>
                              </div>
                            </div>
                            <div className={`flex gap-1 items-center justify-center px-4 py-2 rounded ${getPaymentStatusColor(paymentDetails?.payment?.status)}`}>
                              {paymentDetails?.payment?.status === "PAID" ? (
                                <CheckIcon className="size-6" />
                              ) : (<XCircleIcon className="size-6" />)}
                              <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3]">
                                {getPaymentStatusLabel(paymentDetails?.payment?.status)}
                              </p>
                            </div>
                          </div>

                          {/* Transaction Details */}
                          <div className="bg-gray-2 border border-gray-6 rounded-lg p-4 grid grid-cols-3">
                            <div className="flex flex-col gap-[15px] py-3">
                              <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-12">
                                Valor total pago
                              </p>
                              <p className="font-family-dm-sans font-medium text-[16px] leading-[1.3] text-gray-12">
                                {formatPrice(paymentInfo.totalAmount / 100)}
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
                            {coupon && (
                              <div className="flex flex-col gap-[15px] py-4">
                                <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-12">
                                  Cupom utilizado
                                </p>
                                <div className="flex items-center gap-1">
                                  <svg className="size-5 text-yellow-12 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                                  </svg>
                                  <p className="font-family-dm-sans font-medium text-[16px] leading-[1.3] text-yellow-12">
                                    {[
                                      coupon.code,
                                      coupon.couponType === "AGE" ? "Por faixa etária" : coupon.couponType === "QUANTITY" ? "Por quantidade" : null,
                                      coupon.discountType === "PERCENTAGE" && coupon.discountPercentage != null
                                        ? `${coupon.discountPercentage}% de desconto`
                                        : coupon.discountValue != null
                                          ? `${formatPrice(coupon.discountValue / 100)} de desconto`
                                          : null,
                                    ].filter(Boolean).join(" - ")}
                                  </p>
                                </div>
                              </div>
                            )}
                            {voucher && (
                              <div className="flex flex-col gap-[15px] py-4">
                                <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-12">
                                  Voucher utilizado
                                </p>
                                <p className="font-family-dm-sans font-medium text-[16px] leading-[1.3] text-gray-12">
                                  {[voucher.code, voucher.name].filter(Boolean).join(" - ")}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : voucher ? (
                        /* Pedido gratuito com voucher: mostra só a info do voucher */
                        <div className="bg-gray-2 border border-gray-6 rounded-lg p-4 flex flex-col gap-[15px]">
                          <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-12">
                            Voucher utilizado
                          </p>
                          <p className="font-family-dm-sans font-medium text-[16px] leading-[1.3] text-gray-12">
                            {[voucher.code, voucher.name].filter(Boolean).join(" - ")}
                          </p>
                        </div>
                      ) : null}

                      {/* Tickets List */}
                      <div className="bg-gray-2 border-[1.5px] border-gray-6 rounded-lg flex flex-col">
                        {/* Header */}
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
                              Ingresso
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
                              className="flex items-center h-[60px] border-b last:border-0 border-gray-6"
                            >
                              <div className="w-[120px] px-4">
                                <p className="font-family-dm-sans font-semibold text-[14px] leading-[1.3] text-gray-12 truncate">
                                  #{participant.registrationId}
                                </p>
                              </div>
                              <div className="w-[273px] px-4 flex gap-[10px] items-center">
                                <div className="size-9 rounded-lg bg-gray-6 flex items-center justify-center shrink-0">
                                  <span className="text-gray-12 font-semibold text-sm">
                                    {participant.name.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                                <div className="flex flex-col min-w-0 flex-1">
                                  <p className="font-family-dm-sans font-semibold text-[14px] leading-[1.3] text-gray-12 truncate">
                                    {participant.name}
                                  </p>
                                  <p className="font-family-dm-sans font-normal text-[14px] leading-[1.3] text-gray-11 truncate">
                                    {participant.email}
                                  </p>
                                </div>
                              </div>
                              <div className="flex-1 px-4 flex flex-col">
                                <p className="font-family-dm-sans font-normal text-[14px] leading-[1.3] text-gray-11">
                                  {participant.category}
                                </p>
                                <p className="font-inter font-semibold text-[14px] leading-[1.3] text-gray-12">
                                  {participant.ticket}
                                </p>
                              </div>
                              <div className="flex-1 px-4 py-2 flex justify-end">
                                <button
                                  type="button"
                                  aria-label="Informações do participante"
                                  title="Informações do participante"
                                  name="view-participant-details"
                                  onClick={() => goToParticipantDetails(participant.viewRegistrationId)}
                                  className="bg-gray-2 border border-gray-6 rounded-lg size-8 flex items-center justify-center hover:bg-gray-3 transition-colors cursor-pointer"
                                >
                                  <TicketIcon className="size-4 text-gray-11" />
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
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
