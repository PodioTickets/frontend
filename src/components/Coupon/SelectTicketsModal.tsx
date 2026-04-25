"use client";

import { useState, useEffect } from "react";
import { X, ArrowLeft } from "lucide-react";
import { Checkbox } from "@/components/CheckBox";
import { Button } from "@/components/Button";
import { useTickets, type Ticket } from "@/hooks/useTickets";
import { useTicketCategories } from "@/hooks/useTicketCategories";
import { TicketIcon } from "../Icons/TicketIcon";

interface SelectTicketsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedTicketIds: string[]) => void;
  eventId: string | null;
  selectedTicketIds?: string[];
}

export function SelectTicketsModal({
  isOpen,
  onClose,
  onConfirm,
  eventId,
  selectedTicketIds = [],
}: SelectTicketsModalProps) {
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
    setSelectedIds((prev) =>
      prev.includes(ticketId)
        ? prev.filter((id) => id !== ticketId)
        : [...prev, ticketId]
    );
  };

  const handleConfirm = () => {
    onConfirm(selectedIds);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-gray-1 rounded-xl overflow-hidden w-full max-w-[1098px] max-h-[90vh] flex flex-col shadow-lg">
        {/* Header */}
        <div className="border-b border-gray-6 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <button
              onClick={onClose}
              className="border border-gray-6 rounded-full p-2 hover:bg-gray-2 transition-colors"
            >
              <ArrowLeft className="size-5 text-gray-12" />
            </button>
            <h2 className="text-gray-12 text-xl font-semibold font-family-dm-sans leading-[1.3]">
              Vincular ingressos
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-11 hover:text-gray-12 transition-colors p-1 rounded-lg hover:bg-gray-3"
          >
            <X className="size-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto p-5">
            {/* Info bar */}
            <div className="flex items-center justify-between mb-7">
              <p className="text-gray-11 text-base font-family-dm-sans leading-[1.3]">
                Selecione os ingressos que deseja vincular a este cupom
              </p>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-1">
                  <span className="text-gray-11 text-base font-family-dm-sans leading-[1.3]">
                    Total de ingressos:
                  </span>
                  <span className="text-gray-12 text-base font-family-dm-sans leading-[1.3]">
                    {tickets.length}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-gray-11 text-base font-family-dm-sans leading-[1.3]">
                    Selecionados:
                  </span>
                  <span className="text-gray-12 text-base font-family-dm-sans leading-[1.3]">
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
              <div className="grid grid-cols-3 gap-4">
                {tickets.map((ticket) => (
                  <TicketCard
                    key={ticket.id}
                    ticket={ticket}
                    categoryName={categoryMap.get(ticket.groupId) || "Ingresso avulso"}
                    isSelected={selectedIds.includes(ticket.id)}
                    onToggle={() => handleToggleTicket(ticket.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-2 border-t border-gray-6 px-4 py-3 flex items-center justify-end">
          <Button
            onClick={handleConfirm}
            disabled={selectedIds.length === 0}
            className="
            disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Adicionar ao cupom
          </Button>
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
}

function TicketCard({ ticket, categoryName, isSelected, onToggle }: TicketCardProps) {
  return (
    <div
      className={`bg-gray-2 border rounded-xl p-4 flex flex-col cursor-pointer transition-colors ${isSelected
        ? "border-primary-8 bg-primary-4"
        : "border-gray-6 hover:bg-gray-3"
        }`}
      onClick={onToggle}
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
      <div className="border-t border-gray-6 pt-4 flex items-center justify-between">
        <p className="text-gray-12 text-base font-bold font-manrope leading-[1.1]">
          {ticket.price}
        </p>
        <Checkbox
          checked={isSelected}
          onCheckedChange={onToggle}
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    </div>
  );
}
