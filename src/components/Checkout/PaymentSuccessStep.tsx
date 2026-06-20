"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronDown } from "lucide-react";
import { Button } from "../Button";
import { useRouter } from "next/navigation";
import type { Event } from "@/interfaces/event";
import { RegistrationQRCode } from "../QRCode/RegistrationQRCode";
import { type IncludedProduct } from "@/components/Ticket/ProductVariationCard";
import { ParticipantProductsTab } from "./ParticipantProductsTab";
import { EventInfoCard } from "@/components/Event/EventInfoCard";
import { formatBRL as formatCurrency } from "@/lib/money";
import { Tooltip } from "@/components/Tooltip";
import { formatPhoneForCountry } from "@/utils/phone";
import { isBrazilianCountry } from "@/validators/Auth.validator";
import { formatDateBR } from "@/utils/datetimeBR";
import { formatAnswer } from "@/utils/questionAnswer";

interface PaymentSuccessStepProps {
  event: Event;
  orderNumber?: string;
  paymentMethod?: string;
  totalPaid?: number;
  participantsData?: Array<{
    participantIndex: number;
    registrationId?: string;
    ticketName: string;
    categoryName?: string;
    ticketPrice: number;
    qrCode?: string | {
      registrationId?: string;
      eventId?: string;
      userId?: string;
      raw?: string;
    };
    // Shape `IncludedProduct` (mesmo do ProductVariationCard) — a tab de Produtos
    // é compartilhada via ParticipantProductsTab.
    additionalProducts?: IncludedProduct[];
    includedProducts?: IncludedProduct[];
  }>;
  participantsInfo?: Array<{
    id: string;
    name: string;
    email: string;
    cpf: string;
    /** Tipo de documento e país do participante — definem label/máscara do doc. */
    documentType?: string | null;
    country?: string | null;
    phone: string;
    birthDate: string;
    gender: 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY' | null;
    emergencyContactName?: string;
    emergencyPhone?: string;
    questionAnswers?: Array<{
      question?: string | { question?: string } | null;
      answer?: unknown;
    }>;
  }>;
  serviceFee?: number;
  couponDiscount?: number;
  couponName?: string;
  productsSubtotal?: number;
  couponType?: "DISCOUNT" | "QUANTITY" | "AGE";
  couponPercent?: number;
  voucherDiscount?: number;
  voucherName?: string;
  date?: string;
}

/** Extrai o texto da pergunta — aceita string direta ou objeto `{ question }`. */
function getQuestionLabel(
  question: string | { question?: string } | null | undefined,
  fallbackIndex: number,
): string {
  if (typeof question === "string" && question.trim()) return question;
  if (question && typeof question === "object" && typeof question.question === "string" && question.question.trim()) {
    return question.question;
  }
  return `Pergunta ${fallbackIndex + 1}`;
}

