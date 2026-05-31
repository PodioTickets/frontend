"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useDroppable } from "@dnd-kit/core";
import { PencilIcon } from "@/components/Icons/PencilIcon";
import { TrashIcon } from "@/components/Icons/TrashIcon";
import type { ModalityGroup } from "@/services/organizer/OrganizerService";
import { TicketTable } from "./TicketTable";
import { DeleteTicketCategoryModal } from "./DeleteTicketCategoryModal";
import { CategoryDeleteBlockedModal } from "./CategoryDeleteBlockedModal";
import type { Ticket } from "@/hooks/useTickets";
import type { TicketMoveCategoryOption } from "./TicketTable";

interface TicketCategoryCardProps {
  category: ModalityGroup;
  /** Ingressos exibidos na página atual (tabela paginada). */
  tickets: Ticket[];
  /** Total de ingressos na categoria (todas as páginas), para bloquear exclusão e avisos. */
  totalTicketsInCategory: number;
  currentPage: number;
  totalPages: number;
  onEdit: (categoryId: string, name: string) => void;
  onEditDescription?: (categoryId: string, description: string) => void;
  onDelete: (categoryId: string) => void | Promise<void>;
  onEditTicket: (ticketId: string) => void;
  onPageChange: (categoryId: string, page: number) => void;
  onDuplicateTicket: (ticketId: string) => void;
  duplicatingTicketId?: string | null;
  productsMap?: Record<string, { id: string; name: string; image: string | null }>;
  onDropTicket?: (ticketId: string, categoryId: string) => void;
  moveCategoryOptions?: TicketMoveCategoryOption[];
  onMoveTicketToCategory?: (
    ticketId: string,
    categoryId: string | null,
  ) => void | Promise<void>;
  /** Mover um ingresso uma posição (cima/baixo) dentro desta categoria via menu mobile. */
  onMoveTicketWithinScope?: (
    ticketId: string,
    direction: "up" | "down",
  ) => void | Promise<void>;
  /** Sobrescreve bordas/raio quando a categoria está dentro de um wrapper (ex.: sortable). */
  className?: string;
  /** Quando true, não renderiza a linha do nome + lápis + lixeira (ex.: header no SortableTicketCategoryItem). */
  hideCategoryTitleRow?: boolean;
}

export function TicketCategoryCard({
  category,
  tickets,
  totalTicketsInCategory,
  currentPage,
  totalPages,
  onEdit,
  onEditDescription,
  onDelete,
  onEditTicket,
  onPageChange,
  onDuplicateTicket,
  duplicatingTicketId = null,
  productsMap = {},
  onDropTicket,
  moveCategoryOptions,
  onMoveTicketToCategory,
  onMoveTicketWithinScope,
  className: rootClassName,
  hideCategoryTitleRow = false,
}: TicketCategoryCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editingName, setEditingName] = useState(category.name);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editingDescription, setEditingDescription] = useState(category.description || "");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [blockedDeleteModalOpen, setBlockedDeleteModalOpen] = useState(false);

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
    <>
      {!hideCategoryTitleRow && (
        <>
          <CategoryDeleteBlockedModal
            open={blockedDeleteModalOpen}
            onClose={() => setBlockedDeleteModalOpen(false)}
          />
          <DeleteTicketCategoryModal
            open={deleteModalOpen}
            onClose={() => setDeleteModalOpen(false)}
            canDelete={totalTicketsInCategory === 0}
            onConfirm={() => onDelete(category.id)}
          />
        </>
      )}
    <div
      ref={setNodeRef}
      data-category-id={category.id}
      className={`flex flex-col transition-colors ${hideCategoryTitleRow
        ? "gap-3 border-0 bg-transparent p-0 md:gap-6 md:bg-gray-3 md:p-5"
        : "gap-6 border border-gray-6 bg-gray-3 p-5"
        } ${isOver ? "border-primary-11" : ""}${rootClassName ? ` ${rootClassName}` : ""}`}
    >
      {/* Category Header */}
      <div
        className={`flex w-full flex-col gap-3 ${hideCategoryTitleRow ? "hidden md:flex" : ""}`}
      >
        {!hideCategoryTitleRow && (
          <div className="flex items-center justify-between flex-wrap gap-4 w-full">
            <div className="flex min-w-0 flex-1 items-center gap-[10px]">
              {isEditing ? (
                <div className="min-w-0 max-w-full flex-1 overflow-hidden">
                  <div className="inline-grid w-[min(100%,max-content)] max-w-full align-middle">
                    <span
                      aria-hidden
                      className="invisible col-start-1 row-start-1 whitespace-pre px-0 text-2xl font-bold font-manrope leading-[1.1]"
                    >
                      {editingName.length > 0 ? editingName : "\u00a0"}
                    </span>
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onBlur={handleSave}
                      onKeyDown={(e) => {
                        e.stopPropagation();
                        if (e.key === "Enter") {
                          handleSave();
                        } else if (e.key === "Escape") {
                          handleCancel();
                        }
                      }}
                      className="col-start-1 row-start-1 min-w-0 w-full max-w-full overflow-x-auto border-0 border-b border-gray-6 bg-transparent py-0 text-2xl font-bold font-manrope leading-[1.1] text-gray-12 focus:border-primary-8 focus:outline-none"
                      autoFocus
                    />
                  </div>
                </div>
              ) : (
                <h3 className="min-w-0 truncate text-gray-12 text-2xl font-bold font-manrope leading-[1.1]">
                  {category.name}
                </h3>
              )}
              <button
                type="button"
                title="Editar"
                onClick={() => {
                  setIsEditing(true);
                  setEditingName(category.name);
                }}
                className="shrink-0 bg-gray-2 border-[1.5px] border-gray-6 p-1 rounded-lg hover:bg-gray-3 transition-colors size-9 flex items-center justify-center cursor-pointer"
              >
                <PencilIcon className="size-5 text-gray-11" />
              </button>
            </div>
            <div className="flex items-center">
              <button
                type="button"
                title="Deletar"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() =>
                  totalTicketsInCategory > 0
                    ? setBlockedDeleteModalOpen(true)
                    : setDeleteModalOpen(true)
                }
                className="bg-red-2 border-[1.5px] border-red-6 p-1 rounded-lg hover:bg-red-3 transition-colors size-9 flex items-center justify-center cursor-pointer"
              >
                <TrashIcon className="size-5 text-red-12" />
              </button>
            </div>
          </div>
        )}
        {/* Observation Field */}
        <div className="w-full">
          {isEditingDescription ? (
            <input
              type="text"
              value={editingDescription}
              onChange={(e) => setEditingDescription(e.target.value)}
              onBlur={handleSaveDescription}
              onKeyDown={(e) => {
                e.stopPropagation();
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
            </div>
          )}
        </div>
      </div>

      {/* Tickets Content */}
      {tickets.length === 0 ? (
        <div className="flex w-full flex-wrap items-center justify-center gap-6 rounded-xl border border-gray-6 bg-gray-1 p-5 md:bg-gray-3">
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
          duplicatingTicketId={duplicatingTicketId}
          productsMap={productsMap}
          ticketScopeCategoryId={category.id}
          moveCategoryOptions={moveCategoryOptions}
          onMoveTicketToCategory={onMoveTicketToCategory}
          onMoveTicketWithinScope={onMoveTicketWithinScope}
        />
      )}
    </div>
    </>
  );
}
