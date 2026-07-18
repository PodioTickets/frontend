"use client";

import { useState, useEffect } from "react";
import { X, ArrowLeft } from "lucide-react";
import { Checkbox } from "@/components/CheckBox";
import { Button } from "@/components/Button";
import { useTickets, type Ticket } from "@/hooks/useTickets";
import { useTicketCategories } from "@/hooks/useTicketCategories";
import { TicketIcon } from "../Icons/TicketIcon";

/**
 * Preço efetivo do ingresso em centavos. Prioriza o lote ativo (fonte de verdade
 * do preço vigente) e cai para o primeiro lote quando não há lote ativo resolvido.
 * Retorna 0 quando não há preço, tratando o ingresso como gratuito.
 */
function getTicketPriceCents(ticket: Ticket): number {
  const raw = ticket.activeBatch?.price ?? ticket.batches?.[0]?.price;
  const cents = raw != null ? Number(raw) : 0;
  return Number.isFinite(cents) ? cents : 0;
}

/**
 * Ingresso gratuito/zerado: não é elegível a cupom/voucher (não há valor a
 * descontar). Usado para desabilitar a seleção nos modais de cupom e voucher.
 */
function isFreeTicket(ticket: Ticket): boolean {
  return getTicketPriceCents(ticket) <= 0;
}

interface SelectTicketsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedTicketIds: string[]) => void;
  eventId: string | null;
  selectedTicketIds?: string[];
  singleSelect?: boolean;
  /**
   * Somente leitura: exibe os ingressos vinculados sem permitir alteração.
   * Usado ao editar um voucher (a vinculação é imutável no backend).
   */
  readOnly?: boolean;
  /**
   * Contexto de uso do modal. Dirige a copy e a regra de elegibilidade:
   * - "coupon"/"voucher": ingresso gratuito é inelegível (não há valor a descontar).
   * - "question": qualquer ingresso é elegível (a pergunta independe de preço).
   * Default "coupon" mantém o comportamento histórico de cupom/voucher.
   */
  context?: "coupon" | "voucher" | "question";
}

