import type { Ticket } from "@/hooks/useTickets";

export type ImageCarouselItem = {
  src: string | null | undefined;
  name: string;
  id: string;
};

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

/**
 * Retorna todos os itens do carrossel para um ingresso, expandindo todas as imagens
 * de cada produto. Produtos sem imagem aparecem com src: null (exibe fallback de letra).
 * O produto `primaryProductId` é movido para a frente.
 */
export function getTicketProductCarouselItems(
  ticket: Pick<Ticket, "productImages">,
  options?: { primaryProductId?: string | null },
): ImageCarouselItem[] {
  if (!ticket.productImages?.length) return [];

  let products = [...ticket.productImages];

  if (options?.primaryProductId) {
    const idx = products.findIndex((p) => p.id === options.primaryProductId);
    if (idx > 0) {
      const [primary] = products.splice(idx, 1);
      products = [primary, ...products];
    }
  }

  const items: ImageCarouselItem[] = [];
  for (const product of products) {
    if (product.images.length > 0) {
      product.images.forEach((src, i) => {
        items.push({ id: `${product.id}-${i}`, name: product.name, src });
      });
    } else {
      items.push({ id: product.id, name: product.name, src: null });
    }
  }

  return items;
}

/** Imagens únicas de todos os ingressos da categoria (uma por produto), com principal primeiro. */
export function getCategoryKitCarouselItems(
  tickets: Pick<Ticket, "productImages">[],
  primaryProductId?: string | null,
): ImageCarouselItem[] {
  const seen = new Set<string>();
  const items: ImageCarouselItem[] = [];

  for (const ticket of tickets) {
    for (const product of ticket.productImages || []) {
      if (seen.has(product.id)) continue;
      seen.add(product.id);
      items.push({
        id: product.id,
        name: product.name,
        src: product.images[0] ?? null,
      });
    }
  }

  if (primaryProductId) {
    const idx = items.findIndex((i) => i.id === primaryProductId);
    if (idx > 0) {
      const [primary] = items.splice(idx, 1);
      return [primary, ...items];
    }
  }

  return items;
}
