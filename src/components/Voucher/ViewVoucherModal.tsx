"use client";

import { useState, useEffect } from "react";
import { useViewVoucherModal } from "@/stores/modalStore";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { organizerService } from "@/services";
import toast from "react-hot-toast";
import { useClipboard } from "@/hooks/useClipboard";
import { buildCouponShareLink } from "@/lib/couponShareLink";
import { formatDateBR } from "@/utils/datetimeBR";
import { CopyIcon } from "@/components/Icons/CopyIcon";
import { Button } from "@/components/Button";
import { TicketIcon } from "@/components/Icons/TicketIcon";
import { useTickets } from "@/hooks/useTickets";
import { useTicketCategories } from "@/hooks/useTicketCategories";
import { Loading } from "../Loading";

interface Voucher {
  id: string;
  code: string;
  name: string;
  status: "ACTIVE" | "INACTIVE" | "USED" | "EXPIRED";
  [key: string]: any;
}

interface VoucherGroupInfo {
  name: string;
  status: "ACTIVE" | "INACTIVE" | "USED" | "EXPIRED";
  totalCount: number;
  availableCount: number;
  usedCount: number;
  expiredCount: number;
  inactiveCount: number;
  expiryDate?: string;
  appliesTo?: "all" | Array<string | { id: string }>;
  linkedTicket?: {
    id: string;
    name: string;
    price: number;
    category?: { id: string; name: string };
  };
}

