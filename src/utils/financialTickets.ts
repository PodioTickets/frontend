import type { Ticket } from "@/hooks/useTickets";
import type { FinancialTicket } from "@/services/organizer/OrganizerService";

/**
 * Converte `Ticket[]` (já normalizado por `formatRawTicket`) em `FinancialTicket[]`
 * usado pela lista "Ingressos de lotes" do financeiro e do dashboard.
 *
 * Receita = soma de `quantitySold * price` por lote (price em centavos).
 * Sold = `ticket.quantitySold` quando o backend agrega, fallback à soma dos lotes.
 *
 * Mantido como função pura (sem hook) pra ser usado em qualquer contexto:
 * `useTickets` no dashboard ou response cru de `/events/:id/financial` (depois
 * de aplicar `formatRawTicket` no chamador).
 */
export function mapTicketsToFinancialList(
  tickets: Ticket[],
): FinancialTicket[] {
  return tickets.map((ticket) => {
    const categoryName = ticket.categoryName || "Ingresso avulso";
    const totalRevenue = ticket.batches.reduce((sum, b) => {
      const sold = b.quantitySold ?? 0;
      const price = Number(b.price) || 0;
      return sum + sold * price;
    }, 0);
    const totalSold =
      ticket.quantitySold ??
      ticket.batches.reduce((sum, b) => sum + (b.quantitySold ?? 0), 0);

    return {
      id: ticket.id,
      type: "category" as const,
      name: ticket.name,
      subtitle: categoryName,
      categoryId: ticket.categoryId ?? undefined,
      sold: String(totalSold),
      revenue: totalRevenue,
      createdAt: ticket.createdAt,
      /* `lots` é tipado como `{ id, name, sold, revenue, createdAt }[]` em
       * `FinancialTicket`, mas os consumidores atuais acessam `quantitySold` e
       * `price` raw (centavos). Mantemos esses campos extras pra compat. */
      lots: ticket.batches.map((b) => ({
        id: b.id,
        name: "",
        sold: String(b.quantitySold ?? 0),
        revenue: (b.quantitySold ?? 0) * (Number(b.price) || 0),
        createdAt: b.createdAt ?? ticket.createdAt,
        quantitySold: b.quantitySold ?? 0,
        price: Number(b.price) || 0,
      })) as FinancialTicket["lots"],
    };
  });
}
