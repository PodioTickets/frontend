"use client";

import { useLayoutEffect, useMemo, useState } from "react";
import {
  Pencil,
  Plus,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  X,
  Copy,
  Move,
  Folder,
  Ticket as TicketIcon,
  SquareArrowUp,
  SquareArrowDown,
} from "lucide-react";
import { ImageWithInitialFallback } from "@/components/ImageWithInitialFallback";
import { CSS } from "@dnd-kit/utilities";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { ticketDragId } from "@/lib/organizerTicketListDnD";
import type { Ticket } from "@/hooks/useTickets";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerTitle,
} from "@/components/ui/drawer";

export type TicketMoveCategoryOption = {
  id: string;
  name: string;
  ticketCount: number;
  /** Lista «Sem categoria» / gerais — envia `categoryId: null` ao mover. */
  isUncategorizedBucket?: boolean;
};

interface TicketTableProps {
  tickets: Ticket[];
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onEdit: (ticketId: string) => void;
  onDuplicate: (ticketId: string) => void;
  /** Ingresso em processo de duplicação (mostra spinner no botão) */
  duplicatingTicketId?: string | null;
  productsMap?: Record<string, { id: string; name: string; image: string | null }>;
  /** Categoria desta tabela: `null` = ingressos gerais (sem categoria). */
  ticketScopeCategoryId?: string | null;
  /** Destinos para mover no mobile (exceto o atual, filtrado dentro do componente). */
  moveCategoryOptions?: TicketMoveCategoryOption[];
  onMoveTicketToCategory?: (
    ticketId: string,
    categoryId: string | null,
  ) => void | Promise<void>;
  /**
   * Move um ingresso uma posição (cima/baixo) dentro do escopo atual.
   * No-op silencioso quando já está nas pontas — o botão correspondente é
   * desabilitado dentro do componente.
   */
  onMoveTicketWithinScope?: (
    ticketId: string,
    direction: "up" | "down",
  ) => void | Promise<void>;
}

const formatPrice = (price: string) => {
  if (!price) return "R$ 0,00";

  if (price.startsWith("R$")) {
    return price;
  }

  const numericValue = parseFloat(price);
  if (!isNaN(numericValue)) {
    return `R$ ${(numericValue / 100).toFixed(2).replace(".", ",")}`;
  }

  return `R$ ${price}`;
};

function DuplicateRowSpinner() {
  return (
    <span
      className="inline-block size-[18px] shrink-0 animate-spin rounded-full border-2 border-gray-6 border-b-primary-11"
      aria-hidden
    />
  );
}

