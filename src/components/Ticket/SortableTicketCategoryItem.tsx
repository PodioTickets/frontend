"use client";

import { useEffect, useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { categorySortableId } from "@/lib/ticketCategoryOrder";
import type { ModalityGroup } from "@/services/organizer/OrganizerService";
import { PencilIcon } from "@/components/Icons/PencilIcon";
import { TrashIcon } from "@/components/Icons/TrashIcon";
import { DeleteTicketCategoryModal } from "./DeleteTicketCategoryModal";
import { CategoryDeleteBlockedModal } from "./CategoryDeleteBlockedModal";

export function SortableTicketCategoryItem({
  categoryId,
  category,
  totalTicketsInCategory,
  onEdit,
  onDelete,
  children,
}: {
  categoryId: string;
  category: ModalityGroup;
  totalTicketsInCategory: number;
  onEdit: (categoryId: string, name: string) => void;
  onDelete: (categoryId: string) => void | Promise<void>;
  children: React.ReactNode;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editingName, setEditingName] = useState(category.name);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [blockedDeleteModalOpen, setBlockedDeleteModalOpen] = useState(false);

  useEffect(() => {
    if (!isEditing) {
      setEditingName(category.name);
    }
  }, [category.name, isEditing]);

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
        className={`flex w-full max-w-full flex-col overflow-hidden rounded-xl border border-gray-6 ${
          isDragging
            ? "z-10 opacity-60 shadow-lg ring-2 ring-primary-8/30"
            : ""
        }`}
      >
        <div
          className="flex min-h-[44px] min-w-0 flex-1 cursor-grab touch-none items-center justify-between gap-3 border-b border-gray-6 bg-gray-1 px-5 py-2 outline-none hover:bg-gray-2/80 active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-primary-8/35 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-1"
          aria-label="Arrastar para reordenar a categoria"
          {...attributes}
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
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => {
                setIsEditing(true);
                setEditingName(category.name);
              }}
              className="shrink-0 flex size-9 cursor-pointer items-center justify-center rounded-lg border-[1.5px] border-gray-6 bg-gray-2 p-1 transition-colors hover:bg-gray-3"
              aria-label="Editar nome da categoria"
            >
              <PencilIcon className="size-5 text-gray-11" />
            </button>
          </div>
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() =>
              totalTicketsInCategory > 0
                ? setBlockedDeleteModalOpen(true)
                : setDeleteModalOpen(true)
            }
            className="shrink-0 flex size-9 cursor-pointer items-center justify-center rounded-lg border-[1.5px] border-red-6 bg-red-2 p-1 transition-colors hover:bg-red-3"
            aria-label="Excluir categoria"
          >
            <TrashIcon className="size-5 text-red-12" />
          </button>
        </div>
        <div className="flex flex-col">{children}</div>
      </div>
    </>
  );
}
