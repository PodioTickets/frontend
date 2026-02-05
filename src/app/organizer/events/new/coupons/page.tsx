"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { userService } from "@/services";
import { organizerService } from "@/services";
import { useCreateEvent } from "@/contexts/CreateEventContext";
import { Button } from "@/components/Button";
import { ArrowButton } from "@/components/ArrowButton";
import { CouponIcon } from "@/components/Icons/CouponIcon";
import { CopyIcon } from "@/components/Icons/CopyIcon";
import { PencilIcon } from "@/components/Icons/PencilIcon";
import { TrashIcon } from "@/components/Icons/TrashIcon";
import toast from "react-hot-toast";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { useClipboard } from "@/hooks/useClipboard";
import { useCreateCouponModal, useDeleteCouponModal } from "@/stores/modalStore";

interface Coupon {
  id: string;
  code: string;
  type: "PERCENTAGE" | "FIXED";
  value: number;
  expiryDate: string;
  status: "ACTIVE" | "INACTIVE" | "EXPIRED";
  eventId: string;
  createdAt: string;
  updatedAt: string;
}

export default function CouponsPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { formData } = useCreateEvent();
  const { copyToClipboard } = useClipboard();
  const { openCreateCouponModal, setOnModalSave } = useCreateCouponModal();
  const { openDeleteCouponModal } = useDeleteCouponModal();
  const [authChecked, setAuthChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });


  // Verificar autenticação
  useEffect(() => {
    const hasToken = userService.isAuthenticated();
    if (!hasToken) {
      router.push("/");
      return;
    }
    const timer = setTimeout(() => {
      setAuthChecked(true);
    }, 300);
    return () => clearTimeout(timer);
  }, [router]);

  // Carregar cupons
  const loadCoupons = async () => {
    if (!formData.createdEventId) {
      setCoupons([]);
      return;
    }
    setLoading(true);
    try {
      const data = await organizerService.getCoupons(formData.createdEventId, {
        page: pagination.page,
        limit: pagination.limit,
      });
      setCoupons(data.coupons || []);
      setPagination(data.pagination || {
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 1,
      });
    } catch (error: any) {
      console.error("Error loading coupons:", error);
      toast.error("Erro ao carregar cupons");
      setCoupons([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authChecked) return;
    loadCoupons();
  }, [authChecked, formData.createdEventId, pagination.page, pagination.limit]);

  // Setup modal save callback
  useEffect(() => {
    setOnModalSave(async () => {
      await loadCoupons();
    });
  }, [setOnModalSave, formData.createdEventId]);

  const handleBack = () => {
    router.push("/organizer/events/new/questionnaire");
  };

  const handleCreateCoupon = () => {
    openCreateCouponModal({
      eventId: formData.createdEventId || "mock-event",
    });
  };

  const handleEditCoupon = (coupon: Coupon) => {
    // TODO: Abrir modal de edição de cupom
    openCreateCouponModal({
      eventId: formData.createdEventId || "mock-event",
      couponId: coupon.id,
      coupon: coupon,
    });
  };

  const handleDeleteCoupon = (couponId: string, couponCode: string) => {
    openDeleteCouponModal({
      couponId,
      couponCode,
      onConfirm: async () => {
        if (!formData.createdEventId) {
          throw new Error("Evento não encontrado");
        }

        try {
          await organizerService.deleteCoupon(formData.createdEventId, couponId);
          toast.success("Cupom excluído com sucesso!");
          loadCoupons(); // Recarregar cupons da API
        } catch (error: any) {
          console.error("Error deleting coupon:", error);
          throw error; // O modal já trata o erro
        }
        toast.success("Cupom excluído com sucesso!");
      },
    });
  };

  const handleCopyCode = async (code: string) => {
    try {
      await copyToClipboard(code);
    } catch (error) {
      // Error já é tratado pelo hook
    }
  };

  const handleSkip = () => {
    // TODO: Publicar evento diretamente
    router.push("/organizer/events/new/vouchers");
  };

  const handleConfirm = () => {
    router.push("/organizer/events/new/vouchers");
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      ACTIVE: { label: "Ativo", className: "bg-[#21835D] text-[#FBFEFB]" },
      INACTIVE: { label: "Inativo", className: "bg-gray-5 text-gray-12" },
      EXPIRED: { label: "Expirado", className: "bg-red-10/20 text-red-11" },
    };
    return statusMap[status] || statusMap.INACTIVE;
  };

  const getTypeLabel = (type: string) => {
    return type === "PERCENTAGE" ? "Percentual" : "Valor fixo";
  };

  const getValueDisplay = (coupon: Coupon) => {
    return coupon.type === "PERCENTAGE"
      ? `${coupon.value}%`
      : formatCurrency(coupon.value);
  };

  if (!authChecked || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-11">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 pb-[176px] px-5 md:px-[124px] pt-[52px]">
      <div className="max-w-[1192px] mx-auto flex flex-col gap-9">
        {/* Title Section */}
        <div className="flex flex-col gap-4">
          <div className="flex gap-3 items-center">
            <button
              onClick={handleBack}
              className="border border-gray-6 rounded-[52px] cursor-pointer size-9 flex items-center justify-center hover:bg-gray-3 transition-colors rotate-180"
            >
              <ArrowButton isOpen={false} />
            </button>
            <h1 className="text-gray-12 text-[28px] font-bold font-manrope leading-[1.1]">
              Cupons de desconto
            </h1>
          </div>
          <p className="text-gray-11 text-base font-dm-sans leading-[1.3]">
            Crie e gerencie cupons para aplicar desconto nas inscrições
          </p>
        </div>

        {/* Coupons List Section */}
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <h2 className="text-gray-12 text-xl font-bold font-manrope leading-[1.1]">
              Lista de cupons
            </h2>
            <Button
              onClick={handleCreateCoupon}
              variant="default"
              className="text-base font-bold font-manrope leading-[1.1]"
            >
              <Plus className="size-5" />
              Criar cupom
            </Button>
          </div>

          {/* Coupons Table */}
          {coupons.length === 0 ? (
            <div className="border border-gray-6 rounded-xl p-12 flex flex-col items-center justify-center gap-4">
              <CouponIcon className="size-12 text-gray-11" />
              <p className="text-gray-11 text-base font-dm-sans">
                Nenhum cupom criado ainda
              </p>
            </div>
          ) : (
            <div className="bg-gray-1 rounded-lg border border-gray-6 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-3 border-b border-gray-6">
                    <tr>
                      <th className="text-left py-4 px-5 text-gray-12 text-sm font-semibold font-dm-sans">
                        Código
                      </th>
                      <th className="text-center py-4 px-5 text-gray-12 text-sm font-semibold font-dm-sans">
                        Tipo
                      </th>
                      <th className="text-center py-4 px-5 text-gray-12 text-sm font-semibold font-dm-sans">
                        Valor
                      </th>
                      <th className="text-center py-4 px-5 text-gray-12 text-sm font-semibold font-dm-sans">
                        Validade
                      </th>
                      <th className="text-center py-4 px-5 text-gray-12 text-sm font-semibold font-dm-sans">
                        Status
                      </th>
                      <th className="text-end py-4 px-5 text-gray-12 text-sm font-semibold font-dm-sans">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-6">
                    {coupons.map((coupon) => {
                      const statusBadge = getStatusBadge(coupon.status);
                      return (
                        <tr
                          key={coupon.id}
                          className="hover:bg-gray-2 transition-colors"
                        >
                          <td className="py-4 px-5">
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-12 font-semibold font-dm-sans">
                                {coupon.code}
                              </span>
                              <button
                                onClick={() => handleCopyCode(coupon.code)}
                                className="size-5 flex items-center justify-center hover:bg-gray-3 rounded-lg transition-colors cursor-pointer"
                                title="Copiar código"
                              >
                                <CopyIcon className="size-4 text-gray-11" />
                              </button>
                            </div>
                          </td>
                          <td className="py-4 px-5 text-center">
                            <span className="text-sm text-gray-12 font-semibold font-dm-sans">
                              {getTypeLabel(coupon.type)}
                            </span>
                          </td>
                          <td className="py-4 px-5 text-center">
                            <span className="text-sm text-gray-12 font-semibold font-dm-sans">
                              {getValueDisplay(coupon)}
                            </span>
                          </td>
                          <td className="py-4 px-5 text-center">
                            <span className="text-sm text-gray-12 font-semibold font-dm-sans">
                              {formatDate(coupon.expiryDate)}
                            </span>
                          </td>
                          <td className="py-4 px-5 text-center">
                            <span
                              className={`px-3 py-1 rounded text-xs font-medium ${statusBadge.className}`}
                            >
                              {statusBadge.label}
                            </span>
                          </td>
                          <td className="py-4 px-5">
                            <div className="flex items-center gap-2 justify-end">
                              <button
                                onClick={() => handleEditCoupon(coupon)}
                                className="size-8 rounded-lg bg-gray-2 border border-gray-6 hover:bg-gray-4 flex items-center justify-center transition-colors"
                                title="Editar"
                              >
                                <PencilIcon className="size-4 text-gray-11" />
                              </button>
                              <button
                                onClick={() => handleDeleteCoupon(coupon.id, coupon.code)}
                                className="size-8 rounded-lg bg-red-2 border border-red-6 hover:bg-red-3 flex items-center justify-center transition-colors"
                                title="Excluir"
                              >
                                <TrashIcon className="size-4 text-red-12" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() =>
                setPagination((prev) => ({ ...prev, page: prev.page - 1 }))
              }
              disabled={pagination.page === 1}
              className="size-8 rounded-full border border-gray-6 bg-gray-1 hover:bg-gray-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
            >
              <ChevronLeft className="size-4 text-gray-11" />
            </button>
            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(
              (page) => (
                <button
                  key={page}
                  onClick={() =>
                    setPagination((prev) => ({ ...prev, page }))
                  }
                  className={`size-8 rounded-full border transition-colors font-dm-sans text-sm ${pagination.page === page
                    ? "bg-primary-11 text-white border-primary-11"
                    : "bg-gray-1 border-gray-6 text-gray-12 hover:bg-gray-2"
                    }`}
                >
                  {page}
                </button>
              )
            )}
            <button
              onClick={() =>
                setPagination((prev) => ({ ...prev, page: prev.page + 1 }))
              }
              disabled={pagination.page === pagination.totalPages}
              className="size-8 rounded-full border border-gray-6 bg-gray-1 hover:bg-gray-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
            >
              <ChevronRight className="size-4 text-gray-11" />
            </button>
          </div>
        )}

        {/* Bottom Actions */}
        <div className="flex justify-end gap-2">
          <Button
            onClick={handleSkip}
            variant="outline"
            className="border-gray-6 text-gray-12 text-lg font-bold px-11 h-[52px]"
          >
            Pular etapa e publicar
          </Button>
          <Button
            onClick={handleConfirm}
            variant="default"
            className="text-gray-12 text-lg font-bold px-11 h-[52px]"
          >
            Confirmar cupons
          </Button>
        </div>
      </div>
    </div>
  );
}
