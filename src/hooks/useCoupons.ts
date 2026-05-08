import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { organizerService } from "@/services";
import { queryKeys } from "@/services/cache/QueryClient";
import toast from "react-hot-toast";

export interface Coupon {
  id: string;
  code: string;
  discountType: string;
  discountValue: number;
  maxUses?: number;
  validFrom?: string;
  validUntil?: string;
}

interface CouponsCache {
  coupons: any[];
  pagination?: { total?: number; [k: string]: unknown };
}

export function useCoupons(
  eventId: string | null,
  enabled: boolean = true,
  page: number = 1,
  limit: number = 10
) {
  const queryClient = useQueryClient();
  const cacheKey = queryKeys.events.coupons(eventId || "");

  const {
    data,
    isLoading,
    error,
  } = useQuery({
    queryKey: cacheKey,
    queryFn: async () => {
      if (!eventId) return { coupons: [], pagination: { total: 0 } } as CouponsCache;
      return organizerService.getCoupons(eventId, { page, limit });
    },
    enabled: enabled && !!eventId,
  });

  const createMutation = useMutation({
    mutationFn: async (couponData: any) => {
      if (!eventId) throw new Error("Event ID is required");
      return organizerService.createCoupon(eventId, couponData);
    },
    onSuccess: (newCoupon: any) => {
      if (eventId && newCoupon?.id) {
        queryClient.setQueryData<CouponsCache>(cacheKey, (old) => {
          const existing = old?.coupons ?? [];
          if (existing.some((c) => c?.id === newCoupon.id)) return old;
          const prevTotal = (old?.pagination?.total as number | undefined) ?? existing.length;
          return {
            ...(old ?? {}),
            coupons: [newCoupon, ...existing],
            pagination: { ...(old?.pagination ?? {}), total: prevTotal + 1 },
          };
        });
      }
      toast.success("Cupom criado com sucesso!");
    },
    onError: (error: any) => {
      console.error("Error creating coupon:", error);
      toast.error(error.response?.data?.message || "Erro ao criar cupom");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      couponId,
      data,
    }: {
      couponId: string;
      data: any;
    }) => {
      if (!eventId) throw new Error("Event ID is required");
      return organizerService.updateCoupon(eventId, couponId, data);
    },
    onSuccess: (updatedCoupon: any) => {
      if (eventId && updatedCoupon?.id) {
        queryClient.setQueryData<CouponsCache>(cacheKey, (old) => {
          if (!old?.coupons) return old;
          return {
            ...old,
            coupons: old.coupons.map((c) =>
              c?.id === updatedCoupon.id ? { ...c, ...updatedCoupon } : c,
            ),
          };
        });
      }
      toast.success("Cupom atualizado com sucesso!");
    },
    onError: (error: any) => {
      console.error("Error updating coupon:", error);
      toast.error(error.response?.data?.message || "Erro ao atualizar cupom");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (couponId: string) => {
      if (!eventId) throw new Error("Event ID is required");
      await organizerService.deleteCoupon(eventId, couponId);
      return couponId;
    },
    onSuccess: (deletedId: string) => {
      if (eventId) {
        queryClient.setQueryData<CouponsCache>(cacheKey, (old) => {
          if (!old?.coupons) return old;
          const filtered = old.coupons.filter((c) => c?.id !== deletedId);
          const prevTotal = (old.pagination?.total as number | undefined) ?? old.coupons.length;
          return {
            ...old,
            coupons: filtered,
            pagination: { ...(old.pagination ?? {}), total: Math.max(0, prevTotal - 1) },
          };
        });
      }
      toast.success("Cupom deletado com sucesso!");
    },
    onError: (error: any) => {
      console.error("Error deleting coupon:", error);
      toast.error(error.response?.data?.message || "Erro ao deletar cupom");
    },
  });

  return {
    coupons: data?.coupons || [],
    total: (data as any)?.total || (data as any)?.pagination?.total || 0,
    loading: isLoading,
    error,
    createCoupon: (couponData: any) => createMutation.mutateAsync(couponData),
    updateCoupon: (couponId: string, data: any) =>
      updateMutation.mutateAsync({ couponId, data }),
    deleteCoupon: (couponId: string) => deleteMutation.mutateAsync(couponId),
  };
}
