import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { organizerService } from "@/services";
import type { ModalityGroup } from "@/services/organizer/OrganizerService";
import { queryKeys } from "@/services/cache/QueryClient";
import {
  formatRawTicket,
  mergeTicketsWithPendingWrites,
  type Ticket,
} from "@/hooks/useTickets";

/**
 * Subconjunto do evento que a página de gerenciamento de ingressos consome.
 * O bundle não traz o evento completo (banner, descrições, etc) — só o
 * necessário pra UI da página de tickets.
 */
export interface TicketsManagementEvent {
  id: string;
  name: string;
  slug: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  kitSelectionDisplay?: any;
}

/**
 * Shape armazenado no cache do React Query. Tickets já vêm **formatados**
 * (após `formatRawTicket`) — o `select` apenas reconcila com pending writes,
 * sem reformatar. Isso evita o bug de `formatRawTicket` ser não-idempotente.
 */
export interface TicketsManagementBundle {
  event: TicketsManagementEvent;
  categories: ModalityGroup[];
  tickets: Ticket[];
}

/**
 * Shape **bruto** vindo do backend, antes da normalização.
 * Apenas o helper `normalizeTicketsManagementRaw` consome esse tipo —
 * tudo que entra no cache é `TicketsManagementBundle` (formatted).
 */
export interface TicketsManagementBundleRaw {
  event: TicketsManagementEvent;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  categories: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tickets: any[];
}

/**
 * Normaliza o payload bruto do backend pro shape do cache. Aplica
 * `formatRawTicket` em cada ticket. Usado pelo `queryFn` e pelo Server
 * Component (`initialData`).
 */
export function normalizeTicketsManagementRaw(
  raw: TicketsManagementBundleRaw,
): TicketsManagementBundle {
  return {
    event: raw.event,
    categories: (raw.categories ?? []) as ModalityGroup[],
    tickets: (raw.tickets ?? []).map(formatRawTicket),
  };
}

const EMPTY_BUNDLE: TicketsManagementBundle = {
  event: { id: "", name: "", slug: "" },
  categories: [],
  tickets: [],
};

export interface UseTicketsManagementOptions {
  /**
   * Bundle já **formatado** pré-carregado no servidor (Server Component).
   * Hidrata o cache no primeiro render — após `staleTime` o React Query
   * refaz a query normalmente.
   *
   * Deve ser passado por `normalizeTicketsManagementRaw(...)` antes de
   * chegar aqui (o Server Component faz isso). O cache armazena formatted
   * pra evitar dupla aplicação de `formatRawTicket` (não-idempotente).
   */
  initialData?: TicketsManagementBundle;
}

/**
 * Bundle da página de gerenciamento de ingressos: `event + categories +
 * tickets` em **uma única request**.
 *
 * - Substitui `useEvent` + `useTicketCategories` + `useTickets` nessa página.
 * - `staleTime: 30s` dedupa navegações rápidas (ex.: voltar do form de edição).
 * - `refetchOnWindowFocus: true` (nativo do react-query) substitui os listeners
 *   customizados `focus`/`visibilitychange`/`pageshow` que duplicavam disparos.
 * - Tickets já entram no cache **formatados** (pelo `queryFn` ou pelo
 *   Server Component via `normalizeTicketsManagementRaw`). O `select` apenas
 *   reconcila com pending writes — não reformata.
 */
export function useTicketsManagement(
  eventId: string | null,
  enabled: boolean = true,
  options: UseTicketsManagementOptions = {},
) {
  const { initialData } = options;
  const { data, isLoading, error, refetch } = useQuery<
    TicketsManagementBundle,
    Error,
    TicketsManagementBundle
  >({
    queryKey: queryKeys.events.ticketsManagement(eventId || ""),
    queryFn: async () => {
      if (!eventId) return EMPTY_BUNDLE;
      const raw = await organizerService.getTicketsManagementBundle(eventId);
      return normalizeTicketsManagementRaw(raw);
    },
    // Cache já tem tickets formatados — apenas reconcila com pending writes.
    select: (cached) => ({
      event: cached.event,
      categories: cached.categories,
      tickets: mergeTicketsWithPendingWrites(eventId, cached.tickets),
    }),
    enabled: enabled && !!eventId,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: "always",
    initialData,
    initialDataUpdatedAt: initialData ? Date.now() : undefined,
  });

  // Referência estável quando data é undefined (evita loops em useEffect downstream).
  const bundle = useMemo<TicketsManagementBundle>(
    () => data ?? EMPTY_BUNDLE,
    [data],
  );

  return {
    event: bundle.event,
    categories: bundle.categories,
    tickets: bundle.tickets,
    loading: isLoading,
    error,
    refetch,
  };
}
