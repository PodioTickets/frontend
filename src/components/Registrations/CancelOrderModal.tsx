"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Button } from "../Button";
import { TicketIcon } from "@/components/Icons/TicketIcon";

interface CancelOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
  /** Quantidade de ingressos do pedido (texto dinâmico singular/plural). */
  ticketCount: number;
  /** Valor integral do reembolso em REAIS (já dividido por 100). */
  refundAmount: number;
  /**
   * Pedido GRATUITO (R$0): é cancelamento puro, não estorno. Esconde o texto de
   * reembolso/taxa de 2% (não há valor pago) e ajusta o título.
   */
  isFreeCancel?: boolean;
}

function formatPrice(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Confirmação de cancelamento/estorno de pedido (organizador).
 * Figma: node 4771:133926. Overlay próprio (z-60) por cima do PaymentDetailsModal
 * (z-50) — controlado por estado local, não pelo modalStore (que é single-modal).
 */
export function CancelOrderModal({
  isOpen,
  onClose,
  onConfirm,
  loading = false,
  ticketCount,
  refundAmount,
  isFreeCancel = false,
}: CancelOrderModalProps) {
  const ticketsLabel =
    ticketCount === 1
      ? "O ingresso deste pedido será cancelado. Esta ação é irreversível."
      : `Os ${ticketCount} ingressos deste pedido serão cancelados. Esta ação é irreversível.`;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 z-[60]"
            onClick={loading ? undefined : onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gray-1 rounded-[12px] w-full max-w-[474px] shadow-2xl flex flex-col gap-11 pt-6 pb-5 px-5">
              <div className="flex flex-col gap-6 items-center w-full">
                <div className="flex flex-col gap-4 items-center justify-center w-full">
                  <p className="font-family-dm-sans font-semibold text-[20px] leading-[1.3] text-gray-12">
                    {isFreeCancel ? "Cancelar pedido?" : "Estornar pedido?"}
                  </p>
                  {isFreeCancel ? (
                    <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-11 text-center">
                      Este pedido é gratuito — não há valor a reembolsar. O pedido
                      e seus ingressos serão cancelados.
                    </p>
                  ) : (
                    <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-11 text-center">
                      O participante receberá o valor integral de{" "}
                      <span className="font-bold text-gray-12">
                        {formatPrice(refundAmount)}
                      </span>
                      . Para processar o reembolso, o valor já repassado e a taxa
                      de cancelamento de{" "}
                      <span className="font-bold text-gray-12">2%</span> serão
                      descontados do seu financeiro.
                    </p>
                  )}
                </div>
                <div className="bg-gray-2 border border-gray-6 rounded-lg p-4 w-full flex items-center gap-3">
                  <TicketIcon className="size-6 text-red-11 shrink-0" />
                  <p className="font-family-dm-sans font-medium text-[14px] leading-[1.3] text-gray-11">
                    {ticketsLabel}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 items-center w-full">
                <Button
                  variant="outline"
                  onClick={onClose}
                  disabled={loading}
                  className="flex-1 h-12 border-gray-6 text-gray-12"
                >
                  Manter pedido
                </Button>
                <Button
                  variant="destructive"
                  onClick={onConfirm}
                  isLoading={loading}
                  className="flex-1 h-12"
                >
                  {isFreeCancel ? "Cancelar pedido" : "Estornar pedido"}
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
