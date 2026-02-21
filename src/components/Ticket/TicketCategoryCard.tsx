"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useDroppable } from "@dnd-kit/core";
import { PencilIcon } from "@/components/Icons/PencilIcon";
import { TrashIcon } from "@/components/Icons/TrashIcon";
import type { ModalityGroup } from "@/services/organizer/OrganizerService";
import { TicketTable } from "./TicketTable";
import type { Ticket } from "@/hooks/useTickets";

interface TicketCategoryCardProps {
  category: ModalityGroup;
  tickets: Ticket[];
  currentPage: number;
  totalPages: number;
  onEdit: (categoryId: string, name: string) => void;
  onDelete: (categoryId: string) => void;
  onEditTicket: (ticketId: string) => void;
  onDeleteTicket: (ticketId: string) => void;
  onPageChange: (categoryId: string, page: number) => void;
  onDuplicateTicket: (ticketId: string) => void;
  productsMap?: Record<string, { id: string; name: string; image: string | null }>;
  onDropTicket?: (ticketId: string, categoryId: string) => void;
}

export function TicketCategoryCard({
  category,
  tickets,
  currentPage,
  totalPages,
  onEdit,
  onDelete,
  onEditTicket,
  onDeleteTicket,
  onPageChange,
  onDuplicateTicket,
  productsMap = {},
  onDropTicket,
}: TicketCategoryCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editingName, setEditingName] = useState(category.name);

  const { setNodeRef, isOver } = useDroppable({
    id: `category-${category.id}`,
    data: {
      type: "category",
      categoryId: category.id,
    },
  });

  const handleSave = () => {
    if (editingName.trim()) {
      onEdit(category.id, editingName.trim());
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setEditingName(category.name);
    setIsEditing(false);
  };

  return (
    <div
      ref={setNodeRef}
      data-category-id={category.id}
      className={`flex flex-col gap-6 bg-gray-3 border border-gray-6 rounded-xl p-5 transition-colors ${isOver ? "border-primary-11" : ""
        }`}
    >
      {/* Category Header */}
      <div className="flex items-center justify-between flex-wrap gap-4 w-full">
        <div className="flex gap-[10px] items-center">
          {isEditing ? (
            <input
              type="text"
              value={editingName}
              onChange={(e) => setEditingName(e.target.value)}
              onBlur={handleSave}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSave();
                } else if (e.key === "Escape") {
                  handleCancel();
                }
              }}
              className="text-gray-12 text-2xl font-bold font-manrope leading-[1.1] bg-transparent border-b border-gray-6 focus:outline-none focus:border-primary-8"
              autoFocus
            />
          ) : (
            <h3 className="text-gray-12 text-2xl font-bold font-manrope leading-[1.1]">
              {category.name}
            </h3>
          )}
          <button
            onClick={() => {
              setIsEditing(true);
              setEditingName(category.name);
            }}
            className="bg-gray-2 border-[1.5px] border-gray-6 p-1 rounded-lg hover:bg-gray-3 transition-colors size-9 flex items-center justify-center cursor-pointer"
          >
            <PencilIcon className="size-5 text-gray-11" />
          </button>
        </div>
        <div className="flex items-center">
          <button
            onClick={() => {
              if (confirm("Tem certeza que deseja excluir esta categoria?")) {
                onDelete(category.id);
              }
            }}
            className="bg-red-2 border-[1.5px] border-red-6 p-1 rounded-lg hover:bg-red-3 transition-colors size-9 flex items-center justify-center cursor-pointer"
          >
            <TrashIcon className="size-5 text-red-12" />
          </button>
        </div>
      </div>

      {/* Tickets Content */}
      {tickets.length === 0 ? (
        <div className="bg-gray-3 border border-gray-6 rounded-xl flex flex-wrap gap-6 items-center justify-center p-5 w-full">
          <div className="flex flex-1 flex-col items-center justify-center min-h-px min-w-px py-11">
            <div className="bg-gray-1 flex flex-col items-start justify-center">
              <div className={`border-2 border-dashed flex gap-4 items-center justify-center overflow-clip p-6 rounded-xl w-full transition-colors ${isOver ? "border-primary-11 bg-primary-2" : "border-gray-6"
                }`}>
                <div className="overflow-clip relative shrink-0 size-16">
                  <Plus className="size-16 text-primary-11" />
                </div>
                <div className="flex flex-col items-start justify-center shrink-0">
                  <div className="flex flex-col gap-4 items-start justify-center whitespace-pre-wrap">
                    <p className="font-manrope font-bold leading-[1.1] text-xl text-primary-11 w-full">
                      Arraste um ingresso para este campo
                    </p>
                    <p className="font-family-dm-sans font-normal leading-[1.3] text-base text-gray-12 w-full">
                      Você também pode deixar tudo em "Ingressos geral"
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <TicketTable
          tickets={tickets}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={(page) => onPageChange(category.id, page)}
          onEdit={onEditTicket}
          onDuplicate={onDuplicateTicket}
          productsMap={productsMap}
        />
      )}
    </div>
  );
}
