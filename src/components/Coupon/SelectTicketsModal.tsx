"use client";

import { useState, useEffect } from "react";
import { X, ArrowLeft } from "lucide-react";
import { Checkbox } from "@/components/CheckBox";
import { Button } from "@/components/Button";
import { useTickets, type Ticket } from "@/hooks/useTickets";
import { useTicketCategories } from "@/hooks/useTicketCategories";
import { TicketIcon } from "../Icons/TicketIcon";
import { hasDisplayableDistance } from "@/utils/checkoutModalityDisplay";

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

  // Avulsos primeiro (sem título), depois uma seção por categoria, na ordem das categorias.
  const categoryIds = new Set(categories.map((cat) => cat.id));
  const groups: Array<{ id: string; title: string | null; tickets: Ticket[] }> = [
    { id: "avulsos", title: null, tickets: tickets.filter((t) => !categoryIds.has(t.groupId)) },
    ...categories.map((cat) => ({
      id: cat.id,
      title: cat.name,
      tickets: tickets.filter((t) => t.groupId === cat.id),
    })),
  ].filter((g) => g.tickets.length > 0);

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

  // Ingresso que pode ser marcado agora (gratuito é inelegível a cupom/voucher).
  const isSelectable = (ticket: Ticket) => isQuestion || !isFreeTicket(ticket);

  /** Checkbox do cabeçalho: marca todos os elegíveis do grupo; se já estão todos, desmarca o grupo. */
  const handleToggleGroup = (groupTickets: Ticket[]) => {
    if (readOnly || singleSelect) return;
    const ids = groupTickets.filter(isSelectable).map((t) => t.id);
    const allSelected = ids.length > 0 && ids.every((id) => selectedIds.includes(id));
    setSelectedIds((prev) =>
      allSelected
        ? prev.filter((id) => !groupTickets.some((t) => t.id === id))
        : [...prev, ...ids.filter((id) => !prev.includes(id))],
    );
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
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* Modal: fullscreen no mobile, dialog centralizado no desktop */}
      <div className="relative bg-gray-1 w-full h-full md:h-auto md:max-h-[90vh] md:max-w-[1098px] md:rounded-xl overflow-hidden flex flex-col shadow-lg pb-[max(0px,env(safe-area-inset-bottom))]">
        {/* Header */}
        <div className="border-b border-gray-6 px-4 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              onClick={onClose}
              className="border border-gray-6 rounded-full size-8 flex items-center justify-center hover:bg-gray-2 transition-colors shrink-0"
              aria-label="Voltar"
            >
              <ArrowLeft className="size-4 text-gray-12" />
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
            className="text-gray-11 hover:text-gray-12 transition-colors size-9 flex items-center justify-center rounded-lg hover:bg-gray-3 shrink-0"
            aria-label="Fechar"
          >
            <X className="size-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 md:pr-5 py-5 flex flex-col gap-5 md:gap-7">
          {/* Info bar */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-4 font-family-dm-sans text-sm md:text-base leading-[1.3]">
            <p className="text-gray-11">
              {readOnly
                ? "Ingressos vinculados a este voucher (somente leitura)"
                : isQuestion
                  ? "Selecione os ingressos aos quais esta pergunta será direcionada"
                  : context === "voucher"
                    ? "Selecione o ingresso que deseja vincular a este voucher"
                    : "Selecione os ingressos em que este cupom será aplicado"}
            </p>
            <div className="flex items-center gap-6 shrink-0">
              <p className="text-gray-11">
                Total de ingressos: <span className="text-gray-12 tabular-nums">{tickets.length}</span>
              </p>
              <p className="text-gray-11">
                Selecionados: <span className="text-gray-12 tabular-nums">{selectedIds.length}</span>
              </p>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <p className="text-gray-11 text-base font-family-dm-sans">Carregando ingressos...</p>
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
            <div className="flex flex-col gap-4">
              {appliesToAll && (
                <div className="rounded-lg border border-primary-6 bg-primary-3 px-4 py-3">
                  <p className="text-gray-12 text-sm md:text-base font-family-dm-sans leading-[1.3]">
                    Este voucher se aplica a <strong>todos os ingressos</strong> do evento.
                  </p>
                </div>
              )}
              {groups.map((group) => {
                const table = (
                  <TicketSelectTable
                    tickets={group.tickets}
                    headerClassName={group.title ? "bg-gray-4" : "bg-gray-3"}
                    isSelected={(t) => appliesToAll || selectedIds.includes(t.id)}
                    isSelectable={isSelectable}
                    onToggle={(t) => handleToggleTicket(t.id)}
                    onToggleAll={singleSelect ? undefined : () => handleToggleGroup(group.tickets)}
                    readOnly={readOnly}
                  />
                );
                return group.title ? (
                  <div
                    key={group.id}
                    className="bg-gray-3 border border-gray-6 rounded-xl p-3 md:p-5 flex flex-col gap-4 md:gap-6"
                  >
                    <p className="font-manrope font-bold text-lg leading-[1.1] text-gray-12">{group.title}</p>
                    {table}
                  </div>
                ) : (
                  <div key={group.id}>{table}</div>
                );
              })}
            </div>
          )}
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
                  ? "Aplicar ao voucher"
                  : "Aplicar ao cupom"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

