import { useEffect, useState } from "react";
import { organizerService } from "@/services";
import { categoryLabelFromTicket } from "@/lib/productValidation";
import type { LinkedTicketListItem } from "@/components/Product/CreateProductModal.types";

/**
 * Resolve os ingressos vinculados a um produto, exibidos nos diálogos de
 * confirmação do `CreateProductModal`. Mescla o que veio nos props do modal
 * (`linkedTickets`/`linkedTicketNames`) com o que a API retorna (em edição,
 * via `getTickets` filtrando por `productIds`). Dedup por nome do ingresso;
 * API tem precedência (traz a categoria). Falha de rede → cai nos props.
 *
 * Extraído do `CreateProductModal` (Bloco 3, Fase 2) — efeito autocontido.
 */
export function useProductLinkedTickets(params: {
  isOpen: boolean;
  eventId: string | null | undefined;
  productId?: string;
  linkedTickets?: unknown;
  linkedTicketNames?: unknown;
}): LinkedTicketListItem[] {
  const { isOpen, eventId, productId, linkedTickets, linkedTicketNames } =
    params;
  const [linkedTicketsResolved, setLinkedTicketsResolved] = useState<
    LinkedTicketListItem[]
  >([]);

  useEffect(() => {
    // Fechar o modal limpa a lista (comportamento do reset original).
    if (!isOpen) {
      setLinkedTicketsResolved([]);
      return;
    }
    if (!eventId) return;

    let cancelled = false;

    const itemsFromModalProp = (): LinkedTicketListItem[] => {
      const lt = linkedTickets;
      if (Array.isArray(lt) && lt.length > 0) {
        return lt
          .map(
            (x: {
              name?: unknown;
              categoryName?: unknown;
              category?: unknown;
            }) => {
              const name = String(x?.name ?? "").trim();
              const catRaw = x?.categoryName ?? x?.category;
              const categoryLabel =
                typeof catRaw === "string" && catRaw.trim()
                  ? catRaw.trim()
                  : "—";
              return { name, categoryLabel };
            },
          )
          .filter((x) => x.name);
      }
      const raw = linkedTicketNames;
      if (!Array.isArray(raw)) return [];
      return raw
        .map((n) => ({
          name: String(n ?? "").trim(),
          categoryLabel: "—",
        }))
        .filter((x) => x.name);
    };

    const mergeByTicketName = (
      fromApi: LinkedTicketListItem[],
      fromModal: LinkedTicketListItem[],
    ): LinkedTicketListItem[] => {
      const seen = new Set<string>();
      const out: LinkedTicketListItem[] = [];
      for (const item of fromApi) {
        if (seen.has(item.name)) continue;
        seen.add(item.name);
        out.push(item);
      }
      for (const item of fromModal) {
        if (seen.has(item.name)) continue;
        seen.add(item.name);
        out.push(item);
      }
      return out;
    };

    (async () => {
      const modalItems = itemsFromModalProp();
      if (!productId) {
        if (!cancelled) setLinkedTicketsResolved(modalItems);
        return;
      }
      try {
        const res = await organizerService.getTickets(eventId, {
          page: 1,
          limit: 500,
        });
        if (cancelled) return;
        const tickets = res.tickets || [];
        const pid = String(productId);
        const fromApi = tickets
          .filter(
            (t: { productIds?: string[] }) =>
              Array.isArray(t.productIds) &&
              t.productIds.some((id) => String(id) === pid),
          )
          .map((t: Record<string, unknown>) => ({
            name: String(t.name ?? "").trim(),
            categoryLabel: categoryLabelFromTicket(t),
          }))
          .filter((x) => x.name);
        if (!cancelled) {
          setLinkedTicketsResolved(mergeByTicketName(fromApi, modalItems));
        }
      } catch {
        if (!cancelled) setLinkedTicketsResolved(modalItems);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen, eventId, productId, linkedTicketNames, linkedTickets]);

  return linkedTicketsResolved;
}
