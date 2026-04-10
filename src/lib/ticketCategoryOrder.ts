import {
  closestCorners,
  pointerWithin,
  type CollisionDetection,
  type Over,
} from "@dnd-kit/core";
import { organizerService } from "@/services";
import type { ModalityGroup } from "@/services/organizer/OrganizerService";

export const CATEGORY_SORTABLE_ID_PREFIX = "cat-sort-";

/** Mesmo prefixo que `TicketCategoryCard` usa em `useDroppable`. */
export const CATEGORY_DROP_ID_PREFIX = "category-";

/** Mesmo prefixo que `ticketDragId` em organizerTicketListDnD. */
const TICKET_DRAG_PREFIX = "ticket-";

export function categorySortableId(categoryId: string) {
  return `${CATEGORY_SORTABLE_ID_PREFIX}${categoryId}`;
}

export function parseCategorySortableId(id: string): string | null {
  if (!id.startsWith(CATEGORY_SORTABLE_ID_PREFIX)) return null;
  return id.slice(CATEGORY_SORTABLE_ID_PREFIX.length);
}

/**
 * Na página de ingressos, categorias e ingressos compartilham o mesmo `DndContext`.
 * Com `closestCorners`, ao arrastar uma categoria o `over` vira com frequência uma
 * linha de ingresso (`ticket-*`), não o sortable/droppable da categoria — e o reorder
 * não roda. Filtramos colisões para só cabeçalhos/drops de categoria nesse caso.
 */
export const organizerTicketCategoriesCollisionDetection: CollisionDetection = (
  args,
) => {
  const activeId = String(args.active.id);
  if (activeId.startsWith(CATEGORY_SORTABLE_ID_PREFIX)) {
    const filtered = args.droppableContainers.filter((c) => {
      const id = String(c.id);
      return (
        id.startsWith(CATEGORY_SORTABLE_ID_PREFIX) ||
        id.startsWith(CATEGORY_DROP_ID_PREFIX)
      );
    });
    return closestCorners({ ...args, droppableContainers: filtered });
  }
  /** Ingresso: priorizar área `category-*` sob o ponteiro apenas quando é uma categoria diferente da de origem. */
  if (activeId.startsWith(TICKET_DRAG_PREFIX)) {
    const activeData = args.active.data.current as
      | { type?: string; ticket?: { groupId?: string } }
      | undefined;
    const activeGroupId = activeData?.ticket?.groupId;
    const activeCategoryDropId =
      activeGroupId && activeGroupId !== 'uncategorized'
        ? `${CATEGORY_DROP_ID_PREFIX}${activeGroupId}`
        : `${CATEGORY_DROP_ID_PREFIX}uncategorized`;

    const pointerHits = pointerWithin(args);
    const categoryHits = pointerHits.filter((c) =>
      String(c.id).startsWith(CATEGORY_DROP_ID_PREFIX),
    );

    // Se o ponteiro está sobre uma categoria DIFERENTE da de origem → mover entre categorias
    const crossCategoryHits = categoryHits.filter(
      (c) => String(c.id) !== activeCategoryDropId,
    );
    if (crossCategoryHits.length > 0) {
      return crossCategoryHits;
    }

    // Mesma categoria (ou avulsos) → usa closestCorners para detectar o ticket alvo e reordenar
  }
  return closestCorners(args);
};

type CategoryRef = Pick<ModalityGroup, "id">;

/**
 * Ao reordenar categorias, o `over` pode ser o id sortable (`cat-sort-*`), a área
 * droppável dos ingressos (`category-*`), ou (sem collision custom) uma linha de
 * ingresso (`ticket-*`) — nesse caso usamos `ticket.groupId` se `categories` for passado.
 */
export function resolveCategoryReorderOverId(
  over: Over | null,
  categories?: readonly CategoryRef[],
): string | null {
  if (!over) return null;
  const idStr = String(over.id);

  if (idStr.startsWith(TICKET_DRAG_PREFIX) && categories?.length) {
    const cur = over.data?.current as
      | { type?: string; ticket?: { groupId?: string } }
      | undefined;
    const gid = cur?.type === "ticket" ? cur.ticket?.groupId : undefined;
    if (gid && gid !== "uncategorized" && categories.some((c) => c.id === gid)) {
      return gid;
    }
  }

  const fromSortable = parseCategorySortableId(idStr);
  if (fromSortable) return fromSortable;
  if (idStr.startsWith(CATEGORY_DROP_ID_PREFIX)) {
    const rest = idStr.slice(CATEGORY_DROP_ID_PREFIX.length);
    if (rest === "uncategorized") return null;
    return rest;
  }
  const cur = over.data?.current as
    | { type?: string; categoryId?: string }
    | undefined;
  if (
    cur?.type === "category" &&
    cur.categoryId &&
    cur.categoryId !== "uncategorized"
  ) {
    return cur.categoryId;
  }
  return null;
}

/** Uma requisição PATCH .../categories/reorder — ordem do array = sortOrder 0, 1, 2… */
export async function persistTicketCategoryOrderApi(
  eventId: string,
  ordered: ModalityGroup[],
) {
  if (ordered.length === 0) return;
  const categoryIds = ordered.map((c) => c.id);
  await organizerService.reorderTicketCategories(eventId, categoryIds);
}
