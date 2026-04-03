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

export function getTicketProductCarouselItems(
  ticket: Pick<Ticket, "products">,
  productsMap: Record<
    string,
    { id: string; name: string; image: string | null } | undefined
  >,
  options?: {
    primaryProductId?: string | null;
    /** Ex.: checkout/ingressos — não exibir produtos do kit sem imagem. */
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