interface TicketSelectTableProps {
  tickets: Ticket[];
  /** Fundo do cabeçalho: gray-3 nos avulsos, gray-4 dentro do card cinza da categoria (Figma). */
  headerClassName: string;
  isSelected: (ticket: Ticket) => boolean;
  /** Gratuito é inelegível a cupom/voucher: linha esmaecida, sem marcar (desmarcar continua possível). */
  isSelectable: (ticket: Ticket) => boolean;
  onToggle: (ticket: Ticket) => void;
  /** Ausente (seleção única) → cabeçalho sem checkbox. */
  onToggleAll?: () => void;
  readOnly: boolean;
}

/** Tabela de seleção de um grupo de ingressos: checkbox · Nome do ingresso · Modalidade/Distância. */
function TicketSelectTable({
  tickets,
  headerClassName,
  isSelected,
  isSelectable,
  onToggle,
  onToggleAll,
  readOnly,
}: TicketSelectTableProps) {
  const selectable = tickets.filter(isSelectable);
  const allSelected = selectable.length > 0 && selectable.every(isSelected);
  return (
    <div className="bg-gray-2 border-[1.5px] border-gray-6 rounded-lg overflow-hidden w-full">
      <div className={`${headerClassName} border-b border-gray-6 h-11 flex items-center`}>
        <div className="pl-4 flex items-center shrink-0 w-10">
          {onToggleAll && (
            <Checkbox
              checked={allSelected}
              onCheckedChange={onToggleAll}
              disabled={readOnly || selectable.length === 0}
              aria-label="Selecionar todos"
            />
          )}
        </div>
        <p className="flex-1 min-w-0 p-4 font-inter text-sm font-medium leading-[1.3] text-gray-12">
          Nome do ingresso
        </p>
        <p className="flex-1 min-w-0 p-4 text-center font-inter text-sm font-medium leading-[1.3] text-gray-12">
          Modalidade/Distância
        </p>
      </div>
      {tickets.map((ticket) => {
        const selected = isSelected(ticket);
        // Gratuito ainda não marcado → inelegível. Já marcado (vínculo antigo) segue removível.
        const ineligible = !readOnly && !isSelectable(ticket) && !selected;
        const interactive = !readOnly && !ineligible;
        return (
          <div
            key={ticket.id}
            className={`bg-gray-1 border-b border-gray-6 last:border-b-0 min-h-[52px] flex items-center transition-colors ${
              interactive ? "cursor-pointer hover:bg-gray-2" : "cursor-default"
            } ${ineligible || (readOnly && !selected) ? "opacity-60" : ""}`}
            onClick={interactive ? () => onToggle(ticket) : undefined}
            title={ineligible ? "Ingresso gratuito não é elegível a cupom/voucher" : undefined}
          >
            <div className="pl-4 flex items-center shrink-0 w-10">
              <Checkbox
                checked={selected}
                onCheckedChange={interactive ? () => onToggle(ticket) : undefined}
                disabled={!interactive}
                onClick={(e) => e.stopPropagation()}
                aria-label={ticket.name}
              />
            </div>
            <div className="flex-1 min-w-0 px-4 py-2 flex flex-col justify-center gap-1">
              <p className="font-family-dm-sans font-semibold text-sm leading-[1.3] text-gray-12 truncate">
                {ticket.name}
              </p>
              {ineligible && (
                <span className="font-family-dm-sans text-xs leading-[1.3] text-gray-10">
                  Gratuito · não elegível
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0 px-4 py-2 flex flex-col items-center justify-center gap-2 text-sm leading-[1.3] text-center">
              <p className="font-inter font-semibold text-gray-12">{ticket.modality || "—"}</p>
              {hasDisplayableDistance(ticket.distance) && (
                <p className="font-family-dm-sans font-medium text-gray-11">
                  {ticket.distance}
                  {ticket.distanceUnit || "KM"}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
