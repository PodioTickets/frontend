"use client";

import { useState } from "react";
import Image from "next/image";
import { ImageWithInitialFallback } from "@/components/ImageWithInitialFallback";
import { ChevronDown } from "lucide-react";
import { Button } from "../Button";
import { useRouter } from "next/navigation";
import type { Event } from "@/interfaces/event";
import { RegistrationQRCode } from "../QRCode/RegistrationQRCode";
import { isSemInteresseVariation } from "@/utils/semInteresseVariation";
import { EventInfoCard } from "@/components/Event/EventInfoCard";
import { Tooltip } from "@/components/Tooltip";

interface PaymentSuccessStepProps {
  event: Event;
  orderNumber?: string;
  paymentMethod?: string;
  totalPaid?: number;
  participantsData?: Array<{
    participantIndex: number;
    ticketName: string;
    categoryName?: string;
    ticketPrice: number;
    qrCode?: string | {
      registrationId?: string;
      eventId?: string;
      userId?: string;
      raw?: string;
    };
    additionalProducts?: Array<{
      name: string;
      price: number;
      quantity: number;
      variationName?: string | null;
      variationType?: string | null;
      image?: string | null;
    }>;
    includedProducts?: Array<{
      name: string;
      price: number;
      quantity: number;
      variationName?: string | null;
      variationType?: string | null;
      isIncluded?: boolean;
      isRequired?: boolean;
      image?: string | null;
    }>;
  }>;
  participantsInfo?: Array<{
    id: string;
    name: string;
    email: string;
    cpf: string;
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
  date?: string;
}

function formatAnswer(answer: unknown): string {
  if (answer == null) return "—";
  if (Array.isArray(answer)) return answer.join(", ");
  if (typeof answer === "string") {
    try {
      const parsed: unknown = JSON.parse(answer);
      if (Array.isArray(parsed)) return parsed.join(", ");
    } catch { }
  }
  return String(answer) || "—";
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
  date: paymentDate,
}: PaymentSuccessStepProps) {
  const isAutomaticCoupon = couponType === "QUANTITY" || couponType === "AGE";
  const couponLabel = `${isAutomaticCoupon
    ? "Cupom automático"
    : couponName
      ? `Cupom ${couponName}`
      : "Cupom"
    }${couponPercent != null && couponPercent > 0 ? ` (-${couponPercent}%)` : ""}:`;
  const router = useRouter();

  const participants = participantsInfo.map(p => ({
    name: p.name,
    cpf: p.cpf,
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
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(date));
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const maskCPF = (cpf: string) => {
    if (!cpf) return "";
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

  const formatPhone = (phone: string) => {
    if (!phone) return "";
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length === 11) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
    }
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

  const getGenderLabel = (gender: string) => {
    const labels: Record<string, string> = {
      MALE: "Masculino",
      FEMALE: "Feminino",
      OTHER: "Outro",
      PREFER_NOT_TO_SAY: "Prefiro não informar",
      male: "Masculino",
      female: "Feminino",
      other: "Outro",
    };
    return labels[gender] || gender;
  };

  // Calculate totals
  const subtotal = participantsData.reduce((sum, p) => sum + p.ticketPrice, 0);
  const additionalProductsTotal = productsSubtotal ?? 0;
  const serviceFee = propServiceFee ?? event?.serviceFee ?? 0;
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
            <div className="flex flex-col gap-2 items-center">
              {/* Badge verde estrelar com check branco — substitui o
               * /images/approved_payment.png. SVG inline pra evitar criar
               * novo asset PNG e manter visual nitido em qualquer DPR. */}
              <svg
                className="mb-2"
                width={158}
                height={158}
                viewBox="0 0 96 96"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-label="Success Icon"
              >
                <path
                  d="M48 4l8.7 6.5 10.8-1.7 5.2 9.6 9.6 5.2-1.7 10.8L87 43.3v9.4l-6.4 8.9 1.7 10.8-9.6 5.2-5.2 9.6-10.8-1.7L48 92l-8.7-6.5-10.8 1.7-5.2-9.6-9.6-5.2 1.7-10.8L9 52.7v-9.4l6.4-8.9-1.7-10.8 9.6-5.2L28.5 8.8l10.8 1.7L48 4z"
                  fill="#308737"
                />
                <path
                  d="M34 49.5l9.5 9.5L63 39.5"
                  stroke="#FFFFFF"
                  strokeWidth={6}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
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

                    {/* Payment Method */}
                    <div className="border border-gray-6 flex items-center justify-between p-4 rounded-lg w-full">
                      <p className="font-semibold text-base leading-[1.1] text-gray-12 font-manrope">
                        Forma de pagamento:
                      </p>
                      <p className="font-bold text-base leading-[1.1] text-gray-12 font-manrope text-end">
                        {paymentMethod}
                      </p>
                    </div>

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

                    {/* Subtotal */}
                    <div className="border border-gray-6 flex items-center justify-between p-4 rounded-lg w-full">
                      <p className="font-semibold text-base leading-[1.1] text-gray-12 font-manrope">
                        Subtotal:
                      </p>
                      <p className="font-bold text-base leading-[1.1] text-gray-12 font-manrope">
                        {formatCurrency(subtotal)}
                      </p>
                    </div>

                    {/* Service Fee — oculto quando 0 */}
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

                    {/* Coupon Discount */}
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

                    {/* Voucher Discount */}
                    {voucherDiscount > 0 && (
                      <div className="border border-gray-6 flex items-center justify-between p-4 rounded-lg w-full">
                        <p className="font-semibold text-base leading-[1.1] text-gray-12 font-manrope">
                          Desconto voucher:
                        </p>
                        <p className="font-bold text-base leading-[1.1] text-gray-12 font-manrope">
                          – {formatCurrency(voucherDiscount)}
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
                  const qrCode = `$${process.env.NEXT_PUBLIC_ROOT_SITE_URL}/user/tickets/${orderNumber}`;
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
                                      {maskCPF(participant.cpf)}
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
                                    label: "CPF",
                                    value: formatCPF(participant.cpf || ""),
                                  },
                                  {
                                    label: "Data de nascimento",
                                    value: participant.birthDate
                                      ? formatDate(participant.birthDate)
                                      : "",
                                  },
                                  {
                                    label: "Telefone",
                                    value: formatPhone(participant.phone || ""),
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
                                      ? `${participant.emergencyContactName} - ${formatPhone(participant.emergencyPhone)}`
                                      : participant.emergencyContactName || formatPhone(participant.emergencyPhone || "") || "",
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
                            <div className="flex flex-col gap-5 items-start pb-6 pt-8 px-4 w-full">
                              <p className="font-bold text-xl leading-[1.1] text-gray-12 font-manrope">
                                Produtos do participante
                              </p>
                              {/* Produtos incluídos no ticket */}
                              {participantData.includedProducts && participantData.includedProducts.filter(p => !(p.isRequired === false && p.variationName && isSemInteresseVariation({ name: p.variationName }))).length > 0 && (
                                <div className="flex flex-col gap-3 items-start w-full">
                                  <p className="font-semibold text-sm text-gray-11 font-family-dm-sans">Incluídos no ingresso</p>
                                  {participantData.includedProducts.filter(p => !(p.isRequired === false && p.variationName && isSemInteresseVariation({ name: p.variationName }))).map((product, idx) => (
                                    <div
                                      key={`included-${idx}`}
                                      className="border border-gray-6 flex flex-col items-center justify-center p-4 rounded-xl w-full"
                                    >
                                      <div className="flex flex-1 gap-3 items-center w-full">
                                        <div className="border border-gray-6 relative rounded-lg shrink-0 size-[100px] overflow-hidden">
                                          <ImageWithInitialFallback
                                            src={product.image}
                                            alt={product.name}
                                            name={product.name}
                                            fallbackId={`inc-${idx}`}
                                            fill
                                            sizes="100px"
                                            className="size-full rounded-lg"
                                            letterClassName="text-2xl font-semibold"
                                          />
                                        </div>
                                        <div className="flex flex-1 flex-col gap-3 items-start justify-center min-w-0">
                                          <p className="font-semibold text-base leading-[1.3] text-gray-12 font-family-dm-sans line-clamp-2 w-full">
                                            {product.name}
                                          </p>
                                          <p className="font-semibold text-base leading-[1.1] text-gray-12 font-manrope">
                                            {product.price > 0 ? formatCurrency(product.price) : "Incluso"}
                                          </p>
                                          {product.variationName && (
                                            <div className="flex gap-1 items-center min-w-0 max-w-full">
                                              <p className="font-normal text-sm leading-[1.3] text-gray-12 font-family-dm-sans shrink-0">
                                                {product.variationType || "Variação"}:
                                              </p>
                                              <p className="font-semibold text-sm leading-[1.1] text-gray-12 font-manrope min-w-0 truncate">
                                                {product.variationName}
                                              </p>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                              {/* Produtos adicionais */}
                              {participantData.additionalProducts && participantData.additionalProducts.length > 0 && (
                                <div className="flex flex-col gap-3 items-start w-full">
                                  <p className="font-semibold text-sm text-gray-11 font-family-dm-sans">Adicionais</p>
                                  {participantData.additionalProducts.map((product, idx) => (
                                    <div
                                      key={`add-${idx}`}
                                      className="border border-gray-6 flex flex-col items-center justify-center p-4 rounded-xl w-full"
                                    >
                                      <div className="flex flex-1 gap-3 items-center w-full">
                                        <div className="relative rounded-lg shrink-0 size-[100px] overflow-hidden">
                                          <ImageWithInitialFallback
                                            src={product.image}
                                            alt={product.name}
                                            name={product.name}
                                            fallbackId={`add-${idx}`}
                                            fill
                                            sizes="100px"
                                            className="size-full rounded-lg"
                                            letterClassName="text-2xl font-semibold"
                                          />
                                        </div>
                                        <div className="flex flex-1 flex-col gap-3 items-start justify-center min-w-0">
                                          <p className="font-semibold text-base leading-[1.3] text-gray-12 font-family-dm-sans line-clamp-2 w-full">
                                            {product.name}
                                            {product.quantity > 1 && (
                                              <span className="text-gray-11 font-normal"> x{product.quantity}</span>
                                            )}
                                          </p>
                                          <p className="font-semibold text-base leading-[1.1] text-gray-12 font-manrope">
                                            {product.price > 0 ? formatCurrency(product.price * product.quantity) : "Incluso"}
                                          </p>
                                          {product.variationName && (
                                            <div className="flex gap-1 items-center min-w-0 max-w-full">
                                              <p className="font-normal text-sm leading-[1.3] text-gray-12 font-family-dm-sans shrink-0">
                                                {product.variationType || "Variação"}:
                                              </p>
                                              <p className="font-semibold text-sm leading-[1.1] text-gray-12 font-manrope min-w-0 truncate">
                                                {product.variationName}
                                              </p>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                              {(!participantData.includedProducts || participantData.includedProducts.filter(p => !(p.isRequired === false && p.variationName && isSemInteresseVariation({ name: p.variationName }))).length === 0) &&
                                (!participantData.additionalProducts || participantData.additionalProducts.length === 0) && (
                                  <p className="text-sm text-gray-11">
                                    Nenhum produto para este participante.
                                  </p>
                                )}
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
            <div className="flex flex-col gap-[8px] items-center">
              {/* Badge verde estrelar com check branco (desktop). */}
              <svg
                width={117}
                height={117}
                viewBox="0 0 96 96"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-label="Success Icon"
              >
                <path
                  d="M48 4l8.7 6.5 10.8-1.7 5.2 9.6 9.6 5.2-1.7 10.8L87 43.3v9.4l-6.4 8.9 1.7 10.8-9.6 5.2-5.2 9.6-10.8-1.7L48 92l-8.7-6.5-10.8 1.7-5.2-9.6-9.6-5.2 1.7-10.8L9 52.7v-9.4l6.4-8.9-1.7-10.8 9.6-5.2L28.5 8.8l10.8 1.7L48 4z"
                  fill="#308737"
                />
                <path
                  d="M34 49.5l9.5 9.5L63 39.5"
                  stroke="#FFFFFF"
                  strokeWidth={6}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
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

                    {/* Payment Method */}
                    <div className="border border-gray-6 flex items-center justify-between p-[16px] rounded-[8px] w-full">
                      <p className="font-semibold text-[16px] leading-[1.1] text-gray-12 font-manrope">
                        Forma de pagamento:
                      </p>
                      <p className="font-bold text-[16px] leading-[1.1] text-gray-12 font-manrope text-end">
                        {paymentMethod}
                      </p>
                    </div>

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

                    {/* Subtotal */}
                    <div className="border border-gray-6 flex items-center justify-between p-[16px] rounded-[8px] w-full">
                      <p className="font-semibold text-[16px] leading-[1.1] text-gray-12 font-manrope">
                        Subtotal:
                      </p>
                      <p className="font-bold text-[16px] leading-[1.1] text-gray-12 font-manrope">
                        {formatCurrency(subtotal)}
                      </p>
                    </div>

                    {/* Service Fee — oculto quando 0 */}
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

                    {/* Coupon Discount */}
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

                    {/* Voucher Discount */}
                    {voucherDiscount > 0 && (
                      <div className="border border-gray-6 flex items-center justify-between p-[16px] rounded-[8px] w-full">
                        <p className="font-semibold text-[16px] leading-[1.1] text-gray-12 font-manrope">
                          Desconto voucher:
                        </p>
                        <p className="font-bold text-[16px] leading-[1.1] text-gray-12 font-manrope">
                          – {formatCurrency(voucherDiscount)}
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
                  const qrCode = `$${process.env.NEXT_PUBLIC_ROOT_SITE_URL}/user/tickets/${orderNumber}`;
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
                                      {maskCPF(participant.cpf)}
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
                                    label: "CPF",
                                    value: formatCPF(participant.cpf || ""),
                                  },
                                  {
                                    label: "Data de nascimento",
                                    value: participant.birthDate
                                      ? formatDate(participant.birthDate)
                                      : "",
                                  },
                                  {
                                    label: "Telefone",
                                    value: formatPhone(participant.phone || ""),
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
                                      ? `${participant.emergencyContactName} - ${formatPhone(participant.emergencyPhone)}`
                                      : participant.emergencyContactName || formatPhone(participant.emergencyPhone || "") || "",
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
                            <div className="flex flex-col gap-5 items-start pb-[24px] pt-[32px] px-[16px] w-full">
                              <p className="font-bold text-[20px] leading-[1.1] text-gray-12 font-manrope">
                                Produtos do participante
                              </p>
                              {/* Produtos incluídos no ticket */}
                              {participantData.includedProducts && participantData.includedProducts.filter(p => !(p.isRequired === false && p.variationName && isSemInteresseVariation({ name: p.variationName }))).length > 0 && (
                                <div className="flex flex-col gap-3 items-start w-full">
                                  <p className="font-semibold text-sm text-gray-11 font-family-dm-sans">Incluídos no ingresso</p>
                                  {participantData.includedProducts.filter(p => !(p.isRequired === false && p.variationName && isSemInteresseVariation({ name: p.variationName }))).map((product, idx) => (
                                    <div
                                      key={`included-${idx}`}
                                      className="border border-gray-6 flex flex-col items-center justify-center p-4 rounded-xl w-full"
                                    >
                                      <div className="flex flex-1 gap-3 items-center w-full">
                                        <div className="relative rounded-lg shrink-0 size-[100px] overflow-hidden">
                                          <ImageWithInitialFallback
                                            src={product.image}
                                            alt={product.name}
                                            name={product.name}
                                            fallbackId={`inc-${idx}`}
                                            fill
                                            sizes="100px"
                                            className="size-full rounded-lg border-0"
                                            letterClassName="text-2xl font-semibold"
                                          />
                                        </div>
                                        <div className="flex flex-1 flex-col gap-6 items-start justify-center min-w-0">
                                          <p className="font-semibold text-base leading-[1.3] text-gray-12 font-family-dm-sans">
                                            {product.name}
                                          </p>
                                          <div className="flex items-center justify-between w-full">
                                            <p className="font-semibold text-base leading-[1.1] text-gray-12 font-manrope">
                                              {product.price > 0 ? formatCurrency(product.price) : "Incluso"}
                                            </p>
                                            {product.variationName && (
                                              <div className="flex gap-1 items-center justify-end min-w-[147px]">
                                                <p className="font-normal text-base text-gray-12 font-family-dm-sans">
                                                  {product.variationType || "Variação"}:
                                                </p>
                                                <p className="font-semibold text-base text-gray-12 font-manrope">
                                                  {product.variationName}
                                                </p>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                              {/* Produtos adicionais */}
                              {participantData.additionalProducts && participantData.additionalProducts.length > 0 && (
                                <div className="flex flex-col gap-3 items-start w-full">
                                  <p className="font-semibold text-sm text-gray-11 font-family-dm-sans">Adicionais</p>
                                  {participantData.additionalProducts.map((product, idx) => (
                                    <div
                                      key={`add-${idx}`}
                                      className="border border-gray-6 flex flex-col items-center justify-center p-4 rounded-xl w-full"
                                    >
                                      <div className="flex flex-1 gap-3 items-center w-full">
                                        <div className="relative shrink-0 size-[100px] overflow-hidden">
                                          <ImageWithInitialFallback
                                            src={product.image}
                                            alt={product.name}
                                            name={product.name}
                                            fallbackId={`add-${idx}`}
                                            fill
                                            sizes="100px"
                                            className="size-full rounded-lg"
                                            letterClassName="text-2xl font-semibold"
                                          />
                                        </div>
                                        <div className="flex flex-1 flex-col gap-6 items-start justify-center min-w-0">
                                          <p className="font-semibold text-base leading-[1.3] text-gray-12 font-family-dm-sans">
                                            {product.name}
                                            {product.quantity > 1 && (
                                              <span className="text-gray-11 font-normal"> x{product.quantity}</span>
                                            )}
                                          </p>
                                          <div className="flex items-center justify-between w-full">
                                            <p className="font-semibold text-base leading-[1.1] text-gray-12 font-manrope">
                                              {product.price > 0 ? formatCurrency(product.price * product.quantity) : "Incluso"}
                                            </p>
                                            {product.variationName && (
                                              <div className="flex gap-1 items-center justify-end min-w-[147px]">
                                                <p className="font-normal text-base leading-[1.3] text-gray-12 font-family-dm-sans">
                                                  {product.variationType || "Variação"}:
                                                </p>
                                                <p className="font-semibold text-base leading-[1.1] text-gray-12 font-manrope">
                                                  {product.variationName}
                                                </p>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                              {(!participantData.includedProducts || participantData.includedProducts.filter(p => !(p.isRequired === false && p.variationName && isSemInteresseVariation({ name: p.variationName }))).length === 0) &&
                                (!participantData.additionalProducts || participantData.additionalProducts.length === 0) && (
                                  <p className="text-sm text-gray-11">
                                    Nenhum produto para este participante.
                                  </p>
                                )}
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
