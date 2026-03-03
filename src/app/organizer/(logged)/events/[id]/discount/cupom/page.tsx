"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { userService } from "@/services";
import { organizerService } from "@/services";
import { Button } from "@/components/Button";
import { CouponIcon } from "@/components/Icons/CouponIcon";
import { CopyIcon } from "@/components/Icons/CopyIcon";
import { PencilIcon } from "@/components/Icons/PencilIcon";
import { TrashIcon } from "@/components/Icons/TrashIcon";
import toast from "react-hot-toast";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { useClipboard } from "@/hooks/useClipboard";
import { useCreateCouponModal, useDeleteCouponModal } from "@/stores/modalStore";
import { EventPageHeader } from "@/components/Organizer/EventPageHeader";
import { Loading } from "@/components/Loading";

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
  const params = useParams();
  const eventId = params.id as string;
  const { isAuthenticated } = useAuth();
  const { copyToClipboard } = useClipboard();
  const { openCreateCouponModal, setOnModalSave } = useCreateCouponModal();
  const { openDeleteCouponModal } = useDeleteCouponModal();
  const [authChecked, setAuthChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [event, setEvent] = useState<any>(null);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  // Verificar autenticação e carregar evento
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

  // Carregar dados do evento
  useEffect(() => {
    if (!authChecked || !eventId) return;
    
    const loadEvent = async () => {
      try {
        const eventData = await organizerService.getEventById(eventId);
        setEvent(eventData);
      } catch (error: any) {
        console.error("Error loading event:", error);
        toast.error("Erro ao carregar evento");
      }
    };

    loadEvent();
  }, [authChecked, eventId]);

  // Carregar cupons
  const loadCoupons = async () => {
    if (!eventId) {
      setCoupons([]);
      return;
    }
    setLoading(true);
    try {
      const data = await organizerService.getCoupons(eventId, {
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
    if (!authChecked || !eventId) return;
    loadCoupons();
  }, [authChecked, eventId, pagination.page, pagination.limit]);

  // Setup modal save callback
  useEffect(() => {
    setOnModalSave(async () => {
      await loadCoupons();
    });
  }, [setOnModalSave, eventId]);

  const handleCreateCoupon = () => {
    openCreateCouponModal({
      eventId: eventId,
    });
  };

  const handleEditCoupon = (coupon: Coupon) => {
    openCreateCouponModal({
      eventId: eventId,
      couponId: coupon.id,
      coupon: coupon,
    });
  };

  const handleDeleteCoupon = (couponId: string, couponCode: string) => {
    openDeleteCouponModal({
      couponId,
      couponCode,
      onConfirm: async () => {
        if (!eventId) {
          throw new Error("Evento não encontrado");
        }

        try {
          await organizerService.deleteCoupon(eventId, couponId);
          toast.success("Cupom excluído com sucesso!");
          loadCoupons();
        } catch (error: any) {
          console.error("Error deleting coupon:", error);
          throw error;
        }
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
      <div className="min-h-screen bg-gray-2">
        <EventPageHeader eventName={event?.name} />
        <div className="flex items-center justify-center min-h-[400px]">
          <Loading />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-2">
      <EventPageHeader eventName={event?.name} />
      <div className="max-w-7xl mx-auto px-4 lg:px-0 py-6">
        <div className="flex flex-col gap-9">
          {/* Title Section */}
          <div className="flex flex-col gap-4">
            <h1 className="text-gray-12 text-[28px] font-bold font-manrope leading-[1.1]">
              Cupons de desconto
            </h1>
            <p className="text-gray-11 text-base font-family-dm-sans leading-[1.3]">
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
                <p className="text-gray-11 text-base font-family-dm-sans">
                  Nenhum cupom criado ainda
                </p>
              </div>
            ) : (
              <div className="bg-gray-1 rounded-lg border border-gray-6 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-3 border-b border-gray-6">
                      <tr>
                        <th className="text-left py-4 px-5 text-gray-12 text-sm font-semibold font-family-dm-sans">
                          Código
                        </th>
                        <th className="text-center py-4 px-5 text-gray-12 text-sm font-semibold font-family-dm-sans">
                          Tipo
                        </th>
                        <th className="text-center py-4 px-5 text-gray-12 text-sm font-semibold font-family-dm-sans">
                          Valor
                        </th>
                        <th className="text-center py-4 px-5 text-gray-12 text-sm font-semibold font-family-dm-sans">
                          Validade
                        </th>
                        <th className="text-center py-4 px-5 text-gray-12 text-sm font-semibold font-family-dm-sans">
                          Status
                        </th>
                        <th className="text-end py-4 px-5 text-gray-12 text-sm font-semibold font-family-dm-sans">
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
                                <span className="text-sm text-gray-12 font-semibold font-family-dm-sans">
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
                              <span className="text-sm text-gray-12 font-semibold font-family-dm-sans">
                                {getTypeLabel(coupon.type)}
                              </span>
                            </td>
                            <td className="py-4 px-5 text-center">
                              <span className="text-sm text-gray-12 font-semibold font-family-dm-sans">
                                {getValueDisplay(coupon)}
                              </span>
                            </td>
                            <td className="py-4 px-5 text-center">
                              <span className="text-sm text-gray-12 font-semibold font-family-dm-sans">
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
                    className={`size-8 rounded-full border transition-colors font-family-dm-sans text-sm ${pagination.page === page
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
        </div>
      </div>
    </div>
  );
}
