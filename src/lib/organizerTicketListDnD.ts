import type { DragEndEvent } from "@dnd-kit/core";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import { arrayMove } from "@dnd-kit/sortable";
import type { QueryClient } from "@tanstack/react-query";
import type { Ticket } from "@/hooks/useTickets";
import type { ModalityGroup } from "@/services/organizer/OrganizerService";
import { organizerService } from "@/services";
import { queryKeys } from "@/services/cache/QueryClient";

const TICKET_PREFIX = "ticket-";

export function ticketDragId(ticketId: string): string {
  return `${TICKET_PREFIX}${ticketId}`;
}

export function parseTicketDragId(id: string): string | null {
  if (!id.startsWith(TICKET_PREFIX)) return null;
  return id.slice(TICKET_PREFIX.length);
}

/** Chave do rascunho de ordem: UUID da categoria ou `uncategorized`. */
export function ticketOrderDraftKey(scopeCategoryId: string | null): string {
  return scopeCategoryId ?? "uncategorized";
}

/** null = ingressos sem categoria válida (avulsos). */
export function categoryIdForTicketScope(
  ticket: Ticket,
  categories: ModalityGroup[],
): string | null {
  const g = ticket.groupId;
  if (!g || g === "uncategorized") return null;
  return categories.some((c) => c.id === g) ? g : null;
}

