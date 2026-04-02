import { useQuery, useMutation } from "@tanstack/react-query";
import { organizerService } from "@/services";
import { queryKeys, invalidateQueries } from "@/services/cache/QueryClient";
import toast from "react-hot-toast";

export interface Voucher {
  id: string;
  code: string;
  discountType: string;
  discountValue: number;
  maxUses?: number;
  validFrom?: string;
  validUntil?: string;
}

export function useVouchers(
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
    queryKey: queryKeys.events.vouchers(eventId || ""),
    queryFn: async () => {
      if (!eventId) return { groups: [], pagination: { total: 0 } };
      return organizerService.getVouchers(eventId, { page, limit });
    },
    enabled: enabled && !!eventId,
  });

  const createMutation = useMutation({
    mutationFn: async (voucherData: any) => {
      if (!eventId) throw new Error("Event ID is required");
      return organizerService.createVoucher(eventId, voucherData);
    },
    onSuccess: () => {
      invalidateQueries.events.vouchers(eventId!);
      toast.success("Voucher criado com sucesso!");
    },
    onError: (error: any) => {
      console.error("Error creating voucher:", error);
      toast.error(error.response?.data?.message || "Erro ao criar voucher");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      voucherId,
      data,
    }: {
      voucherId: string;
      data: any;
    }) => {
      if (!eventId) throw new Error("Event ID is required");
      return organizerService.updateVoucher(eventId, voucherId, data);
    },
    onSuccess: () => {
      invalidateQueries.events.vouchers(eventId!);
      toast.success("Voucher atualizado com sucesso!");
    },
    onError: (error: any) => {
      console.error("Error updating voucher:", error);
      toast.error(error.response?.data?.message || "Erro ao atualizar voucher");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (voucherId: string) => {
      if (!eventId) throw new Error("Event ID is required");
      return organizerService.deleteVoucher(eventId, voucherId);
    },
    onSuccess: () => {
      invalidateQueries.events.vouchers(eventId!);
      toast.success("Voucher deletado com sucesso!");
    },
    onError: (error: any) => {
      console.error("Error deleting voucher:", error);
      toast.error(error.response?.data?.message || "Erro ao deletar voucher");
    },
  });

  return {
    groups: data?.groups || [],
    pagination: data?.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 },
    total: data?.pagination?.total || 0,
    loading: isLoading,
    error,
    createVoucher: (voucherData: any) => createMutation.mutateAsync(voucherData),
    updateVoucher: (voucherId: string, data: any) =>
      updateMutation.mutateAsync({ voucherId, data }),
    deleteVoucher: (voucherId: string) => deleteMutation.mutateAsync(voucherId),
  };
}
