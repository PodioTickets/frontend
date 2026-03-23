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
  onEditDescription?: (categoryId: string, description: string) => void;
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
  onEditDescription,
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
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editingDescription, setEditingDescription] = useState(category.description || "");

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

  const handleSaveDescription = () => {
    if (onEditDescription) {
      onEditDescription(category.id, editingDescription.trim());
    }
    setIsEditingDescription(false);
  };

  const handleCancelDescription = () => {
    setEditingDescription(category.description || "");
    setIsEditingDescription(false);
  };

  return (
    <div
      ref={setNodeRef}
      data-category-id={category.id}
      className={`flex flex-col gap-6 bg-gray-3 border border-gray-6 rounded-xl p-5 transition-colors ${isOver ? "border-primary-11" : ""
        }`}
    >
      {/* Category Header */}
      <div className="flex flex-col gap-3 w-full">
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
        {/* Observation Field */}
        <div className="w-full">
          {isEditingDescription ? (
            <input
              type="text"
              value={editingDescription}
              onChange={(e) => setEditingDescription(e.target.value)}
              onBlur={handleSaveDescription}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSaveDescription();
                } else if (e.key === "Escape") {
                  handleCancelDescription();
                }
              }}
              placeholder="Adicione uma observação para o cliente..."
              className="text-gray-11 font-normal font-manrope leading-[1.4] bg-transparent border-b border-gray-6 focus:outline-none focus:border-primary-8 w-full"
              autoFocus
            />
          ) : (
            <div className="flex items-center gap-2">
              {category.description ? (
                <p
                  onClick={() => {
                    setIsEditingDescription(true);
                    setEditingDescription(category.description || "");
                  }}
                  className="text-gray-11 font-normal font-manrope leading-[1.4] w-full cursor-text hover:text-gray-12 transition-colors"
                >
                  {category.description}
                </p>
              ) : (
                <p
                  onClick={() => {
                    setIsEditingDescription(true);
                    setEditingDescription("");
                  }}
                  className="text-gray-11 font-normal font-manrope leading-[1.4] w-full cursor-text hover:text-gray-11 transition-colors"
                >
                  Adicione uma observação para o cliente...
                </p>
              )}
              <button
                onClick={() => {
                  setIsEditingDescription(true);
                  setEditingDescription(category.description || "");
                }}
                className="bg-gray-2 border-[1.5px] border-gray-6 p-1 rounded-lg hover:bg-gray-3 transition-colors size-7 flex items-center justify-center cursor-pointer shrink-0"
              >
                <PencilIcon className="size-4 text-gray-11" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tickets Content */}
      {tickets.length === 0 ? (
        <div className="bg-gray-3 border border-gray-6 rounded-xl flex flex-wrap gap-6 items-center justify-center p-5 w-full">
          <div className="flex flex-1 flex-col items-center justify-center min-h-px min-w-px py-0">
            <div className="bg-gray-3 flex flex-col items-start justify-center">
              <div className={`border-2 border-dashed flex gap-4 items-center justify-center overflow-clip p-4 rounded-xl w-full transition-colors ${isOver ? "border-primary-11 bg-primary-2" : "border-gray-6"
                }`}>
                <Plus className="size-10 text-primary-11" />
                <div className="flex flex-col items-start justify-center shrink-0">
                  <div className="flex flex-col gap-2 items-start justify-center whitespace-pre-wrap">
                    <p className="font-manrope font-bold leading-[1.1] text-lg text-primary-11 w-full">
                      Arraste um ingresso para essa categoria
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
