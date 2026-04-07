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
import { Plus } from "lucide-react";
import { PencilIcon } from "@/components/Icons/PencilIcon";
import { normalizeTopicHtmlAnchorHrefs } from "@/lib/normalizeTopicHtmlLinks";
import { cn } from "@/utils/cn";
import type { TopicSectionRow } from "@/lib/eventTopicSections";

function SortableTopicCard({
  topic,
  onEdit,
}: {
  topic: TopicSectionRow;
  onEdit: (id: string) => void;
}) {
  const [mobileExpanded, setMobileExpanded] = useState(false);
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

  const html = normalizeTopicHtmlAnchorHrefs(topic.content);

  const richClass =
    "topic-rich-html text-gray-11 text-base font-family-dm-sans leading-[1.3] prose prose-sm max-w-none pr-1 min-h-0 [&_a]:pointer-events-none [&_a]:cursor-default";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex w-full max-w-full flex-col overflow-hidden rounded-xl border border-gray-8",
        isDragging && "z-10 opacity-60 shadow-lg ring-2 ring-primary-8/30",
      )}
    >
      {/* Cabeçalho — mobile Figma: «Ações»; desktop: título do tópico */}
      <div
        className="flex cursor-grab items-center justify-between gap-2 border-b border-gray-6 bg-gray-1 px-5 py-2 active:cursor-grabbing"
        aria-label="Arrastar para reordenar o tópico"
        {...attributes}
        {...listeners}
      >
        <div className="-mx-1 -my-0.5 flex min-w-0 flex-1 items-center rounded-md px-1 py-1 touch-none outline-none focus-visible:ring-2 focus-visible:ring-primary-8/35 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-1">
          <p className="min-w-0 truncate font-manrope text-base font-semibold leading-[1.1] text-gray-12 md:hidden">
            Ações
          </p>
          <p className="hidden min-w-0 truncate font-manrope text-base font-semibold leading-[1.1] text-gray-12 md:block">
            {topic.title}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            title="Editar"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => onEdit(topic.id)}
            className="flex size-9 cursor-pointer items-center justify-center rounded-lg border border-gray-6 bg-gray-2 transition-colors hover:bg-gray-3"
          >
            <PencilIcon className="size-5 text-gray-11" />
          </button>
        </div>
      </div>

      {/* Mobile Figma: título no corpo + colapsável + «Ver mais» */}
      <div className="hidden min-h-0 flex-col md:flex">
        <div className="flex min-h-0 flex-col gap-4 p-5">
          <div
            className={cn(
              richClass,
              "max-h-[min(42vh,360px)] overflow-y-auto",
            )}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
      </div>

      <div className="flex min-h-0 flex-col md:hidden">
        <div className="flex flex-col gap-6 p-5">
          <p className="font-manrope text-lg font-bold leading-[1.1] text-gray-12">
            {topic.title}
          </p>
          <div
            className={cn(
              richClass,
              "overflow-hidden",
              !mobileExpanded && "max-h-[min(45vh,280px)]",
              mobileExpanded && "max-h-[min(70vh,520px)] overflow-y-auto",
            )}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
        <div className="flex items-center justify-center border-t border-gray-6 bg-gray-1 px-5 py-2">
          <button
            type="button"
            className="flex h-7 items-center justify-center gap-1 px-11 font-family-dm-sans text-base font-semibold leading-[1.3] text-gray-11"
            onClick={() => setMobileExpanded((v) => !v)}
          >
            <Plus
              className={cn(
                "size-6 shrink-0 transition-transform",
                mobileExpanded && "rotate-45",
              )}
              aria-hidden
            />
            {mobileExpanded ? "Ver menos" : "Ver mais"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function SortableTopicsList({
  topics,
  onReorder,
  onEditTopic,
}: {
  topics: TopicSectionRow[];
  onReorder: (reordered: TopicSectionRow[]) => void;
  onEditTopic: (id: string) => void;
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
        <div className="flex w-full max-w-full flex-col gap-6 max-md:gap-8">
          {topics.map((topic) => (
            <SortableTopicCard
              key={topic.id}
              topic={topic}
              onEdit={onEditTopic}
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