export function PaymentSuccessStep({
  event,
  orderNumber,
  paymentMethod,
  totalPaid = 0,
  participantsData = [],
  participantsInfo = [],
  serviceFee: propServiceFee,
  couponDiscount: propCouponDiscount = 0,
  couponName,
  couponType,
  couponPercent,
  productsSubtotal,
  voucherDiscount: propVoucherDiscount = 0,
  voucherName,
  date: paymentDate,
}: PaymentSuccessStepProps) {
  // Pedido gratuito (coberto por cupom/voucher ou ingresso grátis): não há forma
  // de pagamento real — o backend pode mandar um método default (ex.: PIX), então
  // escondemos a linha "Forma de pagamento" em vez de exibir um método inexistente.
  const isFreeOrder = (totalPaid ?? 0) <= 0;
  const isAutomaticCoupon = couponType === "QUANTITY" || couponType === "AGE";
  const couponLabel = `${isAutomaticCoupon
    ? "Cupom automático"
    : couponName
      ? `Cupom ${couponName}`
      : "Cupom"
    }${couponPercent != null && couponPercent > 0 ? ` (-${couponPercent}%)` : ""}:`;
  const voucherLabel = voucherName ? `Voucher ${voucherName}:` : "Desconto voucher:";
  const router = useRouter();

  const participants = participantsInfo.map(p => ({
    name: p.name,
    cpf: p.cpf,
    documentType: p.documentType ?? null,
    country: p.country ?? null,
    email: p.email,
    birthDate: p.birthDate,
    phone: p.phone,
    gender: p.gender || '',
    emergencyContactName: p.emergencyContactName || '',
    emergencyPhone: p.emergencyPhone || '',
    questionAnswers: p.questionAnswers,
  }));

  const [activeTabs, setActiveTabs] = useState<Record<number, "info" | "products">>({});
  const [expandedParticipants, setExpandedParticipants] = useState<
    Record<number, boolean>
  >({
    0: true,
  });

  const formatDate = (date: string) => {
    if (!date) return "";
    return formatDateBR(date, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };


  /* Brasileiro quando: (1) country bate com BR/Brasil/Brazil (sinal mais
   * confiável, vem do cadastro internacional), (2) country null mas
   * documentType === "CPF" (registros legados), ou (3) ambos null + shape do
   * doc (CPF = 11 dígitos puros). Mesma heurística da tela de ingresso —
   * NÃO confiar em documentType primeiro (contas pre-migration têm
   * documentType="CPF" mesmo com country estrangeiro). */
  const isParticipantBr = (p: {
    country?: string | null;
    documentType?: string | null;
    cpf?: string | null;
  }): boolean => {
    if (p.country) return isBrazilianCountry(p.country);
    if (p.documentType) return p.documentType === "CPF";
    const raw = (p.cpf || "").trim();
    if (!raw) return true;
    if (/[A-Za-z]/.test(raw)) return false;
    return raw.replace(/\D/g, "").length === 11;
  };

  // Máscara parcial de PII só pra CPF brasileiro; estrangeiro (passaporte/RNE)
  // exibe cru (não há padrão de mascaramento e o doc tem letras essenciais).
  const maskCPF = (cpf: string, isBr: boolean = true) => {
    if (!cpf) return "";
    if (!isBr) return cpf;
    const cleaned = cpf.replace(/\D/g, "");
    if (cleaned.length !== 11) return cpf;
    return `${cleaned.slice(0, 2)}.***.***-${cleaned.slice(9)}`;
  };

  const formatCPF = (cpf: string) => {
    if (!cpf) return "";
    const cleaned = cpf.replace(/\D/g, "");
    if (cleaned.length !== 11) return cpf;
    return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-${cleaned.slice(9)}`;
  };

  // Formata pelo país do participante via libphonenumber (mesmo helper do
  // cadastro/preenchimento). Sem país mapeado, fallback retorna dígitos limpos.
  const formatPhone = (phone: string, country?: string | null) => {
    if (!phone) return "";
    return formatPhoneForCountry(phone, country ?? null) || phone;
  };

  // País efetivo pro telefone do participante: BR legado (country null) usa
  // "Brasil" — mesma heurística do documento — pra mascarar igual ao resto, em
  // vez de exibir dígitos crus. Estrangeiro conhecido usa o próprio país.
  const phoneCountry = (p: {
    country?: string | null;
    documentType?: string | null;
    cpf?: string | null;
  }): string | null => (isParticipantBr(p) ? p.country || "Brasil" : p.country ?? null);

  // Detalhe do ingresso (compra aprovada) usa a inicial do sexo: M / F / O.
  const getGenderLabel = (gender: string) => {
    const labels: Record<string, string> = {
      MALE: "M",
      FEMALE: "F",
      OTHER: "O",
      PREFER_NOT_TO_SAY: "N",
      male: "M",
      female: "F",
      other: "O",
    };
    return labels[gender] || (gender ? gender.charAt(0).toUpperCase() : gender);
  };

  // Calculate totals
  const additionalProductsTotal = productsSubtotal ?? 0;
  // Subtotal = ingressos + produtos adicionais (antes dos descontos/taxa). Com o
  // `ticketPrice` agora sendo o preço REAL do ingresso (sem produto rateado), os
  // produtos precisam ser somados aqui — senão o subtotal ficaria só os ingressos.
  const ticketsSubtotal = participantsData.reduce((sum, p) => sum + p.ticketPrice, 0);
  const subtotal = ticketsSubtotal + additionalProductsTotal;
  const serviceFee = propServiceFee ?? event?.serviceFee ?? 0;

  /* Agrupa ingressos IDÊNTICOS (mesma categoria + nome + preço unitário) numa só
   * linha "(Nx) Nome". `quantity` conta as unidades; `total` = unitário × qtd.
   * Preserva a ordem de 1ª aparição. */
  const groupedTicketLines = (() => {
    const map = new Map<
      string,
      { categoryName?: string; ticketName: string; unitPrice: number; quantity: number; total: number }
    >();
    for (const p of participantsData) {
      const key = `${p.categoryName ?? ""}|${p.ticketName}|${p.ticketPrice}`;
      const existing = map.get(key);
      if (existing) {
        existing.quantity += 1;
        existing.total += p.ticketPrice;
      } else {
        map.set(key, {
          categoryName: p.categoryName,
          ticketName: p.ticketName,
          unitPrice: p.ticketPrice,
          quantity: 1,
          total: p.ticketPrice,
        });
      }
    }
    return Array.from(map.values());
  })();
  const couponDiscount = propCouponDiscount ?? 0;
  const voucherDiscount = propVoucherDiscount ?? 0;

  const toggleParticipant = (index: number) => {
    setExpandedParticipants((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const displayParticipants = participantsData;

  return (
    <>
      {/* Mobile Layout */}
      <div className="w-full md:hidden bg-gray-2 min-h-screen">

        {/* Mobile Content */}
        <div className="flex flex-col items-center pb-24 pt-0 px-4 w-full">
          {/* Success Header */}
          <div className="flex flex-col items-center justify-center pb-12 pt-10 w-full">
            <div className="flex flex-col gap-8 items-center">
              <Image
                src="/images/approved-payment-badge.png"
                alt="Success Icon"
                width={96}
                height={96}
                draggable={false}
              />
              <div className="flex flex-col gap-4 items-center text-gray-12 text-center">
                <h1 className="font-extrabold text-xl leading-[1.1] font-manrope">
                  Pagamento aprovado
                </h1>
                <p className="font-medium text-base leading-[1.3] font-family-dm-sans">
                  Sua inscrição foi confirmada. Enviamos o comprovante para o
                  seu e-mail.
                </p>
              </div>
            </div>
          </div>

          {/* Order Details Card */}
          <div className="flex items-center justify-center w-full mb-8">
            <div className="flex flex-col items-start w-full">
              <div className="bg-gray-2 flex flex-col items-start overflow-hidden rounded-xl shadow-[0px_2px_6px_0px_rgba(17,17,17,0.25)] w-full">
                <div className="border-b border-gray-6 flex flex-col gap-4 items-start px-4 py-6 w-full">
                  <div className="flex flex-col gap-2 items-start w-full">
                    {/* Order Number */}
                    <div className="border border-gray-6 flex flex-col gap-2 items-start p-4 rounded-lg w-full">
                      <div className="flex-1 flex flex-col items-start">
                        <p className="font-semibold text-base leading-[1.1] text-gray-12 font-manrope">
                          Número do pedido:
                        </p>
                      </div>
                      <div className="flex flex-col items-end">
                        <p className="font-bold text-base leading-[1.1] text-gray-12 font-manrope">
                          #{orderNumber}
                        </p>
                      </div>
                    </div>

                    {/* Event Name */}
                    <div className="border border-gray-6 flex flex-col items-start justify-between p-4 gap-2 rounded-lg w-full">
                      <p className="font-semibold text-base leading-[1.1] text-gray-12 font-manrope">
                        Nome do evento:
                      </p>
                      <p className="font-bold text-base leading-[1.1] text-gray-12 font-manrope text-left flex-1">
                        {event.name}
                      </p>
                    </div>

                    {/* Date */}
                    <div className="border border-gray-6 flex items-center justify-between p-4 rounded-lg w-full">
                      <p className="font-semibold text-base leading-[1.1] text-gray-12 font-manrope">
                        Data da compra:
                      </p>
                      <p className="font-bold text-base leading-[1.1] text-gray-12 font-manrope">
                        {formatDate(paymentDate || event.eventDate)}
                      </p>
                    </div>

                    {/* Payment Method — omitido em pedido gratuito */}
                    {!isFreeOrder && (
                      <div className="border border-gray-6 flex items-center justify-between p-4 rounded-lg w-full">
                        <p className="font-semibold text-base leading-[1.1] text-gray-12 font-manrope">
                          Forma de pagamento:
                        </p>
                        <p className="font-bold text-base leading-[1.1] text-gray-12 font-manrope text-end">
                          {paymentMethod}
                        </p>
                      </div>
                    )}

                    {/* Participants */}
                    <div className="border border-gray-6 flex items-center justify-between p-4 rounded-lg w-full">
                      <p className="font-semibold text-base leading-[1.1] text-gray-12 font-manrope">
                        Participantes:
                      </p>
                      <p className="font-bold text-base leading-[1.1] text-gray-12 font-manrope">
                        {displayParticipants.length}
                      </p>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="bg-gray-6 h-px w-full" />

                  {/* Totals */}
                  <div className="flex flex-col gap-2 items-start w-full">
                    {/* Additional Products */}
                    <div className="border border-gray-6 flex items-center justify-between p-4 rounded-lg w-full">
                      <p className="font-semibold text-base leading-[1.1] text-gray-12 font-manrope">
                        Produtos adicionais:
                      </p>
                      <p className="font-bold text-base leading-[1.1] text-gray-12 font-manrope">
                        {formatCurrency(additionalProductsTotal)}
                      </p>
                    </div>

                    {/* Ingressos — agrupados por tipo idêntico "(Nx) Nome",
                        acima do Subtotal. */}
                    {groupedTicketLines.map((line, lineIndex) => (
                      <div
                        key={lineIndex}
                        className="border border-gray-6 flex items-center justify-between gap-3 p-4 rounded-lg w-full"
                      >
                        <span className="flex flex-col gap-0.5 min-w-0">
                          <span className="text-xs font-normal text-gray-11 font-family-dm-sans truncate">
                            {line.categoryName ?? "Ingresso avulso"}
                          </span>
                          <span className="font-semibold text-sm leading-[1.2] text-gray-12 font-manrope break-words">
                            {line.quantity > 1 ? `(${line.quantity}x) ` : ""}{line.ticketName}
                          </span>
                        </span>
                        <p className="font-bold text-base leading-[1.1] text-gray-12 font-manrope shrink-0">
                          {formatCurrency(line.total)}
                        </p>
                      </div>
                    ))}

                    {/* Subtotal */}
                    <div className="border border-gray-6 flex items-center justify-between p-4 rounded-lg w-full">
                      <p className="font-semibold text-base leading-[1.1] text-gray-12 font-manrope">
                        Subtotal:
                      </p>
                      <p className="font-bold text-base leading-[1.1] text-gray-12 font-manrope">
                        {formatCurrency(subtotal)}
                      </p>
                    </div>

                    {/* Coupon Discount — antes da taxa (taxa por último) */}
                    {couponDiscount > 0 && (
                      <div className="border border-gray-6 flex items-center justify-between p-4 rounded-lg w-full">
                        <p className="font-semibold text-base leading-[1.1] text-gray-12 font-manrope">
                          {couponLabel}
                        </p>
                        <p className="font-bold text-base leading-[1.1] text-gray-12 font-manrope">
                          – {formatCurrency(couponDiscount)}
                        </p>
                      </div>
                    )}

                    {/* Voucher Discount — antes da taxa (taxa por último) */}
                    {voucherDiscount > 0 && (
                      <div className="border border-gray-6 flex items-center justify-between p-4 rounded-lg w-full">
                        <p className="font-semibold text-base leading-[1.1] text-gray-12 font-manrope">
                          {voucherLabel}
                        </p>
                        <p className="font-bold text-base leading-[1.1] text-gray-12 font-manrope">
                          – {formatCurrency(voucherDiscount)}
                        </p>
                      </div>
                    )}

                    {/* Service Fee — oculto quando 0; por ÚLTIMO antes do total */}
                    {serviceFee > 0 && (
                      <div className="border border-gray-6 flex items-center justify-between p-4 rounded-lg w-full">
                        <p className="font-semibold text-base leading-[1.1] text-gray-12 font-manrope">
                          Taxa de serviço:
                        </p>
                        <p className="font-bold text-base leading-[1.1] text-gray-12 font-manrope">
                          {formatCurrency(serviceFee)}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Total Paid */}
                  <div className="flex gap-0.5 items-center justify-center pl-4 pr-0 py-4 rounded-lg w-full">
                    <p className="font-medium text-xl leading-[1.1] text-gray-12 font-manrope">
                      Total pago:
                    </p>
                    <p className="font-bold text-2xl leading-[1.1] text-gray-12 font-manrope">
                      {formatCurrency(totalPaid)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Button */}
              <div className="flex flex-col items-start pb-0 pt-8 px-0 w-full">
                <Button
                  onClick={() => router.push("/user/tickets")}
                  className="w-full font-bold text-lg h-12 flex items-center justify-center gap-2"
                >
                  Ver meus ingressos
                </Button>
              </div>
            </div>
          </div>

          {/* Ticket Details Section */}
          <div className="flex flex-col items-start pb-0 pt-15 w-full">
            <div className="flex flex-col gap-6 items-start w-full">
              <div className="flex flex-col gap-4 items-start justify-center w-full">
                <h2 className="font-bold text-lg leading-[1.1] text-gray-12 font-manrope">
                  Detalhes do seu ingresso
                </h2>
                <p className="font-normal text-sm leading-[1.3] text-gray-11 font-family-dm-sans">
                  Apresente este QR Code na retirada do kit ou na entrada do
                  evento para validar sua inscrição.
                </p>
              </div>

              {/* Event Info Card (mobile) — contexto do evento dentro de "Detalhes do seu ingresso" */}
              <EventInfoCard event={event} className="w-full" />

              {/* Participant Cards */}
              <div className="flex flex-col gap-5 items-start w-full">
                {displayParticipants.map((participantData, index) => {
                  const participant = participants[participantData.participantIndex] || {};
                  const qrCode = `${process.env.NEXT_PUBLIC_ROOT_SITE_URL}/user/tickets/${orderNumber}`;
                  const isExpanded = expandedParticipants[index] || false;

                  return (
                    <div
                      key={index}
                      className="bg-white border border-gray-6 flex flex-col items-start rounded-xl w-full overflow-hidden"
                    >
                      <button
                        className="flex flex-col items-start p-0 w-full"
                        onClick={() => toggleParticipant(index)}
                      >
                        {/* Content */}
                        <div className="flex flex-col gap-5 items-start px-4 py-6 w-full">
                          <div className="flex gap-3 items-start w-full">
                            <div className="relative shrink-0 size-[120px]">
                              <RegistrationQRCode
                                qrCodeData={qrCode}
                                size={120}
                                className="w-full h-full"
                              />
                            </div>
                            <div className="flex-1 flex flex-col gap-4 items-start px-0 py-3 text-gray-12 text-start">
                              <p className="font-normal text-base leading-[1.3] font-family-dm-sans">
                                Participante{" "}
                                {participantData.participantIndex + 1}
                              </p>
                              <Tooltip
                                content={participantData.ticketName}
                                position="topRight"
                                trigger="click"
                                usePortal
                                className="block min-w-0 max-w-full"
                                contentClassName="!w-auto max-w-[calc(100vw-32px)] text-left text-sm text-gray-12 font-family-dm-sans !py-2 !px-3"
                              >
                                <p className="font-bold text-lg leading-[1.1] font-manrope line-clamp-3 cursor-pointer">
                                  {participantData.ticketName}
                                </p>
                              </Tooltip>
                              {participantData.categoryName && (
                                <p className="font-normal text-sm leading-[1.3] text-gray-11 font-family-dm-sans">
                                  {participantData.categoryName}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Profile */}
                        <div className="border-b border-gray-6 flex flex-col gap-4 items-start pb-4 pt-0 px-4 w-full">
                          <div className="border border-gray-6 flex items-center p-2 rounded-xl w-full">
                            <div className="flex gap-2 items-center flex-1">
                              <div className="relative shrink-0 size-10 rounded-full overflow-hidden bg-primary-10/20">
                                {participant.name ? (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <span className="text-primary-11 font-semibold text-sm">
                                      {participant.name.charAt(0).toUpperCase()}
                                    </span>
                                  </div>
                                ) : (
                                  <Image
                                    src="/images/default-avatar.png"
                                    alt="Avatar"
                                    fill
                                    className="object-cover"
                                  />
                                )}
                              </div>
                              <div className="flex flex-col gap-3 items-start justify-center flex-1">
                                <p className="font-semibold text-sm leading-[1.3] text-gray-12 font-family-dm-sans">
                                  {participant.name || "Sem nome"}
                                </p>
                                <div className="flex gap-2 items-center justify-center w-full">
                                  {participant.birthDate && (
                                    <>
                                      <span className="font-normal text-xs leading-[1.3] text-gray-11 font-family-dm-sans">
                                        {formatDate(participant.birthDate)}
                                      </span>
                                      <div className="size-1 rounded-full bg-gray-11" />
                                    </>
                                  )}
                                  {participant.gender && (
                                    <>
                                      <span className="font-normal text-xs leading-[1.3] text-gray-11 font-family-dm-sans">
                                        {getGenderLabel(participant.gender)}
                                      </span>
                                      <div className="size-1 rounded-full bg-gray-11" />
                                    </>
                                  )}
                                  {participant.cpf && (
                                    <span className="font-normal text-xs leading-[1.3] text-gray-11 font-family-dm-sans flex-1 truncate">
                                      {maskCPF(participant.cpf, isParticipantBr(participant))}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </button>

                      {/* Expanded Content */}
                      {isExpanded && (
                        <>
                          {/* Tabs */}
                          <div className="flex gap-3 items-start pb-2 pt-5 px-4 w-full">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveTabs(prev => ({ ...prev, [index]: "info" }));
                              }}
                              className={`px-4 py-3 rounded-[32px] font-semibold text-base leading-[1.1] font-manrope ${(activeTabs[index] ?? "info") === "info"
                                ? "bg-primary-11 text-primary-2"
                                : "bg-gray-5 text-gray-11"
                                }`}
                            >
                              Informações
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveTabs(prev => ({ ...prev, [index]: "products" }));
                              }}
                              className={`px-4 py-3 rounded-[32px] font-semibold text-base leading-[1.1] font-manrope ${(activeTabs[index] ?? "info") === "products"
                                ? "bg-primary-11 text-primary-2"
                                : "bg-gray-5 text-gray-11"
                                }`}
                            >
                              Produtos
                            </button>
                          </div>

                          {/* Tab Content */}
                          {(activeTabs[index] ?? "info") === "info" ? (
                            <div className="flex flex-wrap gap-5 items-start overflow-hidden pb-6 pt-8 px-4 w-full">
                              <p className="font-bold text-lg leading-[1.1] text-gray-12 font-manrope w-full">
                                Informações do participante
                              </p>
                              <div className="grid grid-cols-1 gap-4 w-full">
                                {[
                                  {
                                    label: "Nome",
                                    value: participant.name || "",
                                  },
                                  {
                                    label: "Email",
                                    value: participant.email || "",
                                  },
                                  {
                                    label: isParticipantBr(participant) ? "CPF" : "Documento",
                                    value: isParticipantBr(participant)
                                      ? formatCPF(participant.cpf || "")
                                      : participant.cpf || "",
                                  },
                                  {
                                    label: "Data de nascimento",
                                    value: participant.birthDate
                                      ? formatDate(participant.birthDate)
                                      : "",
                                  },
                                  {
                                    label: "Telefone",
                                    value: formatPhone(participant.phone || "", phoneCountry(participant)),
                                  },
                                  {
                                    label: "Sexo",
                                    value: participant.gender
                                      ? getGenderLabel(participant.gender)
                                      : "",
                                  },
                                  {
                                    label: "Contato de emergência",
                                    value: participant.emergencyContactName && participant.emergencyPhone
                                      ? `${participant.emergencyContactName} - ${formatPhone(participant.emergencyPhone, phoneCountry(participant))}`
                                      : participant.emergencyContactName || formatPhone(participant.emergencyPhone || "", phoneCountry(participant)) || "",
                                  },
                                ].map((field, idx) => {
                                  if (!field.value) return null
                                  return (
                                    <div
                                      key={idx}
                                      className="flex flex-col items-start rounded-lg w-full"
                                    >
                                      <label className="font-normal text-sm text-gray-12 font-family-dm-sans">
                                        {field.label}
                                      </label>
                                      <input
                                        type="text"
                                        value={field.value}
                                        readOnly
                                        className="w-full font-medium text-base text-gray-12 font-family-dm-sans bg-transparent border-0 outline-none"
                                      />
                                    </div>
                                  )
                                })}
                              </div>
                              {participant.questionAnswers && participant.questionAnswers.length > 0 && (
                                <>
                                  <div className="w-full h-px bg-gray-6 my-2" />
                                  <p className="font-bold text-lg leading-[1.1] text-gray-12 font-manrope w-full">
                                    Perguntas do Organizador
                                  </p>
                                  <div className="grid grid-cols-1 gap-4 w-full">
                                    {participant.questionAnswers.map((q, idx) => (
                                      <div key={idx} className="flex flex-col items-start rounded-lg w-full">
                                        <label className="font-normal text-sm text-gray-12 font-family-dm-sans">
                                          {getQuestionLabel(q.question, idx)}
                                        </label>
                                        <input
                                          type="text"
                                          value={formatAnswer(q.answer)}
                                          readOnly
                                          className="w-full font-medium text-base text-gray-12 font-family-dm-sans bg-transparent border-0 outline-none"
                                        />
                                      </div>
                                    ))}
                                  </div>
                                </>
                              )}
                            </div>
                          ) : (
                            <div className="pb-6 pt-8 px-4 w-full">
                              <ParticipantProductsTab
                                includedProducts={participantData.includedProducts ?? []}
                                additionalProducts={participantData.additionalProducts ?? []}
                                registrationId={participantData.registrationId ?? ""}
                              />
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:flex bg-gray-2 flex-col items-start overflow-hidden w-full">
        <div className="flex flex-col h-auto items-center pb-[176px] pt-[56px] px-0 w-full">
          {/* Header */}
          <div className="flex flex-col items-center justify-center pb-[52px] pt-0 px-[168px] w-full">
            <div className="flex flex-col gap-8 items-center">
              <Image
                src="/images/approved-payment-badge.png"
                alt="Success Icon"
                width={96}
                height={96}
                draggable={false}
              />
              <div className="flex flex-col gap-[16px] items-center text-gray-12 text-center">
                <h1 className="font-extrabold text-[32px] leading-[1.1] font-manrope">
                  Pagamento aprovado
                </h1>
                <p className="font-medium text-[18px] leading-[1.3] font-family-dm-sans">
                  Sua inscrição foi confirmada. Enviamos o comprovante para o
                  seu e-mail.
                </p>
              </div>
            </div>
          </div>

          {/* Order Details */}
          <div className="flex items-center justify-center px-[168px] py-0 w-full">
            <div className="flex flex-col items-start w-[692px]">
              <div className="bg-gray-2 flex flex-col items-start overflow-hidden rounded-[12px] shadow-[0px_2px_6px_0px_rgba(17,17,17,0.25)] w-full">
                <div className="border-b border-gray-6 flex flex-col gap-[16px] items-start px-[16px] py-[24px] w-full">
                  <div className="flex flex-col gap-[8px] items-start w-full">
                    {/* Order Number */}
                    <div className="border border-gray-6 flex gap-[32px] items-center p-[16px] rounded-[8px] w-full">
                      <div className="flex-1 flex flex-col items-start">
                        <p className="font-semibold text-[16px] leading-[1.1] text-gray-12 font-manrope">
                          Número do pedido:
                        </p>
                      </div>
                      <div className="flex flex-col items-end">
                        <p className="font-semibold text-[16px] leading-[1.1] text-gray-12 font-manrope">
                          #{orderNumber}
                        </p>
                      </div>
                    </div>

                    {/* Event Name */}
                    <div className="border border-gray-6 flex items-center justify-between p-[16px] rounded-[8px] w-full">
                      <p className="font-semibold text-[16px] leading-[1.1] text-gray-12 font-manrope">
                        Nome do evento:
                      </p>
                      <p className="font-bold text-[16px] leading-[1.1] text-gray-12 font-manrope text-right line-clamp-3 w-1/2">
                        {event.name}
                      </p>
                    </div>

                    {/* Date */}
                    <div className="border border-gray-6 flex items-center justify-between p-[16px] rounded-[8px] w-full">
                      <p className="font-semibold text-[16px] leading-[1.1] text-gray-12 font-manrope">
                        Data da compra:
                      </p>
                      <p className="font-bold text-[16px] leading-[1.1] text-gray-12 font-manrope">
                        {formatDate(paymentDate || event.eventDate)}
                      </p>
                    </div>

                    {/* Payment Method — omitido em pedido gratuito */}
                    {!isFreeOrder && (
                      <div className="border border-gray-6 flex items-center justify-between p-[16px] rounded-[8px] w-full">
                        <p className="font-semibold text-[16px] leading-[1.1] text-gray-12 font-manrope">
                          Forma de pagamento:
                        </p>
                        <p className="font-bold text-[16px] leading-[1.1] text-gray-12 font-manrope text-end">
                          {paymentMethod}
                        </p>
                      </div>
                    )}

                    {/* Participants */}
                    <div className="border border-gray-6 flex items-center justify-between p-[16px] rounded-[8px] w-full">
                      <p className="font-semibold text-[16px] leading-[1.1] text-gray-12 font-manrope">
                        Participantes:
                      </p>
                      <p className="font-bold text-[16px] leading-[1.1] text-gray-12 font-manrope">
                        {displayParticipants.length}
                      </p>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="bg-gray-6 h-px w-full" />

                  {/* Totals */}
                  <div className="flex flex-col gap-[8px] items-start w-full">
                    {/* Additional Products */}
                    <div className="border border-gray-6 flex items-center justify-between p-[16px] rounded-[8px] w-full">
                      <p className="font-semibold text-[16px] leading-[1.1] text-gray-12 font-manrope">
                        Produtos adicionais:
                      </p>
                      <p className="font-bold text-[16px] leading-[1.1] text-gray-12 font-manrope">
                        {formatCurrency(additionalProductsTotal)}
                      </p>
                    </div>

                    {/* Ingressos — agrupados por tipo idêntico "(Nx) Nome",
                        acima do Subtotal. */}
                    {groupedTicketLines.map((line, lineIndex) => (
                      <div
                        key={lineIndex}
                        className="border border-gray-6 flex items-center justify-between gap-3 p-[16px] rounded-[8px] w-full"
                      >
                        <span className="flex flex-col gap-0.5 min-w-0">
                          <span className="text-xs font-normal text-gray-11 font-family-dm-sans truncate">
                            {line.categoryName ?? "Ingresso avulso"}
                          </span>
                          <span className="font-semibold text-base leading-[1.2] text-gray-12 font-manrope break-words">
                            {line.quantity > 1 ? `(${line.quantity}x) ` : ""}{line.ticketName}
                          </span>
                        </span>
                        <p className="font-bold text-[16px] leading-[1.1] text-gray-12 font-manrope shrink-0">
                          {formatCurrency(line.total)}
                        </p>
                      </div>
                    ))}

                    {/* Subtotal */}
                    <div className="border border-gray-6 flex items-center justify-between p-[16px] rounded-[8px] w-full">
                      <p className="font-semibold text-[16px] leading-[1.1] text-gray-12 font-manrope">
                        Subtotal:
                      </p>
                      <p className="font-bold text-[16px] leading-[1.1] text-gray-12 font-manrope">
                        {formatCurrency(subtotal)}
                      </p>
                    </div>

                    {/* Coupon Discount — antes da taxa (taxa por último) */}
                    {couponDiscount > 0 && (
                      <div className="border border-gray-6 flex items-center justify-between p-[16px] rounded-[8px] w-full">
                        <p className="font-semibold text-[16px] leading-[1.1] text-gray-12 font-manrope">
                          {couponLabel}
                        </p>
                        <p className="font-bold text-[16px] leading-[1.1] text-gray-12 font-manrope">
                          – {formatCurrency(couponDiscount)}
                        </p>
                      </div>
                    )}

                    {/* Voucher Discount — antes da taxa (taxa por último) */}
                    {voucherDiscount > 0 && (
                      <div className="border border-gray-6 flex items-center justify-between p-[16px] rounded-[8px] w-full">
                        <p className="font-semibold text-[16px] leading-[1.1] text-gray-12 font-manrope">
                          {voucherLabel}
                        </p>
                        <p className="font-bold text-[16px] leading-[1.1] text-gray-12 font-manrope">
                          – {formatCurrency(voucherDiscount)}
                        </p>
                      </div>
                    )}

                    {/* Service Fee — oculto quando 0; por ÚLTIMO antes do total */}
                    {serviceFee > 0 && (
                      <div className="border border-gray-6 flex items-center justify-between p-[16px] rounded-[8px] w-full">
                        <p className="font-semibold text-[16px] leading-[1.1] text-gray-12 font-manrope">
                          Taxa de serviço:
                        </p>
                        <p className="font-bold text-[16px] leading-[1.1] text-gray-12 font-manrope">
                          {formatCurrency(serviceFee)}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Total Paid */}
                  <div className="flex gap-[2px] items-center justify-center pl-[16px] pr-0 py-[16px] rounded-[8px] w-full">
                    <p className="font-medium text-[20px] leading-[1.1] text-gray-12 font-manrope">
                      Total pago:
                    </p>
                    <p className="font-bold text-[24px] leading-[1.1] text-gray-12 font-manrope">
                      {formatCurrency(totalPaid)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Button */}
              <div className="flex flex-col items-start pb-0 pt-[32px] px-0 w-full">
                <Button
                  onClick={() => router.push("/user/tickets")}
                  className="w-full font-bold text-[20px] h-[52px]"
                >
                  Ver meus ingressos
                </Button>
              </div>
            </div>
          </div>

          {/* Ticket Details Section */}
          <div className="flex flex-col items-center pb-0 pt-[80px] w-[692px]">
            <div className="flex flex-col gap-[24px] items-start w-full">
              <div className="flex flex-col gap-[16px] items-start justify-center w-full">
                <h2 className="font-bold text-[28px] leading-[1.1] text-gray-12 font-manrope">
                  Detalhes do seu ingresso
                </h2>
                <p className="font-normal text-[16px] leading-[1.3] text-gray-11 font-family-dm-sans">
                  Apresente este QR Code na retirada do kit ou na entrada do
                  evento para validar sua inscrição.
                </p>
              </div>

              {/* Event Info Card (desktop) — contexto do evento dentro de "Detalhes do seu ingresso" */}
              <EventInfoCard event={event} className="w-full" />

              {/* Participant Cards */}
              <div className="flex flex-col gap-[20px] items-center w-full">
                {displayParticipants.map((participantData, index) => {
                  const participant = participants[participantData.participantIndex] || {};
                  const qrCode = `${process.env.NEXT_PUBLIC_ROOT_SITE_URL}/user/tickets/${orderNumber}`;
                  const isExpanded = expandedParticipants[index] || false;

                  return (
                    <div
                      key={index}
                      className="bg-gray-1 border border-gray-6 flex flex-col items-start min-w-[400px] rounded-[12px] w-[692px] overflow-hidden"
                    >
                      <button
                        className="flex flex-col items-start p-0 w-full"
                        onClick={() => toggleParticipant(index)}
                      >
                        {/* Content */}
                        <div className="flex items-center justify-between px-[16px] py-[24px] w-full">
                          <div className="flex flex-col gap-[20px] items-start">
                            <p className="font-normal text-[16px] leading-[1.3] text-gray-12 font-family-dm-sans">
                              Participante{" "}
                              {participantData.participantIndex + 1}
                            </p>
                            <div className="flex flex-col items-start">
                              <p className="font-normal text-base truncate max-w-[400px] leading-[1.3] text-gray-11 font-family-dm-sans">
                                {participantData.categoryName ?? "Ingresso avulso"}
                              </p>
                              <Tooltip
                                content={participantData.ticketName}
                                position="topRight"
                                trigger="click"
                                usePortal
                                className="block min-w-0 max-w-[400px]"
                                contentClassName="!w-auto max-w-[calc(100vw-32px)] text-left text-sm text-gray-12 font-family-dm-sans !py-2 !px-3"
                              >
                                <h3 className="font-bold text-[24px] line-clamp-3 leading-[1.1] text-gray-12 font-manrope text-left cursor-pointer">
                                  {participantData.ticketName}
                                </h3>
                              </Tooltip>
                            </div>
                          </div>
                          {/* QR Code */}
                          <div className="flex flex-row items-center">
                            <div className="aspect-square h-full relative">
                              <RegistrationQRCode
                                qrCodeData={qrCode}
                                size={128}
                                className="w-full h-full"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Profile */}
                        <div className="border-b border-gray-6 flex items-center justify-between pb-[20px] pt-0 px-[16px] w-full">
                          <div className="border border-gray-6 flex items-center p-[12px] rounded-[12px]">
                            <div className="flex gap-[8px] items-center">
                              <div className="relative size-[40px] rounded-full overflow-hidden bg-primary-10/20">
                                {participant.name ? (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <span className="text-primary-11 font-semibold text-sm">
                                      {participant.name.charAt(0).toUpperCase()}
                                    </span>
                                  </div>
                                ) : (
                                  <Image
                                    src="/images/default-avatar.png"
                                    alt="Avatar"
                                    fill
                                    className="object-cover"
                                  />
                                )}
                              </div>
                              <div className="flex flex-col gap-[12px] items-start justify-center">
                                <p className="font-semibold text-[14px] leading-[1.3] text-gray-12 font-family-dm-sans">
                                  {participant.name || "Sem nome"}
                                </p>
                                <div className="flex gap-[8px] items-center justify-center">
                                  {participant.birthDate && (
                                    <>
                                      <span className="font-normal text-[14px] leading-[1.3] text-gray-11 font-family-dm-sans">
                                        {formatDate(participant.birthDate)}
                                      </span>
                                      <div className="size-1 rounded-full bg-gray-11" />
                                    </>
                                  )}
                                  {participant.gender && (
                                    <>
                                      <span className="font-normal text-[14px] leading-[1.3] text-gray-11 font-family-dm-sans">
                                        {getGenderLabel(participant.gender)}
                                      </span>
                                      <div className="size-1 rounded-full bg-gray-11" />
                                    </>
                                  )}
                                  {participant.cpf && (
                                    <span className="font-normal text-[14px] leading-[1.3] text-gray-11 font-family-dm-sans">
                                      {maskCPF(participant.cpf, isParticipantBr(participant))}
                                    </span>
                                  )}

                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center justify-center size-8">
                            <ChevronDown
                              className={`size-8 text-gray-12 transition-transform ${isExpanded ? "rotate-180" : ""
                                }`}
                            />
                          </div>
                        </div>
                      </button>

                      {/* Expanded Content */}
                      {isExpanded && (
                        <>
                          {/* Tabs */}
                          <div className="flex gap-[12px] items-start pb-[8px] pt-[20px] px-[16px] w-full">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveTabs(prev => ({ ...prev, [index]: "info" }));
                              }}
                              className={`px-[16px] py-[12px] rounded-[32px] font-semibold text-[16px] leading-[1.1] font-manrope ${(activeTabs[index] ?? "info") === "info"
                                ? "bg-primary-11 text-primary-2"
                                : "bg-gray-5 text-gray-11"
                                }`}
                            >
                              Informações
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveTabs(prev => ({ ...prev, [index]: "products" }));
                              }}
                              className={`px-[16px] py-[12px] rounded-[32px] font-semibold text-[16px] leading-[1.1] font-manrope ${(activeTabs[index] ?? "info") === "products"
                                ? "bg-primary-11 text-primary-2"
                                : "bg-gray-5 text-gray-11"
                                }`}
                            >
                              Produtos
                            </button>
                          </div>

                          {/* Tab Content */}
                          {(activeTabs[index] ?? "info") === "info" ? (
                            <div className="flex flex-wrap gap-[20px_12px] items-start overflow-hidden pb-[24px] pt-[32px] px-[16px] w-full">
                              <p className="font-bold text-[20px] leading-[1.1] text-gray-12 font-manrope w-full">
                                Informações do participante
                              </p>
                              <div className="grid grid-cols-2 gap-10 w-full">
                                {[
                                  {
                                    label: "Nome",
                                    value: participant.name || "",
                                  },
                                  {
                                    label: "Email",
                                    value: participant.email || "",
                                  },
                                  {
                                    label: isParticipantBr(participant) ? "CPF" : "Documento",
                                    value: isParticipantBr(participant)
                                      ? formatCPF(participant.cpf || "")
                                      : participant.cpf || "",
                                  },
                                  {
                                    label: "Data de nascimento",
                                    value: participant.birthDate
                                      ? formatDate(participant.birthDate)
                                      : "",
                                  },
                                  {
                                    label: "Telefone",
                                    value: formatPhone(participant.phone || "", phoneCountry(participant)),
                                  },
                                  {
                                    label: "Sexo",
                                    value: participant.gender
                                      ? getGenderLabel(participant.gender)
                                      : "",
                                  },
                                  {
                                    label: "Contato de emergência",
                                    value: participant.emergencyContactName && participant.emergencyPhone
                                      ? `${participant.emergencyContactName} - ${formatPhone(participant.emergencyPhone, phoneCountry(participant))}`
                                      : participant.emergencyContactName || formatPhone(participant.emergencyPhone || "", phoneCountry(participant)) || "",
                                  },
                                ].map((field, idx) => {
                                  if (!field.value) return null
                                  return (
                                    <div
                                      key={idx}
                                      className="flex flex-col gap-2 items-start rounded-[8px] min-w-[313px]"
                                    >
                                      <label className="font-normal text-[16px] leading-[1.3] text-gray-12 font-family-dm-sans">
                                        {field.label}
                                      </label>
                                      <input
                                        type="text"
                                        value={field.value}
                                        readOnly
                                        className="w-full font-medium text-[16px] leading-[1.3] text-gray-12 font-family-dm-sans bg-transparent border-0 outline-none"
                                      />
                                    </div>
                                  )
                                })}
                              </div>
                              {participant.questionAnswers && participant.questionAnswers.length > 0 && (
                                <>
                                  <div className="w-full h-px bg-gray-6 my-2" />
                                  <p className="font-bold text-[20px] leading-[1.1] text-gray-12 font-manrope w-full">
                                    Perguntas do Organizador
                                  </p>
                                  <div className="grid grid-cols-2 gap-10 w-full">
                                    {participant.questionAnswers.map((q, idx) => (
                                      <div key={idx} className="flex flex-col gap-2 items-start rounded-[8px] min-w-[313px]">
                                        <label className="font-normal text-[16px] leading-[1.3] text-gray-12 font-family-dm-sans">
                                          {getQuestionLabel(q.question, idx)}
                                        </label>
                                        <input
                                          type="text"
                                          value={formatAnswer(q.answer)}
                                          readOnly
                                          className="w-full font-medium text-[16px] leading-[1.3] text-gray-12 font-family-dm-sans bg-transparent border-0 outline-none"
                                        />
                                      </div>
                                    ))}
                                  </div>
                                </>
                              )}
                            </div>
                          ) : (
                            <div className="pb-[24px] pt-[32px] px-[16px] w-full">
                              <ParticipantProductsTab
                                includedProducts={participantData.includedProducts ?? []}
                                additionalProducts={participantData.additionalProducts ?? []}
                                registrationId={participantData.registrationId ?? ""}
                              />
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
