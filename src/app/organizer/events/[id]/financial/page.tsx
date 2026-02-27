"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { organizerService, userService } from "@/services";
import { Button } from "@/components/Button";
import {
  ArrowUp,
} from "lucide-react";
import toast from "react-hot-toast";
import { Loading } from "@/components/Loading";
import { CalendarIcon } from "@/components/Icons/CalendarIcon";
import { EventPageHeader } from "@/components/Organizer/EventPageHeader";
import { RevenueChart } from "@/components/Organizer/RevenueChart";
import { ArrowButton } from "@/components/ArrowButton";
import { TransferHistoryDrawer } from "@/components/Financial/TransferHistoryDrawer";
import { InstallmentsDrawer } from "@/components/Financial/InstallmentsDrawer";
import { AwaitingReleaseDrawer } from "@/components/Financial/AwaitingReleaseDrawer";
import { RefundedDrawer } from "@/components/Financial/RefundedDrawer";
import { ChargebackDrawer } from "@/components/Financial/ChargebackDrawer";
import { useRequestTransferModal } from "@/stores/modalStore";
import { RepasseIcon } from "@/components/Icons/RepasseIcon";
import { PaymentIcon } from "@/components/Icons/PaymentIcon";
import type { FinancialTicket } from "@/services/organizer/OrganizerService";
import { RemoveIcon } from "@/components/Icons/RemoveIcon";
import { ChargeBackIcon } from "@/components/Icons/ChargeBackIcon";
import { TimerIcon } from "@/components/Icons/Organizer/TimerIcon";
import { FaturaIcon } from "@/components/Icons/FaturaIcon";

