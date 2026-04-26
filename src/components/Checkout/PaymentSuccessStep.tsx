"use client";

import { useState } from "react";
import Image from "next/image";
import { ImageWithInitialFallback } from "@/components/ImageWithInitialFallback";
import { ChevronDown } from "lucide-react";
import { Button } from "../Button";
import { SuccessIcon } from "../Icons/SuccessIcon";
import { useRouter } from "next/navigation";
import type { Event } from "@/interfaces/event";
import { CalendarIcon } from "../Icons/CalendarIcon";
import { ClockIcon } from "../Icons/ClockIcon";
import { LocationIcon } from "../Icons/LocationIcon";
import { RegistrationQRCode } from "../QRCode/RegistrationQRCode";
import { isSemInteresseVariation } from "@/utils/semInteresseVariation";

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
    }>;
    includedProducts?: Array<{
      name: string;
      price: number;
      quantity: number;
      variationName?: string | null;
      variationType?: string | null;
      isIncluded?: boolean;
      isRequired?: boolean;
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
    questionAnswers?: Array<{ question: any; answer: any }>;
  }>;
  serviceFee?: number;
  couponDiscount?: number;
  voucherDiscount?: number;
  date?: string;
}

function formatAnswer(answer: any): string {
  if (answer == null) return "—";
  if (Array.isArray(answer)) return answer.join(", ");
  if (typeof answer === "string") {
    try {
      const parsed = JSON.parse(answer);
      if (Array.isArray(parsed)) return parsed.join(", ");
    } catch {}
  }
  return String(answer) || "—";
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
  voucherDiscount: propVoucherDiscount = 0,
  date: paymentDate,
}: PaymentSuccessStepProps) {
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

  const formatTime = (date: string) => {
    if (!date) return "";
    return new Intl.DateTimeFormat("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
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
  const additionalProductsTotal = participantsData.reduce(
    (sum, p) =>
      sum +
      (p.additionalProducts?.reduce(
        (productSum, product) => productSum + product.price * product.quantity,
        0
      ) || 0),
    0
  );
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
              <Image
                src="/images/approved_payment.png"
                alt="Success Icon"
                width={158}
                height={158}
                draggable={false}
                className="mb-2"
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
                    <div className="border border-gray-6 flex gap-8 items-center p-4 rounded-lg w-full">
                      <div className="flex-1 flex flex-col items-start">
                        <p className="font-semibold text-base leading-[1.1] text-gray-12 font-manrope">
                          Número do pedido:
                        </p>
                      </div>
                      <div className="flex flex-col items-end">
                        <p className="font-semibold text-base leading-[1.1] text-gray-12 font-manrope">
                          #{orderNumber}
                        </p>
                      </div>
                    </div>

                    {/* Event Name */}
                    <div className="border border-gray-6 flex items-center justify-between p-4 rounded-lg w-full">
                      <p className="font-semibold text-base leading-[1.1] text-gray-12 font-manrope">
                        Nome do evento:
                      </p>
                      <p className="font-bold text-base leading-[1.1] text-gray-12 font-manrope text-right flex-1 ml-2">
                        {event.name}
                      </p>
                    </div>

                    {/* Date */}
                    <div className="border border-gray-6 flex items-center justify-between p-4 rounded-lg w-full">
                      <p className="font-semibold text-base leading-[1.1] text-gray-12 font-manrope">
                        Data do pagamento:
                      </p>
                      <p className="font-bold text-base leading-[1.1] text-gray-12 font-manrope">
                        {paymentDate || formatDate(event.eventDate)}
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

                    {/* Service Fee */}
                    <div className="border border-gray-6 flex items-center justify-between p-4 rounded-lg w-full">
                      <p className="font-semibold text-base leading-[1.1] text-gray-12 font-manrope">
                        Taxa de serviço:
                      </p>
                      <p className="font-bold text-base leading-[1.1] text-gray-12 font-manrope">
                        {formatCurrency(serviceFee)}
                      </p>
                    </div>

                    {/* Coupon Discount */}
                    {couponDiscount > 0 && (
                      <div className="border border-gray-6 flex items-center justify-between p-4 rounded-lg w-full">
                        <p className="font-semibold text-base leading-[1.1] text-gray-12 font-manrope">
                          Desconto cupom:
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

              {/* Participant Cards */}
              <div className="flex flex-col gap-5 items-start w-full">
                {displayParticipants.map((participantData, index) => {
                  const participant = participants[participantData.participantIndex] || {};
                  console.log(participant);
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
                              {participantData.qrCode ? (
                                <RegistrationQRCode
                                  qrCodeData={participantData.qrCode}
                                  size={120}
                                  className="w-full h-full"
                                />
                              ) : (
                                <div className="w-full h-full bg-gray-2 border-2 border-gray-6 rounded-lg flex items-center justify-center">
                                  <span className="text-xs text-gray-11">
                                    QR Code
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="flex-1 flex flex-col gap-4 items-start px-0 py-3 text-gray-12 text-start">
                              <p className="font-normal text-base leading-[1.3] font-family-dm-sans">
                                Participante{" "}
                                {participantData.participantIndex + 1}
                              </p>
                              <p className="font-bold text-lg leading-[1.1] font-manrope">
                                {participantData.ticketName}
                              </p>
                              {participantData.categoryName && (
                                <p className="font-normal text-sm leading-[1.3] text-gray-11 font-family-dm-sans">
                                  {participantData.categoryName}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-4 items-start w-full">
                            <div className="flex gap-2 items-center">
                              <CalendarIcon className="size-6 text-gray-12" />
                              <span className="font-medium text-base leading-[1.3] text-gray-12 font-family-dm-sans">
                                {formatDate(event.eventDate)}
                              </span>
                            </div>
                            <div className="flex gap-2 items-center">
                              <ClockIcon className="size-6 text-gray-12" />
                              <span className="font-medium text-base leading-[1.3] text-gray-12 font-family-dm-sans">
                                {formatTime(event.eventDate)}
                              </span>
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
                                    {participant.questionAnswers.map((q: any, idx: number) => (
                                      <div key={idx} className="flex flex-col items-start rounded-lg w-full">
                                        <label className="font-normal text-sm text-gray-12 font-family-dm-sans">
                                          {q.question?.question || q.question || `Pergunta ${idx + 1}`}
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
                                            src={(product as any).image}
                                            alt={product.name}
                                            name={product.name}
                                            fallbackId={`inc-${idx}`}
                                            fill
                                            sizes="100px"
                                            className="size-full rounded-lg"
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
                              {/* Produtos adicionais */}
                              {participantData.additionalProducts && participantData.additionalProducts.length > 0 && (
                                <div className="flex flex-col gap-3 items-start w-full">
                                  <p className="font-semibold text-sm text-gray-11 font-family-dm-sans">Adicionais</p>
                                  {participantData.additionalProducts.map((product, idx) => (
                                    <div
                                      key={`add-${idx}`}
                                      className="border border-gray-6 flex items-center justify-between p-4 rounded-xl w-full"
                                    >
                                      <p className="font-semibold text-base leading-[1.3] text-gray-12 font-family-dm-sans">
                                        {product.name}
                                        {product.quantity > 1 && (
                                          <span className="text-gray-11 font-normal"> x{product.quantity}</span>
                                        )}
                                      </p>
                                      <p className="font-semibold text-base leading-[1.1] text-gray-12 font-manrope">
                                        {formatCurrency(product.price * product.quantity)}
                                      </p>
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
              <Image
                src="/images/approved_payment.png"
                alt="Success Icon"
                width={117}
                height={88}
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
                      <p className="font-bold text-[16px] leading-[1.1] text-gray-12 font-manrope">
                        {event.name}
                      </p>
                    </div>

                    {/* Date */}
                    <div className="border border-gray-6 flex items-center justify-between p-[16px] rounded-[8px] w-full">
                      <p className="font-semibold text-[16px] leading-[1.1] text-gray-12 font-manrope">
                        Data do pagamento:
                      </p>
                      <p className="font-bold text-[16px] leading-[1.1] text-gray-12 font-manrope">
                        {paymentDate || formatDate(event.eventDate)}
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

                    {/* Service Fee */}
                    <div className="border border-gray-6 flex items-center justify-between p-[16px] rounded-[8px] w-full">
                      <p className="font-semibold text-[16px] leading-[1.1] text-gray-12 font-manrope">
                        Taxa de serviço:
                      </p>
                      <p className="font-bold text-[16px] leading-[1.1] text-gray-12 font-manrope">
                        {formatCurrency(serviceFee)}
                      </p>
                    </div>

                    {/* Coupon Discount */}
                    {couponDiscount > 0 && (
                      <div className="border border-gray-6 flex items-center justify-between p-[16px] rounded-[8px] w-full">
                        <p className="font-semibold text-[16px] leading-[1.1] text-gray-12 font-manrope">
                          Desconto cupom:
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

              {/* Participant Cards */}
              <div className="flex flex-col gap-[20px] items-center w-full">
                {displayParticipants.map((participantData, index) => {
                  const participant = participants[participantData.participantIndex] || {};
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
                              {participantData.categoryName && (
                                <p className="font-normal text-base truncate max-w-[400px] leading-[1.3] text-gray-11 font-family-dm-sans">
                                  {participantData.categoryName}
                                </p>
                              )}
                              <h3 className="font-bold text-[24px] truncate max-w-[400px] leading-[1.1] text-gray-12 font-manrope">
                                {participantData.ticketName}
                              </h3>
                            </div>

                            <div className="flex gap-[32px] items-start">
                              <div className="flex gap-[8px] items-center">
                                <CalendarIcon className="size-6 text-gray-12" />
                                <span className="font-medium text-[18px] leading-[1.3] text-gray-12 font-family-dm-sans">
                                  {formatDate(event.eventDate)}
                                </span>
                              </div>
                              <div className="flex gap-[8px] items-center">
                                <ClockIcon className="size-6 text-gray-12" />
                                <span className="font-medium text-[18px] leading-[1.3] text-gray-12 font-family-dm-sans">
                                  {formatTime(event.eventDate)}
                                </span>
                              </div>
                            </div>
                          </div>
                          {/* QR Code */}
                          <div className="flex flex-row items-center">
                            <div className="aspect-square h-full relative">
                              {participantData.qrCode ? (
                                <RegistrationQRCode
                                  qrCodeData={participantData.qrCode}
                                  size={128}
                                  className="w-full h-full"
                                />
                              ) : (
                                <div className="w-[128px] h-[128px] bg-gray-2 border-2 border-gray-6 rounded-lg flex items-center justify-center">
                                  <span className="text-xs text-gray-11">
                                    QR Code
                                  </span>
                                </div>
                              )}
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
                                    {participant.questionAnswers.map((q: any, idx: number) => (
                                      <div key={idx} className="flex flex-col gap-2 items-start rounded-[8px] min-w-[313px]">
                                        <label className="font-normal text-[16px] leading-[1.3] text-gray-12 font-family-dm-sans">
                                          {q.question?.question || q.question || `Pergunta ${idx + 1}`}
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
                                        <div className="border border-gray-6 relative rounded-lg shrink-0 size-[100px] overflow-hidden">
                                          <ImageWithInitialFallback
                                            src={(product as any).image}
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
                                      className="border border-gray-6 flex items-center justify-between p-4 rounded-xl w-full"
                                    >
                                      <p className="font-semibold text-base leading-[1.3] text-gray-12 font-family-dm-sans">
                                        {product.name}
                                        {product.quantity > 1 && (
                                          <span className="text-gray-11 font-normal"> x{product.quantity}</span>
                                        )}
                                      </p>
                                      <p className="font-semibold text-base leading-[1.1] text-gray-12 font-manrope">
                                        {formatCurrency(product.price * product.quantity)}
                                      </p>
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
