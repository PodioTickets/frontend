import type { Ticket } from "@/hooks/useTickets";

export type ImageCarouselItem = {
  src: string | null | undefined;
  name: string;
  id: string;
};

export function getTicketProductCarouselItems(
  ticket: Pick<Ticket, "products">,
  productsMap: Record<
    string,
    { id: string; name: string; image: string | null } | undefined
  >
): ImageCarouselItem[] {
  if (!ticket.products?.length) return [];
  return ticket.products.map((productId) => {
    const p = productsMap[productId];
    return {
      id: productId,
      name: p?.name ?? "Produto",
      src: p?.image ?? null,
    };
  });
}
