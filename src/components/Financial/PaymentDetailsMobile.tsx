"use client";

import { ReactNode } from "react";
import Image from "next/image";
import { getAvatarUrl } from "@/utils/avatar";
import { Copy, CheckCircle, ChevronLeft, FileText, Star, X } from "lucide-react";
import { Pagination } from "../Pagination";
import { PixIcon } from "@/components/Icons/PixIcon";
import { CardIcon } from "@/components/Icons/CardIcon";
import { TicketIcon } from "@/components/Icons/TicketIcon";
import { PaymentIcon } from "react-svg-credit-card-payment-icons";
import { ArrowButton } from "../ArrowButton";
import { XCircleIcon } from "lucide-react";
import { formatShortId } from "@/utils/shortId";

/**
 * Body mobile do comprovante de pagamento (`PaymentItemDetailsDrawer`).
 *
 * Fiel ao Figma 2770:51521 — header back+nome do evento, breadcrumb,
 * "Detalhes do pedido", lista vertical de campos do comprador, cards de
 * pagamento (método + status) e transação (valor, gateway, IDs com copy),
 * lista de ingressos vinculados com paginação mobile.
 *
 * Não compartilha com `FinancialDetailsMobile` (Estornos / Chargebacks) porque
 * a estrutura difere — aqui tem mais informações estruturadas em seções
 * (comprador / pagamento / transação / ingressos) e cards de info-pair.
 */

export interface MobileParticipantItem {
  id: string;
  name: string;
  email: string;
  ticketName: string;
  categoryName: string;
  avatarUrl?: string | null;
  amount?: number;
}

interface PaymentDetailsMobileProps {
  /* Header */
  eventName: string;
  onClose: () => void;

  /* Order header */
  orderId: string;

  /* Buyer info — array de pares pra a lista vertical */
  buyerFields: Array<{ label: string; value: string }>;

  /* Payment method */
  paymentMethod: string;
  cardBrand?: string;
  last4Digits?: string;
  paymentStatus: string;
  paymentStatusLabel: string;

  /* Transaction info */
  totalAmount: number;
  purchaseDate: string;
  gateway: string;
  authorizationCode?: string;
  transactionId: string;
  installmentsLabel?: string;
  nsu?: string;
  transactionIp?: string;
  couponCode?: string;

  /* Tickets vinculados */
  participants: MobileParticipantItem[];
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;

  /* Copy state (managed pelo caller pra unificar entre mobile/desktop) */
  copied: boolean;
  onCopy: (text: string) => void;

  /* Botão CTA opcional pra "Ver detalhes" do ingresso */
  onViewParticipant?: (participant: MobileParticipantItem) => void;
}

const formatBRL = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/** Tag de status do pagamento — cores mapeadas pelo `status` autoritativo. */
function StatusTag({
  status,
  label,
}: {
  status: string;
  label: string;
}) {
  const className =
    status === "PAID"
      ? "bg-green-11 text-green-1"
      : status === "PENDING"
        ? "bg-yellow-11 text-white"
        : "bg-red-11 text-gray-1";
  const Icon = status === "PAID" ? CheckCircle : XCircleIcon;
  return (
    <div
      className={`${className} inline-flex gap-1 items-center justify-center px-4 py-2 rounded font-family-dm-sans text-base leading-[1.3]`}
    >
      <Icon className="size-5" />
      <span>{label}</span>
    </div>
  );
}

/** Par label/value usado nas listas verticais (comprador + transação). */
function InfoPair({
  label,
  value,
  valueNode,
}: {
  label: ReactNode;
  value?: string;
  valueNode?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 py-4 w-full">
      <p className="font-family-dm-sans text-base leading-[1.3] text-gray-12">
        {label}
      </p>
      {valueNode ?? (
        <p className="font-family-dm-sans font-medium text-base leading-[1.3] text-gray-12 break-all">
          {value || "—"}
        </p>
      )}
    </div>
  );
}

