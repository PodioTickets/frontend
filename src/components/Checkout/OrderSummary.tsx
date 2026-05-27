import { useState, useEffect } from "react";
import { Button } from "../Button";
import Image from "next/image";
import { ArrowButton } from "../ArrowButton";
import { TicketIcon } from "../Icons/TicketIcon";
import { StarIcon } from "../Icons/StarIcon";
import type { Event } from "@/interfaces/event";
import { formatDocumentDisplay, isPersonBr } from "@/utils/documentDisplay";

interface OrderItem {
  name: string;
  price: number;
  image?: string;
  size?: string;
}

interface GroupedTicket {
  quantity: number;
  raceName: string;
  distance: string;
  price: number;
  total: number;
}

interface ParticipantData {
  participantIndex: number;
  ticketName: string;
  categoryName?: string;
  ticketPrice: number;
  additionalProducts?: Array<{
    name: string;
    price: number;
    quantity: number;
  }>;
  participant?: {
    name: string;
    cpf: string;
    email: string;
    birthDate: string;
    phone: string;
    gender?: string;
    /** Nacionalidade (PT-BR) — decide formatação do documento (CPF vs cru). */
    nationality?: string;
  };
  couponCode?: string;
  couponDiscount?: number;
  voucherCode?: string;
  voucherDiscount?: number;
}

export interface OrderSummaryCoupon {
  code?: string;
  discount?: number;
  name?: string;
  percent?: number;
  type?: "PERCENTAGE" | "FIXED";
  couponType?: "DISCOUNT" | "QUANTITY" | "AGE";
  fixedValue?: number;
  error?: string | null;
  isApplied?: boolean;
  isLoading?: boolean;
  onApply: () => void;
  onChange?: (code: string) => void;
}

export interface OrderSummaryVoucher {
  code?: string;
  discount?: number;
  name?: string;
}

interface OrderSummaryProps {
  items?: OrderItem[];
  groupedTickets?: GroupedTicket[];
  serviceFee: number;
  subtotalOverride?: number;
  total: number;
  coupon: OrderSummaryCoupon;
  voucher?: OrderSummaryVoucher;
  participantsData?: ParticipantData[];
  onParticipantClick?: (participantIndex: number) => void;
  event: Event;
}

