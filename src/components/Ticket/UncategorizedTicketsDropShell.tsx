"use client";

import { useDroppable } from "@dnd-kit/core";

export function UncategorizedTicketsDropShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: "category-uncategorized",
    data: { type: "category", categoryId: "uncategorized" },
  });

  return (
    <div
      ref={setNodeRef}
      data-category-id="uncategorized"
      className={`rounded-xl transition-colors ${isOver ? "ring-2 ring-primary-11 ring-offset-2 ring-offset-gray-2" : ""}`}
    >
      {children}
    </div>
  );
}