export function PaymentDetailsMobile({
  eventName,
  onClose,
  orderId,
  buyerFields,
  paymentMethod,
  cardBrand,
  last4Digits,
  paymentStatus,
  paymentStatusLabel,
  totalAmount,
  purchaseDate,
  gateway,
  authorizationCode,
  transactionId,
  installmentsLabel,
  nsu,
  transactionIp,
  couponCode,
  participants,
  currentPage,
  totalPages,
  onPageChange,
  copied,
  onCopy,
  onViewParticipant,
}: PaymentDetailsMobileProps) {
  const cardPaymentLabel =
    paymentMethod === "PIX"
      ? "Pix"
      : cardBrand && last4Digits
        ? `${cardBrand} **** ${last4Digits}`
        : paymentMethod;
  const cardSubLabel = paymentMethod === "PIX" ? "Pagamento instantâneo" : paymentMethod;

  const paginatedParticipants = participants;

  /* Transaction fields — lista única pra renderização uniforme. */
  const transactionFields: Array<{ label: string; value?: string; valueNode?: ReactNode }> = [
    { label: "Valor total", value: `R$ ${formatBRL(totalAmount)}` },
    { label: "Data da compra", value: purchaseDate },
    { label: "Gateway", value: gateway },
    {
      label: "ID da transação",
      valueNode: (
        <div className="flex gap-1 items-center">
          <p className="font-family-dm-sans font-medium text-base leading-[1.3] text-gray-12 truncate max-w-[200px]">
            {transactionId}
          </p>
          <button
            onClick={() => onCopy(transactionId)}
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
      ),
    },
  ];

  if (couponCode) {
    transactionFields.push({
      label: "Voucher utilizado",
      valueNode: (
        <div className="flex gap-1 items-center">
          <Star className="size-4 text-yellow-12 fill-yellow-12" />
          <p className="font-family-dm-sans font-semibold text-sm leading-[1.3] text-yellow-12">
            {couponCode}
          </p>
        </div>
      ),
    });
  }

  if (installmentsLabel) {
    transactionFields.push({ label: "Parcelamento", value: installmentsLabel });
  }
  if (authorizationCode) {
    transactionFields.push({ label: "Código de autorização", value: authorizationCode });
  }
  if (nsu) {
    transactionFields.push({ label: "NSU", value: nsu });
  }
  if (transactionIp) {
    transactionFields.push({ label: "IP", value: transactionIp });
  }

  return (
    <div className="md:hidden flex flex-col h-full bg-gray-2">
      {/* Header: back + nome do evento + close */}
      <div className="border-b border-gray-6 flex h-[52px] items-center gap-1 px-4 shrink-0 w-full">
        <button
          onClick={onClose}
          className="flex items-center justify-center rounded-lg shrink-0 size-8 transition-colors rotate-90 cursor-pointer hover:bg-gray-3"
          aria-label="Voltar"
        >
          <ArrowButton isOpen={true} />
        </button>
        <p className="font-manrope font-extrabold text-base leading-[1.1] text-gray-12 truncate flex-1">
          {eventName}
        </p>
        <button
          onClick={onClose}
          className="flex items-center justify-center rounded-lg size-8 transition-colors cursor-pointer hover:bg-gray-3 shrink-0"
          aria-label="Fechar"
        >
          <X className="size-5 text-gray-12" />
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">
        {/* Breadcrumb */}
        <div className="px-4 pt-6 pb-6 flex flex-wrap gap-y-2 gap-x-1 items-center justify-center font-family-dm-sans text-sm leading-[1.3]">
          <span className="text-gray-11">Eventos</span>
          <ChevronLeft className="size-4 text-gray-11 rotate-180 shrink-0" />
          <span className="text-gray-11">Financeiro</span>
          <ChevronLeft className="size-4 text-gray-11 rotate-180 shrink-0" />
          <span className="text-gray-11">Histórico de repasses</span>
          <ChevronLeft className="size-4 text-gray-11 rotate-180 shrink-0" />
          <span className="text-gray-12">Detalhes do pedido</span>
        </div>

        {/* Topo: título + ID + lista de campos do comprador */}
        <div className="px-4 pb-5 flex flex-col gap-5">
          <h2 className="font-manrope font-bold text-xl leading-[1.1] text-gray-12">
            Detalhes do pedido
          </h2>

          <div className="flex gap-1 items-center font-family-dm-sans text-base leading-[1.3] flex-wrap">
            <span className="text-gray-11">ID do pedido:</span>
            <span className="text-gray-12 break-all">{formatShortId(orderId)}</span>
          </div>

          {/* Lista vertical de campos do comprador */}
          <div className="flex flex-col w-full">
            {buyerFields.map((f, i) => (
              <InfoPair key={i} label={f.label} value={f.value} />
            ))}
          </div>
        </div>

        {/* Cards de pagamento (método + transação) */}
        <div className="px-4 py-5 flex flex-col gap-3">
          {/* Payment Method Container */}
          <div className="bg-gray-2 border border-gray-6 rounded-lg p-4 flex flex-col gap-4">
            <div className="flex gap-3 items-center w-full">
              <div className="size-10 flex items-center justify-center shrink-0">
                {paymentMethod === "PIX" ? (
                  <PixIcon className="size-10 text-gray-12" />
                ) : cardBrand ? (
                  <PaymentIcon type={cardBrand as any} format="flatRounded" className="size-10" />
                ) : (
                  <CardIcon className="size-10 text-gray-12" />
                )}
              </div>
              <div className="flex flex-col gap-3 min-w-0 flex-1">
                <p className="font-family-dm-sans font-semibold text-lg leading-[1.3] text-gray-12 truncate">
                  {cardPaymentLabel}
                </p>
                <p className="font-family-dm-sans text-base leading-[1.3] text-gray-12">
                  {cardSubLabel}
                </p>
              </div>
            </div>
            <div className="self-start">
              <StatusTag status={paymentStatus} label={paymentStatusLabel} />
            </div>
          </div>

          {/* Transaction Info card */}
          <div className="bg-gray-2 border border-gray-6 rounded-lg px-4 py-3 flex flex-col">
            {transactionFields.map((f, i) => (
              <div
                key={i}
                className={i < transactionFields.length - 1 ? "border-b border-gray-6/50" : ""}
              >
                <InfoPair label={f.label} value={f.value} valueNode={f.valueNode} />
              </div>
            ))}
          </div>
        </div>

        {/* Ingressos vinculados — Figma do zero.
         * Estrutura:
         *   - Wrapper externo: px-4 py-5, gap 20 entre titulo e card.
         *   - Titulo: 18px Manrope 700, line 19.8.
         *   - Outer card: bg #F9F9F9 (gray-2), border 1.5px #D9D9D9 (gray-6),
         *     radius 8, overflow-hidden (pra cantos arredondarem os items).
         *   - Items: bg #FCFCFC (gray-1), px 12, py 16, gap 24 interno.
         *     Items adjacentes separados por border-b (em vez de border full
         *     em cada — evita linha dupla no encontro).
         *   - Header item: avatar 36px round + nome (16/500 DM Sans) + email
         *     (14/400 DM Sans). Gap 8 horizontal, 8 vertical.
         *   - Bloco categoria: label 12/400 #646464 + valor 14/600 Manrope.
         *     Gap 8.
         *   - Divider 1px #D9D9D9 full-width.
         *   - Botao "Ver ingresso": h 44, border 1px #D9D9D9, radius 8,
         *     icone Ticket 20px + texto 16/700 Manrope. Gap 8.
         *   - Paginacao DENTRO do outer card, px-4 py-5. Botoes pagina
         *     32x32, gap 4 entre paginas. Ativo bg primary-11 #308737 +
         *     texto branco. Inativo bg gray-4 #E8E8E8 + texto gray-12. */}
        {participants.length > 0 && (
          <div className="px-4 py-5 flex flex-col gap-5">
            <h3 className="font-manrope font-bold text-[18px] leading-[19.8px] text-gray-12">
              Ingressos vinculados a este pedido
            </h3>

            <div className="bg-gray-2 border-[1.5px] border-gray-6 rounded-lg overflow-hidden flex flex-col">
              {/* Lista de items — border-b entre items (exceto ultimo da pagina) */}
              <div className="flex flex-col">
                {paginatedParticipants.map((p, idx) => (
                  <article
                    key={p.id}
                    className={`bg-gray-1 px-3 py-4 flex flex-col gap-6 ${
                      idx < paginatedParticipants.length - 1
                        ? "border-b border-gray-6"
                        : ""
                    }`}
                  >
                    <div className="flex flex-col gap-5 w-full">
                      {/* Header: avatar + nome/email — email com gap menor pra
                       * ficar mais perto do nome (Figma). Avatar usa Image
                       * real quando avatarUrl existir; fallback pra inicial. */}
                      <div className="flex items-center gap-2 w-full">
                        {p.avatarUrl ? (
                          <Image
                            src={getAvatarUrl(p.avatarUrl) as string}
                            alt={p.name}
                            width={36}
                            height={36}
                            className="size-9 rounded-full object-cover shrink-0"
                          />
                        ) : (
                          <div className="size-9 rounded-full bg-gray-6 flex items-center justify-center shrink-0 overflow-hidden">
                            <span className="text-gray-12 font-semibold text-sm font-family-dm-sans">
                              {p.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                          <p className="font-family-dm-sans font-medium text-[16px] leading-[20.8px] text-gray-12 truncate">
                            {p.name}
                          </p>
                          <p className="font-family-dm-sans text-[14px] leading-[18.2px] text-gray-11 truncate">
                            {p.email}
                          </p>
                        </div>
                      </div>

                      {/* Bloco categoria + ingresso:
                       * - Linha 1: nome da categoria (fallback "Ingresso avulso")
                       *   12px DM Sans 400 line 15.6 gray-11.
                       * - Linha 2: nome do ingresso (ticketName)
                       *   14px Manrope 600 line 15.4 gray-12.
                       * - Gap label/valor: 2px (categoria perto do ticket). */}
                      <div className="flex flex-col gap-0.5 w-full">
                        <p className="font-family-dm-sans text-[12px] leading-[15.6px] text-gray-11">
                          {p.categoryName || "Ingresso avulso"}
                        </p>
                        <p className="font-manrope font-semibold text-[14px] leading-[18px] text-gray-12 truncate pb-px">
                          {p.ticketName || "—"}
                        </p>
                      </div>
                    </div>

                    {/* Divider */}
                    <div className="h-px bg-gray-6 w-full" />

                    {/* Botao Ver ingresso */}
                    <button
                      onClick={() => onViewParticipant?.(p)}
                      className="border border-gray-6 rounded-lg h-11 flex items-center justify-center gap-2 w-full hover:bg-gray-3 transition-colors cursor-pointer"
                    >
                      <TicketIcon className="size-5 text-gray-12" />
                      <span className="font-manrope font-bold text-[16px] leading-[17.6px] text-gray-12">
                        Ver ingresso
                      </span>
                    </button>
                  </article>
                ))}
              </div>

              {/* Paginacao — DENTRO do outer card, separada da lista */}
              {totalPages > 1 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={onPageChange}
                  className="bg-gray-2 border-t border-gray-6 px-4 py-5"
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
