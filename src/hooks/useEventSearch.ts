import { useInfiniteQuery } from "@tanstack/react-query";
import { eventService } from "@/services";
import type {
  SearchEventsParams,
  SearchEventsResponse,
} from "@/services/events/EventService";
import { useMemo } from "react";

/**
 * Busca paginada de eventos com "Carregar mais" ACUMULATIVO.
 *
 * Usa `useInfiniteQuery`: cada "Carregar mais" busca a próxima página e a
 * ANEXA às anteriores (todas visíveis na tela), em vez de trocar a página
 * exibida. O `page` NÃO entra na queryKey — ele é o `pageParam` interno do
 * infinite query. Assim, mudar qualquer filtro gera uma queryKey nova e o
 * acúmulo reinicia da página 1 automaticamente (sem reset manual).
 */
export function useEventSearch(params: SearchEventsParams = {}) {
  const { limit = 20 } = params;

  const modalitiesKey = params.modalities?.join(",") ?? "";

  // queryKey SEM `page`: a paginação é interna ao infinite query. Trocar filtro
  // = nova key = novo acúmulo do zero.
  const queryKey = useMemo(
    () => [
      "events-search",
      {
        q: params.q,
        country: params.country,
        state: params.state,
        city: params.city,
        startDate: params.startDate,
        endDate: params.endDate,
        includePast: params.includePast,
        modalities: modalitiesKey,
        minPrice: params.minPrice,
        maxPrice: params.maxPrice,
        limit,
      },
    ],
    [
      params.q,
      params.country,
      params.state,
      params.city,
      params.startDate,
      params.endDate,
      params.includePast,
      modalitiesKey,
      params.minPrice,
      params.maxPrice,
      limit,
    ],
  );

  const {
    data,
    isLoading,
    error,
    refetch,
    fetchNextPage,
    isFetchingNextPage,
    hasNextPage,
  } = useInfiniteQuery<SearchEventsResponse>({
    queryKey,
    queryFn: ({ pageParam }) =>
      eventService.searchEvents({ ...params, page: pageParam as number, limit }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const { page, totalPages } = lastPage.pagination;
      return page < totalPages ? page + 1 : undefined;
    },
    // "Menos cache" (política do projeto): qualquer mudança de filtro busca
    // dados frescos. O clique no botão de pesquisar (HomeFilters) ainda invalida
    // explicitamente esta query p/ garantir refetch mesmo sem mudança de filtro.
    staleTime: 0,
    refetchOnMount: "always",
    gcTime: 5 * 60 * 1000,
  });

  // Achata todas as páginas já carregadas em uma única lista (o "acúmulo").
  const events = useMemo(
    () => data?.pages.flatMap((p) => p.events) ?? [],
    [data],
  );

  // `total`/`totalPages` são constantes entre as páginas — a 1ª já os traz.
  const pagination = data?.pages[0]?.pagination ?? {
    page: 1,
    limit,
    total: 0,
    totalPages: 1,
  };

  return {
    events,
    pagination,
    query: data?.pages[0]?.query,
    isLoading,
    error,
    refetch,
    /** Busca e ANEXA a próxima página (usado pelo botão "Carregar mais"). */
    fetchNextPage,
    /** `true` enquanto a próxima página está sendo buscada. */
    isFetchingNextPage,
    /** Ainda há páginas a carregar. */
    hasNextPage: !!hasNextPage,
  };
}
