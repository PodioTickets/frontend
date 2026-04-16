"use client";

import { useState, useCallback, useMemo } from "react";
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
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/Button";
import { ImageWithInitialFallback } from "@/components/ImageWithInitialFallback";
import { PencilIcon } from "@/components/Icons/PencilIcon";
import { ExcludeIcon } from "@/components/Icons/Organizer/ExcludeIcon";
import toast from "react-hot-toast";
import { Plus } from "lucide-react";
import type { ProductData } from "./TicketForm.types";
import { formatProductPrice } from "./TicketForm.utils";

interface TicketProductsSectionProps {
  products: ProductData[];
  setProducts: React.Dispatch<React.SetStateAction<ProductData[]>>;
  eventId: string;
  ticketName: string;
  selectedGroupLabel: string;
  ticketBatchesTotalQuantity: number;
  openCreateProductModal: (params: {
    eventId: string;
    productId?: string;
    product?: ProductData["product"];
    ticketBatchesTotalQuantity: number;
    linkedTickets?: { name: string; categoryName: string }[];
  }) => void;
  openAddExistingProductsModal: (params: {
    eventId: string;
    excludeProductIds: string[];
  }) => void;
}

function SortableTicketProductCard({
  product,
  onEdit,
  onRemove,
  dragDisabled,
}: {
  product: ProductData;
  onEdit: () => void;
  onRemove: () => void;
  dragDisabled?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: product.productId,
    disabled: dragDisabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-gray-2 border border-gray-6 rounded-xl flex flex-col flex-1 min-w-0 md:min-w-[287px] ${isDragging ? "z-10 opacity-70 shadow-lg ring-2 ring-primary-8/25" : ""
        } ${dragDisabled
          ? ""
          : "cursor-grab touch-none active:cursor-grabbing [&_.ticket-product-actions]:cursor-default"
        }`}
      {...(dragDisabled ? {} : attributes)}
      {...(dragDisabled ? {} : listeners)}
    >
      <div className="border-b border-gray-6 flex flex-col gap-3 p-3 md:flex-row md:items-center md:gap-3 md:p-4">
        <div className="relative mx-auto aspect-square w-full max-h-[132px] max-w-[132px] rounded border border-gray-6 overflow-hidden bg-gray-3 shrink-0 md:mx-0 md:size-[100px] md:max-h-none md:max-w-none md:aspect-auto">
          <ImageWithInitialFallback
            src={product.product.image}
            alt={product.product.name}
            name={product.product.name}
            fallbackId={product.productId}
            fill
            sizes="(max-width: 768px) 132px, 100px"
            className="size-full rounded border-transparent border-0"
            letterClassName="text-base font-semibold font-family-dm-sans"
          />
        </div>
        <div className="flex flex-col justify-center gap-1.5 flex-1 min-w-0 md:justify-between md:py-2 md:gap-2">
          <h3 className="text-gray-12 text-sm font-semibold font-family-dm-sans leading-[1.1] line-clamp-2 md:text-base md:truncate md:line-clamp-none">
            {product.product.name}
          </h3>
          <p className="text-gray-11 text-xs font-semibold font-family-dm-sans leading-[1.3] md:text-sm">
            {product.product.isIncludedInTicket
              ? "Valor incluso no ingresso"
              : `R$ ${formatProductPrice(product.product.basePrice)}`}
          </p>
        </div>
      </div>

      <div
        className="ticket-product-actions flex flex-row items-center justify-end gap-2 p-3 md:flex-col md:items-end md:justify-center md:p-4"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="flex gap-2 items-center">
          <button
            type="button"
            title="Editar"
            onClick={onEdit}
            className="bg-gray-2 border border-gray-6 rounded-lg size-9 flex items-center justify-center hover:bg-gray-3 transition-colors"
          >
            <PencilIcon className="size-5 text-gray-11" />
          </button>
          <button
            type="button"
            title="Remover"
            onClick={onRemove}
            className="bg-red-2 border border-red-6 rounded-lg size-9 flex items-center justify-center hover:bg-red-3 transition-colors"
          >
            <ExcludeIcon className="size-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function TicketProductsSection({
  products,
  setProducts,
  eventId,
  ticketName,
  selectedGroupLabel,
  ticketBatchesTotalQuantity,
  openCreateProductModal,
  openAddExistingProductsModal,
}: TicketProductsSectionProps) {
  const [activeProductDragId, setActiveProductDragId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragStart = useCallback((e: DragStartEvent) => {
    setActiveProductDragId(e.active.id as string);
  }, []);

  const handleDragCancel = useCallback(() => {
    setActiveProductDragId(null);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveProductDragId(null);
      if (!over || active.id === over.id) return;
      const oldIndex = products.findIndex((p) => p.productId === active.id);
      const newIndex = products.findIndex((p) => p.productId === over.id);
      if (oldIndex < 0 || newIndex < 0) return;
      setProducts(arrayMove(products, oldIndex, newIndex));
    },
    [products, setProducts],
  );

  const activeDragProduct = useMemo(
    () =>
      activeProductDragId
        ? products.find((p) => p.productId === activeProductDragId)
        : undefined,
    [activeProductDragId, products],
  );

  const linkedTickets = ticketName.trim()
    ? [{ name: ticketName.trim(), categoryName: selectedGroupLabel }]
    : [];

  return (
    <div
      id="ticket-form-kit-products"
      className="flex flex-col gap-6 bg-gray-3 border border-gray-6 rounded-xl p-4"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between md:gap-6">
        <div className="flex flex-col gap-2">
          <h2 className="text-gray-12 text-lg font-semibold font-family-dm-sans leading-[1.1]">
            Produtos do Ingresso
          </h2>
          <p className="text-gray-11 text-base font-family-dm-sans leading-[1.3]">
            Adicione e gerencie os produtos do kit que ficarão disponíveis neste ingresso.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row md:shrink-0">
          <Button
            variant="outline"
            className="border-gray-6 text-gray-12 w-full md:w-auto"
            onClick={() => {
              if (!eventId) {
                toast.error("Evento não encontrado");
                return;
              }
              openAddExistingProductsModal({
                eventId,
                excludeProductIds: products
                  .map((p) => String(p.productId || p.id || "").trim())
                  .filter(Boolean),
              });
            }}
          >
            Adicionar produtos existentes
          </Button>
          <Button
            className="w-full md:w-auto"
            onClick={() => {
              if (!eventId) {
                toast.error("Evento não encontrado");
                return;
              }
              openCreateProductModal({
                eventId,
                ticketBatchesTotalQuantity,
                linkedTickets,
              });
            }}
          >
            <Plus className="size-5" />
            Criar um novo produto
          </Button>
        </div>
      </div>

      {products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 border border-gray-6 rounded-xl">
          <p className="text-gray-11 text-base font-family-dm-sans">
            Nenhum produto adicionado ainda
          </p>
        </div>
      ) : (
        <div className="bg-gray-2 border border-gray-6 rounded-xl p-5">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
          >
            <SortableContext
              items={products.map((p) => p.productId)}
              strategy={rectSortingStrategy}
            >
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                {products.map((product) => (
                  <SortableTicketProductCard
                    key={product.productId}
                    product={product}
                    dragDisabled={products.length < 2}
                    onEdit={() => {
                      if (!eventId) {
                        toast.error("Evento não encontrado");
                        return;
                      }
                      openCreateProductModal({
                        eventId,
                        productId: product.productId,
                        product: product.product,
                        ticketBatchesTotalQuantity,
                        linkedTickets,
                      });
                    }}
                    onRemove={() => {
                      setProducts((prev) =>
                        prev.filter((p) => p.productId !== product.productId),
                      );
                      toast.success("Produto removido do ingresso");
                    }}
                  />
                ))}
              </div>
            </SortableContext>
            <DragOverlay dropAnimation={null}>
              {activeDragProduct ? (
                <div className="bg-gray-2 border border-gray-6 rounded-xl flex flex-col flex-1 min-w-[287px] max-w-[368px] shadow-2xl opacity-95 cursor-grabbing">
                  <div className="border-b border-gray-6 flex gap-3 items-center p-4">
                    <div className="flex flex-col justify-center min-w-0 flex-1 py-1">
                      <p className="text-gray-12 text-base font-semibold font-family-dm-sans truncate">
                        {activeDragProduct.product.name}
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>
      )}
    </div>
  );
}
