"use client";

import { useState } from "react";
import Image from "next/image";
import { FileText } from "lucide-react";
import { TicketIcon } from "@/components/Icons/TicketIcon";
import { Tooltip } from "@/components/Tooltip";
import { getAvatarUrl } from "@/utils/avatar";
import { formatDateBRTShort, formatTimeBRT } from "@/utils/datetimeBR";
import {
  getFinalStatus,
  type RegistrationListRow,
  type RegistrationStatusBadge,
} from "@/lib/registrations";
import { formatShortId } from "@/utils/shortId";

/**
 * Linha da tabela de inscrições (compartilhada admin/organizer). Antes
 * duplicada byte a byte. `getStatusBadge` é injetado pelo chamador para manter
 * a configuração de badge fora do componente de apresentação.
 */
export function RegistrationRow({
  registration,
  onViewRegistration,
  onViewPaymentDetails,
  getStatusBadge,
}: {
  registration: RegistrationListRow;
  onViewRegistration: () => void;
  onViewPaymentDetails: () => void;
  getStatusBadge: (status: string) => RegistrationStatusBadge;
}) {
  const [imageError, setImageError] = useState(false);

  // Calcular o status final usando a função auxiliar
  const finalStatus = getFinalStatus(registration);
  const paymentStatus = registration.order?.payment?.status;
  const paymentMetadata = registration.order?.payment?.metadata;
  const refundType = registration.order?.payment?.refundType;

  const statusBadge = getStatusBadge(finalStatus);
  const isCancelled = finalStatus === "CANCELLED" || paymentStatus === "FAILED";
  const isRefunded = finalStatus === "REFUNDED" || paymentStatus === "REFUNDED" || (paymentMetadata && refundType === "REFUND");
  const isChargeback = finalStatus === "CHARGEBACK" || paymentStatus === "CHARGEBACK" || (paymentMetadata && refundType === "CHARGEBACK");
  // "Pago" só quando NÃO há estado terminal de cancelamento/estorno/chargeback.
  // Sem este guard, um pedido CANCELLED cujo pagamento permanece PAID (ex.: free
  // order cancelado — o pagamento de R$0 não vira REFUNDED) aparecia como "Pago",
  // pois `paymentStatus === "PAID"` sobrepunha o status cancelado da inscrição.
  const isPaid =
    !isCancelled &&
    !isRefunded &&
    !isChargeback &&
    (finalStatus === "CONFIRMED" ||
      finalStatus === "COMPLETED" ||
      paymentStatus === "PAID");

  // Avatar com fallback para primeira letra
  const fullName = `${registration.user?.firstName || ""} ${registration.user?.lastName || ""}`.trim();
  const firstLetter = fullName ? fullName.charAt(0).toUpperCase() : "U";
  const hasAvatar = !!registration.user?.avatarUrl && !imageError;

  return (
    <div
      className="bg-gray-1 border-b border-gray-6 flex h-[52px] items-center justify-between w-full last:border-b-0 hover:bg-gray-2 transition-colors"
    >
      {/* ID do pedido */}
      <div className="flex h-full items-center p-4 w-[136px]">
        <Tooltip
          contentClassName="w-auto px-3 py-2 gap-0"
          position="topRight"
          content={
            <p className="font-inter font-normal text-sm text-gray-11 leading-[1.3] whitespace-nowrap">
              {registration.id}
            </p>
          }
        >
          <p className="font-inter font-semibold leading-[1.3] text-sm text-gray-12 cursor-default">
            {formatShortId(registration.id)}
          </p>
        </Tooltip>
      </div>

      {/* Cliente */}
      <div className="flex flex-1 h-full items-center gap-3 min-h-px min-w-px p-4">
        <div className="relative shrink-0 size-8 rounded-full overflow-hidden">
          {hasAvatar ? (
            <Image
              src={getAvatarUrl(registration.user?.avatarUrl ?? "") as string}
              alt={fullName || "User"}
              width={32}
              height={32}
              className="rounded-full object-cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="size-8 rounded-full bg-primary-10/20 flex items-center justify-center">
              <span className="text-primary-11 font-semibold text-sm">
                {firstLetter}
              </span>
            </div>
          )}
        </div>
        <div className="flex flex-col min-w-0">
          <p className="font-inter font-semibold leading-[1.3] text-sm text-gray-12 truncate">
            {registration.user?.firstName}{" "}
            {registration.user?.lastName && `${registration.user?.lastName} `}
          </p>
          <p className="font-family-dm-sans font-medium leading-[1.3] text-xs text-gray-11 truncate">
            {registration.user?.email}
          </p>
        </div>
      </div>

      {/* Ticket */}
      <div className="flex flex-1 h-full items-center min-w-0 p-4">
        <div className="flex flex-col min-w-0 w-full">
          <span className="text-gray-11 text-xs truncate font-inter font-normal leading-[1.3]">
            {registration.ticket?.category?.name || "Ingresso avulso"}
          </span>
          <span className="truncate font-family-dm-sans text-sm font-semibold leading-[1.3] text-gray-12">
            {registration.ticket?.name ?? ""}
          </span>
        </div>
      </div>

      {/* Data compra (instante real → BRT): data + horário embaixo */}
      <div className="flex flex-col h-full justify-center p-4 w-[140px]">
        <span className="font-family-dm-sans font-medium leading-[1.3] text-sm text-gray-12 text-center">
          {registration.createdAt ? formatDateBRTShort(registration.createdAt) : "—"}
        </span>
        {registration.createdAt && (
          <span className="font-family-dm-sans font-normal leading-[1.3] text-xs text-gray-11 text-center">
            {formatTimeBRT(registration.createdAt, { hour: "2-digit", minute: "2-digit" })}
          </span>
        )}
      </div>

      {/* Status */}
      <div className="flex h-full items-center justify-center text-center p-4 w-[120px]">
        <span
          className={`inline-flex items-center justify-center gap-1 px-3 py-1 rounded text-xs font-medium ${isPaid
            ? "bg-primary-11 text-white"
            : isCancelled
              ? "bg-red-11 text-white"
              : isChargeback
                ? "bg-red-11 text-white"
                : isRefunded
                  ? "bg-red-11 text-white"
                  : statusBadge?.className || "bg-gray-10/20 text-gray-11"
            }`}
        >
          {isPaid
            ? "Pago"
            : isCancelled
              ? "Cancelado"
              : isChargeback
                ? "ChargeBack"
                : isRefunded
                  ? "Estornado"
                  : statusBadge?.label || "Desconhecido"}
        </span>
      </div>

      {/* Ações */}
      <div className="flex gap-1 h-full items-center justify-center px-4 py-2 w-[112px]">
        {!isCancelled && (
          <>
            <button
              onClick={onViewPaymentDetails}
              name="view-payment-details"
              aria-label="Ver pedido"
              title="Ver pedido"
              className="bg-gray-2 border border-gray-6 rounded-lg size-8 flex items-center justify-center hover:bg-gray-3 transition-colors cursor-pointer"
            >
              <FileText className="size-4 text-gray-11" />
            </button>
            <button
              onClick={onViewRegistration}
              name="view-registration"
              aria-label="Ver ingresso"
              title="Ver ingresso"
              className="bg-gray-2 border border-gray-6 rounded-lg size-8 flex items-center justify-center hover:bg-gray-3 transition-colors cursor-pointer"
            >
              <TicketIcon className="size-4 text-gray-11" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
