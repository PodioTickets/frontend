"use client";

import { useState, useEffect } from "react";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { X, FileText, Search, Download } from "lucide-react";
import toast from "react-hot-toast";
import { CardIcon } from "@/components/Icons/CardIcon";
import { PaymentItemDetailsDrawer } from "./PaymentItemDetailsDrawer";
import { AnticipationModal } from "./AnticipationModal";
import { AwaitingReleaseExportModal } from "./AwaitingReleaseExportModal";
import { ArrowButton } from "../ArrowButton";
import { organizerService } from "@/services";
import type {
  PendingRelease,
  Installment,
} from "@/services/organizer/OrganizerService";
import { TimerIcon } from "../Icons/Organizer/TimerIcon";
import { getAvatarUrl } from "@/utils/avatar";
import Image from "next/image";
import { Button } from "../Button";
import { Tooltip } from "../Tooltip";
import { Pagination } from "../Pagination";
import { formatDateBRT } from "@/utils/datetimeBR";
import { formatShortId } from "@/utils/shortId";
import { formatDocumentDisplay, isPersonBr } from "@/utils/documentDisplay";
import { cn } from "@/utils/cn";
import { ReleaseIcon } from "../Icons/ReleaseIcon";

interface AwaitingReleaseDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  totalPending: number;
  /** Total "Parcelados a receber" (installmentsToReceive) — card/aba Parcelados. */
  installmentsTotal?: number;
  releaseToday: number;
  totalTransactions: number;
  eventId: string;
  eventName?: string;
  categoryName?: string;
  onNavigatePrev?: () => void;
  onNavigateNext?: () => void;
}

type FinancialTab = "avista" | "parcelados";

/** Linha normalizada da tabela — comum às duas abas (à vista / parcelados). */
interface NormalizedRow {
  id: string; // ID do pedido (exibição)
  lookupId: string; // ID p/ o lookup de detalhes (pagamento/pedido)
  transactionId: string;
  buyerName: string;
  buyerEmail: string;
  buyerSub: string; // documento (à vista) ou e-mail (fallback)
  buyerAvatar: string | null;
  buyerInitial: string;
  releaseISO: string;
  paymentMethod: "PIX" | "CREDIT_CARD";
  amount: number; // centavos
  installmentLabel: string | null; // "2/3" parcelas pagas (só parcelados)
}