export default function EventFinancialPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [authChecked, setAuthChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<any>(null);
  const [periodFilter, setPeriodFilter] = useState("hoje");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [isTransferHistoryOpen, setIsTransferHistoryOpen] = useState(false);
  const [isInstallmentsOpen, setIsInstallmentsOpen] = useState(false);
  const [isAwaitingReleaseOpen, setIsAwaitingReleaseOpen] = useState(false);
  const [isRefundedOpen, setIsRefundedOpen] = useState(false);
  const [isChargebackOpen, setIsChargebackOpen] = useState(false);
  const { openRequestTransferModal } = useRequestTransferModal();
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });

  // Financial data
  const [financialData, setFinancialData] = useState<{
    availableBalance: number;
    installmentsToReceive: number;
    awaitingRelease: number;
    totalTransferred: number;
    refunded: number;
    chargebacks: number;
    grossRevenue: number;
    revenueChange: number;
    revenueChart?: {
      labels: string[];
      revenue: number[];
    };
  }>({
    availableBalance: 1240,
    installmentsToReceive: 1240,
    awaitingRelease: 1240,
    totalTransferred: 1240,
    refunded: 1240,
    chargebacks: 1240,
    grossRevenue: 10000,
    revenueChange: 12,
    revenueChart: {
      labels: [],
      revenue: [],
    },
  });

  // Data for tickets/lots
  const [ticketsData, setTicketsData] = useState<FinancialTicket[]>([]);
  const [financialBatchesMap, setFinancialBatchesMap] = useState<Map<string, { sold: string; revenue: number }>>(new Map());

  useEffect(() => {
    if (authLoading) return;

    const hasToken = userService.isAuthenticated();
    if (!hasToken && !isAuthenticated) {
      router.push("/");
      return;
    }

    if (!authChecked) {
      setAuthChecked(true);
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!authChecked || authLoading || !eventId) return;
    loadData();
  }, [authChecked, eventId, periodFilter, pagination.page]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [eventData, financialDataResponse, ticketsResponse, categoriesResponse] = await Promise.all([
        organizerService.getEventById(eventId),
        organizerService.getEventFinancial(eventId, {
          period: periodFilter as "hoje" | "7d" | "15d" | "1m" | "2m",
          page: pagination.page,
          limit: pagination.limit,
        }),
        organizerService.getTickets(eventId),
        organizerService.getTicketCategories(eventId),
      ]);
      setEvent(eventData);
      setFinancialData({
        availableBalance: financialDataResponse.summary.availableBalance,
        installmentsToReceive: financialDataResponse.summary.installmentsToReceive,
        awaitingRelease: financialDataResponse.summary.awaitingRelease,
        totalTransferred: financialDataResponse.summary.totalTransferred,
        refunded: financialDataResponse.summary.refunded,
        chargebacks: financialDataResponse.summary.chargebacks,
        grossRevenue: financialDataResponse.summary.grossRevenue,
        revenueChange: financialDataResponse.summary.revenueChange,
        revenueChart: financialDataResponse.revenueChart,
      });

      // Criar mapa de dados financeiros por ticket ID e batch ID
      const financialTicketsMap = new Map<string, FinancialTicket>();
      const financialBatchesMap = new Map<string, { sold: string; revenue: number }>();

      if (financialDataResponse.tickets?.items) {
        financialDataResponse.tickets.items.forEach((financialTicket: FinancialTicket) => {
          financialTicketsMap.set(financialTicket.id, financialTicket);

          // Mapear lotes financeiros se existirem
          if (financialTicket.lots) {
            financialTicket.lots.forEach((lot) => {
              financialBatchesMap.set(lot.id, {
                sold: lot.sold,
                revenue: lot.revenue,
              });
            });
          }
        });
      }

      // Criar estrutura de dados para exibição - lista de tickets
      const formattedTicketsData: FinancialTicket[] = [];

      // Processar cada ticket
      ticketsResponse.tickets.forEach((ticket: any) => {
        // Usar o nome da categoria do objeto category que vem na resposta
        const categoryName = ticket.category?.name || "Sem categoria";

        // Verificar se o ticket tem batches
        const hasBatches = ticket.batches && ticket.batches.length > 0;
        const financialTicket = financialTicketsMap.get(ticket.id);

        // Calcular totais do ticket (soma de todos os batches ou usar dados financeiros)
        let totalSold = 0;
        let totalRevenue = 0;

        if (financialTicket) {
          // Usar dados financeiros se disponíveis
          totalSold = parseInt(financialTicket.sold) || 0;
          totalRevenue = financialTicket.revenue || 0;
        } else if (hasBatches) {
          // Se não houver dados financeiros, somar dos batches
          ticket.batches.forEach((batch: any) => {
            const financialBatch = financialBatchesMap.get(batch.id);
            if (financialBatch) {
              totalSold += parseInt(financialBatch.sold) || 0;
              totalRevenue += financialBatch.revenue || 0;
            }
          });
        }

        // Adicionar ticket
        formattedTicketsData.push({
          id: ticket.id,
          type: "category", // Mantém "category" para compatibilidade com o código de renderização
          name: ticket.name,
          subtitle: categoryName, // Nome da categoria no subtitle
          categoryId: ticket.categoryId,
          sold: totalSold.toString(),
          revenue: totalRevenue,
          createdAt: ticket.createdAt,
          lots: ticket.batches,
        });
      });

      setTicketsData(formattedTicketsData);
      setFinancialBatchesMap(financialBatchesMap);
      setPagination(financialDataResponse.tickets.pagination);
    } catch (error: any) {
      console.error("Error loading event:", error);
      toast.error("Erro ao carregar dados do evento");
    } finally {
      setLoading(false);
    }
  };

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-gray-2 flex items-center justify-center">
        <Loading />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-2">
      <EventPageHeader
        eventName={event?.name}
        tabs={[
          { label: "Dashboard", href: `/organizer/events/${eventId}/dashboard` },
          { label: "Inscrições", href: `/organizer/events/${eventId}/registrations` },
          { label: "Financeiro", href: `/organizer/events/${eventId}/financial`, active: true },
          { label: "Editar", href: `/organizer/events/${eventId}/edit` },
        ]}
      />
      <div className="max-w-7xl mx-auto px-4 lg:px-0">


        {/* Page Title */}
        <div className="mb-6 flex items-center justify-between w-full">
          <div>
            <h1 className="text-3xl font-bold text-gray-12 mb-2">Financeiro</h1>
            <p className="text-gray-11">
              Acompanhe o faturamento, repasses e valores em processamento deste evento
            </p>
          </div>
          <div>
            <Button onClick={() => openRequestTransferModal({
              availableBalance: financialData.availableBalance,
              onViewHistory: () => setIsTransferHistoryOpen(true)
            })}>
              Solicitar repasse
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-col gap-[32px] items-start overflow-clip pb-[64px] relative shrink-0 w-full">
          {/* Cards Section - 3x2 Grid */}
          <div className="grid grid-cols-3 gap-0 w-full">
            {/* Saldo disponível */}
            <div className="bg-gray-1 border border-gray-6 rounded-tl-[12px] px-4 py-3">
              <div className="flex items-center justify-between mb-3">
                <p className="font-family-dm-sans font-normal text-[14px] text-gray-11">
                  Saldo disponível
                </p>
                <div className="w-[28px] h-[28px] p-1 rounded-lg bg-primary-4 flex items-center justify-center">
                  <PaymentIcon className="size-5 text-gray-12" />
                </div>
              </div>
              <p className="font-family-dm-sans font-bold text-[20px] text-gray-12">
                R$ {(financialData.availableBalance / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>

            {/* Parcelados a receber */}
            <div className="bg-gray-1 border-t border-b border-r border-gray-6 px-4 py-3">
              <div className="flex items-center justify-between mb-3">
                <p className="font-family-dm-sans font-normal text-[14px] text-gray-11">
                  Parcelados a receber
                </p>
                <div className="w-[28px] h-[28px] p-1 rounded-lg bg-blue-4 flex items-center justify-center">
                  <CalendarIcon className="size-5 text-blue-12" />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <p className="font-family-dm-sans font-bold text-[20px] text-gray-12">
                  R${(financialData.installmentsToReceive / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <button
                  onClick={() => setIsInstallmentsOpen(true)}
                  className="text-[14px] text-gray-11 underline font-family-dm-sans font-medium cursor-pointer"
                >
                  Ver detalhes
                </button>
              </div>
            </div>

            {/* Aguardando liberação */}
            <div className="bg-gray-1 border border-gray-6 rounded-tr-[12px] px-4 py-3">
              <div className="flex items-center justify-between mb-3">
                <p className="font-family-dm-sans font-normal text-[14px] text-gray-11">
                  Aguardando liberação
                </p>
                <div className="w-[28px] h-[28px] p-1 rounded-lg bg-yellow-4 flex items-center justify-center">
                  <TimerIcon className="size-5 text-yellow-12" />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <p className="font-family-dm-sans font-bold text-[20px] text-gray-12">
                  R${(financialData.awaitingRelease / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <button
                  onClick={() => setIsAwaitingReleaseOpen(true)}
                  className="text-[14px] text-gray-11 underline font-family-dm-sans font-medium cursor-pointer"
                >
                  Ver detalhes
                </button>
              </div>
            </div>

            {/* Total já repassado */}
            <div className="bg-gray-1 border-l border-b border-r border-gray-6 rounded-bl-[12px] px-4 py-3">
              <div className="flex items-center justify-between mb-3">
                <p className="font-family-dm-sans font-normal text-[14px] text-gray-11">
                  Total já repassado
                </p>
                <div className="w-[28px] h-[28px] p-1 rounded-lg bg-[#EBE4FF] flex items-center justify-center">
                  <RepasseIcon className="size-5 text-gray-12" />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <p className="font-family-dm-sans font-bold text-[20px] text-gray-12">
                  R${(financialData.totalTransferred / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <button
                  onClick={() => setIsTransferHistoryOpen(true)}
                  className="text-[14px] text-gray-11 underline font-family-dm-sans font-medium cursor-pointer"
                >
                  Ver detalhes
                </button>
              </div>
            </div>

            {/* Estornado */}
            <div className="bg-gray-1 border-b border-r border-gray-6 px-4 py-3">
              <div className="flex items-center justify-between mb-3">
                <p className="font-family-dm-sans font-normal text-[14px] text-gray-11">
                  Estornado
                </p>
                <div className="w-[28px] h-[28px] p-1 rounded-lg bg-red-3 flex items-center justify-center">
                  <RemoveIcon className="size-3 text-red-12" />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <p className="font-family-dm-sans font-bold text-[20px] text-gray-12">
                  R${(financialData.refunded / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <button
                  onClick={() => setIsRefundedOpen(true)}
                  className="text-[14px] text-gray-11 underline font-family-dm-sans font-medium cursor-pointer"
                >
                  Ver detalhes
                </button>
              </div>
            </div>

            {/* Chargebacks */}
            <div className="bg-gray-1 border border-gray-6 rounded-br-[12px] px-4 py-3">
              <div className="flex items-center justify-between mb-3">
                <p className="font-family-dm-sans font-normal text-[14px] text-gray-11">
                  Chargebacks
                </p>
                <div className="w-[28px] h-[28px] p-1 rounded-lg bg-red-3 flex items-center justify-center">
                  <ChargeBackIcon className="size-5 text-red-12" />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <p className="font-family-dm-sans font-bold text-[20px] text-gray-12">
                  R${(financialData.chargebacks / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <button
                  onClick={() => setIsChargebackOpen(true)}
                  className="text-[14px] text-gray-11 underline font-family-dm-sans font-medium cursor-pointer"
                >
                  Ver detalhes
                </button>
              </div>
            </div>
          </div>

          {/* Chart Card */}
          <div className="w-full bg-gray-1 border border-gray-6 rounded-[12px] px-4 py-3">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-[28px] h-[28px] p-1 rounded-lg bg-blue-4 flex items-center justify-center">
                  <FaturaIcon className="size-5 text-blue-12" />
                </div>
                <p className="font-family-dm-sans font-normal text-[14px] text-gray-11">
                  Faturamento
                </p>
              </div>
              <div className="bg-gray-3 flex items-center p-1 rounded-[8px]">
                {["Hoje", "7D", "15D", "1M", "2M"].map((period) => (
                  <button
                    key={period}
                    onClick={() => setPeriodFilter(period.toLowerCase())}
                    className={`px-4 py-1 rounded-[8px] text-[14px] border font-family-dm-sans font-medium transition-colors ${periodFilter === period.toLowerCase()
                      ? "bg-gray-1 border-gray-6 text-gray-12"
                      : "text-gray-11 hover:text-gray-12 border-transparent"
                      }`}
                  >
                    {period}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-4 mb-4">
              <p className="font-manrope font-bold text-[20px] text-gray-12">
                R$ {(financialData.grossRevenue / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <div className="flex items-center gap-2">
                <ArrowUp className="size-6 text-primary-11" />
                <span className="font-family-dm-sans font-normal text-[14px] text-gray-12">
                  {financialData.revenueChange.toFixed(2)}% vs. semana passada
                </span>
              </div>
            </div>

            {/* Chart */}
            <div className="h-[341px] rounded-lg relative">
              <RevenueChart
                data={{
                  labels: financialData.revenueChart?.labels || [],
                  revenue: financialData.revenueChart?.revenue?.map((val: number) => val / 100) || [],
                }}
              />
            </div>
          </div>


          {/* Table Section */}
          <div className="bg-gray-2 border border-gray-6 rounded-lg overflow-hidden w-full">
            {/* Table Header */}
            <div className="bg-gray-4 border-b border-gray-6 flex h-[44px] items-center">
              <div className="flex h-full items-center p-4 w-[289.5px]">
                <p className="font-inter font-medium leading-[1.3] text-sm text-gray-12">
                  Ingresso/Lotes
                </p>
              </div>
              <div className="flex flex-1 h-full items-center min-h-px min-w-px p-4">
                <p className="font-inter font-medium leading-[1.3] text-sm text-gray-12">
                  Vendidos
                </p>
              </div>
              <div className="flex flex-1 h-full items-center min-h-px min-w-px p-4">
                <p className="font-inter font-medium leading-[1.3] text-sm text-gray-12">
                  Receita bruta
                </p>
              </div>
              <div className="flex flex-1 h-full items-center min-h-px min-w-px p-4">
                <p className="font-inter font-medium leading-[1.3] text-sm text-gray-12">
                  Criado em
                </p>
              </div>
            </div>

            {/* Table Rows */}
            <div className="flex flex-col items-start w-full">
              {ticketsData.map((item, index) => {
                const isExpanded = expandedRows.has(item.id);
                const isCategory = item.type === "category";
                const hasLots = item.lots && item.lots.length > 0;

                return (
                  <div key={item.id} className="w-full">
                    {/* Categoria/Ticket */}
                    <div
                      className={`border-b border-gray-6 flex items-center justify-between w-full hover:bg-gray-2 transition-colors ${isExpanded && hasLots ? "bg-blue-3" : "bg-gray-1"} ${isCategory ? "h-[56px]" : "h-[48px]"}`}
                    >
                      {/* Ingresso/Lotes */}
                      <div className="flex h-full items-center px-4 py-3 w-[289.5px]">
                        <div className="flex items-center gap-3">
                          {hasLots && (
                            <button
                              onClick={() => toggleRow(item.id)}
                              className="flex items-center justify-center cursor-pointer"
                            >
                              <div className="relative size-6">
                                <div className={`absolute inset-0 ${isExpanded ? "bg-blue-5" : "bg-gray-4"} rounded p-1`}>
                                  <div className="size-full rounded-lg flex items-center justify-center p-1">
                                    <ArrowButton isOpen={isExpanded} />
                                  </div>
                                </div>
                              </div>
                            </button>
                          )}
                          <div className="flex flex-col gap-0">
                            {item.subtitle && (
                              <p className="font-inter font-normal leading-[1.3] text-sm text-gray-11">
                                {item.subtitle}
                              </p>
                            )}
                            <p className="font-inter font-semibold leading-[1.3] text-sm text-gray-12">
                              {item.name}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Vendidos */}
                      <div className="flex flex-1 h-full items-center min-h-px min-w-px px-4 py-3">
                        <p className="font-inter font-semibold leading-[1.3] text-sm text-gray-12">
                          {item.sold}
                        </p>
                      </div>

                      {/* Receita bruta */}
                      <div className="flex flex-1 h-full items-center min-h-px min-w-px px-4 py-3">
                        <div className="flex items-center gap-1">
                          <span className="font-inter font-semibold leading-[1.3] text-sm text-gray-12">
                            R$
                          </span>
                          <span className="font-inter font-semibold leading-[1.3] text-sm text-gray-12">
                            {(item.revenue / 100).toFixed(2).replace(".", ",")}
                          </span>
                        </div>
                      </div>

                      {/* Criado em */}
                      <div className="flex flex-1 h-full items-center min-h-px min-w-px px-4 py-3">
                        <p className="font-inter font-semibold leading-[1.3] text-sm text-gray-12">
                          {new Date(item.createdAt).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                    </div>

                    {/* Lotes (quando expandido) */}
                    {isExpanded && hasLots && item.lots && item.lots.map((lot: any, lotIndex: number) => {
                      // Buscar dados financeiros do lote
                      const financialLot = financialBatchesMap.get(lot.id);
                      // Extrair apenas o valor vendido (antes do hífen, se houver)
                      const lotSoldRaw = financialLot?.sold || "0";
                      const lotSold = typeof lotSoldRaw === "string" && lotSoldRaw.includes("-")
                        ? lotSoldRaw.split("-")[0].trim()
                        : lotSoldRaw;
                      const lotRevenue = financialLot?.revenue || lot.revenue || 0;
                      const lotCreatedAt = lot.createdAt || item.createdAt;
                      const lotName = `Lote ${lotIndex + 1} - ${item.name}`;

                      return (
                        <div
                          key={`${item.id}-lot-${lot.id}`}
                          className="bg-blue-2 border-b border-blue-6 flex items-center justify-between w-full h-[48px] hover:bg-blue-3 transition-colors last:border-b-0"
                        >
                          {/* Ingresso/Lotes */}
                          <div className="flex h-full items-center px-4 py-3 w-[289.5px]">
                            <div className="flex items-center gap-3">
                              <div className="flex flex-col gap-0">
                                <p className="font-inter font-semibold leading-[1.3] text-sm text-gray-12">
                                  {lotName}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Vendidos */}
                          <div className="flex flex-1 h-full items-center min-h-px min-w-px px-4 py-3">
                            <p className="font-inter font-semibold leading-[1.3] text-sm text-gray-12">
                              {lotSold}
                            </p>
                          </div>

                          {/* Receita bruta */}
                          <div className="flex flex-1 h-full items-center min-h-px min-w-px px-4 py-3">
                            <div className="flex items-center gap-1">
                              <span className="font-inter font-semibold leading-[1.3] text-sm text-gray-12">
                                R$
                              </span>
                              <span className="font-inter font-semibold leading-[1.3] text-sm text-gray-12">
                                {(lotRevenue / 100).toFixed(2).replace(".", ",")}
                              </span>
                            </div>
                          </div>

                          {/* Criado em */}
                          <div className="flex flex-1 h-full items-center min-h-px min-w-px px-4 py-3">
                            <p className="font-inter font-semibold leading-[1.3] text-sm text-gray-12">
                              {new Date(lotCreatedAt).toLocaleDateString("pt-BR")}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pagination and Export */}
          <div className="flex items-center justify-between w-full">
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2">
                {Array.from({ length: Math.min(pagination.totalPages, 8) }, (_, i) => {
                  const pageNum = i + 1;
                  const isActive = pageNum === pagination.page;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPagination({ ...pagination, page: pageNum })}
                      className={`size-8 flex items-center justify-center border rounded-lg text-sm font-inter font-normal transition-colors ${isActive
                        ? "bg-[#59E373] border-[#59E373] text-gray-12"
                        : "border-gray-6 hover:bg-gray-3 text-gray-12"
                        }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Transfer History Drawer */}
      <TransferHistoryDrawer
        isOpen={isTransferHistoryOpen}
        onClose={() => setIsTransferHistoryOpen(false)}
        totalTransferred={financialData.totalTransferred}
        eventId={eventId}
        eventName={event?.name}
        categoryName="Nome da categoria"
        onNavigatePrev={undefined} // Primeiro drawer, não tem anterior
        onNavigateNext={() => {
          setIsTransferHistoryOpen(false);
          setIsAwaitingReleaseOpen(true);
        }}
      />

      {/* Awaiting Release Drawer */}
      <AwaitingReleaseDrawer
        isOpen={isAwaitingReleaseOpen}
        onClose={() => setIsAwaitingReleaseOpen(false)}
        totalPending={financialData.awaitingRelease}
        releaseToday={0} // Será atualizado pelos dados reais do drawer
        totalTransactions={0} // Será atualizado pelos dados reais do drawer
        eventId={eventId}
        eventName={event?.name}
        categoryName="Nome da categoria"
        onNavigatePrev={() => {
          setIsAwaitingReleaseOpen(false);
          setIsTransferHistoryOpen(true);
        }}
        onNavigateNext={() => {
          setIsAwaitingReleaseOpen(false);
          setIsInstallmentsOpen(true);
        }}
      />

      {/* Installments Drawer */}
      <InstallmentsDrawer
        isOpen={isInstallmentsOpen}
        onClose={() => setIsInstallmentsOpen(false)}
        totalPending={financialData.installmentsToReceive}
        releaseToday={0} // Será atualizado pelos dados reais do drawer
        totalTransactions={0} // Será atualizado pelos dados reais do drawer
        eventId={eventId}
        eventName={event?.name}
        categoryName="Nome da categoria"
        onNavigatePrev={() => {
          setIsInstallmentsOpen(false);
          setIsAwaitingReleaseOpen(true);
        }}
        onNavigateNext={() => {
          setIsInstallmentsOpen(false);
          setIsRefundedOpen(true);
        }}
      />

      {/* Refunded Drawer */}
      <RefundedDrawer
        isOpen={isRefundedOpen}
        onClose={() => setIsRefundedOpen(false)}
        totalRefunded={financialData.refunded}
        eventId={eventId}
        eventName={event?.name}
        categoryName="Nome da categoria"
        onNavigatePrev={() => {
          setIsRefundedOpen(false);
          setIsInstallmentsOpen(true);
        }}
        onNavigateNext={() => {
          setIsRefundedOpen(false);
          setIsChargebackOpen(true);
        }}
      />

      {/* Chargeback Drawer */}
      <ChargebackDrawer
        isOpen={isChargebackOpen}
        onClose={() => setIsChargebackOpen(false)}
        totalChargebacks={financialData.chargebacks}
        eventId={eventId}
        eventName={event?.name}
        categoryName="Nome da categoria"
        onNavigatePrev={() => {
          setIsChargebackOpen(false);
          setIsRefundedOpen(true);
        }}
        onNavigateNext={undefined} // Último drawer, não tem próximo
      />
    </div>
  );
}
