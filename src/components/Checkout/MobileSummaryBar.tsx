"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useDragControls } from "framer-motion";
import { Button } from "../Button";
import { Tooltip } from "../Tooltip";
import { SeeDetailsIcon } from "../Icons/SeeDetailsIcon";
import { usePathname } from "next/navigation";
import { formatBRL as formatPrice } from "@/lib/money";
import { useHidePricing } from "@/contexts/HidePricingContext";

/**
 * Barra de resumo fixa (mobile) unificada do checkout.
 *
 * Substitui os 4 cards fixos duplicados (ModalitiesStep / InformationStep /
 * SubscriptionStep / PaymentStep). Comportamento idêntico em todas as telas:
 *
 *  - MINIMIZADO: mostra só cupom/voucher + taxa de serviço + total + CTA.
 *  - "Ver detalhes": abre um bottom-sheet (backdrop + slide-up) com o restante
 *    (ingressos do pedido, produtos, breakdown completo e conteúdo extra opcional).
 *
 * Toda a marcação vive aqui; cada step só passa os VALORES já calculados e a
 * config do CTA. O label de cupom/voucher vem pronto (cada fluxo formata com
 * sua própria regra de domínio).
 */

export interface MobileSummaryTicketLine {
  categoryName?: string | null;
  /** Nome do ingresso (ticketName/raceName conforme o step). */
  name: string;
  quantity: number;
  total: number;
}

export interface MobileSummaryDiscount {
  /** Label já formatado, ex.: "Cupom X10 (-10%)" ou "Voucher ABC". */
  label: string;
  /** Valor absoluto do desconto (exibido como -R$X). */
  amount: number;
}

export interface MobileSummaryBarProps {
  eventName: string;
  totalParticipants: number;
  tickets: MobileSummaryTicketLine[];
  /** Subtotal (tickets + produtos) — só aparece nos detalhes quando há desconto. */
  subtotal: number;
  /** Cupom OU voucher aplicado (mutuamente exclusivos no pedido). */
  discount?: MobileSummaryDiscount | null;
  /** Cupom pendente (capturado da URL, aplicado "ao continuar") — só label. */
  pendingDiscountLabel?: string | null;
  /** Resumo de produtos adicionais (quando houver). `count` é opcional. */
  additionalProducts?: { count?: number; total: number } | null;
  serviceFee: number;
  total: number;
  /** CTA principal da barra. OPCIONAL: o PaymentStep finaliza pelos botões do
   *  próprio formulário de pagamento (cartão/Pix/free), então passa sem CTA e a
   *  barra fica só como resumo (sem botão na barra fixa nem no bottom-sheet). */
  cta?: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
    loading?: boolean;
  };
  /** Conteúdo extra no bottom-sheet (ex.: cards de participante do PaymentStep). */
  extraDetails?: React.ReactNode;
  /**
   * Layout da barra fixa minimizada:
   * - `full`: card completo (nome + participantes + desconto + taxa + total + CTA
   *   + aba "Ver detalhes"). Usado SÓ em /ingressos (ModalitiesStep).
   * - `compact` (default): linha enxuta "(N participantes) · Ver detalhes" —
   *   demais etapas do checkout.
   * O bottom-sheet de detalhes é idêntico nos dois.
   */
  variant?: "full" | "compact" | "hidden";
  /**
   * Controle EXTERNO do bottom-sheet (opcional). Permite que um irmão (ex.: o
   * "Ver detalhes" do `OrderSummary` no PaymentStep) abra o mesmo sheet. Se
   * `open` for fornecido, o componente fica controlado; senão usa estado interno.
   */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}


/** Linha "label: valor" padrão do resumo. Reusada nos detalhes ricos pra
 * padronizar o tamanho dos textos entre breakdown e cards de participante. */
export function SummaryRow({
  label,
  value,
  emphasize = false,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  emphasize?: boolean;
}) {
  return (
    <div className="flex items-baseline gap-1 text-gray-12 font-family-manrope">
      <span className={emphasize ? "text-base font-medium" : "text-sm font-medium"}>{label}: </span>
      <span className={emphasize ? "text-base font-bold" : "text-sm font-semibold"}>
        {value}
      </span>
    </div>
  );
}

