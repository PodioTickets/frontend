import { useQuery } from "@tanstack/react-query";
import { organizerService } from "@/services";
import { queryKeys } from "@/services/cache/QueryClient";

export function useModalityTemplates(enabled: boolean = true) {
  const {
    data: templates = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: queryKeys.events.modalities.templates(),
    queryFn: async () => {
      const response: any = await organizerService.getModalityTemplates();
      return response.templates || [];
    },
    enabled,
  });

  return {
    templates,
    loading: isLoading,
    error,
  };
}