export function AwaitingReleaseDrawer({
  isOpen,
  onClose,
  totalPending,
  installmentsTotal = 0,
  totalTransactions,
  eventId,
  eventName = "Maratona 2024",
  categoryName = "Nome da categoria",
  onNavigatePrev,
  onNavigateNext,
}: AwaitingReleaseDrawerProps) {
  const [activeTab, setActiveTab] = useState<FinancialTab>("avista");
  const [currentPage, setCurrentPage] = useState(1);
  const [installmentsPage, setInstallmentsPage] = useState(1);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isAnticipationOpen, setIsAnticipationOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [detailsItem, setDetailsItem] = useState<NormalizedRow | null>(null);
  const [pendingReleases, setPendingReleases] = useState<PendingRelease[]>([]);
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingInstallments, setLoadingInstallments] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [pagination, setPagination] = useState<{
    page: number;
    limit: number;
    totalOrders: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  }>({
    page: 1,
    limit: 20,
    totalOrders: totalTransactions,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  });
  const itemsPerPage = 20;

  useEffect(() => {
    if (isOpen && eventId) {
      loadPendingReleases(1);
      loadInstallments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, eventId]);

  useEffect(() => {
    if (isOpen && eventId && currentPage > 0) {
      loadPendingReleases(currentPage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  // Trocar de aba/busca volta a paginação dos parcelados (client-side) ao início.
  useEffect(() => {
    setInstallmentsPage(1);
  }, [searchQuery, activeTab]);

  const loadPendingReleases = async (page: number) => {
    try {
      setLoading(true);
      const data = await organizerService.getEventPendingReleases(eventId, page, itemsPerPage);
      setPendingReleases(data.pending || []);
      if (data.pagination) {
        setPagination({
          page: data.pagination.page || page,
          limit: data.pagination.limit || itemsPerPage,
          totalOrders: data.pagination.totalOrders || 0,
          totalPages: data.pagination.totalPages || 1,
          hasNextPage: data.pagination.hasNextPage || false,
          hasPreviousPage: data.pagination.hasPreviousPage || false,
        });
      }
    } catch (error) {
      console.error("Error loading pending releases:", error);
      setPendingReleases([]);
    } finally {
      setLoading(false);
    }
  };

  const loadInstallments = async () => {
    try {
      setLoadingInstallments(true);
      const data = await organizerService.getEventInstallments(eventId);
      setInstallments(data.installments || []);
    } catch (error) {
      console.error("Error loading installments:", error);
      setInstallments([]);
    } finally {
      setLoadingInstallments(false);
    }
  };

  // Data de LIBERAÇÃO = instante real (dataPagamento + retenção). Exibir no fuso de
  // Brasília (BRT) — a mesma âncora do `daysUntilRelease`/custo do backend. Usar UTC
  // aqui mostrava 1 dia a mais para pagamentos feitos à noite no Brasil.
  const formatDate = (dateString: string) =>
    formatDateBRT(dateString, { day: "2-digit", month: "2-digit", year: "numeric" });

  // ===== À vista (pending releases, paginado no servidor) =====
  const avistaFiltered = searchQuery.trim()
    ? pendingReleases.filter((item) => {
      const q = searchQuery.toLowerCase();
      const orderId = (item.orderId || "").toLowerCase();
      const fullName = (item.buyer?.fullName || `${item.buyer?.firstName || ""} ${item.buyer?.lastName || ""}`.trim()).toLowerCase();
      const email = (item.buyer?.email || "").toLowerCase();
      const doc = (item.buyer?.documentNumber || "").toLowerCase();
      return orderId.includes(q) || fullName.includes(q) || email.includes(q) || doc.includes(q);
    })
    : pendingReleases;

  const normalizeAvista = (item: PendingRelease): NormalizedRow => {
    const name = item.buyer?.fullName || `${item.buyer?.firstName || ""} ${item.buyer?.lastName || ""}`.trim();
    return {
      id: item.orderId,
      lookupId: item.orderId,
      transactionId: item.transactionId,
      buyerName: name,
      buyerEmail: item.buyer?.email || "",
      buyerSub:
        formatDocumentDisplay(item.buyer?.documentNumber, isPersonBr({ document: item.buyer?.documentNumber })) ||
        item.buyer?.email ||
        "",
      buyerAvatar: item.buyer?.avatarUrl ?? null,
      buyerInitial: (item.buyer?.firstName || name || "?").charAt(0).toUpperCase(),
      releaseISO: item.releaseDate,
      paymentMethod: item.paymentMethod,
      amount: item.amount,
      installmentLabel: null,
    };
  };

  // ===== Parcelados (installments, agrupados por pedido, paginado no cliente) =====
  // "Parcelas pagas" = nº da PRÓXIMA parcela pendente − 1 (mesma regra do
  // InstallmentsDrawer). Valor = soma das parcelas pendentes do pedido.
  const groupedInstallments: NormalizedRow[] = (() => {
    const byOrder = new Map<string, Installment[]>();
    for (const inst of installments) {
      const key = inst.orderId || inst.paymentId || inst.id;
      const group = byOrder.get(key);
      if (group) group.push(inst);
      else byOrder.set(key, [inst]);
    }
    return Array.from(byOrder.values()).map((group) => {
      const sorted = [...group].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
      const next = sorted[0];
      const totalInstallments = next.totalInstallments ?? sorted.length;
      const paidInstallments = Math.max(0, (next.installmentNumber ?? 1) - 1);
      const name = `${next.buyer.firstName || ""} ${next.buyer.lastName || ""}`.trim();
      return {
        id: next.orderId || next.paymentId || next.id,
        lookupId: next.paymentId || next.orderId || "",
        transactionId: next.id,
        buyerName: name,
        buyerEmail: next.buyer.email || "",
        buyerSub: next.buyer.email || "",
        buyerAvatar: next.buyer.avatarUrl ?? null,
        buyerInitial: (next.buyer.firstName || name || "?").charAt(0).toUpperCase(),
        releaseISO: next.dueDate,
        paymentMethod: "CREDIT_CARD" as const,
        amount: sorted.reduce((s, i) => s + i.amount, 0),
        installmentLabel: `${paidInstallments}/${totalInstallments}`,
      };
    });
  })();

  const parceladosFiltered = searchQuery.trim()
    ? groupedInstallments.filter((d) => {
      const q = searchQuery.toLowerCase();
      return (
        (d.id || "").toLowerCase().includes(q) ||
        d.buyerName.toLowerCase().includes(q) ||
        d.buyerEmail.toLowerCase().includes(q)
      );
    })
    : groupedInstallments;

  const parceladosTotalPages = Math.max(1, Math.ceil(parceladosFiltered.length / itemsPerPage));
  const parceladosPaginated = parceladosFiltered.slice(
    (installmentsPage - 1) * itemsPerPage,
    installmentsPage * itemsPerPage,
  );

  // ===== Estado derivado por aba (a UI é dirigida por estes) =====
  const isAvista = activeTab === "avista";
  const rows: NormalizedRow[] = isAvista
    ? avistaFiltered.map(normalizeAvista)
    : parceladosPaginated;
  const isLoading = isAvista ? loading : loadingInstallments;
  const emptyLabel = isAvista
    ? "Nenhum item aguardando liberação"
    : "Nenhuma parcela a receber";
  const tabTotalPages = isAvista ? pagination.totalPages : parceladosTotalPages;
  const tabCurrentPage = isAvista ? pagination.page : installmentsPage;
  const onTabPageChange = isAvista ? setCurrentPage : setInstallmentsPage;
  const tabTotalCount = isAvista ? pagination.totalOrders : parceladosFiltered.length;

  const openDetails = (row: NormalizedRow) => {
    setDetailsItem(row);
    setIsDetailsOpen(true);
  };

  const handleExportCsv = async (fields: string[]) => {
    try {
      setIsExporting(true);
      const { blob, filename } = await organizerService.exportFinancialPending(
        eventId,
        activeTab,
        fields,
      );
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setIsExportModalOpen(false);
    } catch (error) {
      console.error("Error exporting CSV:", error);
      toast.error("Erro ao exportar CSV");
    } finally {
      setIsExporting(false);
    }
  };

  const tabButton = (tab: FinancialTab, label: string) => (
    <button
      type="button"
      onClick={() => setActiveTab(tab)}
      className={cn(
        "h-9 px-4 rounded-lg font-family-manrope font-medium text-sm leading-[1.3] transition-colors cursor-pointer",
        activeTab === tab
          ? "bg-primary-11 text-gray-1"
          : "bg-gray-3 text-gray-11 hover:bg-gray-4",
      )}
    >
      {label}
    </button>
  );

  return (
    <>
      {/* disablePreventScroll={false}: desliga o preventScroll iOS do vaul (default
          `true` o mantém ATIVO — semântica invertida) que travava o scroll do
          ViewRegistrationModal aberto pelo detalhe do pedido (fora do drawer). */}
      <Drawer
        open={isOpen}
        onOpenChange={(open) => {
          // O AnticipationModal é um portal em document.body (fora do
          // DrawerContent) → o vaul trata o clique nele como interação EXTERNA e
          // pede pra fechar o drawer. Enquanto o modal está aberto, ignoramos o
          // auto-dismiss para o drawer não fechar por baixo dele.
          if (!open && (isAnticipationOpen || isExportModalOpen)) return;
          if (!open) onClose();
        }}
        direction="right"
        disablePreventScroll={false}
      >
        {/* data-vaul-no-drag: destrava o scroll interno (vaul right-drawer trata
            swipe vertical como arraste-pra-fechar). Fecha pelos botões/overlay. */}
        <DrawerContent data-vaul-no-drag className="bg-gray-2 md:bg-gray-1 h-full w-full sm:max-w-[969px] border-l border-gray-6">
          <DrawerTitle className="sr-only">Aguardando liberação - Detalhes</DrawerTitle>
          {/* ========== MOBILE Header (Figma) ========== */}
          <DrawerHeader className="md:hidden border-b border-gray-6 p-0">
            <div className="flex flex-col">
              <div className="flex items-center gap-1 h-[52px] px-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="size-8 flex items-center justify-center shrink-0 rounded-lg hover:bg-gray-3 transition-colors rotate-180"
                  aria-label="Voltar"
                >
                  <ArrowButton isOpen={false} />
                </button>
                <p className="font-manrope font-extrabold text-base leading-[1.1] text-gray-12 truncate flex-1 min-w-0">
                  {eventName}
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 px-4 py-2 flex-wrap text-gray-11">
                <span className="font-family-dm-sans font-normal text-sm text-gray-11">Eventos</span>
                <ArrowButton />
                <span className="font-family-dm-sans font-normal text-sm text-gray-11">Financeiro</span>
                <ArrowButton />
                <span className="font-family-dm-sans font-normal text-sm text-gray-12">Aguardando liberação</span>
              </div>
              <div className="flex gap-2 items-center justify-center px-4 pb-3">
                <div className="size-7 rounded-lg bg-yellow-4 flex items-center justify-center shrink-0">
                  <TimerIcon className="size-5 text-yellow-12" />
                </div>
                <h2 className="font-family-dm-sans font-semibold text-base leading-[1.3] text-gray-12">
                  Aguardando liberação - Detalhes
                </h2>
              </div>
            </div>
          </DrawerHeader>

          {/* ========== DESKTOP Header ========== */}
          <DrawerHeader className="hidden md:block border-b border-gray-6 px-5 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-5">
                <div className="flex items-center gap-1">
                  <button
                    onClick={onNavigatePrev}
                    disabled={!onNavigatePrev}
                    className="size-9 flex items-center justify-center border border-gray-6 rounded-full hover:bg-gray-3 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed rotate-180"
                  >
                    <ArrowButton isOpen={false} />
                  </button>
                  <button
                    onClick={onNavigateNext}
                    disabled={!onNavigateNext}
                    className="size-9 flex items-center justify-center border border-gray-6 rounded-full hover:bg-gray-3 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ArrowButton isOpen={false} />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-[32px] h-[32px] p-1 rounded-lg bg-yellow-3 flex items-center justify-center">
                    <TimerIcon className="size-6 text-yellow-12" />
                  </div>
                  <h2 className="font-family-dm-sans font-semibold text-[20px] leading-[1.3] text-gray-12">
                    Aguardando liberação - Detalhes
                  </h2>
                </div>
              </div>
              <DrawerClose asChild>
                <button className="size-8 flex items-center justify-center rounded-lg hover:bg-gray-3 transition-colors cursor-pointer">
                  <X className="size-6 text-gray-12" />
                </button>
              </DrawerClose>
            </div>
          </DrawerHeader>

          {/* ========== MOBILE Content ========== */}
          <div className="md:hidden flex-1 overflow-y-auto flex flex-col">
            <div className="p-4 flex flex-col gap-4">
              {/* Summary cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-1 border border-gray-6 rounded-xl p-4 flex flex-col justify-between gap-3">
                  <div className="flex flex-col gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-4 flex items-center justify-center shrink-0">
                      <CardIcon className="size-5 text-gray-12" />
                    </div>
                    <p className="font-family-dm-sans font-normal text-base text-gray-11">À vista</p>
                  </div>
                  <p className="font-manrope font-extrabold text-lg text-gray-12">
                    R$ {(totalPending / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="bg-gray-1 border border-gray-6 rounded-xl p-4 flex flex-col justify-between gap-3">
                  <div className="flex flex-col gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-4 flex items-center justify-center shrink-0">
                      <ReleaseIcon className="size-5 text-gray-12" />
                    </div>
                    <p className="font-family-dm-sans font-normal text-base text-gray-11">Parcelados</p>
                  </div>
                  <p className="font-manrope font-extrabold text-lg text-gray-12">
                    R$ {(installmentsTotal / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex items-center gap-2">
                {tabButton("avista", "À vista")}
                {tabButton("parcelados", "Parcelados")}
              </div>

              {/* Search */}
              <div className="border border-gray-6 rounded-lg h-10 flex items-center gap-2 px-3 bg-gray-1">
                <Search className="size-5 text-gray-11 shrink-0" />
                <input
                  type="text"
                  placeholder="Buscar por ID do pedido, nome ou cpf"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 min-w-0 bg-transparent font-family-dm-sans font-normal text-sm text-gray-12 placeholder:text-gray-11 outline-none"
                />
              </div>

              {/* Transaction cards list */}
              <div className="flex flex-col gap-3">
                {isLoading ? (
                  <div className="py-8 text-center text-gray-11 font-family-dm-sans text-sm">Carregando...</div>
                ) : rows.length === 0 ? (
                  <div className="py-8 text-center text-gray-11 font-family-dm-sans text-sm">{emptyLabel}</div>
                ) : (
                  rows.map((row, index) => (
                    <div
                      key={`${row.id}-${index}`}
                      className="bg-gray-1 border border-gray-6 rounded-lg overflow-hidden"
                    >
                      <div className="flex flex-col gap-5 px-3 py-4">
                        <div className="flex items-center justify-between">
                          <div className="flex gap-2 items-center min-w-0 flex-1">
                            {row.buyerAvatar ? (
                              <Image
                                src={getAvatarUrl(row.buyerAvatar)}
                                alt={row.buyerName}
                                width={36}
                                height={36}
                                className="size-9 rounded-full object-cover shrink-0"
                              />
                            ) : (
                              <div className="size-9 rounded-full bg-gray-6 flex items-center justify-center shrink-0">
                                <span className="text-gray-12 font-semibold text-sm">{row.buyerInitial}</span>
                              </div>
                            )}
                            <div className="flex flex-col gap-1 min-w-0">
                              <p className="font-family-dm-sans font-medium text-base text-gray-12 truncate">
                                {row.buyerName}
                              </p>
                              <p className="font-family-dm-sans font-normal text-sm text-gray-11 truncate">{row.buyerSub}</p>
                            </div>
                          </div>
                        </div>
                        <p className="font-family-dm-sans font-medium text-sm text-gray-12">ID Pedido: {formatShortId(row.id)}</p>
                        <div className="bg-gray-2 border border-gray-6 rounded-lg min-h-[34px] flex items-center px-3 py-1">
                          <p className="font-family-dm-sans font-medium text-sm text-gray-12">Próx. liberação: {formatDate(row.releaseISO)}</p>
                        </div>
                        <div className="flex items-center justify-between border-b border-gray-6 pb-3">
                          <p className="font-manrope font-extrabold text-xl text-gray-12">
                            R$ {(row.amount / 100).toFixed(2).replace(".", ",")}
                          </p>
                          {row.installmentLabel && (
                            <p className="font-family-dm-sans font-normal text-sm text-gray-11">
                              Parcelas pagas: {row.installmentLabel}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-center p-3 pt-0">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => openDetails(row)}
                          className="w-full font-manrope font-bold text-base border-gray-6 text-gray-12"
                        >
                          <FileText className="size-5" />
                          Ver detalhes
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <Pagination
                currentPage={tabCurrentPage}
                totalPages={tabTotalPages}
                onPageChange={onTabPageChange}
                totalItems={tabTotalCount}
                pageSize={itemsPerPage}
                disabled={isLoading}
                className="pt-2"
              />
              <Button
                type="button"
                onClick={() => setIsExportModalOpen(true)}
                isLoading={isExporting}
                className="w-full font-manrope font-bold text-base"
              >
                <Download className="size-5" />
                Exportar CSV
              </Button>
            </div>
          </div>

          {/* ========== DESKTOP Content ========== */}
          <div className="hidden md:block flex-1 overflow-y-auto">
            <div className="p-5">
              <div className="mb-5 flex items-center gap-2 text-base text-gray-11 font-family-dm-sans">
                <span>Evento: <span className="text-gray-12">{eventName}</span></span>
              </div>

              {/* Cards (À vista / Parcelados) + Solicitar antecipação (à direita) */}
              <div className="flex items-center justify-between gap-4 mb-5 flex-wrap">
                <div className="flex items-start gap-3 flex-wrap">
                  {/* À vista */}
                  <div className="bg-gray-1 border border-gray-6 rounded-[12px] flex flex-col gap-2 pt-4 pb-5 px-4 w-[248px] max-w-full">
                    <div className="flex items-center justify-between">
                      <p className="font-family-dm-sans font-normal text-base text-gray-11">À vista</p>
                      <div className="w-[32px] h-[32px] p-1 rounded-lg bg-blue-4 flex items-center justify-center shrink-0">
                        <CardIcon className="size-5 text-gray-12" />
                      </div>
                    </div>
                    <p className="font-manrope font-extrabold text-[20px] leading-[1.1] text-gray-12">
                      R$ {(totalPending / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  {/* Parcelados */}
                  <div className="bg-gray-1 border border-gray-6 rounded-[12px] flex flex-col gap-2 pt-4 pb-5 px-4 w-[248px] max-w-full">
                    <div className="flex items-center justify-between">
                      <p className="font-family-dm-sans font-normal text-base text-gray-11">Parcelados</p>
                      <div className="w-[32px] h-[32px] p-1 rounded-lg bg-blue-4 flex items-center justify-center shrink-0">
                        <ReleaseIcon className="size-5 text-gray-12" />
                      </div>
                    </div>
                    <p className="font-manrope font-extrabold text-[20px] leading-[1.1] text-gray-12">
                      R$ {(installmentsTotal / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
               {/*  <Button
                  type="button"l
                  variant="outline"
                  onClick={() => setIsAnticipationOpen(true)}
                  className="border-gray-6 text-gray-12 font-manrope font-bold text-base"
                >
                  Solicitar antecipação
                </Button> */}
              </div>

              {/* Tabs + Search */}
              <div className="flex items-center gap-3 mb-4 flex-wrap">
                <div className="flex items-center gap-2 shrink-0">
                  {tabButton("avista", "À vista")}
                  {tabButton("parcelados", "Parcelados")}
                </div>
                <div className="border border-gray-6 rounded-lg h-10 flex items-center gap-2 px-3 bg-gray-1 flex-1 min-w-[240px]">
                  <Search className="size-5 text-gray-11 shrink-0" />
                  <input
                    type="text"
                    placeholder="Buscar por ID do pedido, nome ou cpf"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 min-w-0 bg-transparent font-family-dm-sans font-normal text-sm text-gray-12 placeholder:text-gray-11 outline-none"
                  />
                </div>
              </div>

              {/* Table */}
              <div className="bg-gray-2 border border-gray-6 rounded-lg overflow-hidden">
                {/* Table Header */}
                <div className="bg-gray-4 border-b border-gray-6 flex h-[44px] items-center">
                  <div className="flex h-full items-center p-4 w-[120px]">
                    <p className="font-inter font-medium leading-[1.3] text-sm text-gray-12">ID pedido</p>
                  </div>
                  <div className="flex flex-1 h-full items-center min-h-px min-w-px p-4">
                    <p className="font-inter font-medium leading-[1.3] text-sm text-gray-12">Comprador</p>
                  </div>
                  <div className="flex flex-1 h-full items-center justify-center min-h-px min-w-px p-4">
                    <p className="font-inter font-medium leading-[1.3] text-sm text-gray-12 text-center">Previsão liberação</p>
                  </div>
                  <div className="flex flex-1 h-full items-center justify-center min-h-px min-w-px p-4">
                    <p className="font-inter font-medium leading-[1.3] text-sm text-gray-12 text-center">Valor pendente</p>
                  </div>
                  <div className="flex h-full items-center justify-center p-4 w-[64px]">
                    <p className="font-inter font-medium leading-[1.3] text-sm text-gray-12">Ações</p>
                  </div>
                </div>

                {/* Table Rows */}
                <div className="flex flex-col items-start w-full">
                  {isLoading ? (
                    <div className="w-full p-8 text-center text-gray-11">Carregando...</div>
                  ) : rows.length === 0 ? (
                    <div className="w-full p-8 text-center text-gray-11">{emptyLabel}</div>
                  ) : (
                    rows.map((row, index) => (
                      <div
                        key={`${row.id}-${index}`}
                        className="bg-gray-1 border-b border-gray-6 flex items-center justify-between w-full last:border-b-0 hover:bg-gray-2 transition-colors min-h-[60px]"
                      >
                        {/* ID pedido */}
                        <div className="flex h-full items-center p-4 w-[120px]">
                          <Tooltip
                            position="topRight"
                            trigger="hover"
                            content={<p className="font-family-dm-sans font-normal text-sm leading-[1.3] text-gray-12 text-left break-all">{row.id}</p>}
                            contentClassName="max-w-[min(320px,calc(100vw-2rem))] w-max min-w-0 px-3 py-2 gap-0 !items-stretch"
                            className="block min-w-0 max-w-full"
                          >
                            <p className="font-inter font-semibold leading-[1.3] text-sm text-gray-12 truncate cursor-help">
                              {formatShortId(row.id)}
                            </p>
                          </Tooltip>
                        </div>

                        {/* Comprador */}
                        <div className="flex flex-1 h-full items-center gap-3 min-h-px min-w-px p-4">
                          {row.buyerAvatar ? (
                            <Image
                              src={getAvatarUrl(row.buyerAvatar)}
                              alt={row.buyerName}
                              width={36}
                              height={36}
                              className="size-9 rounded-full object-cover shrink-0"
                            />
                          ) : (
                            <div className="size-9 rounded-full bg-gray-6 flex items-center justify-center shrink-0">
                              <span className="text-gray-12 font-semibold text-sm">{row.buyerInitial}</span>
                            </div>
                          )}
                          <div className="flex flex-col gap-0 min-w-0">
                            <p className="font-inter font-semibold leading-[1.3] text-sm text-gray-12 truncate">{row.buyerName}</p>
                            <p className="font-inter font-normal leading-[1.3] text-sm text-gray-11 truncate">{row.buyerSub}</p>
                          </div>
                        </div>

                        {/* Previsão liberação */}
                        <div className="flex flex-1 h-full items-center justify-center min-h-px min-w-px p-4">
                          <p className="font-inter font-semibold leading-[1.3] text-sm text-gray-12 text-center">
                            Próx. {formatDate(row.releaseISO)}
                          </p>
                        </div>

                        {/* Valor pendente */}
                        <div className="flex flex-1 h-full items-center justify-center min-h-px min-w-px p-4">
                          <div className="flex flex-col items-center gap-0.5">
                            <span className="font-inter font-semibold leading-[1.3] text-sm text-gray-12">
                              R$ {(row.amount / 100).toFixed(2).replace(".", ",")}
                            </span>
                            {row.installmentLabel && (
                              <span className="font-inter font-normal leading-[1.3] text-xs text-gray-11">
                                Parcelas pagas: {row.installmentLabel}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Ações */}
                        <div className="flex gap-1 h-full items-center justify-center px-4 py-2 w-[64px]">
                          <button
                            onClick={() => openDetails(row)}
                            className="bg-gray-2 border border-gray-6 rounded-lg size-8 flex items-center justify-center hover:bg-gray-3 transition-colors cursor-pointer"
                          >
                            <FileText className="size-4 text-gray-11" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Footer: paginação (esquerda) + Exportar CSV (direita) */}
              <div className="mt-4 flex items-center justify-between gap-4">
                <Pagination className="w-max" onPageChange={onTabPageChange} currentPage={tabCurrentPage} totalPages={tabTotalPages} totalItems={tabTotalCount} pageSize={itemsPerPage} disabled={isLoading} />
                <Button
                  type="button"
                  onClick={() => setIsExportModalOpen(true)}
                  isLoading={isExporting}
                  className="font-manrope font-bold text-base"
                >
                  Exportar CSV
                </Button>
              </div>
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Payment Details Drawer */}
      {detailsItem && (
        <PaymentItemDetailsDrawer
          isOpen={isDetailsOpen}
          onClose={() => {
            setIsDetailsOpen(false);
            setDetailsItem(null);
          }}
          paymentItem={{
            orderId: detailsItem.lookupId,
            transactionId: detailsItem.transactionId,
            buyer: {
              name: detailsItem.buyerName,
              email: detailsItem.buyerEmail,
              avatar: detailsItem.buyerAvatar,
            },
            releaseDate: formatDate(detailsItem.releaseISO),
            paymentMethod: detailsItem.paymentMethod === "PIX" ? "Pix" : "Cartão de Crédito",
            value: detailsItem.amount / 100,
            installment: detailsItem.installmentLabel,
          }}
          eventName={eventName}
          categoryName={categoryName}
          type={detailsItem.installmentLabel ? "installment" : "awaiting"}
        />
      )}

      {/* Modal "Antecipar recebíveis". Busca a cotação e envia o pedido pelo
          endpoint /repasse/anticipations. Montagem condicional (mount = aberto). */}
      {isAnticipationOpen && (
        <AnticipationModal
          eventId={eventId}
          eventName={eventName}
          onClose={() => setIsAnticipationOpen(false)}
          onSuccess={() => loadPendingReleases(currentPage)}
        />
      )}

      {/* Modal de filtros do "Exportar CSV" — seleção de colunas, no padrão do
          export fiscal. onConfirm dispara o download com os campos escolhidos. */}
      <AwaitingReleaseExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        onConfirm={({ fields }) => handleExportCsv(fields)}
        isExporting={isExporting}
        tabLabel={isAvista ? "À vista" : "Parcelados"}
      />
    </>
  );
}