export function sortedTicketsInScope(
  tickets: Ticket[],
  scopeCategoryId: string | null,
  categories: ModalityGroup[],
): Ticket[] {
  return tickets
    .filter((t) => categoryIdForTicketScope(t, categories) === scopeCategoryId)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

/** Aplica rascunho de ordem aos ingressos de um bucket (categoria ou avulsos). */
export function applyDraftOrderToTickets(
  bucket: Ticket[],
  scopeKey: string,
  draft: Record<string, string[]>,
): Ticket[] {
  const sorted = [...bucket].sort(
    (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
  );
  const ids = draft[scopeKey];
  if (!ids || ids.length !== bucket.length) return sorted;
  const bucketSet = new Set(bucket.map((t) => t.id));
  if (ids.some((id) => !bucketSet.has(id))) return sorted;
  const byId = new Map(bucket.map((t) => [t.id, t]));
  return ids.map((id) => byId.get(id)).filter((t): t is Ticket => t != null);
}

/** Persiste só escopos que tenham entrada no rascunho (usuário alterou ordem). */
export async function persistTicketOrderDrafts(
  eventId: string,
  tickets: Ticket[],
  categories: ModalityGroup[],
  draft: Record<string, string[]>,
): Promise<void> {
  const keys = Object.keys(draft);
  if (keys.length === 0) return;

  for (const key of keys) {
    const scopeCategoryId = key === "uncategorized" ? null : key;
    const bucket = sortedTicketsInScope(tickets, scopeCategoryId, categories);
    const ordered = applyDraftOrderToTickets(bucket, key, draft);
    const ids = ordered.map((t) => t.id);
    if (ids.length === 0) continue;
    await organizerService.reorderTickets(eventId, {
      categoryId: scopeCategoryId,
      ticketIds: ids,
    });
  }
}

export type OrganizerTicketDragEndArgs = {
  event: DragEndEvent;
  tickets: Ticket[];
  categories: ModalityGroup[];
  eventId: string;
  queryClient: QueryClient;
  handleDropTicket: (ticketId: string, categoryId: string | null) => Promise<void>;
  dragEndPosition: { x: number; y: number } | null;
  categoryElementsCacheRef: MutableRefObject<Map<string, DOMRect>>;
  setTicketOrderDraft: Dispatch<SetStateAction<Record<string, string[]>>>;
  /** Rascunho atual de ordem (mesmo estado React) — necessário para calcular o patch sem depender do flush do setState. */
  ticketOrderDraft: Record<string, string[]>;
};

function buildSameScopeOrderPatch(
  ticketOrderDraft: Record<string, string[]>,
  tickets: Ticket[],
  categories: ModalityGroup[],
  sourceScope: string | null,
  activeTicketId: string,
  overTicketId: string,
): Record<string, string[]> {
  const key = ticketOrderDraftKey(sourceScope);
  const bucket = sortedTicketsInScope(tickets, sourceScope, categories);
  let base = ticketOrderDraft[key];
  const bucketIds = new Set(bucket.map((t) => t.id));
  if (
    !base ||
    base.length !== bucket.length ||
    base.some((id) => !bucketIds.has(id))
  ) {
    base = bucket.map((t) => t.id);
  }
  const oldIndex = base.indexOf(activeTicketId);
  const newIndex = base.indexOf(overTicketId);
  if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return {};
  return { [key]: arrayMove(base, oldIndex, newIndex) };
}

/** Retorna patch de ordem por escopo (vazio = nada a persistir em reorder-tickets). */
export async function applyOrganizerTicketDragEnd({
  event,
  tickets,
  categories,
  eventId,
  queryClient,
  handleDropTicket,
  dragEndPosition,
  categoryElementsCacheRef,
  setTicketOrderDraft,
  ticketOrderDraft,
}: OrganizerTicketDragEndArgs): Promise<Record<string, string[]>> {
  const { active, over } = event;
  const activeTicketId = parseTicketDragId(active.id as string);
  if (!activeTicketId) return {};

  const ticket = tickets.find((t) => t.id === activeTicketId);
  if (!ticket) return {};

  const ticketsQueryKey = queryKeys.events.tickets(eventId);

  if (!over) {
    if (categoryIdForTicketScope(ticket, categories) !== null) {
      await handleDropTicket(activeTicketId, null);
    }
    return {};
  }

  const overId = over.id.toString();

  if (overId.startsWith(TICKET_PREFIX)) {
    const overTicketId = parseTicketDragId(overId);
    if (!overTicketId || overTicketId === activeTicketId) return {};

    const overTicket = tickets.find((t) => t.id === overTicketId);
    if (!overTicket) return {};

    const sourceScope = categoryIdForTicketScope(ticket, categories);
    const targetScope = categoryIdForTicketScope(overTicket, categories);

    if (sourceScope === targetScope) {
      const patch = buildSameScopeOrderPatch(
        ticketOrderDraft,
        tickets,
        categories,
        sourceScope,
        activeTicketId,
        overTicketId,
      );
      if (Object.keys(patch).length === 0) return {};
      setTicketOrderDraft((prev) => ({ ...prev, ...patch }));
      return patch;
    }

    await handleDropTicket(
      activeTicketId,
      targetScope === null ? null : targetScope,
    );

    const fresh =
      queryClient.getQueryData<Ticket[]>(ticketsQueryKey) ?? [];

    const targetKey = ticketOrderDraftKey(targetScope);
    const sourceKey = ticketOrderDraftKey(sourceScope);
    const targetBucket = sortedTicketsInScope(fresh, targetScope, categories);
    const sourceBucket = sortedTicketsInScope(fresh, sourceScope, categories);

    const withoutActiveInTarget = targetBucket.filter(
      (t) => t.id !== activeTicketId,
    );
    const insertAt = Math.max(
      0,
      withoutActiveInTarget.findIndex((t) => t.id === overTicketId),
    );
    const newTargetIds = [
      ...withoutActiveInTarget.slice(0, insertAt).map((t) => t.id),
      activeTicketId,
      ...withoutActiveInTarget.slice(insertAt).map((t) => t.id),
    ];
    const newSourceIds = sourceBucket.map((t) => t.id);

    const patch = {
      [targetKey]: newTargetIds,
      [sourceKey]: newSourceIds,
    };
    setTicketOrderDraft((prev) => ({ ...prev, ...patch }));
    return patch;
  }

  if (overId.startsWith("category-")) {
    const overData = over.data.current as
      | { type?: string; categoryId?: string }
      | undefined;
    if (overData?.type === "category" && overData.categoryId) {
      const targetCategoryId = overData.categoryId;
      if (targetCategoryId === "uncategorized") {
        if (categoryIdForTicketScope(ticket, categories) !== null) {
          await handleDropTicket(activeTicketId, null);
        }
        return {};
      }
      if (categoryIdForTicketScope(ticket, categories) !== targetCategoryId) {
        await handleDropTicket(activeTicketId, targetCategoryId);
      }
    }
    return {};
  }

  if (dragEndPosition) {
    const allCategoryElements = document.querySelectorAll("[data-category-id]");

    for (const categoryElement of allCategoryElements) {
      const catId = categoryElement.getAttribute("data-category-id");
      if (!catId) continue;

      let rect = categoryElementsCacheRef.current.get(catId);
      if (!rect) {
        rect = categoryElement.getBoundingClientRect();
        categoryElementsCacheRef.current.set(catId, rect);
      } else {
        const currentRect = categoryElement.getBoundingClientRect();
        if (
          rect.left !== currentRect.left ||
          rect.top !== currentRect.top ||
          rect.width !== currentRect.width ||
          rect.height !== currentRect.height
        ) {
          rect = currentRect;
          categoryElementsCacheRef.current.set(catId, rect);
        }
      }

      const isInside =
        dragEndPosition.x >= rect.left &&
        dragEndPosition.x <= rect.right &&
        dragEndPosition.y >= rect.top &&
        dragEndPosition.y <= rect.bottom;

      if (isInside) {
        if (catId !== "uncategorized") {
          if (categoryIdForTicketScope(ticket, categories) !== catId) {
            await handleDropTicket(activeTicketId, catId);
          }
        } else if (categoryIdForTicketScope(ticket, categories) !== null) {
          await handleDropTicket(activeTicketId, null);
        }
        break;
      }
    }
  }

  return {};
}
