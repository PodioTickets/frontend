"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTickets, type Ticket } from "@/hooks/useTickets";
import { useTicketCategories } from "@/hooks/useTicketCategories";
import { organizerService } from "@/services";
import { queryKeys } from "@/services/cache/QueryClient";
import {
  type Product,
  productPriceFromApiToReais,
} from "@/components/Checkout/SubscriptionStep.utils";

/**
 * Dados compartilhados da etapa de Produtos do checkout: tickets agrupados por
 * categoria, produtos do evento normalizados e o mapa ingresso→produtos.
 *
 * Extraído do `SubscriptionStep` para um hook isolado para que consumidores que
 * só precisam dos DADOS (ex.: `useCheckoutProductStep`, usado no header de todas
 * as páginas do checkout) não arrastem o componente pesado da etapa para o bundle.
 *
 * Checkout é 100% server-driven: as queries usam `staleTime: 0` / `gcTime: 0` /
 * `refetchOnMount: "always"` — o servidor é sempre a fonte autoritativa.
 */
export function useSubscriptionData(eventId: string | undefined) {
  const { tickets, loading: ticketsLoading } = useTickets(eventId ?? null, !!eventId, false, true);
  const { categories, loading: categoriesLoading } = useTicketCategories(eventId ?? null, !!eventId);

  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: queryKeys.events.products(eventId || ""),
    queryFn: async () => {
      if (!eventId) return { products: [] };
      return organizerService.getProducts(eventId);
    },
    enabled: !!eventId,
    // Checkout exige 100% server-driven: nada de cache.
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
  });

  const loading = ticketsLoading || categoriesLoading || productsLoading;

  const { categorizedTickets, uncategorizedTickets } = useMemo(() => {
    const categorized: Array<{ id: string; name: string; tickets: Ticket[] }> = [];
    const uncategorized: Ticket[] = [];

    const categoryMap = new Map(categories.map((cat) => [cat.id, cat.name]));

    const ticketsByCategory: Record<string, Ticket[]> = {};
    tickets.forEach((ticket) => {
      const categoryId = ticket.groupId;
      if (categoryId && categoryMap.has(categoryId)) {
        if (!ticketsByCategory[categoryId]) {
          ticketsByCategory[categoryId] = [];
        }
        ticketsByCategory[categoryId].push(ticket);
      } else {
        uncategorized.push(ticket);
      }
    });

    categories.forEach((category) => {
      const categoryTickets = ticketsByCategory[category.id] || [];
      if (categoryTickets.length > 0) {
        categorized.push({
          id: category.id,
          name: category.name,
          tickets: categoryTickets.filter((ticket) => {
            try {
              const price = parseFloat(ticket.price.replace(/[^\d,]/g, "").replace(",", "."));
              return !isNaN(price) && price >= 0;
            } catch {
              return false;
            }
          }),
        });
      }
    });

    const validUncategorized = uncategorized.filter((ticket) => {
      try {
        const price = parseFloat(ticket.price.replace(/[^\d,]/g, "").replace(",", "."));
        return !isNaN(price) && price >= 0;
      } catch {
        return false;
      }
    });

    return {
      categorizedTickets: categorized,
      uncategorizedTickets: validUncategorized,
    };
  }, [tickets, categories]);

  const allProducts = useMemo(() => {
    if (!productsData?.products) return [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return productsData.products.map((product: any): Product => ({
      id: product.id,
      name: product.name,
      image: product.image || null,
      images: Array.isArray(product.images) ? product.images.filter(Boolean) : [],
      basePrice: productPriceFromApiToReais(product.basePrice),
      isRequired: product.isRequired || false,
      isIncludedInTicket: product.isIncludedInTicket || false,
      variationType:
        typeof product.variationType === "string" && product.variationType.trim()
          ? product.variationType.trim()
          : typeof product.variation_type === "string" && product.variation_type.trim()
            ? product.variation_type.trim()
            : null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      variations: (product.variations || []).map((v: any) => ({
        id: v.id,
        name: v.name,
        price: productPriceFromApiToReais(v.price),
        stock: typeof v.stock === "number" ? v.stock : parseInt(String(v.stock), 10) || 0,
      })),
    }));
  }, [productsData]);

  const ticketProductsMap = useMemo(() => {
    const map: Record<string, string[]> = {};

    categorizedTickets.forEach((category) => {
      category.tickets.forEach((ticket) => {
        map[ticket.id] = ticket.products || [];
      });
    });

    uncategorizedTickets.forEach((ticket) => {
      map[ticket.id] = ticket.products || [];
    });

    return map;
  }, [categorizedTickets, uncategorizedTickets]);

  const getProductsForTicket = (ticketId: string): Product[] => {
    const ticketProductIds = ticketProductsMap[ticketId] || [];
    if (ticketProductIds.length === 0) return [];
    return allProducts.filter((product) => ticketProductIds.includes(product.id));
  };

  const { requiredProducts, additionalProducts } = useMemo(() => {
    const required: Product[] = [];
    const additional: Product[] = [];

    allProducts.forEach((product) => {
      if (product.isRequired) {
        required.push(product);
      } else {
        additional.push(product);
      }
    });

    return { requiredProducts: required, additionalProducts: additional };
  }, [allProducts]);

  return {
    loading,
    categories,
    categorizedTickets,
    uncategorizedTickets,
    allProducts,
    ticketProductsMap,
    getProductsForTicket,
    requiredProducts,
    additionalProducts,
  };
}
