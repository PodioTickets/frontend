"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { categorySortableId } from "@/lib/ticketCategoryOrder";

export function SortableTicketCategoryItem({
  categoryId,
  children,
}: {
  categoryId: string;
  children: React.ReactNode;
}) {
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex w-full max-w-full flex-col overflow-hidden rounded-xl border border-gray-6 ${
        isDragging ? "z-10 opacity-60 shadow-lg ring-2 ring-primary-8/30" : ""
      }`}
    >
      <div
        className="flex min-h-[44px] min-w-0 flex-1 cursor-grab touch-none items-center border-b border-gray-6 bg-gray-1 px-5 py-2 outline-none hover:bg-gray-2/80 active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-primary-8/35 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-1"
        aria-label="Arrastar para reordenar a categoria"
        {...attributes}
        {...listeners}
        onMouseDown={(e) => e.preventDefault()}
      >
        <p className="min-w-0 truncate text-base font-semibold font-manrope leading-[1.1] text-gray-12">
          Ações
        </p>
      </div>
      <div className="flex flex-col">{children}</div>
    </div>
  );
}