export function MobileSummaryBar({
  eventName,
  totalParticipants,
  tickets,
  subtotal,
  discount,
  pendingDiscountLabel,
  additionalProducts,
  serviceFee,
  total,
  cta,
  extraDetails,
  variant = "compact",
  open: controlledOpen,
  onOpenChange,
}: MobileSummaryBarProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  // Controlado se `open` foi passado; senão usa o estado interno.
  const open = controlledOpen ?? internalOpen;
  const setOpen = useCallback(
    (next: boolean) => {
      onOpenChange?.(next);
      if (controlledOpen === undefined) setInternalOpen(next);
    },
    [controlledOpen, onOpenChange],
  );
  // Portal só monta no client (document indisponível no SSR), igual ao padrão
  // de modais do projeto.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const closeSheet = useCallback(() => setOpen(false), [setOpen]);
  // A aba "Ver detalhes" alterna o sheet (abre/fecha no mesmo controle).
  const toggleSheet = useCallback(() => setOpen(!open), [setOpen, open]);

  // Fluxo de cortesia: sem valores. Barra fixa mínima só com o CTA.
  const hidePricing = useHidePricing();

  // Drag-to-dismiss: o gesto é disparado SÓ pelo header/grabber (via
  // dragControls + dragListener={false}) pra não competir com o scroll do
  // corpo do sheet. Soltar abaixo do limiar (deslocamento ou velocidade)
  // fecha; senão volta pra posição.
  const dragControls = useDragControls();
  const startDrag = useCallback(
    (event: React.PointerEvent) => dragControls.start(event),
    [dragControls]
  );

  // Trava o scroll do fundo enquanto o bottom-sheet está aberto (UX de modal).
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  // Breakdown reusado na barra (compacto) e no rodapé do sheet (completo).
  const discountRow = discount ? (
    <SummaryRow
      label={discount.label}
      value={`-${formatPrice(discount.amount)}`}
    />
  ) : pendingDiscountLabel ? (
    <SummaryRow
      label={pendingDiscountLabel}
      value={<span className="text-xs font-medium">ao continuar</span>}
    />
  ) : null;

  const feeRow =
    serviceFee > 0 ? (
      <SummaryRow label="Taxa de serviço" value={formatPrice(serviceFee)} />
    ) : null;

  // Cortesia: nenhuma linha de valor — só o CTA numa barra fixa mínima.
  if (hidePricing) {
    if (!cta) return null;
    return (
      <div data-mobile-summary-bar="true" className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
        <div className="bg-gray-2 border-t border-gray-6 shadow-lg px-4 py-3 pb-5">
          <Button
            onClick={cta.onClick}
            disabled={cta.disabled}
            isLoading={cta.loading}
            className="w-full font-bold font-manrope disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cta.label}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Barra minimizada COMPLETA — só em /ingressos (variant="full"):
          nome + participantes + desconto + taxa + total + CTA + aba "Ver detalhes". */}
      {variant === "full" ? (
        <div data-mobile-summary-bar="true" className="fixed bottom-0 left-0 right-0 z-50 md:hidden flex flex-col">
          {/* Aba "Ver detalhes" acima do card (mesmo formato da tela de pagamento). */}
          <button
            type="button"
            onClick={toggleSheet}
            aria-expanded={open}
            className="self-end w-1/3 bg-gray-2 border-t border-l border-r border-gray-6 rounded-tl-xl py-2 text-xs font-medium text-gray-11 text-center font-family-dm-sans hover:text-gray-12 active:scale-95 transition-transform"
          >
            {open ? "Ocultar detalhes" : "Ver detalhes"}
          </button>

          <div className="bg-gray-2 border-t border-gray-6 shadow-lg px-4 py-3">
            <div className="flex flex-col gap-2">
              {/* Identificação do pedido também na barra minimizada. */}
              <div className="flex items-center justify-between gap-2 min-w-0">
                <h3 className="min-w-0 truncate font-manrope font-bold text-sm text-gray-12">
                  {eventName}
                </h3>
              </div>
              <SummaryRow label="Participantes" value={totalParticipants} />
              {discountRow}
              {feeRow}
              <div className="flex items-center justify-between gap-3">
                <SummaryRow label="Total" value={formatPrice(total)} emphasize />
                {cta && (
                  <Button
                    onClick={cta.onClick}
                    disabled={cta.disabled}
                    isLoading={cta.loading}
                    className="font-bold font-manrope disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {cta.label}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : variant === "compact" ? (
        /* Barra minimizada COMPACTA — demais etapas: "(N participantes) · Ver detalhes". */
        <div data-mobile-summary-bar="true" className="fixed bottom-0 left-0 right-0 z-50 md:hidden flex flex-col">
          <div className="bg-gray-2 border-t border-gray-6 shadow-lg px-4 py-3 flex items-center justify-between pb-5 w-full">
            <h1 className="text-sm text-gray-11">({totalParticipants} {totalParticipants > 1 ? "Participantes" : "Participante"})</h1>
            <h1 onClick={toggleSheet}
              aria-expanded={open} className="flex items-center gap-2 text-primary-11 font-medium text-sm underline cursor-pointer">Ver detalhes <SeeDetailsIcon /></h1>
          </div>
        </div>
      ) : null}

      {/* Bottom-sheet com os detalhes completos — portado pro document.body
          (padrão de modais do projeto) pra escapar de stacking contexts /
          transforms dos ancestrais do step, que prendiam o sheet atrás do
          conteúdo. Backdrop e painel são filhos motion KEYADOS do
          AnimatePresence pra que a animação de entrada E saída funcione. */}
      {mounted &&
        createPortal(
          <AnimatePresence>
            {open && (
              <motion.div
                key="mobile-summary-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="md:hidden fixed inset-0 bg-black/50 z-[60]"
                onClick={closeSheet}
              />
            )}
            {open && (
              <motion.div
                key="mobile-summary-panel"
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "tween", duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
                drag="y"
                dragControls={dragControls}
                dragListener={false}
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={{ top: 0, bottom: 0.6 }}
                dragMomentum={false}
                onDragEnd={(_, info) => {
                  // Fecha se arrastou o suficiente pra baixo ou com velocidade.
                  if (info.offset.y > 120 || info.velocity.y > 600) closeSheet();
                }}
                className="md:hidden fixed bottom-0 left-0 right-0 z-[61] bg-gray-1 rounded-t-2xl max-h-[85dvh] flex flex-col overflow-hidden shadow-2xl"
                role="dialog"
                aria-modal="true"
                aria-label="Detalhes do pedido"
              >
                {/* Grabber + header — área de arrasto pra fechar (touch-none
                    impede o navegador de tratar o gesto como scroll). */}
                <div
                  onPointerDown={startDrag}
                  className="shrink-0 pt-3 px-4 pb-3 border-b border-gray-6 cursor-grab active:cursor-grabbing touch-none select-none"
                >
                  <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-gray-6" />
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="font-manrope font-bold text-lg leading-[1.1] text-gray-12 truncate">
                        {eventName}
                      </h2>
                      <p className="text-sm text-gray-11 font-family-dm-sans mt-1">
                        Participantes:{" "}
                        <span className="font-semibold text-gray-12">{totalParticipants}</span>
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={closeSheet}
                      className="shrink-0 text-sm font-semibold text-gray-11 font-family-dm-sans hover:text-gray-12 active:scale-95 transition"
                    >
                      Fechar
                    </button>
                  </div>
                </div>

                {/* Corpo rolável — `min-h-0` é obrigatório p/ o overflow funcionar
                    dentro do flex-col com altura limitada (senão transborda e cobre a tela). */}
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] px-4 py-4 flex flex-col gap-5">
                  {/* Detalhe rico do step (cards de participante + imagens dos
                    produtos) quando fornecido; senão, a lista flat de ingressos. */}
                  {extraDetails ? (
                    extraDetails
                  ) : (
                    tickets.length > 0 && (
                      <div className="flex flex-col gap-3">
                        <p className="font-manrope font-bold text-base text-gray-12">
                          Ingressos no pedido
                        </p>
                        {tickets.map((ticket, index) => (
                          <div key={index} className="flex flex-col gap-0.5 min-w-0">
                            <p className="text-xs text-gray-11 leading-[1.3] truncate font-family-dm-sans">
                              {ticket.categoryName || "Ingresso Avulso"}
                            </p>
                            <div className="flex items-baseline gap-2 min-w-0">
                              {/* Tooltip click-to-reveal: nome completo quando truncado (mobile sem hover). */}
                              <Tooltip
                                content={`(${ticket.quantity}x) ${ticket.name}`}
                                position="topRight"
                                trigger="click"
                                usePortal
                                className="block min-w-0 flex-1"
                                contentClassName="!w-auto max-w-[calc(100vw-32px)] text-left text-sm text-gray-12 font-family-dm-sans !py-2 !px-3"
                              >
                                <p className="text-sm font-semibold text-gray-12 truncate min-w-0 cursor-pointer font-family-dm-sans">
                                  ({ticket.quantity}x) {ticket.name}:
                                </p>
                              </Tooltip>
                              <p className="text-sm font-semibold text-gray-12 shrink-0 font-family-dm-sans">
                                {formatPrice(ticket.total)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  )}

                  {/* Breakdown completo */}
                  <div className="flex flex-col gap-2 border-t border-gray-6 pt-4">
                    <SummaryRow label="Subtotal" value={formatPrice(subtotal)} />
                    {discountRow}
                    {feeRow}
                    <SummaryRow label="Total" value={formatPrice(total)} emphasize />
                  </div>
                </div>


              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  );
}