function useOrganizerTicketMobileNoDrag() {
  const [off, setOff] = useState(false);
  useLayoutEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const apply = () => setOff(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  return off;
}

const MAX_VISIBLE_PRODUCTS = 5;

function TicketProductThumbnails({
  ticket,
  productsMap,
}: {
  ticket: Ticket;
  productsMap: Record<string, { id: string; name: string; image: string | null }>;
}) {
  const ticketProducts = ticket.products
    .map((productId) => productsMap[productId])
    .filter(Boolean)
    .slice(0, MAX_VISIBLE_PRODUCTS);
  const remainingCount = Math.max(0, ticket.products.length - MAX_VISIBLE_PRODUCTS);

  if (ticketProducts.length === 0 && remainingCount === 0) {
    return <span className="font-family-dm-sans text-sm text-gray-11">—</span>;
  }

  return (
    <div className="flex h-9 items-center pr-2">
      <div className="flex h-9 items-center gap-0">
        {ticketProducts.map((product) => (
          <div
            key={product.id}
            className="-mr-2 flex h-9 max-w-[36.5px] shrink-0 overflow-clip rounded-md last:mr-0"
          >
            <div className="relative size-9 overflow-hidden rounded-md border-[0.537px] border-gray-6 bg-gray-3">
              <ImageWithInitialFallback
                src={product.image}
                alt={product.name}
                name={product.name}
                fallbackId={product.id}
                fill
                sizes="36px"
                className="size-full rounded-md"
                letterClassName="text-base font-semibold"
              />
            </div>
          </div>
        ))}
        {remainingCount > 0 && (
          <div className="relative -mr-2 flex h-9 max-w-[36.5px] shrink-0 overflow-clip rounded-[2.15px]">
            <div className="relative size-9 overflow-hidden rounded-[2.15px] border-[0.537px] border-gray-6 bg-gray-3">
              {ticketProducts.length > 0 ? (
                <ImageWithInitialFallback
                  src={ticketProducts[ticketProducts.length - 1]?.image}
                  alt=""
                  name={ticketProducts[ticketProducts.length - 1]?.name ?? ""}
                  fallbackId={ticketProducts[ticketProducts.length - 1]?.id}
                  fill
                  sizes="36px"
                  className="size-full rounded-[2.15px]"
                  letterClassName="text-base font-semibold"
                />
              ) : null}
              <div className="absolute inset-0 rounded-[2.15px] bg-black/80" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex items-center gap-[2.3px]">
                  <Plus className="size-[6.93px] text-white" />
                  <p className="font-manrope text-[9.67px] font-extrabold leading-[1.1] text-white">
                    {remainingCount}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function filterMoveDestinations(
  options: TicketMoveCategoryOption[] | undefined,
  scope: string | null | undefined,
): TicketMoveCategoryOption[] {
  if (!options?.length) return [];
  const inUncategorized =
    scope == null || scope === "" || scope === "uncategorized";
  return options.filter((o) => {
    if (inUncategorized) {
      if (o.isUncategorizedBucket) return false;
      return true;
    }
    return o.id !== scope;
  });
}

function SortableTicketRow({
  ticket,
  productsMap,
  onEdit,
  onDuplicate,
  duplicatingTicketId,
  mobileNoDrag,
  onOpenMobileOptions,
}: {
  ticket: Ticket;
  productsMap: Record<string, { id: string; name: string; image: string | null }>;
  onEdit: (ticketId: string) => void;
  onDuplicate: (ticketId: string) => void;
  duplicatingTicketId?: string | null;
  mobileNoDrag: boolean;
  onOpenMobileOptions: (ticketId: string) => void;
}) {
  const ticketProducts = ticket.products
    .map((productId) => productsMap[productId])
    .filter(Boolean)
    .slice(0, MAX_VISIBLE_PRODUCTS);
  const remainingCount = Math.max(0, ticket.products.length - MAX_VISIBLE_PRODUCTS);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: ticketDragId(ticket.id),
    data: {
      type: "ticket",
      ticket,
    },
    disabled: mobileNoDrag,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const duplicateInProgress = duplicatingTicketId != null;
  const isThisRowDuplicating = duplicatingTicketId === ticket.id;

  const distanceLabel = ticket.distance
    ? `${ticket.distance}${ticket.distanceUnit || "KM"}`
    : null;

  const mobileDragListeners = mobileNoDrag ? {} : listeners;
  const mobileDragAttributes = mobileNoDrag ? {} : attributes;

  return (
    <div ref={setNodeRef} style={style} className="w-full">
      {/* Desktop — tabela */}
      <div
        {...listeners}
        {...attributes}
        className="hidden h-[52px] w-full cursor-move items-center justify-between border-b border-gray-6 bg-gray-1 transition-colors last:border-b-0 hover:bg-gray-2 touch-none md:flex"
      >
        <div className="flex h-full w-[318px] min-w-0 items-center p-4">
          <p className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap font-family-dm-sans text-sm font-semibold leading-[1.3] text-gray-12">
            {ticket.name}
          </p>
        </div>

        <div className="flex h-full min-h-px min-w-px flex-1 items-center justify-center p-4">
          <p className="font-inter text-sm font-semibold leading-[1.3] text-gray-12">
            {ticket?.price !== "R$ 0,00" ? formatPrice(ticket.price) : "Gratuito"}
          </p>
        </div>

        <div className="flex h-full min-h-px min-w-px flex-1 flex-col items-center justify-center gap-2 p-4 text-sm leading-[1.3]">
          <p className="font-inter font-semibold text-gray-12">{ticket.modality || "—"}</p>
          {ticket.distance && (
            <p className="font-family-dm-sans font-medium text-gray-11">
              {ticket.distance}
              {ticket.distanceUnit || "KM"}
            </p>
          )}
        </div>

        <div className="flex h-full min-h-px min-w-px flex-1 items-center justify-center p-4">
          {ticketProducts.length > 0 || remainingCount > 0 ? (
            <div className="flex h-9 items-center gap-[4.3px]">
              {ticketProducts.map((product) => (
                <div
                  key={product.id}
                  className="flex h-9 max-w-[36.5px] w-[36px] items-start overflow-clip rounded-md"
                >
                  <div className="relative size-9 overflow-hidden rounded-md border-[0.537px] border-gray-6 bg-gray-3">
                    <ImageWithInitialFallback
                      src={product.image}
                      alt={product.name}
                      name={product.name}
                      fallbackId={product.id}
                      fill
                      sizes="36px"
                      className="size-full rounded-md"
                      letterClassName="text-base font-semibold"
                    />
                  </div>
                </div>
              ))}
              {remainingCount > 0 && (
                <div className="relative flex h-9 max-w-[36.5px] w-[36.5px] items-start overflow-clip rounded-[2.15px]">
                  <div className="relative size-9 overflow-hidden rounded-[2.15px] border-[0.537px] border-gray-6 bg-gray-3">
                    {ticketProducts.length > 0 ? (
                      <ImageWithInitialFallback
                        src={ticketProducts[ticketProducts.length - 1]?.image}
                        alt=""
                        name={ticketProducts[ticketProducts.length - 1]?.name ?? ""}
                        fallbackId={ticketProducts[ticketProducts.length - 1]?.id}
                        fill
                        sizes="36px"
                        className="size-full rounded-[2.15px]"
                        letterClassName="text-base font-semibold"
                      />
                    ) : null}
                    <div className="absolute inset-0 rounded-[2.15px] bg-black/80" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="flex items-center gap-[2.3px]">
                        <Plus className="size-[6.93px] text-white" />
                        <p className="font-manrope text-[9.67px] font-extrabold leading-[1.1] text-white">
                          {remainingCount}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <span className="font-family-dm-sans text-sm text-gray-11">—</span>
          )}
        </div>

        <div className="flex h-full w-[148px] shrink-0 items-center justify-center gap-1 px-2 py-2">
          <button
            type="button"
            data-nav
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              if (isThisRowDuplicating) return;
              onEdit(ticket.id);
            }}
            disabled={isThisRowDuplicating}
            aria-busy={isThisRowDuplicating}
            title="Editar ingresso"
            className="flex size-8 cursor-pointer items-center justify-center rounded-lg border border-gray-6 bg-gray-2 transition-colors hover:bg-gray-3 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-gray-2"
          >
            {isThisRowDuplicating ? (
              <DuplicateRowSpinner />
            ) : (
              <Pencil className="size-5 text-gray-11" />
            )}
          </button>
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              if (duplicateInProgress) return;
              onDuplicate(ticket.id);
            }}
            disabled={duplicateInProgress}
            aria-busy={isThisRowDuplicating}
            title="Duplicar ingresso"
            className="flex size-8 cursor-pointer items-center justify-center rounded-lg border border-gray-6 bg-gray-2 transition-colors hover:bg-gray-3 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-gray-2"
          >
            {isThisRowDuplicating ? (
              <DuplicateRowSpinner />
            ) : (
              <Plus className="size-5 text-gray-11" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile — cartão (Figma) */}
      <div
        {...mobileDragListeners}
        {...mobileDragAttributes}
        className={`flex w-full flex-col gap-4 rounded-lg border border-gray-6 bg-gray-1 px-3 py-4 md:hidden ${mobileNoDrag ? "" : "touch-none cursor-move active:cursor-grabbing"
          }`}
      >
        <div className="flex w-full items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="font-family-dm-sans text-sm font-semibold leading-[1.3] text-gray-12">
              {ticket.name}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {ticket.modality ? (
                <span className="font-family-dm-sans text-sm font-normal leading-[1.3] text-gray-11">
                  {ticket.modality}
                </span>
              ) : (
                <span className="font-family-dm-sans text-sm font-normal leading-[1.3] text-gray-11">
                  —
                </span>
              )}
              {distanceLabel ? (
                <>
                  <span className="size-1.5 shrink-0 rounded-full bg-gray-11" aria-hidden />
                  <span className="font-family-dm-sans text-sm font-normal leading-[1.3] text-gray-11">
                    {distanceLabel}
                  </span>
                </>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            data-nav
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onOpenMobileOptions(ticket.id);
            }}
            className="flex size-8 shrink-0 items-center justify-center rounded-lg text-gray-12 hover:bg-gray-2"
            aria-label="Mais opções do ingresso"
          >
            <MoreVertical className="size-5 text-gray-12" strokeWidth={2} />
          </button>
        </div>
        <div className="flex w-full items-center justify-between gap-2">
          <p className="font-manrope text-base font-extrabold leading-[1.1] text-gray-12">
            {formatPrice(ticket.price)}
          </p>
          <TicketProductThumbnails ticket={ticket} productsMap={productsMap} />
        </div>
      </div>
    </div>
  );
}

export function TicketTable({
  tickets,
  currentPage,
  totalPages,
  onPageChange,
  onEdit,
  onDuplicate,
  duplicatingTicketId = null,
  productsMap = {},
  ticketScopeCategoryId = null,
  moveCategoryOptions,
  onMoveTicketToCategory,
  onMoveTicketWithinScope,
}: TicketTableProps) {
  const mobileNoDrag = useOrganizerTicketMobileNoDrag();

  const moveDestinations = useMemo(
    () => filterMoveDestinations(moveCategoryOptions, ticketScopeCategoryId),
    [moveCategoryOptions, ticketScopeCategoryId],
  );

  const canMobileMove = Boolean(onMoveTicketToCategory && moveDestinations.length > 0);

  const [mobileSheet, setMobileSheet] = useState<
    { ticketId: string; phase: "options" | "move" } | null
  >(null);
  const [moveSubmitting, setMoveSubmitting] = useState(false);

  const sheetTicket = useMemo(
    () => (mobileSheet ? tickets.find((t) => t.id === mobileSheet.ticketId) : undefined),
    [mobileSheet, tickets],
  );

  const sheetTicketIndex = useMemo(
    () => (mobileSheet ? tickets.findIndex((t) => t.id === mobileSheet.ticketId) : -1),
    [mobileSheet, tickets],
  );
  // Botões "Mover pra cima/baixo" só aparecem quando há mais de 1 ingresso no
  // escopo e o callback existe. Cada um é desabilitado quando o ticket é a
  // extremidade — evita feedback de "movi" sem mudança real.
  const canMobileReorderWithinScope = Boolean(
    onMoveTicketWithinScope && tickets.length > 1,
  );
  const canMoveUp = canMobileReorderWithinScope && sheetTicketIndex > 0;
  const canMoveDown =
    canMobileReorderWithinScope &&
    sheetTicketIndex >= 0 &&
    sheetTicketIndex < tickets.length - 1;

  const closeMobileSheet = () => {
    setMobileSheet(null);
    setMoveSubmitting(false);
  };

  // Fecha o drawer ANTES do await — a UI já reflete a mudança via optimistic
  // update no `TicketsSection.handleMoveTicketWithinScope`, e o toast (success
  // ou error) é disparado pelo parent ao final do persist.
  const handleReorderWithinScope = (direction: "up" | "down") => {
    if (!mobileSheet?.ticketId || !onMoveTicketWithinScope) return;
    const ticketId = mobileSheet.ticketId;
    closeMobileSheet();
    void onMoveTicketWithinScope(ticketId, direction);
  };

  const handleSelectMoveTarget = async (opt: TicketMoveCategoryOption) => {
    if (!mobileSheet?.ticketId || !onMoveTicketToCategory) return;
    setMoveSubmitting(true);
    try {
      const nextCat = opt.isUncategorizedBucket ? null : opt.id;
      await onMoveTicketToCategory(mobileSheet.ticketId, nextCat);
      closeMobileSheet();
    } catch {
      setMoveSubmitting(false);
    }
  };

  return (
    <SortableContext
      items={tickets.map((t) => ticketDragId(t.id))}
      strategy={verticalListSortingStrategy}
    >
      <div className="flex w-full flex-col gap-3 md:gap-0 md:overflow-hidden md:rounded-lg md:border md:border-gray-6 md:bg-gray-2">
        <div className="hidden h-[44px] w-full items-center border-b border-gray-6 bg-gray-4 md:flex">
          <div className="flex h-full w-[318px] items-center p-4">
            <p className="font-inter text-sm font-medium leading-[1.3] text-gray-12">Nome do ingresso</p>
          </div>
          <div className="flex h-full min-h-px min-w-px flex-1 items-center justify-center p-4">
            <p className="font-inter text-sm font-medium leading-[1.3] text-gray-12">Preço</p>
          </div>
          <div className="flex h-full min-h-px min-w-px flex-1 items-center justify-center p-4">
            <p className="font-inter text-sm font-medium leading-[1.3] text-gray-12">Modalide/Distância</p>
          </div>
          <div className="flex h-full min-h-px min-w-px flex-1 items-center justify-center p-4">
            <p className="font-inter text-sm font-medium leading-[1.3] text-gray-12">Produtos relacionados</p>
          </div>
          <div className="flex h-full w-[148px] shrink-0 items-center justify-center p-4">
            <p className="font-inter text-sm font-medium leading-[1.3] text-gray-12">Ações</p>
          </div>
        </div>

        {tickets.map((ticket) => (
          <SortableTicketRow
            key={ticket.id}
            ticket={ticket}
            productsMap={productsMap}
            onEdit={onEdit}
            onDuplicate={onDuplicate}
            duplicatingTicketId={duplicatingTicketId}
            mobileNoDrag={mobileNoDrag}
            onOpenMobileOptions={(id) => setMobileSheet({ ticketId: id, phase: "options" })}
          />
        ))}

        {totalPages > 1 ? (
          <div className="hidden items-center justify-center gap-2 border-t border-gray-6 px-5 py-4 md:flex">
            <button
              type="button"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="flex size-8 items-center justify-center rounded-lg border border-gray-6 hover:bg-gray-3 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronLeft className="size-4" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => onPageChange(p)}
                className={`flex size-8 items-center justify-center rounded-lg border ${currentPage === p
                  ? "border-[#59E373] bg-[#59E373] text-gray-12"
                  : "border-gray-6 hover:bg-gray-3"
                  }`}
              >
                {p}
              </button>
            ))}
            <button
              type="button"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="flex size-8 items-center justify-center rounded-lg border border-gray-6 hover:bg-gray-3 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        ) : null}
      </div>

      <Drawer
        open={mobileSheet !== null}
        onOpenChange={(open) => {
          if (!open) closeMobileSheet();
        }}
      >
        <DrawerContent
          overlayClassName="bg-black/50 supports-backdrop-filter:backdrop-blur-[2px]"
          className="border-gray-6 bg-gray-1 px-0 pb-6 [&>div:first-child]:hidden"
        >
          {mobileSheet?.phase === "options" && sheetTicket ? (
            <>
              <div className="flex items-center justify-between border-b border-gray-6 px-4 pb-3 pt-1">
                <DrawerTitle className="text-left font-manrope text-base font-extrabold leading-[1.1] text-gray-12">
                  Mais opções
                </DrawerTitle>
                <DrawerClose asChild>
                  <button
                    type="button"
                    className="flex size-9 items-center justify-center rounded-lg text-gray-11 hover:bg-gray-2 hover:text-gray-12"
                    aria-label="Fechar"
                  >
                    <X className="size-5" strokeWidth={2} />
                  </button>
                </DrawerClose>
              </div>
              <div className="flex flex-col">
                <button
                  type="button"
                  disabled={duplicatingTicketId === sheetTicket.id}
                  className="flex w-full items-center gap-3 border-b border-gray-6 px-4 py-4 text-left transition-colors last:border-b-0 hover:bg-gray-2 disabled:opacity-50"
                  onClick={() => {
                    if (duplicatingTicketId === sheetTicket.id) return;
                    onEdit(sheetTicket.id);
                    closeMobileSheet();
                  }}
                >
                  {duplicatingTicketId === sheetTicket.id ? (
                    <DuplicateRowSpinner />
                  ) : (
                    <Pencil className="size-5 shrink-0 text-gray-12" strokeWidth={2} />
                  )}
                  <span className="font-family-dm-sans text-base text-gray-12">Editar ingresso</span>
                </button>
                <button
                  type="button"
                  disabled={duplicatingTicketId != null}
                  className="flex w-full items-center gap-3 border-b border-gray-6 px-4 py-4 text-left transition-colors last:border-b-0 hover:bg-gray-2 disabled:opacity-50"
                  onClick={() => {
                    if (duplicatingTicketId != null) return;
                    onDuplicate(sheetTicket.id);
                    closeMobileSheet();
                  }}
                >
                  {duplicatingTicketId === sheetTicket.id ? (
                    <DuplicateRowSpinner />
                  ) : (
                    <Copy className="size-5 shrink-0 text-gray-12" strokeWidth={2} />
                  )}
                  <span className="font-family-dm-sans text-base text-gray-12">Duplicar</span>
                </button>
                {canMobileReorderWithinScope ? (
                  <>
                    <button
                      type="button"
                      disabled={!canMoveUp}
                      className="flex w-full items-center gap-3 border-b border-gray-6 px-4 py-4 text-left transition-colors last:border-b-0 hover:bg-gray-2 disabled:cursor-not-allowed disabled:opacity-50"
                      onClick={() => handleReorderWithinScope("up")}
                    >
                      <SquareArrowUp
                        className="size-5 shrink-0 text-gray-12"
                        strokeWidth={2}
                      />
                      <span className="font-family-dm-sans text-base text-gray-12">
                        Mover para cima
                      </span>
                    </button>
                    <button
                      type="button"
                      disabled={!canMoveDown}
                      className="flex w-full items-center gap-3 border-b border-gray-6 px-4 py-4 text-left transition-colors last:border-b-0 hover:bg-gray-2 disabled:cursor-not-allowed disabled:opacity-50"
                      onClick={() => handleReorderWithinScope("down")}
                    >
                      <SquareArrowDown
                        className="size-5 shrink-0 text-gray-12"
                        strokeWidth={2}
                      />
                      <span className="font-family-dm-sans text-base text-gray-12">
                        Mover para baixo
                      </span>
                    </button>
                  </>
                ) : null}
                {canMobileMove ? (
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 border-b border-gray-6 px-4 py-4 text-left transition-colors last:border-b-0 hover:bg-gray-2"
                    onClick={() =>
                      setMobileSheet({ ticketId: sheetTicket.id, phase: "move" })
                    }
                  >
                    <Move className="size-5 shrink-0 text-primary-11" strokeWidth={2} />
                    <span className="font-family-dm-sans text-base font-medium text-primary-11">
                      Mover para categoria
                    </span>
                  </button>
                ) : null}
              </div>
            </>
          ) : null}

          {mobileSheet?.phase === "move" && sheetTicket ? (
            <>
              <div className="flex items-center justify-between border-b border-gray-6 px-4 pb-3 pt-1">
                <div className="flex min-w-0 flex-1 items-center gap-1 pr-2">
                  <button
                    type="button"
                    className="flex size-9 shrink-0 items-center justify-center rounded-lg text-gray-11 hover:bg-gray-2 hover:text-gray-12"
                    aria-label="Voltar"
                    onClick={() =>
                      setMobileSheet({ ticketId: sheetTicket.id, phase: "options" })
                    }
                  >
                    <ChevronLeft className="size-5" strokeWidth={2} />
                  </button>
                  <DrawerTitle className="min-w-0 flex-1 text-left font-manrope text-base font-bold leading-[1.1] text-gray-12">
                    Mover para qual categoria?
                  </DrawerTitle>
                </div>
                <DrawerClose asChild>
                  <button
                    type="button"
                    className="flex size-9 shrink-0 items-center justify-center rounded-lg text-gray-11 hover:bg-gray-2 hover:text-gray-12"
                    aria-label="Fechar"
                  >
                    <X className="size-5" strokeWidth={2} />
                  </button>
                </DrawerClose>
              </div>
              <p className="px-4 pt-3 font-family-dm-sans text-sm text-gray-11">
                Selecione a categoria de destino
              </p>
              <div className="mt-2 max-h-[55vh] overflow-y-auto">
                {moveDestinations.map((opt) => {
                  const n = opt.ticketCount;
                  const subtitle = opt.isUncategorizedBucket
                    ? `${n} ${n === 1 ? "ingresso nos gerais" : "ingressos nos gerais"}`
                    : `${n} ${n === 1 ? "ingresso" : "ingressos"}`;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      disabled={moveSubmitting}
                      className="flex w-full items-center gap-3 border-b border-gray-6 px-4 py-4 text-left transition-colors hover:bg-gray-2 disabled:opacity-50"
                      onClick={() => void handleSelectMoveTarget(opt)}
                    >
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-gray-3">
                        {opt.isUncategorizedBucket ? (
                          <TicketIcon className="size-5 text-gray-11" strokeWidth={2} />
                        ) : (
                          <Folder className="size-5 text-gray-11" strokeWidth={2} />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-family-dm-sans text-base font-semibold text-gray-12">
                          {opt.name}
                        </p>
                        <p className="mt-0.5 font-family-dm-sans text-sm text-gray-11">
                          {subtitle}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          ) : null}
        </DrawerContent>
      </Drawer>
    </SortableContext>
  );
}
