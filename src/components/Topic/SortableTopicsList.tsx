"use client";

import { useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { PencilIcon } from "@/components/Icons/PencilIcon";
import { TrashIcon } from "@/components/Icons/TrashIcon";
import { GripVertical } from "lucide-react";
import type { TopicSectionRow } from "@/lib/eventTopicSections";

function SortableTopicCard({
  topic,
  onEdit,
  onDelete,
}: {
  topic: TopicSectionRow;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void | Promise<void>;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: topic.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const headingClass =
    topic.variant === "default"
      ? "text-gray-12 text-2xl font-bold font-manrope leading-[1.1]"
      : "text-gray-12 text-xl font-bold font-manrope leading-[1.1]";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`border border-gray-8 rounded-xl w-full max-w-full flex flex-col overflow-hidden ${
        isDragging ? "z-10 opacity-60 shadow-lg ring-2 ring-primary-8/30" : ""
      }`}
    >
      <div className="bg-gray-1 border-b border-gray-6 flex items-center justify-between px-5 py-2 gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <button
            type="button"
            className="shrink-0 cursor-grab touch-none rounded-lg border border-transparent p-1.5 text-gray-11 hover:bg-gray-3 hover:border-gray-6 active:cursor-grabbing"
            aria-label="Arrastar para reordenar"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="size-5" />
          </button>
          <p className="text-gray-12 text-base font-semibold font-manrope leading-[1.1] truncate">
            Ações
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onEdit(topic.id)}
            className="bg-gray-2 border-[1.5px] border-gray-6 rounded-lg hover:bg-gray-3 transition-colors size-9 flex items-center justify-center cursor-pointer"
          >
            <PencilIcon className="size-5 text-gray-11" />
          </button>
          {topic.allowDelete ? (
            <button
              type="button"
              onClick={() => onDelete(topic.id)}
              className="bg-red-2 border-[1.5px] border-red-6 p-2 rounded-lg hover:bg-red-3 transition-colors size-9 flex items-center justify-center cursor-pointer"
            >
              <TrashIcon className="size-5 text-red-11" />
            </button>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-4 p-5 min-h-0">
        {topic.variant === "default" ? (
          <h2 className={headingClass}>{topic.title}</h2>
        ) : (
          <h3 className={headingClass}>{topic.title}</h3>
        )}
        <div
          className="text-gray-11 text-base font-family-dm-sans leading-[1.3] prose prose-sm max-w-none max-h-[min(42vh,360px)] overflow-y-auto pr-1 min-h-0"
          dangerouslySetInnerHTML={{ __html: topic.content }}
        />
      </div>
    </div>
  );
}

export function SortableTopicsList({
  topics,
  onReorder,
  onEditTopic,
  onDeleteTopic,
}: {
  topics: TopicSectionRow[];
  onReorder: (reordered: TopicSectionRow[]) => void;
  onEditTopic: (id: string) => void;
  onDeleteTopic: (id: string) => void | Promise<void>;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (e: DragStartEvent) => {
    setActiveId(e.active.id as string);
  };

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    setActiveId(null);
    if (!over || active.id === over.id) return;
    const oldIndex = topics.findIndex((t) => t.id === active.id);
    const newIndex = topics.findIndex((t) => t.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    onReorder(arrayMove(topics, oldIndex, newIndex));
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  const activeTopic = activeId ? topics.find((t) => t.id === activeId) : null;

  if (topics.length === 0) return null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <SortableContext
        items={topics.map((t) => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex flex-col gap-6 w-full max-w-full">
          {topics.map((topic) => (
            <SortableTopicCard
              key={topic.id}
              topic={topic}
              onEdit={onEditTopic}
              onDelete={onDeleteTopic}
            />
          ))}
        </div>
      </SortableContext>
      <DragOverlay dropAnimation={null}>
        {activeTopic ? (
          <div className="border border-gray-8 rounded-xl bg-gray-1 shadow-2xl w-full max-w-[min(calc(100vw-2.5rem),843px)]">
            <div className="bg-gray-1 border-b border-gray-6 px-5 py-3">
              <p className="text-gray-12 text-base font-semibold font-manrope truncate">
                {activeTopic.title}
              </p>
            </div>
            <div className="p-4 text-sm text-gray-11">Arraste para alterar a ordem</div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
