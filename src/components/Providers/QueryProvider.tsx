'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/services/cache/QueryClient';

interface QueryProviderProps {
  children: React.ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
