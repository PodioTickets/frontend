"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { userService } from "@/services";
import { organizerService } from "@/services";
import { Button } from "@/components/Button";
import { VoucherIcon } from "@/components/Icons/VoucherIcon";
import { PencilIcon } from "@/components/Icons/PencilIcon";
import { TrashIcon } from "@/components/Icons/TrashIcon";
import toast from "react-hot-toast";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { useCreateVoucherModal, useDeleteVoucherModal, useViewVoucherModal } from "@/stores/modalStore";
import { AdminEventHeader } from "@/components/Admin/AdminEventHeader";
import { Loading } from "@/components/Loading";

interface VoucherGroup {
  id?: string;
  name: string;
  eventId: string;
  activeCount: number;
  expiredCount: number;
  inactiveCount: number;
  totalCount: number;
  usedCount: number;
  appliesTo: string[] | "all";
  cpfListStatus: "DISABLED" | "ENABLED";
  createdAt: string;
  updatedAt: string;
  expiryDate?: string;
}

export default function VouchersPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;
  const { openCreateVoucherModal, setOnModalSave } = useCreateVoucherModal();
  const { openDeleteVoucherModal } = useDeleteVoucherModal();
  const { openViewVoucherModal } = useViewVoucherModal();
  const [authChecked, setAuthChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [event, setEvent] = useState<any>(null);
  const [voucherGroups, setVoucherGroups] = useState<VoucherGroup[]>([]);
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
      router.push("/admin/login");
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

  // Carregar vouchers
  const loadVouchers = async () => {
    if (!eventId) {
      setVoucherGroups([]);
      return;
    }
    setLoading(true);
    try {
      const data = await organizerService.getVouchers(eventId, {
        page: pagination.page,
        limit: pagination.limit,
      });
      setVoucherGroups(data.groups || []);
      setPagination(data.pagination || {
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 1,
      });
    } catch (error: any) {
      console.error("Error loading vouchers:", error);
      toast.error("Erro ao carregar vouchers");
      setVoucherGroups([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authChecked || !eventId) return;
    loadVouchers();
  }, [authChecked, eventId, pagination.page, pagination.limit]);

  // Setup modal save callback
  useEffect(() => {
    setOnModalSave(async () => {
      await loadVouchers();
    });
  }, [setOnModalSave, eventId]);

  const handleCreateVoucher = () => {
    openCreateVoucherModal({
      eventId: eventId,
    });
  };

  const handleEditVoucher = (group: VoucherGroup) => {
    openCreateVoucherModal({
      eventId: eventId,
      voucherId: group.id || group.name,
      voucher: group as any,
    });
  };

  const handleDeleteVoucher = (groupId: string, groupName: string) => {
    openDeleteVoucherModal({
      voucherId: groupId,
      voucherCode: groupName,
      onConfirm: async () => {
        if (!eventId) {
          throw new Error("Evento não encontrado");
        }

        try {
          await organizerService.deleteVoucher(eventId, groupId);
          toast.success("Voucher deletado com sucesso!");
          loadVouchers();
        } catch (error: any) {
          console.error("Error deleting voucher:", error);
          throw error;
        }
      },
    });
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Sem validade";
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  if (!authChecked || loading) {
    return (
      <div className="min-h-screen bg-gray-2">
        <AdminEventHeader eventId={eventId} eventName={event?.name} eventSlug={event?.slug} />
        <div className="flex items-center justify-center min-h-[400px]">
          <Loading />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-2">
      <AdminEventHeader
        eventId={eventId}
        eventName={event?.name}
        eventSlug={event?.slug}
      />
      <div className="max-w-7xl mx-auto px-4 lg:px-6 2xl:px-0 py-6 pb-20 md:pb-6">
        <div className="flex flex-col gap-9">
          {/* Desktop: Title Section */}
          <div className="hidden md:flex flex-col gap-4">
            <h1 className="text-gray-12 text-[28px] font-bold font-manrope leading-[1.1]">
              Vouchers
            </h1>
            <p className="text-gray-11 text-base font-family-dm-sans leading-[1.3]">
              Crie e gerencie vouchers para aplicar desconto nas inscrições
            </p>
          </div>

          <div className="md:hidden flex flex-col gap-3 px-0">
            <h1 className="font-manrope font-bold text-lg leading-[1.1] text-gray-12">
              Voucher
            </h1>
            <p className="font-family-dm-sans font-normal text-base leading-[1.3] text-gray-11">
              Gere vouchers individuais para liberar desconto ou cortesia na inscrição
            </p>
            <Button
              onClick={handleCreateVoucher}
              className="w-full h-11 rounded-lg font-manrope font-bold text-base flex items-center justify-center gap-1"
            >
              <Plus className="size-5" />
              Criar voucher
            </Button>
          </div>

          {/* Vouchers List Section */}
          <div className="flex flex-col gap-6">
            <div className="hidden md:flex items-center justify-between flex-wrap gap-4">
              <h2 className="text-gray-12 text-xl font-bold font-manrope leading-[1.1]">
                Lista de vouchers
              </h2>
              <Button
                onClick={handleCreateVoucher}
                variant="default"
                className="text-base font-bold font-manrope leading-[1.1]"
              >
                <Plus className="size-5" />
                Criar voucher
              </Button>
            </div>
            <h2 className="md:hidden font-manrope font-bold text-lg leading-[1.1] text-gray-12">
              Lista de vouchers
            </h2>

            {/* Desktop: Vouchers Table */}
            {voucherGroups.length === 0 ? (
              <div className="border border-gray-6 rounded-xl p-12 flex flex-col items-center justify-center gap-4">
                <VoucherIcon className="size-12 text-gray-11" />
                <p className="text-gray-11 text-base font-family-dm-sans">
                  Nenhum voucher criado ainda
                </p>
              </div>
            ) : (
              <>
                <div className="hidden md:block bg-gray-1 rounded-lg border border-gray-6 overflow-hidden w-full">
                  <div className="overflow-x-auto w-full">
                    <table className="w-full">
                      <thead className="bg-gray-3 border-b border-gray-6">
                        <tr>
                          <th className="text-left py-4 px-5 text-gray-12 text-sm font-semibold font-family-dm-sans">
                            Nome do Lote
                          </th>
                          <th className="text-end py-4 px-5 text-gray-12 text-sm font-semibold font-family-dm-sans">
                            Ações
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-6">
                        {voucherGroups.map((group, index) => {
                          const groupId = group.id || `group-${index}`;
                          return (
                            <tr
                              key={groupId}
                              className="hover:bg-gray-2 transition-colors"
                            >
                              <td className="py-4 px-5">
                                <span className="text-sm text-gray-12 font-semibold font-family-dm-sans">
                                  {group.name}
                                </span>
                              </td>
                              <td className="py-4 px-5">
                                <div className="flex items-center gap-2 justify-end">
                                  <Button
                                    variant="outline"
                                    className="border-gray-6 text-gray-12 h-[36px] text-sm mr-4"
                                    onClick={() => openViewVoucherModal({
                                      eventId: eventId,
                                      groupName: group.name,
                                    })}
                                  >
                                    Visualizar voucher
                                  </Button>
                                  <button
                                    onClick={() => handleEditVoucher(group)}
                                    className="size-8 rounded-lg bg-gray-2 border border-gray-6 hover:bg-gray-4 flex items-center justify-center transition-colors cursor-pointer"
                                    title="Editar"
                                  >
                                    <PencilIcon className="size-4 text-gray-11" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteVoucher(groupId, group.name)}
                                    className="size-8 rounded-lg bg-red-2 border border-red-6 hover:bg-red-3 flex items-center justify-center transition-colors cursor-pointer"
                                    title="Deletar"
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

                {/* Mobile: Voucher cards (Figma) */}
                <div className="md:hidden flex flex-col gap-3">
                  {voucherGroups.map((group, index) => {
                    const groupId = group.id || `group-${index}`;
                    return (
                      <div
                        key={groupId}
                        className="bg-gray-1 border border-gray-6 rounded-lg px-4 py-4 flex flex-col gap-5"
                      >
                        <div className="flex items-center">
                          <p className="font-manrope font-semibold text-base leading-[1.1] text-gray-12 truncate">
                            {group.name}
                          </p>
                        </div>
                        <div className="h-px bg-gray-6 w-full" />
                        <div className="flex gap-2 w-full">
                          <Button
                            variant="outline"
                            onClick={() => handleEditVoucher(group)}
                            className="flex-1 h-11 rounded-lg border-gray-6 text-gray-12 font-manrope font-bold text-base hover:bg-gray-3"
                          >
                            Editar
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => openViewVoucherModal({
                              eventId: eventId,
                              groupName: group.name,
                            })}
                            className="flex-1 h-11 rounded-lg border-gray-6 text-gray-12 font-manrope font-bold text-base hover:bg-gray-3"
                          >
                            Visualizar
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
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
                className="size-8 rounded-lg border border-gray-6 bg-gray-1 hover:bg-gray-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
              >
                <ChevronLeft className="size-4 text-gray-11" />
              </button>
              {Array.from({ length: Math.min(pagination.totalPages, 8) }, (_, i) => i + 1).map(
                (page) => (
                  <button
                    key={page}
                    onClick={() =>
                      setPagination((prev) => ({ ...prev, page }))
                    }
                    className={`size-8 rounded-lg border transition-colors font-family-dm-sans text-sm flex items-center justify-center ${pagination.page === page
                      ? "bg-primary-11 text-primary-2 border-primary-11"
                      : "bg-gray-4 border-gray-6 text-gray-12 hover:bg-gray-3"
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
                className="size-8 rounded-lg border border-gray-6 bg-gray-1 hover:bg-gray-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
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
