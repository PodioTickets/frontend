import type { Ticket } from "@/hooks/useTickets";

export type ImageCarouselItem = {
  src: string | null | undefined;
  name: string;
  id: string;
};

function carouselItemHasImage(item: ImageCarouselItem): boolean {
  return typeof item.src === "string" && item.src.trim() !== "";
}

/** Coloca o produto principal (config do evento) na primeira posição, se existir na lista. */
export function orderCarouselItemsWithPrimary(
  items: ImageCarouselItem[],
  primaryProductId?: string | null
): ImageCarouselItem[] {
  if (!primaryProductId || items.length === 0) return items;
  const idx = items.findIndex((i) => i.id === primaryProductId);
  if (idx <= 0) return items;
  const next = [...items];
  const [primary] = next.splice(idx, 1);
  return [primary, ...next];
}

/**
 * Reordena para o item preferido ficar no índice central (`Math.floor(n/2)`),
 * mantendo a ordem relativa dos demais em volta (útil para miniaturas centralizadas no modal).
 */
export function orderCarouselItemsWithPreferredInCenter<T extends { id: string }>(
  items: T[],
  preferredIndex = 0,
): T[] {
  const n = items.length;
  if (n <= 1) return items;
  const p = Math.min(Math.max(preferredIndex, 0), n - 1);
  const center = Math.floor(n / 2);
  const preferred = items[p];
  const after = items.slice(p + 1);
  const before = items.slice(0, p);
  const cycle = [...after, ...before];
  const leftCount = center;
  const left = cycle.slice(0, leftCount);
  const right = cycle.slice(leftCount);
  return [...left, preferred, ...right];
}

export function getTicketProductCarouselItems(
  ticket: Pick<Ticket, "products">,
  productsMap: Record<
    string,
    { id: string; name: string; image: string | null } | undefined
  >,
  options?: {
    primaryProductId?: string | null;
    omitItemsWithoutImage?: boolean;
  },
): ImageCarouselItem[] {
  if (!ticket.products?.length) return [];
  const raw = ticket.products.map((productId) => {
    const p = productsMap[productId];
    return {
      id: productId,
      name: p?.name ?? "Produto",
      src: p?.image ?? null,
    };
  });
  let ordered = orderCarouselItemsWithPrimary(raw, options?.primaryProductId);
  if (options?.omitItemsWithoutImage) {
    ordered = ordered.filter(carouselItemHasImage);
  }
  return ordered;
}

/** Imagens únicas de todos os ingressos da categoria, com principal da categoria primeiro. */
export function getCategoryKitCarouselItems(
  tickets: Pick<Ticket, "products">[],
  productsMap: Record<
    string,
    { id: string; name: string; image: string | null } | undefined
  >,
  primaryProductId?: string | null,
  options?: { omitItemsWithoutImage?: boolean },
): ImageCarouselItem[] {
  const seen = new Set<string>();
  const items: ImageCarouselItem[] = [];
  for (const t of tickets) {
    for (const pid of t.products || []) {
      if (seen.has(pid)) continue;
      seen.add(pid);
      const p = productsMap[pid];
      items.push({
        id: pid,
        name: p?.name ?? "Produto",
        src: p?.image ?? null,
      });
    }
  }
  let ordered = orderCarouselItemsWithPrimary(items, primaryProductId);
  if (options?.omitItemsWithoutImage) {
    ordered = ordered.filter(carouselItemHasImage);
  }
  return ordered;
}