interface VoucherGroupData {
  groupName: string;
  vouchers: Voucher[];
  group?: VoucherGroupInfo;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export function ViewVoucherModal() {
  const { isOpen, closeViewVoucherModal, data } = useViewVoucherModal();
  const { copyToClipboard } = useClipboard();
  const [loading, setLoading] = useState(false);
  const [voucherData, setVoucherData] = useState<VoucherGroupData | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [groupInfo, setGroupInfo] = useState<VoucherGroupInfo | null>(null);

  const eventId = data?.eventId;
  const groupName = data?.groupName;
  // Slug repassado pelo opener (EventVouchersView) p/ montar o link público.
  const eventSlug = data?.eventSlug as string | undefined;

  // Buscar tickets e categorias
  const { tickets } = useTickets(eventId, isOpen);
  const { categories } = useTicketCategories(eventId, isOpen);

  // Mapear categorias por ID
  const categoryMap = new Map(categories.map((cat) => [cat.id, cat.name]));

  const groupStatus: "ACTIVE" | "USED" | "EXPIRED" | "INACTIVE" = (() => {
    if (!groupInfo) return "INACTIVE";
    const { availableCount = 0, usedCount = 0, expiredCount = 0, totalCount = 0 } = groupInfo;
    if (availableCount > 0) return "ACTIVE";
    if (totalCount > 0 && usedCount >= totalCount) return "USED";
    if (totalCount > 0 && expiredCount >= totalCount) return "EXPIRED";
    return "INACTIVE";
  })();

  const groupStatusLabel: Record<typeof groupStatus, string> = {
    ACTIVE: "Ativo",
    USED: "Usado",
    EXPIRED: "Expirado",
    INACTIVE: "Inativo",
  };

  const groupStatusClass: Record<typeof groupStatus, string> = {
    ACTIVE: "bg-primary-5 text-primary-12",
    USED: "bg-gray-5 text-gray-12",
    EXPIRED: "bg-red-4 text-red-11",
    INACTIVE: "bg-gray-5 text-gray-12",
  };

  // Encontrar tickets vinculados ao voucher
  const getLinkedTickets = () => {
    if (!groupInfo || !tickets.length) return [];
    if (groupInfo.appliesTo === "all") return tickets;

    if (Array.isArray(groupInfo.appliesTo)) {
      const ticketIds = groupInfo.appliesTo.map((item) =>
        typeof item === "string" ? item : item.id
      );
      return tickets.filter((ticket) => ticketIds.includes(ticket.id));
    }

    return [];
  };

  const linkedTickets = getLinkedTickets();

  const formatPrice = (cents: number) =>
    `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`;

  // Dados do ingresso vinculado: usa linkedTicket da API diretamente
  const linkedTicket = groupInfo?.linkedTicket ?? null;
  const isSpecificTicket = !!linkedTicket;

  useEffect(() => {
    if (isOpen && eventId && groupName) {
      setCurrentPage(1);
      loadVoucherGroup(1);
    }
  }, [isOpen, eventId, groupName]);

  useEffect(() => {
    if (isOpen && eventId && groupName && currentPage > 1) {
      loadVoucherGroup(currentPage);
    }
  }, [currentPage]);

  const loadVoucherGroup = async (page: number = currentPage) => {
    if (!eventId || !groupName) return;

    setLoading(true);
    try {
      const data = await organizerService.getVoucherGroup(eventId, groupName, {
        page,
        limit: 20,
      });
      setVoucherData(data);

      if (data?.group) {
        setGroupInfo(data.group);
      }
    } catch (error: any) {
      console.error("Error loading voucher group:", error);
      toast.error("Erro ao carregar vouchers");
    } finally {
      setLoading(false);
    }
  };

  // Copia o LINK público do evento com o voucher já aplicado (?voucher=CODIGO).
  const handleCopyCode = async (code: string) => {
    await copyToClipboard(buildCouponShareLink(eventSlug, code, "voucher"));
  };

  const handleDownloadCSV = () => {
    if (!voucherData?.vouchers) return;

    const csvContent = [
      ["Código", "Status"],
      ...voucherData.vouchers.map((v) => [v.code, v.status]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `vouchers-${groupName}-${new Date().getTime()}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV baixado com sucesso!");
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Sem validade";
    return formatDateBR(dateString, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/90 z-50"
            onClick={closeViewVoucherModal}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="bg-gray-1 rounded-xl border border-gray-6 w-full max-w-[916px] max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="border-b border-gray-6 flex items-center justify-between px-5 py-3 shrink-0">
                <h2 className="text-gray-12 text-[20px] font-semibold font-family-dm-sans leading-[1.3]">
                  Lista de vouchers
                </h2>
                <button
                  onClick={closeViewVoucherModal}
                  className="text-gray-11 hover:text-gray-12 transition-colors p-1 rounded-lg hover:bg-gray-3 size-9 flex items-center justify-center"
                >
                  <X className="size-6" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-5">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loading />
                  </div>
                ) : voucherData ? (
                  <div className="flex flex-col gap-8">
                    {/* Top Section - Ticket card + Group info */}
                    <div className="flex gap-6 items-center">
                      {/* Card do ingresso vinculado */}
                      <div className="bg-gray-2 border border-gray-6 rounded-xl flex flex-col shrink-0 w-[343px]">
                        {linkedTicket ? (
                          <>
                            <div className="flex flex-col gap-2 p-4 w-full">
                              <p className="text-gray-11 text-base font-family-dm-sans leading-[1.3] truncate">
                                {linkedTicket.category?.name || "Ingresso avulso"}
                              </p>
                              <div className="flex gap-1.5 items-center">
                                <TicketIcon className="size-5 text-gray-12 shrink-0" />
                                <p className="text-gray-12 text-base font-bold font-manrope leading-[1.1]">
                                  {linkedTicket.name}
                                </p>
                              </div>
                            </div>
                            <div className="border-t border-gray-6 flex items-center px-5 py-4 w-full">
                              <p className="text-gray-12 text-base font-bold font-manrope leading-[1.1]">
                                {formatPrice(linkedTicket.price)}
                              </p>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="flex flex-col gap-2 p-4 w-full">
                              <p className="text-gray-11 text-base font-family-dm-sans leading-[1.3]">
                                Todos os ingressos
                              </p>
                              <div className="flex gap-1.5 items-center">
                                <TicketIcon className="size-5 text-gray-12 shrink-0" />
                                <p className="text-gray-12 text-base font-bold font-manrope leading-[1.1]">
                                  Qualquer ingresso do evento
                                </p>
                              </div>
                            </div>
                            <div className="border-t border-gray-6 flex items-center px-5 py-4 w-full">
                              <p className="text-gray-12 text-base font-bold font-manrope leading-[1.1]">
                                100% cortesia
                              </p>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Informações do grupo */}
                      <div className="flex flex-col gap-4">
                        <p className="text-gray-12 text-lg font-semibold font-family-dm-sans leading-[1.3]">
                          {groupInfo?.name || groupName}
                        </p>

                        {/* Tags row 1: totais / disponíveis / usados */}
                        <div className="flex gap-2.5 items-center flex-wrap">
                          <div className="flex gap-1 items-center">
                            <span className="text-gray-12 text-base font-family-dm-sans leading-[1.3]">Totais:</span>
                            <span className="text-gray-12 text-base font-semibold font-manrope leading-[1.1]">
                              {groupInfo?.totalCount || voucherData.pagination.total}
                            </span>
                          </div>
                          <div className="size-1.5 rounded-full bg-gray-11 shrink-0" />
                          <div className="flex gap-1 items-center">
                            <span className="text-gray-12 text-base font-family-dm-sans leading-[1.3]">Disponíveis:</span>
                            <span className="text-gray-12 text-base font-semibold font-manrope leading-[1.1]">
                              {groupInfo?.availableCount ?? voucherData.vouchers.filter((v) => v.status === "ACTIVE").length}
                            </span>
                          </div>
                          <div className="size-1.5 rounded-full bg-gray-11 shrink-0" />
                          <div className="flex gap-1 items-center">
                            <span className="text-gray-12 text-base font-family-dm-sans leading-[1.3]">Usados:</span>
                            <span className="text-gray-12 text-base font-semibold font-manrope leading-[1.1]">
                              {groupInfo?.usedCount || voucherData.vouchers.filter((v) => v.status === "USED").length}
                            </span>
                          </div>
                        </div>

                        {/* Tags row 2: status / validade / benefício */}
                        <div className="flex gap-2.5 items-center flex-wrap">
                          <div className="flex gap-1 items-center">
                            <span className="text-gray-12 text-base font-family-dm-sans leading-[1.3]">Status:</span>
                            <span className={`px-3 py-1.5 rounded-full text-sm font-semibold font-family-dm-sans leading-[1.3] ${groupStatusClass[groupStatus]}`}>
                              {groupStatusLabel[groupStatus]}
                            </span>
                          </div>
                          {groupInfo?.expiryDate && (
                            <>
                              <div className="size-1.5 rounded-full bg-gray-11 shrink-0" />
                              <div className="flex gap-1 items-center">
                                <span className="text-gray-12 text-base font-family-dm-sans leading-[1.3]">Validade:</span>
                                <span className="text-gray-12 text-base font-semibold font-manrope leading-[1.1]">
                                  {formatDate(groupInfo.expiryDate)}
                                </span>
                              </div>
                            </>
                          )}
                          <div className="size-1.5 rounded-full bg-gray-11 shrink-0" />
                          <div className="flex gap-1 items-center">
                            <span className="text-gray-12 text-base font-family-dm-sans leading-[1.3]">Benefício:</span>
                            <span className="text-gray-12 text-base font-semibold font-manrope leading-[1.1]">
                              100% cortesia
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Vouchers Grid */}
                    <div className="flex flex-col gap-5">
                      <div className="border border-gray-6 rounded-xl overflow-hidden">
                        <div className="grid grid-cols-3">
                          {voucherData.vouchers.map((voucher, index) => {
                            const isLastColumn = (index + 1) % 3 === 0;
                            const totalItems = voucherData.vouchers.length;
                            const lastRowStart = Math.floor((totalItems - 1) / 3) * 3;
                            const isLastRow = index >= lastRowStart;

                            return (
                              <div
                                key={voucher.id || index}
                                className={`flex items-center p-4 min-w-[245px] flex-1 ${!isLastRow ? "border-b border-gray-6" : ""
                                  } ${!isLastColumn ? "border-r border-gray-6" : ""
                                  }`}
                              >
                                <div className="flex gap-1 items-center flex-1">
                                  <p
                                    className={`text-sm font-semibold font-family-dm-sans leading-[1.3] flex-1 ${voucher.status === "USED" || voucher.status === "EXPIRED"
                                      ? "text-gray-9"
                                      : "text-gray-12"
                                      }`}
                                  >
                                    {voucher.code}
                                  </p>
                                  {(voucher.status === "ACTIVE" || voucher.status === "INACTIVE") && (
                                    <button
                                      onClick={() => handleCopyCode(voucher.code)}
                                      className="size-7 rounded-lg flex items-center justify-center hover:bg-gray-3 transition-colors cursor-pointer"
                                      title="Copiar link do voucher"
                                    >
                                      <CopyIcon className="size-4 text-gray-11" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Pagination */}
                      {voucherData.pagination.totalPages > 1 && (
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                            className="size-8 rounded-full border border-gray-6 bg-gray-1 hover:bg-gray-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                          >
                            <ChevronLeft className="size-4 text-gray-11" />
                          </button>
                          {Array.from(
                            { length: voucherData.pagination.totalPages },
                            (_, i) => i + 1
                          ).map((page) => (
                            <button
                              key={page}
                              onClick={() => setCurrentPage(page)}
                              className={`size-8 rounded-full border transition-colors font-family-dm-sans text-sm ${currentPage === page
                                ? "bg-primary-11 text-white border-primary-11"
                                : "bg-gray-1 border-gray-6 text-gray-12 hover:bg-gray-2"
                                }`}
                            >
                              {page}
                            </button>
                          ))}
                          <button
                            onClick={() =>
                              setCurrentPage((prev) =>
                                Math.min(voucherData.pagination.totalPages, prev + 1)
                              )
                            }
                            disabled={currentPage === voucherData.pagination.totalPages}
                            className="size-8 rounded-full border border-gray-6 bg-gray-1 hover:bg-gray-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                          >
                            <ChevronRight className="size-4 text-gray-11" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-gray-11">Nenhum voucher encontrado</div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="border-t border-gray-6 bg-gray-2 flex items-center justify-end gap-2 px-4 py-3 shrink-0">
                <Button
                  variant="outline"
                  onClick={closeViewVoucherModal}
                  className="border border-gray-6 text-gray-12 h-11 px-5"
                >
                  Fechar
                </Button>
                <Button
                  variant="default"
                  onClick={handleDownloadCSV}
                >
                  Baixar CSV
                </Button>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
