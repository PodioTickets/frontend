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
 * A imagem principal (`primaryProductId` é uma URL, igual ao modo por categoria) é
 * movida para a FRENTE — é o item exibido em destaque.
 */
export function getTicketProductCarouselItems(
  ticket: Pick<Ticket, "productImages">,
  options?: { primaryProductId?: string | null; hiddenUrls?: string[] },
): ImageCarouselItem[] {
  if (!ticket.productImages?.length) return [];

  // Imagens OCULTAS pelo organizador não aparecem para o participante.
  const hidden = options?.hiddenUrls?.length
    ? new Set(options.hiddenUrls)
    : null;

  // Só imagens USÁVEIS: produtos sem imagem (ou com todas ocultas) NÃO viram um
  // quadrado de fallback com a letra — se o ingresso fica sem nenhuma imagem
  // visível, o bloco de imagens simplesmente não aparece (gate `length > 0`).
  const items: ImageCarouselItem[] = [];
  for (const product of ticket.productImages) {
    product.images.forEach((src, i) => {
      if (!src?.trim() || hidden?.has(src)) return;
      items.push({ id: `${product.id}-${i}`, name: product.name, src });
    });
  }

  // Move a imagem principal (por URL) para a frente — MESMA regra do modo por
  // categoria. Antes comparava `product.id === primaryProductId`, mas o valor
  // salvo é a URL da imagem, então nunca casava (principal não aparecia no
  // formato "por ingresso").
  const primaryUrl = options?.primaryProductId;
  if (primaryUrl) {
    const idx = items.findIndex((it) => it.src === primaryUrl);
    if (idx > 0) {
      const [primary] = items.splice(idx, 1);
      return [primary, ...items];
    }
  }

  return items;
}

/**
 * Todas as imagens de todos os produtos únicos da categoria, expandidas.
 * primaryImageSrc é uma URL de imagem (vem de primaryKitProductByCategoryId);
 * a imagem com esse src é movida para a frente para ser centralizada no carousel.
 */
export function getCategoryKitCarouselItems(
  tickets: Pick<Ticket, "productImages">[],
  primaryImageSrc?: string | null,
  hiddenUrls?: string[],
): ImageCarouselItem[] {
  const seen = new Set<string>();
  const items: ImageCarouselItem[] = [];
  const hidden = hiddenUrls?.length ? new Set(hiddenUrls) : null;

  for (const ticket of tickets) {
    for (const product of ticket.productImages || []) {
      if (seen.has(product.id)) continue;
      seen.add(product.id);

      if (product.images.length === 0) {
        items.push({ id: product.id, name: product.name, src: null });
      } else {
        product.images.forEach((src, i) => {
          if (hidden?.has(src)) return;
          items.push({ id: `${product.id}-${i}`, name: product.name, src });
        });
      }
    }
  }

  if (primaryImageSrc) {
    const idx = items.findIndex((item) => item.src === primaryImageSrc);
    if (idx > 0) {
      const [primary] = items.splice(idx, 1);
      return [primary, ...items];
    }
  }

  return items;
}
