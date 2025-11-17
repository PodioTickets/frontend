import { useMutation, useQuery, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import { ApiResponse } from '@/services/base/ApiClient';

// Hook base para queries de API
export function useApiQuery<TData = unknown, TError = unknown>(
  queryKey: any[],
  queryFn: () => Promise<ApiResponse<TData>>,
  options?: Omit<UseQueryOptions<ApiResponse<TData>, TError>, 'queryKey' | 'queryFn'>
): UseQueryResult<ApiResponse<TData>, TError> {
  return useQuery({
    queryKey,
    queryFn: async () => {
      const response = await queryFn();
      return response;
    },
    ...options,
  });
}

// Hook base para mutations de API
export function useApiMutation<TData = unknown, TError = unknown, TVariables = unknown>(
  mutationFn: (variables: TVariables) => Promise<ApiResponse<TData>>,
  options?: any
) {
  return useMutation({
    mutationFn,
    ...options,
  });
}
