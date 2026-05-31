"use client";

import { useEffect, useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDown } from "lucide-react";
import { categorySortableId } from "@/lib/ticketCategoryOrder";
import type { ModalityGroup } from "@/services/organizer/OrganizerService";
import { PencilIcon } from "@/components/Icons/PencilIcon";
import { TickIcon } from "@/components/Icons/TickIcon";
import { TrashIcon } from "@/components/Icons/TrashIcon";
import { DeleteTicketCategoryModal } from "./DeleteTicketCategoryModal";
import { CategoryDeleteBlockedModal } from "./CategoryDeleteBlockedModal";
import { cn } from "@/utils/cn";

export function SortableTicketCategoryItem({
  categoryId,
  category,
  totalTicketsInCategory,
  onEdit,
  onEditDescription,
  onDelete,
  onMobileEditCategory,
  children,
}: {
  categoryId: string;
  category: ModalityGroup;
  totalTicketsInCategory: number;
  onEdit: (categoryId: string, name: string) => void;
  onEditDescription?: (categoryId: string, description: string) => void;
  onDelete: (categoryId: string) => void | Promise<void>;
  /** Mobile: abre o drawer de edição (Figma) em vez de inputs inline. */
  onMobileEditCategory?: (categoryId: string) => void;
  children: React.ReactNode;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editingName, setEditingName] = useState(category.name);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [blockedDeleteModalOpen, setBlockedDeleteModalOpen] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState(true);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editingDescription, setEditingDescription] = useState(category.description || "");

  useEffect(() => {
    if (!isEditing) {
      setEditingName(category.name);
    }
  }, [category.name, isEditing]);

  useEffect(() => {
    if (!isEditingDescription) {
      setEditingDescription(category.description || "");
    }
  }, [category.description, isEditingDescription]);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: categorySortableId(categoryId) });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleSave = () => {
    if (editingName.trim()) {
      onEdit(categoryId, editingName.trim());
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setEditingName(category.name);
    setIsEditing(false);
  };

  const handleSaveDescription = () => {
    if (onEditDescription) {
      onEditDescription(categoryId, editingDescription.trim());
    }
    setIsEditingDescription(false);
  };

  const handleCancelDescription = () => {
    setEditingDescription(category.description || "");
    setIsEditingDescription(false);
  };

  const ingressosLabel =
    totalTicketsInCategory === 1
      ? "1 Ingresso"
      : `${totalTicketsInCategory} Ingressos`;

  return (
    <>
      <CategoryDeleteBlockedModal
        open={blockedDeleteModalOpen}
        onClose={() => setBlockedDeleteModalOpen(false)}
      />
      <DeleteTicketCategoryModal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        canDelete={totalTicketsInCategory === 0}
        onConfirm={() => onDelete(categoryId)}
      />
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        className={cn(
          "flex w-full max-w-full flex-col overflow-hidden rounded-xl border border-gray-6 bg-gray-1",
          isDragging ? "z-10 opacity-60 shadow-lg ring-2 ring-primary-8/30" : "",
        )}
      >
        {/* Desktop — arrastar + título */}
        <div
          className="hidden min-h-[44px] min-w-0 flex-1 cursor-grab touch-none items-center justify-between gap-3 border-b border-gray-6 bg-gray-1 px-5 py-2 outline-none hover:bg-gray-2/80 active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-primary-8/35 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-1 md:flex"
          aria-label="Arrastar para reordenar a categoria"
          {...listeners}
        >
          <div className="flex min-w-0 flex-1 items-center gap-[10px]">
            {isEditing ? (
              <div
                className="min-w-0 max-w-full flex-1 overflow-hidden"
                onPointerDown={(e) => e.stopPropagation()}
              >
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
              <h3 className="min-w-0 flex-1 truncate text-2xl font-bold font-manrope leading-[1.1] text-gray-12">
                {category.name}
              </h3>
            )}
            <button
              type="button"
              title={isEditing ? "Salvar" : "Editar"}
              onPointerDown={(e) => e.stopPropagation()}
              onMouseDown={isEditing ? (e) => e.preventDefault() : undefined}
              onClick={() => {
                if (isEditing) {
                  handleSave();
                } else {
                  setIsEditing(true);
                  setEditingName(category.name);
                }
              }}
              className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border-[1.5px] border-gray-6 bg-gray-2 p-1 transition-colors hover:bg-gray-3"
              aria-label={isEditing ? "Salvar nome da categoria" : "Editar nome da categoria"}
            >
              {isEditing ? (
                <TickIcon className="size-5 text-gray-11" />
              ) : (
                <PencilIcon className="size-5 text-gray-11" />
              )}
            </button>
          </div>
          <button
            type="button"
            title="Deletar"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() =>
              totalTicketsInCategory > 0
                ? setBlockedDeleteModalOpen(true)
                : setDeleteModalOpen(true)
            }
            className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border-[1.5px] border-red-6 bg-red-2 p-1 transition-colors hover:bg-red-3"
            aria-label="Deletar categoria"
          >
            <TrashIcon className="size-5 text-red-12" />
          </button>
        </div>

        {/* Mobile — Figma: título, descrição, rodapé com contagem e ações */}
        <div className="flex flex-col border-b border-gray-6 md:hidden" {...listeners}>
          <div className="flex flex-col gap-4 px-4 py-5">
            <div className="flex w-full flex-col gap-3">
              {onMobileEditCategory ? (
                <>
                  <p className="font-manrope text-base font-bold leading-[1.1] text-gray-12">
                    {category.name}
                  </p>
                  <p className="font-family-dm-sans text-sm font-normal leading-[1.3] text-gray-11">
                    {category.description ||
                      "Adicione uma observação para o cliente..."}
                  </p>
                </>
              ) : (
                <>
                  {isEditing ? (
                    <div onPointerDown={(e) => e.stopPropagation()} className="w-full">
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onBlur={handleSave}
                        onKeyDown={(e) => {
                          e.stopPropagation();
                          if (e.key === "Enter") handleSave();
                          else if (e.key === "Escape") handleCancel();
                        }}
                        className="w-full border-0 border-b border-gray-6 bg-transparent font-manrope text-base font-bold leading-[1.1] text-gray-12 focus:border-primary-8 focus:outline-none"
                        autoFocus
                      />
                    </div>
                  ) : (
                    <p className="font-manrope text-base font-bold leading-[1.1] text-gray-12">
                      {category.name}
                    </p>
                  )}
                  {onEditDescription ? (
                    isEditingDescription ? (
                      <input
                        type="text"
                        value={editingDescription}
                        onChange={(e) => setEditingDescription(e.target.value)}
                        onBlur={handleSaveDescription}
                        onKeyDown={(e) => {
                          e.stopPropagation();
                          if (e.key === "Enter") handleSaveDescription();
                          else if (e.key === "Escape") handleCancelDescription();
                        }}
                        placeholder="Adicione uma observação para o cliente..."
                        className="w-full border-0 border-b border-gray-6 bg-transparent font-family-dm-sans text-sm font-normal leading-[1.3] text-gray-11 focus:border-primary-8 focus:outline-none"
                        autoFocus
                        onPointerDown={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <button
                        type="button"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={() => {
                          setIsEditingDescription(true);
                          setEditingDescription(category.description || "");
                        }}
                        className="w-full text-left font-family-dm-sans text-sm font-normal leading-[1.3] text-gray-11 hover:text-gray-12"
                      >
                        {category.description ||
                          "Adicione uma observação para o cliente..."}
                      </button>
                    )
                  ) : category.description ? (
                    <p className="font-family-dm-sans text-sm font-normal leading-[1.3] text-gray-11">
                      {category.description}
                    </p>
                  ) : null}
                </>
              )}
            </div>
            <div className="flex w-full items-center justify-between gap-2">
              <p className="font-family-dm-sans text-sm font-normal leading-[1.3] text-gray-11">
                {ingressosLabel}
              </p>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  title="Editar"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => {
                    if (onMobileEditCategory) {
                      onMobileEditCategory(categoryId);
                      return;
                    }
                    setIsEditing(true);
                    setEditingName(category.name);
                  }}
                  className="flex size-8 cursor-pointer items-center justify-center rounded-lg border border-gray-6 bg-gray-2 p-2 transition-colors hover:bg-gray-3"
                  aria-label="Editar nome da categoria"
                >
                  <PencilIcon className="size-5 text-gray-11" />
                </button>
                <button
                  type="button"
                  title="Deletar"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() =>
                    totalTicketsInCategory > 0
                      ? setBlockedDeleteModalOpen(true)
                      : setDeleteModalOpen(true)
                  }
                  className="flex size-8 cursor-pointer items-center justify-center rounded-lg border border-red-6 bg-red-2 p-2 transition-colors hover:bg-red-3"
                  aria-label="Deletar categoria"
                >
                  <TrashIcon className="size-5 text-red-12" />
                </button>
                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => setMobileExpanded((v) => !v)}
                  className="flex size-8 items-center justify-center text-gray-12"
                  aria-expanded={mobileExpanded}
                  aria-label={mobileExpanded ? "Recolher ingressos" : "Expandir ingressos"}
                >
                  <ChevronDown
                    className={cn(
                      "size-8 transition-transform",
                      mobileExpanded ? "rotate-180" : "",
                    )}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div
          className={cn(
            "flex flex-col px-3 py-4 md:px-0 md:py-0",
            !mobileExpanded && "hidden md:flex",
          )}
        >
          {children}
        </div>
      </div>
    </>
  );
}
