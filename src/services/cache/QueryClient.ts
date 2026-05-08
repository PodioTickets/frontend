import {
  QueryClient,
  QueryCache,
  MutationCache,
  DefaultOptions,
} from "@tanstack/react-query";

const defaultQueryOptions: DefaultOptions = {
  queries: {
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: (failureCount, error: any) => {
      if (error?.status === 401 || error?.status === 403) return false;
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    refetchOnWindowFocus: false,
    refetchOnMount: false,
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
    details: () => [...queryKeys.events.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.events.details(), id] as const,
    tickets: (eventId: string) => [...queryKeys.events.all, "tickets", eventId] as const,
    ticketCategories: (eventId: string) => [...queryKeys.events.all, "ticketCategories", eventId] as const,
    topics: (eventId: string) => [...queryKeys.events.all, "topics", eventId] as const,
    questions: (eventId: string) => [...queryKeys.events.all, "questions", eventId] as const,
    coupons: (eventId: string) => [...queryKeys.events.all, "coupons", eventId] as const,
    vouchers: (eventId: string) => [...queryKeys.events.all, "vouchers", eventId] as const,
    products: (eventId: string) => [...queryKeys.events.all, "products", eventId] as const,
    kits: (eventId: string) => [...queryKeys.events.all, "kits", eventId] as const,
    modalities: {
      templates: () => [...queryKeys.events.all, "modalities", "templates"] as const,
    },
  },
  user: {
    all: ["user"] as const,
    tickets: (params?: { page?: number; limit?: number; status?: string }) =>
      [...queryKeys.user.all, "tickets", params] as const,
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
    auditLogs: {
      all: () => [...queryKeys.admin.all, "auditLogs"] as const,
      list: (params: Record<string, unknown>) =>
        [...queryKeys.admin.auditLogs.all(), "list", params] as const,
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
  },
};

export const invalidateQueries = {
  events: {
    all: () => queryClient.invalidateQueries({ queryKey: queryKeys.events.all }),
    detail: (id: string) =>
      queryClient.invalidateQueries({ queryKey: queryKeys.events.detail(id) }),
    tickets: (eventId: string) =>
      queryClient.invalidateQueries({ queryKey: queryKeys.events.tickets(eventId) }),
    ticketCategories: (eventId: string) =>
      queryClient.invalidateQueries({ queryKey: queryKeys.events.ticketCategories(eventId) }),
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
