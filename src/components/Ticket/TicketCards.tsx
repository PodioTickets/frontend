"use client";

import { Pencil, Trash2, Plus, Minus, ChevronLeft, ChevronRight } from "lucide-react";
import { DistanceIcon } from "@/components/Icons/DistanceIcon";
import { CalendarIcon } from "@/components/Icons/CalendarIcon";
import { ClockIcon } from "@/components/Icons/ClockIcon";
import { hasDisplayableDistance } from "@/utils/checkoutModalityDisplay";
import type { Ticket } from "@/hooks/useTickets";

interface TicketCardsProps {
  tickets: Ticket[];
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onEdit: (ticketId: string) => void;
  onDelete: (ticketId: string) => void;
}

const formatPrice = (price: string) => {
  if (!price) return "R$ 0,00";
  return price.startsWith("R$") ? price : `R$ ${price}`;
};

export function TicketCards({
  tickets,
  currentPage,
  totalPages,
  onPageChange,
  onEdit,
  onDelete,
}: TicketCardsProps) {
  return (
    <div className="border border-gray-6 rounded-xl p-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tickets.map((ticket, index) => (
          <div key={ticket.id} className="bg-gray-2 border border-gray-6 rounded-xl p-5 flex flex-col gap-4">
            <div className="flex items-start justify-between">
              <h4 className="text-gray-12 text-lg font-bold font-manrope">{ticket.name}</h4>
              <div className="flex gap-2">
                <button
                  type="button"
                  title="Editar"
                  onClick={() => onEdit(ticket.id)}
                  className="size-8 bg-blue-2 border border-blue-6 rounded-lg flex items-center justify-center hover:bg-blue-3 transition-colors"
                >
                  <Pencil className="size-4 text-blue-12" />
                </button>
                <button
                  type="button"
                  title="Deletar"
                  onClick={() => onDelete(ticket.id)}
                  className="size-8 bg-red-2 border border-red-6 rounded-lg flex items-center justify-center hover:bg-red-3 transition-colors"
                >
                  <Trash2 className="size-4 text-red-12" />
                </button>
              </div>
            </div>

            <div className="flex gap-4 items-center text-sm text-gray-11 font-family-dm-sans">
              {hasDisplayableDistance(ticket.distance) && (
                <div className="flex gap-1 items-center">
                  <DistanceIcon className="size-4" />
                  <span>{ticket.distance}{ticket.distanceUnit}</span>
                </div>
              )}
              <div className="flex gap-1 items-center">
                <CalendarIcon className="size-4" />
                <span>15/12/2025</span>
              </div>
              <div className="flex gap-1 items-center">
                <ClockIcon className="size-4" />
                <span>1:30 PM</span>
              </div>
            </div>

            {ticket.ageLimit && (
              <div className="bg-yellow-2 border border-yellow-6 rounded-full px-3 py-1 w-fit">
                <span className="text-yellow-12 text-xs font-family-dm-sans">
                  Limite de idade: de {ticket.ageLimit.min || 0} a {ticket.ageLimit.max || 0} anos
                </span>
              </div>
            )}

            <div className="text-gray-12 text-xl font-bold font-manrope">
              {formatPrice(ticket.price)}
            </div>

            <div className="flex items-center gap-2">
              <button className="size-8 border border-gray-6 rounded-lg flex items-center justify-center hover:bg-gray-3">
                <Minus className="size-4 text-gray-11" />
              </button>
              <span className="text-gray-12 font-family-dm-sans">0</span>
              <button className="size-8 border border-gray-6 rounded-lg flex items-center justify-center hover:bg-gray-3">
                <Plus className="size-4 text-gray-11" />
              </button>
            </div>

            {ticket.products.length > 0 && (
              <div className="flex gap-1 items-center">
                {ticket.products.slice(0, 3).map((product, idx) => (
                  <div key={idx} className="size-8 bg-primary-3 rounded border border-primary-6 flex items-center justify-center">
                    <span className="text-xs text-primary-12">P</span>
                  </div>
                ))}
                {ticket.products.length > 3 && (
                  <div className="size-8 bg-gray-3 rounded border border-gray-6 flex items-center justify-center">
                    <span className="text-xs text-gray-11">+{ticket.products.length - 3}</span>
                  </div>
                )}
              </div>
            )}

            {index === 0 && ticket.ageLimit && (
              <button className="w-fit px-4 py-2 bg-gray-3 border border-gray-6 rounded-lg text-gray-12 text-sm font-family-dm-sans hover:bg-gray-4 transition-colors">
                Rascunhos
              </button>
            )}
          </div>
        ))}
      </div>
      {/* Pagination for cards */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4 mt-4 border-t border-gray-6">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="size-8 flex items-center justify-center border border-gray-6 rounded-lg hover:bg-gray-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="size-4" />
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`size-8 flex items-center justify-center border rounded-lg ${
                currentPage === p
                  ? "bg-[#59E373] border-[#59E373] text-gray-12"
                  : "border-gray-6 hover:bg-gray-3"
              }`}
            >
              {p}
            </button>
          ))}
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="size-8 flex items-center justify-center border border-gray-6 rounded-lg hover:bg-gray-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      )}
    </div>
  );
}