export function SelectTicketsModal({
  isOpen,
  onClose,
  onConfirm,
  eventId,
  selectedTicketIds = [],
  singleSelect = false,
  readOnly = false,
  context = "coupon",
}: SelectTicketsModalProps) {
  // Na tela de questionário a pergunta pode ser direcionada a qualquer ingresso,
  // inclusive gratuito — a regra de "gratuito é inelegível" é exclusiva de cupom/voucher.
  const isQuestion = context === "question";
  const [selectedIds, setSelectedIds] = useState<string[]>(selectedTicketIds);
  const { tickets, loading } = useTickets(eventId, isOpen);
  const { categories } = useTicketCategories(eventId, isOpen);

  // Mapear categorias por ID
  const categoryMap = new Map(categories.map((cat) => [cat.id, cat.name]));

  useEffect(() => {
    if (isOpen) {
      setSelectedIds(selectedTicketIds);
    }
  }, [isOpen, selectedTicketIds]);

  const handleToggleTicket = (ticketId: string) => {
    if (readOnly) return;
    // Ingresso gratuito não pode receber cupom/voucher (não há valor a descontar).
    // Bloqueia SELECIONAR um gratuito, mas permite remover uma seleção pré-existente
    // (ex.: vínculo legado criado antes desta regra).
    const ticket = tickets.find((t) => t.id === ticketId);
    if (!isQuestion && ticket && isFreeTicket(ticket) && !selectedIds.includes(ticketId)) return;
    if (singleSelect) {
      setSelectedIds((prev) => (prev.includes(ticketId) ? [] : [ticketId]));
    } else {
      setSelectedIds((prev) =>
        prev.includes(ticketId)
          ? prev.filter((id) => id !== ticketId)
          : [...prev, ticketId]
      );
    }
  };

  const handleConfirm = () => {
    onConfirm(selectedIds);
    onClose();
  };

  // Voucher sem ingressos específicos vinculados (appliesTo "all") quando em leitura.
  const appliesToAll = readOnly && selectedIds.length === 0;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center md:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />

      {/* Modal: fullscreen no mobile, dialog centralizado no desktop */}
      <div className="relative bg-gray-1 w-full h-full md:h-auto md:max-h-[90vh] md:max-w-[1098px] md:rounded-xl overflow-hidden flex flex-col shadow-lg pb-[max(0px,env(safe-area-inset-bottom))]">
        {/* Header */}
        <div className="border-b border-gray-6 px-4 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 md:gap-2.5 min-w-0">
            <button
              onClick={onClose}
              className="border border-gray-6 rounded-full p-2 hover:bg-gray-2 transition-colors shrink-0"
              aria-label="Voltar"
            >
              <ArrowLeft className="size-5 text-gray-12" />
            </button>
            <h2 className="text-gray-12 text-lg md:text-xl font-semibold font-family-dm-sans leading-[1.3] truncate">
              {readOnly
                ? "Ingressos vinculados"
                : isQuestion
                  ? "Selecionar ingressos"
                  : "Vincular ingressos"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-11 hover:text-gray-12 transition-colors p-1 rounded-lg hover:bg-gray-3 shrink-0"
            aria-label="Fechar"
          >
            <X className="size-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto p-4 md:p-5">
            {/* Info bar */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-4 mb-5 md:mb-7">
              <p className="text-gray-11 text-sm md:text-base font-family-dm-sans leading-[1.3]">
                {readOnly
                  ? "Ingressos vinculados a este voucher (somente leitura)"
                  : isQuestion
                    ? "Selecione os ingressos aos quais esta pergunta será direcionada"
                    : context === "voucher"
                      ? "Selecione o ingresso que deseja vincular a este voucher"
                      : "Selecione os ingressos que deseja vincular a este cupom"}
              </p>
              <div className="flex items-center gap-4 md:gap-6 shrink-0">
                <div className="flex items-center gap-1">
                  <span className="text-gray-11 text-sm md:text-base font-family-dm-sans leading-[1.3]">
                    Total:
                  </span>
                  <span className="text-gray-12 text-sm md:text-base font-family-dm-sans leading-[1.3] tabular-nums">
                    {tickets.length}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-gray-11 text-sm md:text-base font-family-dm-sans leading-[1.3]">
                    Selecionados:
                  </span>
                  <span className="text-gray-12 text-sm md:text-base font-family-dm-sans leading-[1.3] tabular-nums">
                    {selectedIds.length}
                  </span>
                </div>
              </div>
            </div>

            {/* Tickets grid */}
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <p className="text-gray-11 text-base font-family-dm-sans">
                  Carregando ingressos...
                </p>
              </div>
            ) : tickets.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="size-16 flex items-center justify-center">
                  <TicketIcon className="size-16 text-gray-8" />
                </div>
                <p className="text-gray-12 text-xl font-semibold font-manrope leading-[1.1]">
                  Nenhum ingresso criado ainda...
                </p>
              </div>
            ) : (
              <>
                {appliesToAll && (
                  <div className="mb-4 md:mb-5 rounded-lg border border-primary-6 bg-primary-3 px-4 py-3">
                    <p className="text-gray-12 text-sm md:text-base font-family-dm-sans leading-[1.3]">
                      Este voucher se aplica a <strong>todos os ingressos</strong> do evento.
                    </p>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                  {tickets.map((ticket) => {
                    const selected = appliesToAll || selectedIds.includes(ticket.id);
                    // Gratuito e ainda não selecionado → inelegível a cupom/voucher.
                    // (Já selecionado permanece removível, tratado no toggle.) Em
                    // somente-leitura é apenas exibição, então não marca inelegível.
                    const ineligible = !readOnly && !isQuestion && isFreeTicket(ticket) && !selected;
                    return (
                      <TicketCard
                        key={ticket.id}
                        ticket={ticket}
                        categoryName={categoryMap.get(ticket.groupId) || "Ingresso avulso"}
                        isSelected={selected}
                        onToggle={() => handleToggleTicket(ticket.id)}
                        readOnly={readOnly}
                        ineligible={ineligible}
                      />
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-2 border-t border-gray-6 px-4 py-3 flex items-center justify-end shrink-0">
          {readOnly ? (
            <Button onClick={onClose} className="w-full md:w-auto">
              Fechar
            </Button>
          ) : (
            <Button
              onClick={handleConfirm}
              disabled={selectedIds.length === 0}
              className="w-full md:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isQuestion
                ? "Confirmar seleção"
                : context === "voucher"
                  ? "Adicionar ao voucher"
                  : "Adicionar ao cupom"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

interface TicketCardProps {
  ticket: Ticket;
  categoryName: string;
  isSelected: boolean;
  onToggle: () => void;
  readOnly?: boolean;
  /** Inelegível a cupom/voucher (gratuito): desabilita clique/checkbox e esmaece o card. */
  ineligible?: boolean;
}

function TicketCard({
  ticket,
  categoryName,
  isSelected,
  onToggle,
  readOnly = false,
  ineligible = false,
}: TicketCardProps) {
  // Card só é interativo quando não é somente-leitura e é elegível.
  const interactive = !readOnly && !ineligible;
  // Esmaece (aparência "desabilitada") os cards inelegíveis e, em somente-leitura,
  // os NÃO vinculados — assim só o ingresso selecionado permanece em destaque (verde).
  const dimmed = ineligible || (readOnly && !isSelected);
  return (
    <div
      className={`bg-gray-2 border rounded-xl p-4 flex flex-col transition-colors ${interactive ? "cursor-pointer" : "cursor-default"} ${dimmed ? "opacity-60" : ""} ${isSelected
        ? "border-primary-8 bg-primary-4"
        : interactive
          ? "border-gray-6 hover:bg-gray-3"
          : "border-gray-6"
        }`}
      onClick={interactive ? onToggle : undefined}
      title={ineligible ? "Ingresso gratuito não é elegível a cupom/voucher" : undefined}
    >
      <div className="flex flex-col gap-2 mb-4">
        <p className="text-gray-11 text-base font-family-dm-sans leading-[1.3] truncate">
          {categoryName}
        </p>
        <div className="flex items-center gap-2">
          <TicketIcon className="size-5 text-gray-12" />
          <p className="text-gray-12 text-base font-bold font-manrope leading-[1.1] truncate">
            {ticket.name}
          </p>
        </div>
      </div>
      <div className="border-t border-gray-6 pt-4 flex items-center justify-between gap-2">
        <div className="flex flex-col min-w-0">
          <p className="text-gray-12 text-base font-bold font-manrope leading-[1.1]">
            {ticket.price}
          </p>
          {ineligible && (
            <span className="text-gray-10 text-xs font-family-dm-sans leading-[1.3] mt-1">
              Gratuito · não elegível
            </span>
          )}
        </div>
        <Checkbox
          checked={isSelected}
          onCheckedChange={interactive ? onToggle : undefined}
          disabled={!interactive}
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    </div>
  );
}
