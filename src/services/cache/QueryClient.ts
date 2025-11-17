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
  lootbox: {
    all: ["lootbox"] as const,
    lists: () => [...queryKeys.lootbox.all, "list"] as const,
    list: (filters: any) => [...queryKeys.lootbox.lists(), filters] as const,
    details: () => [...queryKeys.lootbox.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.lootbox.details(), id] as const,
    purchases: (wallet: string) =>
      [...queryKeys.lootbox.all, "purchases", wallet] as const,
  },
};

export const invalidateQueries = {
  lootbox: () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.lootbox.all }),
  all: () => queryClient.invalidateQueries(),
};

export const removeQueries = {
  lootbox: () => queryClient.removeQueries({ queryKey: queryKeys.lootbox.all }),
};
