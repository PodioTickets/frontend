import { useQuery, useMutation } from "@tanstack/react-query";
import { organizerService } from "@/services";
import { queryKeys, invalidateQueries } from "@/services/cache/QueryClient";
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

export function useCoupons(
  eventId: string | null,
  enabled: boolean = true,
  page: number = 1,
  limit: number = 10
) {
  const {
    data,
    isLoading,
    error,
  } = useQuery({
    queryKey: queryKeys.events.coupons(eventId || ""),
    queryFn: async () => {
      if (!eventId) return { coupons: [], total: 0 };
      return organizerService.getCoupons(eventId, { page, limit });
    },
    enabled: enabled && !!eventId,
  });

  const createMutation = useMutation({
    mutationFn: async (couponData: any) => {
      if (!eventId) throw new Error("Event ID is required");
      return organizerService.createCoupon(eventId, couponData);
    },
    onSuccess: () => {
      invalidateQueries.events.coupons(eventId!);
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
    onSuccess: () => {
      invalidateQueries.events.coupons(eventId!);
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
      return organizerService.deleteCoupon(eventId, couponId);
    },
    onSuccess: () => {
      invalidateQueries.events.coupons(eventId!);
      toast.success("Cupom excluído com sucesso!");
    },
    onError: (error: any) => {
      console.error("Error deleting coupon:", error);
      toast.error(error.response?.data?.message || "Erro ao excluir cupom");
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