export function OrderSummary({
  items = [],
  groupedTickets = [],
  serviceFee,
  subtotalOverride,
  total,
  coupon,
  voucher,
  participantsData = [],
  onParticipantClick,
  event,
}: OrderSummaryProps) {
  const {
    code: externalCouponCode = "",
    discount: couponDiscount = 0,
    name: couponName,
    percent: couponPercent,
    type: couponValueType,
    couponType,
    fixedValue: couponFixedValue,
    error: couponError = null,
    isApplied: isCouponApplied = false,
    isLoading: isCouponLoading = false,
    onApply: onApplyCoupon,
    onChange: onCouponChange,
  } = coupon;
  const voucherCode = voucher?.code;
  const voucherDiscount = voucher?.discount ?? 0;
  const voucherName = voucher?.name;
  const [couponCode, setCouponCode] = useState(externalCouponCode);
  const [expandedParticipants, setExpandedParticipants] = useState<
    Record<number, boolean>
  >({});

  useEffect(() => {
    if (externalCouponCode !== couponCode) {
      setCouponCode(externalCouponCode);
    }
  }, [externalCouponCode]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);
  };

  const formatDate = (date: string) => {
    if (!date) return "";
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(date));
  };

  const getGenderLabel = (gender?: string) => {
    if (!gender) return "";
    const labels: Record<string, string> = {
      male: "Masculino",
      female: "Feminino",
      other: "Outro",
    };
    return labels[gender] || gender;
  };

  const productsSubtotal = items.reduce(
    (sum, item) => sum + item.price / 100,
    0,
  );
  const ticketsSubtotal = groupedTickets.reduce(
    (sum, ticket) => sum + ticket.total,
    0,
  );
  const subtotal =
    subtotalOverride ?? ticketsSubtotal + productsSubtotal + serviceFee;

  const toggleParticipant = (index: number) => {
    setExpandedParticipants((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Seção de Valores */}
      <div className="bg-gray-2 rounded-lg shadow-[0px_2px_6px_0px_rgba(17,17,17,0.15)] p-6">
        <div className="flex flex-col gap-3 pb-6">
          <p className="font-manrope font-bold text-xl leading-[1.1] text-gray-12 mb-2">
            {event.name}
          </p>

          {/* Itens adicionais */}
          {items.length > 0 && (
            <div className="flex gap-8 items-center">
              <div className="flex flex-1 flex-col">
                <p className="font-manrope font-semibold text-base leading-[1.1] text-gray-12">
                  {items.length}x Itens adicionais:
                </p>
              </div>
              <div className="flex flex-col items-end">
                <p className="font-manrope font-semibold text-base leading-[1.1] text-gray-12">
                  {formatPrice(productsSubtotal)}
                </p>
              </div>
            </div>
          )}

          {/* Taxa de serviço — só renderiza quando > 0 */}
          {serviceFee > 0 && (
            <div className="flex items-center justify-between text-base text-gray-12">
              <p className="font-manrope font-semibold">Taxa de serviço:</p>
              <p className="font-manrope font-bold">
                {formatPrice(serviceFee)}
              </p>
            </div>
          )}

          {/* Subtotal só com mais de um ingresso diferente pra somar. */}
          {groupedTickets.length > 1 && (
            <div className="flex items-center justify-between text-base text-gray-12">
              <p className="font-manrope font-semibold">Subtotal:</p>
              <p className="font-manrope font-bold">{formatPrice(subtotal)}</p>
            </div>
          )}

          {/* Cupom aplicado */}
          {isCouponApplied && couponDiscount > 0 && (
            <div className="flex items-center justify-between text-base text-gray-12">
              <p className="font-manrope font-semibold">
                {(() => {
                  const coveredCount = participantsData.filter(
                    (p) => p.couponDiscount && p.couponDiscount > 0,
                  ).length;
                  return couponValueType === "FIXED" && coveredCount > 1
                    ? `${coveredCount}x `
                    : "";
                })()}
                {couponType === "QUANTITY" || couponType === "AGE"
                  ? "Cupom automático"
                  : couponName
                    ? `Cupom ${couponName}`
                    : "Cupom aplicado"}
                {couponPercent != null && couponPercent > 0
                  ? ` (${couponPercent}% OFF)`
                  : ""}
                :
              </p>
              <p className="font-manrope font-bold">
                -{formatPrice(couponDiscount)}
              </p>
            </div>
          )}

          {/* Voucher aplicado */}
          {voucherCode && voucherDiscount > 0 && (
            <div className="flex items-center justify-between text-base text-gray-12">
              <p className="font-manrope font-semibold">
                {voucherName ? `Voucher ${voucherName}` : "Voucher aplicado"}:
              </p>
              <p className="font-manrope font-bold">
                -{formatPrice(voucherDiscount)}
              </p>
            </div>
          )}
        </div>

        {/* Total */}
        <div className="border-t border-gray-6 flex font-manrope font-bold items-center justify-between py-6 text-xl text-gray-12">
          <p>Total:</p>
          <p>{formatPrice(total)}</p>
        </div>

        {/* Campo Cupom */}
        <div className="border-t border-gray-8 flex flex-col gap-5 items-end justify-center pt-6">
          <div className="flex flex-col items-start w-full">
            <div className="flex gap-3 items-center w-full">
              <div className="border-[1.5px] border-gray-8 flex flex-1 h-12 items-center px-3 rounded-lg">
                <input
                  type="text"
                  placeholder="Código de cupom (opcional)"
                  value={couponCode}
                  onChange={(e) => {
                    const value = e.target.value.toUpperCase().substring(0, 30);
                    setCouponCode(value);
                    onCouponChange?.(value);
                  }}
                  maxLength={30}
                  className="flex-1 text-base text-gray-11 font-family-dm-sans font-normal leading-[1.3] bg-transparent border-none outline-none"
                />
              </div>
              <Button
                onClick={onApplyCoupon}
                isLoading={isCouponLoading}
                disabled={isCouponLoading}
              >
                Aplicar
              </Button>
            </div>
            {couponError && (
              <p className="text-sm font-medium text-red-11 mt-2">
                {couponError}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Resumo da Compra */}
      <div className="bg-gray-2 rounded-lg shadow-[0px_2px_6px_0px_rgba(17,17,17,0.15)] overflow-hidden">
        <div className="flex flex-col items-start px-4 py-1">
          <div className="flex items-center justify-center py-4 w-full">
            <p className="font-family-dm-sans font-semibold text-xl leading-[1.3] text-gray-12">
              Resumo da sua compra
            </p>
          </div>

          {/* Lista de Participantes */}
          <div className="flex flex-col gap-4 items-start w-full pb-4">
            {participantsData.map((participantData, index) => {
              const additionalProductsTotal =
                participantData.additionalProducts?.reduce(
                  (sum, p) => sum + (p.price / 100) * p.quantity,
                  0,
                ) || 0;

              return (
                <div
                  key={index}
                  className={`border border-gray-6 flex flex-col items-start overflow-hidden rounded-xl w-full ${onParticipantClick ? "cursor-pointer hover:bg-gray-3 transition-colors" : ""}`}
                  onClick={() =>
                    onParticipantClick?.(participantData.participantIndex)
                  }
                >
                  {/* Conteúdo do Card */}
                  <div className="flex items-center px-4 py-6 w-full">
                    <div className="flex flex-1 flex-col gap-5 items-start">
                      <div className="flex items-center w-full">
                        <p className="font-family-dm-sans font-normal text-base leading-[1.3] text-gray-12">
                          Participante {participantData.participantIndex + 1}
                        </p>
                      </div>
                      <div className="flex flex-col gap-1">
                        <p className="font-family-dm-sans font-normal text-sm text-gray-11 max-w-[200px] truncate">
                          {participantData.categoryName || "Ingresso Avulso"}
                        </p>
                        <p className="font-manrope font-bold text-lg leading-[1.1] text-gray-12">
                          {participantData.ticketName}
                        </p>
                      </div>

                      <div className="flex items-end justify-between w-full text-gray-12">
                        <p className="font-family-dm-sans font-normal text-base leading-[1.3]">
                          Valor do ingresso:
                        </p>
                        <p className="font-manrope font-bold text-lg leading-[1.1]">
                          {formatPrice(participantData.ticketPrice)}
                        </p>
                      </div>
                      {participantData.additionalProducts &&
                        participantData.additionalProducts.length > 0 && (
                          <div className="flex items-end justify-between w-full text-gray-12">
                            <p className="font-family-dm-sans font-normal text-base leading-[1.3]">
                              Produtos adicionais (
                              {participantData.additionalProducts.length}):
                            </p>
                            <p className="font-manrope font-bold text-lg leading-[1.1]">
                              {formatPrice(additionalProductsTotal)}
                            </p>
                          </div>
                        )}
                    </div>
                  </div>

                  {/* Perfil + Badges */}
                  {(participantData.participant ||
                    participantData.couponCode ||
                    (isCouponApplied && participantData.couponDiscount) ||
                    participantData.voucherCode) && (
                    <div className="border-b border-gray-6 flex flex-col gap-3 items-start pb-5 px-4 w-full">
                      {participantData.participant && (
                        <div className="flex items-center justify-between w-full gap-2">
                          <div className="border border-gray-6 flex items-center p-3 rounded-xl flex-1 min-w-0">
                            <div className="flex gap-2 items-center min-w-0">
                              <div className="size-10 rounded-full bg-gray-5 flex items-center justify-center shrink-0 overflow-hidden">
                                {participantData.participant.name ? (
                                  <span className="text-sm font-bold text-gray-12">
                                    {participantData.participant.name
                                      .charAt(0)
                                      .toUpperCase()}
                                  </span>
                                ) : (
                                  <div className="size-10 rounded-full bg-gray-5" />
                                )}
                              </div>
                              <div className="flex flex-col gap-1 items-start justify-center min-w-0">
                                <p className="font-family-dm-sans font-semibold text-sm leading-[1.3] text-gray-12 truncate w-full">
                                  {participantData.participant.name ||
                                    `Participante ${participantData.participantIndex + 1}`}
                                </p>
                                <div className="flex gap-1 items-center min-w-0 overflow-hidden">
                                  {participantData.participant.birthDate && (
                                    <>
                                      <p className="font-family-dm-sans font-normal text-xs text-gray-11 shrink-0">
                                        {formatDate(
                                          participantData.participant.birthDate,
                                        )}
                                      </p>
                                      <div className="size-1 bg-gray-11 rounded-full shrink-0" />
                                    </>
                                  )}
                                  {participantData.participant.gender && (
                                    <>
                                      <p className="font-family-dm-sans font-normal text-xs text-gray-11 shrink-0">
                                        {getGenderLabel(
                                          participantData.participant.gender,
                                        )}
                                      </p>
                                      {participantData.participant.cpf && (
                                        <div className="size-1 bg-gray-11 rounded-full shrink-0" />
                                      )}
                                    </>
                                  )}
                                  {participantData.participant.cpf && (
                                    <p className="font-family-dm-sans font-normal text-xs text-gray-11 truncate">
                                      {formatDocumentDisplay(
                                        participantData.participant.cpf,
                                        isPersonBr({
                                          country: participantData.participant.nationality,
                                          document: participantData.participant.cpf,
                                        })
                                      )}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => toggleParticipant(index)}
                            className="flex items-center justify-center size-6 shrink-0"
                          >
                            <ArrowButton isOpen={false} />
                          </button>
                        </div>
                      )}

                      {/* Badge de Cupom */}
                      {(participantData.couponCode || isCouponApplied) &&
                        participantData.couponDiscount && (
                          <div className="bg-yellow-4 flex items-center justify-between p-3 rounded-lg w-full">
                            <div className="flex gap-1 items-center">
                              <TicketIcon className="size-4 text-yellow-12" />
                              <p className="font-family-dm-sans font-semibold text-sm leading-[1.3] text-yellow-12">
                                {couponType === "QUANTITY" ||
                                couponType === "AGE" ||
                                !participantData.couponCode
                                  ? "Cupom automático"
                                  : `Cupom: ${participantData.couponCode}`}
                              </p>
                              <p className="font-family-dm-sans font-semibold text-sm leading-[1.3] text-yellow-12">
                                {couponValueType === "PERCENTAGE" &&
                                  `(-${couponPercent}%)`}
                              </p>
                            </div>
                            <p className="font-family-dm-sans font-semibold text-sm leading-[1.3] text-yellow-12 whitespace-nowrap">
                              -{formatPrice(participantData.couponDiscount!)}
                            </p>
                          </div>
                        )}

                      {/* Badge de Voucher */}
                      {participantData.voucherCode &&
                        participantData.voucherDiscount && (
                          <div className="bg-yellow-4 flex items-center justify-between p-3 rounded-lg w-full">
                            <div className="flex gap-1 items-center">
                              <StarIcon className="size-4 text-yellow-12" />
                              <p className="font-family-dm-sans font-semibold text-sm leading-[1.3] text-yellow-12">
                                Voucher: {participantData.voucherCode}
                              </p>
                            </div>
                            <p className="font-family-dm-sans font-semibold text-sm leading-[1.3] text-yellow-12 whitespace-nowrap">
                              100% Cortesia
                            </p>
                          </div>
                        )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

