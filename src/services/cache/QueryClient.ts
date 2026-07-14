import {
  QueryClient,
  QueryCache,
  MutationCache,
  DefaultOptions,
} from "@tanstack/react-query";

const defaultQueryOptions: DefaultOptions = {
  queries: {
    /* Política "menos cache possível" (decisão de produto): por padrão, todo
     * dado é considerado IMEDIATAMENTE stale e RE-BUSCADO ao montar/navegar.
     * Isso elimina a classe de bug "abri/voltei e vi dado velho" sem depender
     * de cada hook lembrar de sobrescrever.
     *
     * - `staleTime: 0`        → nunca "fresco"; qualquer consumidor que monta dispara refetch.
     * - `refetchOnMount: "always"` → revalida a cada montagem de página/componente.
     * - `gcTime`              → SÓ retenção em memória (não causa dado velho): mantém um
     *   snapshot pra render instantâneo enquanto o refetch corre. Reduzido p/ 5min
     *   pra minimizar o "flash" de um snapshot antigo ao revisitar.
     *
     * `refetchOnWindowFocus` fica FALSE de PROPÓSITO: refetch ao focar a aba logo
     * após uma mutação pode ler o backend ANTES da escrita propagar (eventual
     * consistency) e "ressuscitar" um item recém-deletado — foi exatamente o
     * sintoma "some e aparece de novo" da categoria. Consistência de MESMA página
     * (criar/editar/excluir) é resolvida por optimistic update + invalidação/
     * pending-writes nas mutations, não por refetch agressivo. */
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
    retry: (failureCount, error: any) => {
      if (error?.status === 401 || error?.status === 403) return false;
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    refetchOnWindowFocus: false,
    refetchOnMount: "always",
    refetchOnReconnect: "always",
    networkMode: "online",
  },
  mutations: {
    retry: false,
    onError: (error) => {
      console.error("Mutation error:", error);
    },
  },
};

const queryCache = new QueryCache({
  onError: (error, query) => {
    console.error("Query error:", {
      queryKey: query.queryKey,
      error: error?.message || error,
      timestamp: new Date().toISOString(),
    });
  },
});

const mutationCache = new MutationCache({
  onError: (error) => {
    console.error("Mutation error:", {
      error: error?.message || error,
      timestamp: new Date().toISOString(),
    });
  },
});

export const queryClient = new QueryClient({
  queryCache,
  mutationCache,
  defaultOptions: defaultQueryOptions,
});

export const queryKeys = {
  events: {
    all: ["events"] as const,
    /** Carrossel público de "Eventos em destaque" da home. */
    featured: (limit: number) =>
      [...queryKeys.events.all, "featured", limit] as const,
    details: () => [...queryKeys.events.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.events.details(), id] as const,
    tickets: (eventId: string) => [...queryKeys.events.all, "tickets", eventId] as const,
    ticketCategories: (eventId: string) => [...queryKeys.events.all, "ticketCategories", eventId] as const,
    /**
     * Bundle agregado da página de gerenciamento de ingressos
     * (event + categories + tickets em 1 só GET).
     */
    ticketsManagement: (eventId: string) =>
      [...queryKeys.events.all, "ticketsManagement", eventId] as const,
    topics: (eventId: string) => [...queryKeys.events.all, "topics", eventId] as const,
    questions: (eventId: string) => [...queryKeys.events.all, "questions", eventId] as const,
    coupons: (eventId: string) => [...queryKeys.events.all, "coupons", eventId] as const,
    vouchers: (eventId: string) => [...queryKeys.events.all, "vouchers", eventId] as const,
    products: (eventId: string) => [...queryKeys.events.all, "products", eventId] as const,
    kits: (eventId: string) => [...queryKeys.events.all, "kits", eventId] as const,
    modalities: {
      templates: () => [...queryKeys.events.all, "modalities", "templates"] as const,
    },
    /* Dashboard split em 3 rotas independentes (overview/rankings/secondary).
     * Cada rota tem queryKey própria com params como sub-key — paginar uma
     * tabela só invalida/refetch a respectiva rota, as outras ficam intactas. */
    dashboard: {
      all: (eventId: string) =>
        [...queryKeys.events.all, "dashboard", eventId] as const,
      overview: (
        eventId: string,
        params: { period?: string; ticketIds?: string[] },
      ) =>
        [
          ...queryKeys.events.dashboard.all(eventId),
          "overview",
          params,
        ] as const,
      rankings: (
        eventId: string,
        params: {
          period?: string;
          ticketIds?: string[];
          ticketRankingPage?: number;
          ticketRankingLimit?: number;
          ticketsPage?: number;
          ticketsLimit?: number;
        },
      ) =>
        [
          ...queryKeys.events.dashboard.all(eventId),
          "rankings",
          params,
        ] as const,
      secondary: (
        eventId: string,
        params: { period?: string; ticketIds?: string[] },
      ) =>
        [
          ...queryKeys.events.dashboard.all(eventId),
          "secondary",
          params,
        ] as const,
    },
  },
  user: {
    all: ["user"] as const,
    tickets: (params?: { page?: number; limit?: number; status?: string }) =>
      [...queryKeys.user.all, "tickets", params] as const,
  },
  /* Geo (estados/cidades por país) — dado de referência ESTÁTICO. As queries
   * sobrescrevem a política global "menos cache" (staleTime Infinity, sem
   * refetchOnMount) porque essa lista é imutável. Ver `src/hooks/useGeo.ts`. */
  geo: {
    all: ["geo"] as const,
    states: (countryCode: string) =>
      [...queryKeys.geo.all, "states", countryCode] as const,
    cities: (countryCode: string, stateCode: string) =>
      [...queryKeys.geo.all, "cities", countryCode, stateCode] as const,
  },
  admin: {
    all: ["admin"] as const,
    notifications: {
      all: () => [...queryKeys.admin.all, "notifications"] as const,
      list: (params: { page: number; search: string; status: string }) =>
        [...queryKeys.admin.notifications.all(), "list", params] as const,
      count: (status: "review" | "sent" | "denied") =>
        [...queryKeys.admin.notifications.all(), "count", status] as const,
    },
    retention: {
      all: () => [...queryKeys.admin.all, "retention"] as const,
      list: (params: { page: number; search: string }) =>
        [...queryKeys.admin.retention.all(), "list", params] as const,
    },
    organizations: {
      all: () => [...queryKeys.admin.all, "organizations"] as const,
      list: (params: { page: number; search: string; status: string }) =>
        [...queryKeys.admin.organizations.all(), "list", params] as const,
    },
    users: {
      all: () => [...queryKeys.admin.all, "users"] as const,
      list: (params: { page: number; search: string; status: string }) =>
        [...queryKeys.admin.users.all(), "list", params] as const,
      detail: (id: string) =>
        [...queryKeys.admin.users.all(), "detail", id] as const,
      registrations: (id: string, params: { page: number }) =>
        [...queryKeys.admin.users.all(), "registrations", id, params] as const,
    },
    auditLogs: {
      all: () => [...queryKeys.admin.all, "auditLogs"] as const,
      list: (params: Record<string, unknown>) =>
        [...queryKeys.admin.auditLogs.all(), "list", params] as const,
    },
    userActivity: {
      all: () => [...queryKeys.admin.all, "userActivity"] as const,
      list: (params: Record<string, unknown>) =>
        [...queryKeys.admin.userActivity.all(), "list", params] as const,
      stats: (params: Record<string, unknown>) =>
        [...queryKeys.admin.userActivity.all(), "stats", params] as const,
      funnel: (params: Record<string, unknown>) =>
        [...queryKeys.admin.userActivity.all(), "funnel", params] as const,
    },
    auditEvent: {
      all: () => [...queryKeys.admin.all, "auditEvent"] as const,
      list: (params: Record<string, unknown>) =>
        [...queryKeys.admin.auditEvent.all(), "list", params] as const,
    },
    repasse: {
      all: () => [...queryKeys.admin.all, "repasse"] as const,
      list: (params: Record<string, unknown>) =>
        [...queryKeys.admin.repasse.all(), "list", params] as const,
    },
    featured: {
      all: () => [...queryKeys.admin.all, "featured"] as const,
      /** Lista dos eventos em destaque (carrossel). */
      list: () => [...queryKeys.admin.featured.all(), "list"] as const,
      /** Picker "adicionar evento": paginado + busca. */
      picker: (params: { page: number; search: string }) =>
        [...queryKeys.admin.featured.all(), "picker", params] as const,
    },
  },
};

export const invalidateQueries = {
  events: {
    all: () => queryClient.invalidateQueries({ queryKey: queryKeys.events.all }),
    detail: (id: string) =>
      queryClient.invalidateQueries({ queryKey: queryKeys.events.detail(id) }),
    // Sempre invalida AMBAS as keys: a antiga (queries dedicadas em outras
    // páginas — dashboard, checkout, modais) e a do bundle agregado (página
    // de gerenciamento). Mantém o cache consistente entre os dois consumidores.
    tickets: (eventId: string) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.events.tickets(eventId) }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.events.ticketsManagement(eventId),
        }),
      ]),
    ticketCategories: (eventId: string) =>
      Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.events.ticketCategories(eventId),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.events.ticketsManagement(eventId),
        }),
      ]),
    ticketsManagement: (eventId: string) =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.events.ticketsManagement(eventId),
      }),
    topics: (eventId: string) =>
      queryClient.invalidateQueries({ queryKey: queryKeys.events.topics(eventId) }),
    questions: (eventId: string) =>
      queryClient.invalidateQueries({ queryKey: queryKeys.events.questions(eventId) }),
    coupons: (eventId: string) =>
      queryClient.invalidateQueries({ queryKey: queryKeys.events.coupons(eventId) }),
    vouchers: (eventId: string) =>
      queryClient.invalidateQueries({ queryKey: queryKeys.events.vouchers(eventId) }),
    products: (eventId: string) =>
      queryClient.invalidateQueries({ queryKey: queryKeys.events.products(eventId) }),
    kits: (eventId: string) =>
      queryClient.invalidateQueries({ queryKey: queryKeys.events.kits(eventId) }),
  },
  user: {
    tickets: () => queryClient.invalidateQueries({ queryKey: queryKeys.user.all }),
  },
  all: () => queryClient.invalidateQueries(),
};

export const removeQueries = {
};
