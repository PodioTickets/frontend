"use client";

import { Pencil, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { TrashIcon } from "@/components/Icons/TrashIcon";
import Image from "next/image";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { Ticket } from "@/hooks/useTickets";

interface TicketTableProps {
  tickets: Ticket[];
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onEdit: (ticketId: string) => void;
  onDuplicate: (ticketId: string) => void;
  /** Abre fluxo de confirmação para excluir (ex.: modal no pai) */
  onRequestDeleteTicket?: (ticketId: string) => void;
  productsMap?: Record<string, { id: string; name: string; image: string | null }>;
}

const formatPrice = (price: string) => {
  if (!price) return "R$ 0,00";

  // Se já está formatado com R$, retorna como está
  if (price.startsWith("R$")) {
    return price;
  }

  // Se é um número (em centavos), converte para reais
  const numericValue = parseFloat(price);
  if (!isNaN(numericValue)) {
    return `R$ ${(numericValue / 100).toFixed(2).replace(".", ",")}`;
  }

  // Caso contrário, apenas adiciona R$
  return `R$ ${price}`;
};

function DraggableTicketRow({
  ticket,
  productsMap,
  onEdit,
  onDuplicate,
  onRequestDeleteTicket,
}: {
  ticket: Ticket;
  productsMap: Record<string, { id: string; name: string; image: string | null }>;
  onEdit: (ticketId: string) => void;
  onDuplicate: (ticketId: string) => void;
  onRequestDeleteTicket?: (ticketId: string) => void;
}) {
  const MAX_VISIBLE_PRODUCTS = 5;
  const ticketProducts = ticket.products
    .map((productId) => productsMap[productId])
    .filter(Boolean)
    .slice(0, MAX_VISIBLE_PRODUCTS);
  const remainingCount = Math.max(0, ticket.products.length - MAX_VISIBLE_PRODUCTS);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: `ticket-${ticket.id}`,
    data: {
      type: "ticket",
      ticket,
    },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="bg-gray-1 border-b border-gray-6 flex h-[52px] items-center justify-between w-full last:border-b-0 cursor-move hover:bg-gray-2 transition-colors"
    >
      {/* Nome do ingresso */}
      <div className="flex h-full items-center p-4 w-[318px]">
        <p className="flex-1 font-family-dm-sans font-semibold leading-[1.3] min-h-px min-w-px overflow-hidden text-sm text-gray-12 text-ellipsis whitespace-nowrap">
          {ticket.name}
        </p>
      </div>

      {/* Preço */}
      <div className="flex flex-1 h-full items-center justify-center min-h-px min-w-px p-4">
        <p className="font-inter font-semibold leading-[1.3] text-sm text-gray-12">
          {formatPrice(ticket.price)}
        </p>
      </div>

      {/* Modalidade/Distância */}
      <div className="flex flex-1 flex-col gap-2 h-full items-center justify-center leading-[1.3] min-h-px min-w-px p-4 text-sm">
        <p className="font-inter font-semibold text-gray-12">
          {ticket.modality || "—"}
        </p>
        {ticket.distance && (
          <p className="font-family-dm-sans font-medium text-gray-11">
            {ticket.distance}{ticket.distanceUnit || "KM"}
          </p>
        )}
      </div>

      {/* Produtos relacionados */}
      <div className="flex flex-1 h-full items-center justify-center min-h-px min-w-px p-4">
        {ticketProducts.length > 0 || remainingCount > 0 ? (
          <div className="flex gap-[4.3px] h-9 items-center">
            {ticketProducts.map((product, idx) => (
              <div
                key={product.id}
                className="flex h-9 items-start max-w-[36.5px] overflow-clip rounded-md w-[36px]"
              >
                <div className="relative size-9 rounded-md border-[0.537px] border-gray-6 overflow-hidden bg-gray-3">
                  {product.image ? (
                    <Image
                      src={product.image}
                      alt={product.name}
                      fill
                      className="object-cover rounded-md"
                    />
                  ) : (
                    <div className="h-full w-full rounded-md overflow-hidden flex items-center justify-center text-gray-11 text-base font-semibold font-family-dm-sans">
                      {product.name.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {remainingCount > 0 && (
              <div className="flex h-9 items-start max-w-[36.5px] overflow-clip rounded-[2.15px] w-[36.5px] relative">
                <div className="relative size-9 rounded-[2.15px] border-[0.537px] border-gray-6 overflow-hidden bg-gray-3">
                  {ticketProducts.length > 0 && ticketProducts[ticketProducts.length - 1]?.image && (
                    <Image
                      src={ticketProducts[ticketProducts.length - 1].image!}
                      alt=""
                      fill
                      className="object-cover rounded-[2.15px]"
                    />
                  )}
                  <div className="absolute inset-0 bg-black/80 rounded-[2.15px]" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="flex items-center gap-[2.3px]">
                      <Plus className="size-[6.93px] text-white" />
                      <p className="font-manrope font-extrabold leading-[1.1] text-[9.67px] text-white">
                        {remainingCount}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <span className="text-gray-11 text-sm">—</span>
        )}
      </div>

      {/* Ações */}
      <div className="flex gap-1 h-full items-center justify-center px-2 py-2 w-[148px] shrink-0">
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onEdit(ticket.id);
          }}
          className="bg-gray-2 border border-gray-6 rounded-lg size-8 flex items-center justify-center hover:bg-gray-3 transition-colors cursor-pointer"
        >
          <Pencil className="size-5 text-gray-11" />
        </button>
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onDuplicate(ticket.id);
          }}
          className="bg-gray-2 border border-gray-6 rounded-lg size-8 flex items-center justify-center hover:bg-gray-3 transition-colors cursor-pointer"
        >
          <Plus className="size-5 text-gray-11" />
        </button>
        {onRequestDeleteTicket ? (
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onRequestDeleteTicket(ticket.id);
            }}
            className="bg-red-2 border border-red-6 rounded-lg size-8 flex items-center justify-center hover:bg-red-3 transition-colors cursor-pointer"
          >
            <TrashIcon className="size-5 text-red-12" />
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function TicketTable({
  tickets,
  currentPage,
  totalPages,
  onPageChange,
  onEdit,
  onDuplicate,
  onRequestDeleteTicket,
  productsMap = {},
}: TicketTableProps) {
  return (
    <div className="bg-gray-2 border border-gray-6 rounded-lg overflow-hidden w-full">
      {/* Header */}
      <div className="bg-gray-4 border-b border-gray-6 flex h-[44px] items-center">
        <div className="flex h-full items-center p-4 w-[318px]">
          <p className="font-inter font-medium leading-[1.3] text-sm text-gray-12">
            Nome do ingresso
          </p>
        </div>
        <div className="flex flex-1 h-full items-center justify-center min-h-px min-w-px p-4">
          <p className="font-inter font-medium leading-[1.3] text-sm text-gray-12">
            Preço
          </p>
        </div>
        <div className="flex flex-1 h-full items-center justify-center min-h-px min-w-px p-4">
          <p className="font-inter font-medium leading-[1.3] text-sm text-gray-12">
            Modalide/Distância
          </p>
        </div>
        <div className="flex flex-1 h-full items-center justify-center min-h-px min-w-px p-4">
          <p className="font-inter font-medium leading-[1.3] text-sm text-gray-12">
            Produtos relacionados
          </p>
        </div>
        <div className="flex h-full items-center justify-center p-4 w-[148px] shrink-0">
          <p className="font-inter font-medium leading-[1.3] text-sm text-gray-12">
            Ações
          </p>
        </div>
      </div>

      {/* Rows */}
      <div className="flex flex-col items-start w-full">
        {tickets.map((ticket) => (
          <DraggableTicketRow
            key={ticket.id}
            ticket={ticket}
            productsMap={productsMap}
            onEdit={onEdit}
            onDuplicate={onDuplicate}
            onRequestDeleteTicket={onRequestDeleteTicket}
          />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 py-4 px-5 border-t border-gray-6">
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
              className={`size-8 flex items-center justify-center border rounded-lg ${currentPage === p
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
