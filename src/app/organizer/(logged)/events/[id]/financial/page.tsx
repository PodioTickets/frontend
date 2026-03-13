"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { organizerService, userService } from "@/services";
import { Button } from "@/components/Button";
import {
  ArrowUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
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
import Link from "next/link";

export default function EventFinancialPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [authChecked, setAuthChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<any>(null);
  const [periodFilter, setPeriodFilter] = useState("geral");
  const [mobileCardsScrollIndex, setMobileCardsScrollIndex] = useState(0);
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
          period: (periodFilter === "geral" ? "2m" : periodFilter) as "hoje" | "7d" | "15d" | "1m" | "2m",
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

  const periodOptions = [
    { label: "Geral", value: "geral" },
    { label: "Hoje", value: "hoje" },
    { label: "7D", value: "7d" },
    { label: "15D", value: "15d" },
    { label: "1M", value: "1m" },
    { label: "2M", value: "2m" },
  ];

  const eventTabs = [
    { label: "Dashboard", href: `/organizer/events/${eventId}/dashboard` },
    { label: "Editar", href: `/organizer/events/${eventId}/edit` },
    { label: "Inscrições", href: `/organizer/events/${eventId}/registrations` },
    { label: "Financeiro", href: `/organizer/events/${eventId}/financial` },
    { label: "Desconto", href: `/organizer/events/${eventId}/discount/cupom` },
    { label: "Ads", href: `/organizer/events/${eventId}/ads` },
  ];

  return (
    <div className="min-h-screen bg-gray-2">
      {/* Desktop header */}
      <div className="hidden md:block">
        <EventPageHeader eventName={event?.name} />
      </div>

      {/* Mobile header: back + event name + horizontal tabs (igual à tela de Ads) */}
      <div className="md:hidden bg-gray-1 border-b border-gray-6">
        <div className="flex items-center gap-1 h-[52px] px-4">
          <Link
            href={`/organizer/events/${eventId}/dashboard`}
            className="size-8 flex items-center justify-center shrink-0 rounded-lg hover:bg-gray-3 transition-colors rotate-180"
            aria-label="Voltar"
          >
            <ArrowButton isOpen={false} />
          </Link>
          <p className="font-manrope font-extrabold text-base leading-[1.1] text-gray-12 truncate flex-1 min-w-0">
            {event?.name || "Evento"}
          </p>
        </div>
        <div className="border-b border-gray-6 overflow-x-auto [&::-webkit-scrollbar]:hidden"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          <div className="flex items-center min-w-max">
            {eventTabs.map((tab) => {
              const isFinancial = tab.href.includes("/financial");
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`shrink-0 px-4 py-3 text-base transition-colors border-b-2 -mb-px ${isFinancial
                    ? "border-primary-11 text-primary-11 font-manrope font-bold"
                    : "border-transparent text-gray-11 font-family-dm-sans font-normal"
                    }`}
                >
                  {tab.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 lg:px-0">

        {/* Page Title - Desktop */}
        <div className="mb-6 hidden lg:flex items-center justify-between w-full">
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
          {/* ========== MOBILE: Banner (Saldo + horizontal cards + dots + button) ========== */}
          <div className="lg:hidden flex flex-col gap-5 w-full px-0 mt-4 md:mt-0">
            <div className="flex flex-col gap-3 w-full">
              {/* Saldo disponível - full width card */}
              <div className="bg-gray-1 border border-gray-6 rounded-lg overflow-hidden w-full">
                <div className="flex gap-2 items-center pt-3 pb-1 px-3">
                  <div className="w-8 h-8 rounded-lg bg-primary-4 flex items-center justify-center shrink-0">
                    <PaymentIcon className="size-5 text-gray-12" />
                  </div>
                  <p className="font-family-dm-sans font-normal text-sm text-gray-11">Saldo disponível</p>
                </div>
                <div className="px-3 py-4">
                  <p className="font-manrope font-extrabold text-lg leading-tight text-gray-12">
                    R$ {(financialData.availableBalance / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
              {/* Horizontal scroll - 5 cards */}
              <div
                className="flex gap-2 overflow-x-auto overflow-y-hidden pb-1 snap-x snap-mandatory scroll-smooth [&::-webkit-scrollbar]:hidden"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                onScroll={(e) => {
                  const el = e.currentTarget;
                  const cardWidth = 157.5 + 8;
                  const index = Math.round(el.scrollLeft / cardWidth);
                  setMobileCardsScrollIndex(Math.min(index, 4));
                }}
              >
                {/* Parcelados a receber */}
                <div className="bg-gray-1 border border-gray-6 rounded-lg min-w-[157px] w-[157px] shrink-0 snap-center">
                  <div className="flex flex-col gap-3 pt-3 pb-1 px-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-4 flex items-center justify-center shrink-0">
                      <CalendarIcon className="size-5 text-blue-12" />
                    </div>
                    <p className="font-family-dm-sans font-normal text-base text-gray-11">Parcelados a receber</p>
                  </div>
                  <div className="px-3 py-4">
                    <p className="font-manrope font-extrabold text-lg text-gray-12">
                      {(financialData.installmentsToReceive / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <button onClick={() => setIsInstallmentsOpen(true)} className="text-sm text-gray-11 underline font-family-dm-sans font-normal pb-3 pt-1 px-3">
                    Ver detalhes
                  </button>
                </div>
                {/* Aguardando liberação */}
                <div className="bg-gray-1 border border-gray-6 rounded-lg min-w-[157px] w-[157px] shrink-0 snap-center">
                  <div className="flex flex-col gap-3 pt-3 pb-1 px-3">
                    <div className="w-8 h-8 rounded-lg bg-yellow-4 flex items-center justify-center shrink-0">
                      <TimerIcon className="size-5 text-yellow-12" />
                    </div>
                    <p className="font-family-dm-sans font-normal text-base text-gray-11">Aguardando liberação</p>
                  </div>
                  <div className="px-3 py-4">
                    <p className="font-manrope font-extrabold text-lg text-gray-12">
                      {(financialData.awaitingRelease / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <button onClick={() => setIsAwaitingReleaseOpen(true)} className="text-sm text-gray-11 underline font-family-dm-sans font-normal pb-3 pt-1 px-3">
                    Ver detalhes
                  </button>
                </div>
                {/* Total já repassado */}
                <div className="bg-gray-1 border border-gray-6 rounded-lg min-w-[157px] w-[157px] shrink-0 snap-center">
                  <div className="flex flex-col gap-3 pt-3 pb-1 px-3">
                    <div className="w-8 h-8 rounded-lg bg-[#EBE4FF] flex items-center justify-center shrink-0">
                      <RepasseIcon className="size-5 text-gray-12" />
                    </div>
                    <p className="font-family-dm-sans font-normal text-base text-gray-11">Total já repassado</p>
                  </div>
                  <div className="px-3 py-4">
                    <p className="font-manrope font-extrabold text-lg text-gray-12">
                      {(financialData.totalTransferred / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <button onClick={() => setIsTransferHistoryOpen(true)} className="text-sm text-gray-11 underline font-family-dm-sans font-normal pb-3 pt-1 px-3">
                    Ver detalhes
                  </button>
                </div>
                {/* Estornado */}
                <div className="bg-gray-1 border border-gray-6 rounded-lg min-w-[157px] w-[157px] shrink-0 snap-center">
                  <div className="flex flex-col gap-3 pt-3 pb-1 px-3">
                    <div className="w-8 h-8 rounded-lg bg-red-3 flex items-center justify-center shrink-0">
                      <RemoveIcon className="size-3 text-red-12" />
                    </div>
                    <p className="font-family-dm-sans font-normal text-base text-gray-11">Estornado</p>
                  </div>
                  <div className="px-3 py-4">
                    <p className="font-manrope font-extrabold text-lg text-gray-12">
                      {(financialData.refunded / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <button onClick={() => setIsRefundedOpen(true)} className="text-sm text-gray-11 underline font-family-dm-sans font-normal pb-3 pt-1 px-3">
                    Ver detalhes
                  </button>
                </div>
                {/* Chargebacks */}
                <div className="bg-gray-1 border border-gray-6 rounded-lg min-w-[157px] w-[157px] shrink-0 snap-center">
                  <div className="flex flex-col gap-3 pt-3 pb-1 px-3">
                    <div className="w-8 h-8 rounded-lg bg-red-3 flex items-center justify-center shrink-0">
                      <ChargeBackIcon className="size-5 text-red-12" />
                    </div>
                    <p className="font-family-dm-sans font-normal text-base text-gray-11">Chargebacks</p>
                  </div>
                  <div className="px-3 py-4">
                    <p className="font-manrope font-extrabold text-lg text-gray-12">
                      {(financialData.chargebacks / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <button onClick={() => setIsChargebackOpen(true)} className="text-sm text-gray-11 underline font-family-dm-sans font-normal pb-3 pt-1 px-3">
                    Ver detalhes
                  </button>
                </div>
              </div>
              {/* Carousel dots */}
              <div className="flex justify-center gap-1.5">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className={`size-3 rounded-full shrink-0 ${i === mobileCardsScrollIndex ? "bg-primary-11" : "bg-gray-6"}`}
                  />
                ))}
              </div>
            </div>
            {/* Solicitar repasse - full width button */}
            <Button
              className="w-full font-manrope font-bold text-base"
              onClick={() => openRequestTransferModal({
                availableBalance: financialData.availableBalance,
                onViewHistory: () => setIsTransferHistoryOpen(true)
              })}
            >
              Solicitar repasse
            </Button>
          </div>

          {/* Cards Section - 3x2 Grid (Desktop only) */}
          <div className="hidden lg:grid grid-cols-3 gap-0 w-full">
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
            {/* Mobile: segment first, then label */}
            <div className="lg:hidden flex flex-col gap-5 pt-5">
              <div className="bg-gray-3 flex items-center p-1 rounded-lg overflow-x-auto">
                {periodOptions.map(({ label, value }) => (
                  <button
                    key={value}
                    onClick={() => setPeriodFilter(value)}
                    className={`px-4 py-3 rounded-lg text-sm font-medium font-family-dm-sans transition-colors shrink-0 ${periodFilter === value
                      ? "bg-gray-1 border border-gray-8 text-gray-12"
                      : "text-gray-11"
                      }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="font-family-dm-sans font-normal text-base text-gray-11">Faturamento</p>
            </div>
            {/* Desktop: row with icon + label + segment */}
            <div className="hidden lg:flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-[28px] h-[28px] p-1 rounded-lg bg-blue-4 flex items-center justify-center">
                  <FaturaIcon className="size-5 text-blue-12" />
                </div>
                <p className="font-family-dm-sans font-normal text-[14px] text-gray-11">
                  Faturamento
                </p>
              </div>
              <div className="bg-gray-3 flex items-center p-1 rounded-[8px]">
                {periodOptions.map(({ label, value }) => (
                  <button
                    key={value}
                    onClick={() => setPeriodFilter(value)}
                    className={`px-4 py-1 rounded-[8px] text-[14px] border font-family-dm-sans font-medium transition-colors ${periodFilter === value
                      ? "bg-gray-1 border-gray-6 text-gray-12"
                      : "text-gray-11 hover:text-gray-12 border-transparent"
                      }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-4 mb-4">
              <p className="font-manrope font-bold text-2xl lg:text-[20px] text-gray-12">
                R$ {(financialData.grossRevenue / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <div className="flex items-center gap-2">
                <ArrowUp className="size-6 text-primary-11" />
                <span className="font-family-dm-sans font-normal text-base lg:text-[14px] text-primary-11">
                  {financialData.revenueChange.toFixed(2)}% vs. semana passada
                </span>
              </div>
            </div>

            {/* Chart */}
            <div className="h-[255px] lg:h-[341px] rounded-lg relative">
              <RevenueChart
                data={{
                  labels: financialData.revenueChart?.labels || [],
                  revenue: financialData.revenueChart?.revenue?.map((val: number) => val / 100) || [],
                }}
              />
            </div>
          </div>


          {/* ========== MOBILE: Ingressos de lotes (cards) ========== */}
          <div className="lg:hidden w-full flex flex-col gap-2">
            <h2 className="font-manrope font-extrabold text-base text-gray-12">Ingressos de lotes</h2>
            <div className="flex flex-col gap-2">
              {ticketsData.map((item) => {
                const isExpanded = expandedRows.has(item.id);
                const hasLots = item.lots && item.lots.length > 0;
                return (
                  <div
                    key={item.id}
                    className={`rounded-lg border border-gray-6 overflow-hidden ${isExpanded && hasLots ? "bg-primary-4/20" : "bg-gray-1"}`}
                  >
                    <button
                      onClick={() => hasLots && toggleRow(item.id)}
                      className="flex items-center justify-between w-full px-4 py-3 text-left"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="flex flex-col min-w-0">
                          {item.subtitle && (
                            <p className="font-family-dm-sans font-normal text-sm text-gray-11 truncate">{item.subtitle}</p>
                          )}
                          <p className="font-manrope font-bold text-sm text-gray-12 truncate">{item.name}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-family-dm-sans font-semibold text-sm text-gray-12">{item.sold} vendidos</span>
                        {hasLots && (
                          isExpanded
                            ? <ChevronDown className="size-4 text-gray-12" />
                            : <ChevronRight className="size-4 text-gray-12" />
                        )}
                      </div>
                    </button>
                    <div className="px-4 pb-3 pt-0">
                      <span className="font-manrope font-bold text-sm text-gray-12">
                        R$ {(item.revenue / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    {isExpanded && hasLots && item.lots && (
                      <div className="border-t border-gray-6 bg-primary-4/10">
                        {item.lots.map((lot: any, lotIndex: number) => {
                          const financialLot = financialBatchesMap.get(lot.id);
                          const lotSoldRaw = financialLot?.sold || "0";
                          const lotSold = typeof lotSoldRaw === "string" && lotSoldRaw.includes("-") ? lotSoldRaw.split("-")[0].trim() : lotSoldRaw;
                          const lotRevenue = financialLot?.revenue ?? 0;
                          return (
                            <div
                              key={`${item.id}-lot-${lot.id}`}
                              className="flex items-center justify-between px-4 py-3 pl-12"
                            >
                              <span className="font-manrope font-semibold text-sm text-gray-12">Lote {lotIndex + 1}</span>
                              <div className="flex items-center gap-4">
                                <span className="font-family-dm-sans font-semibold text-sm text-gray-12">{lotSold} vendidos</span>
                                <span className="font-manrope font-bold text-sm text-gray-12">
                                  R$ {(lotRevenue / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Table Section (Desktop only) */}
          <div className="hidden lg:block bg-gray-2 border border-gray-6 rounded-lg overflow-hidden w-full">
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

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 w-full">
              {/* Mobile: arrows + numbered buttons (Figma style) */}
              <button
                onClick={() => setPagination((p) => ({ ...p, page: Math.max(1, p.page - 1) }))}
                disabled={pagination.page <= 1}
                className="lg:hidden size-8 flex items-center justify-center rounded-lg border border-gray-6 text-gray-12 disabled:opacity-50"
              >
                <ChevronLeft className="size-4" />
              </button>
              <div className="flex items-center justify-center gap-2">
                {Array.from({ length: Math.min(pagination.totalPages, 8) }, (_, i) => {
                  const pageNum = i + 1;
                  const isActive = pageNum === pagination.page;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPagination({ ...pagination, page: pageNum })}
                      className={`size-8 flex items-center justify-center border rounded-lg text-sm font-family-dm-sans font-medium transition-colors ${isActive
                        ? "bg-primary-11 border-primary-11 text-primary-2"
                        : "border-gray-6 hover:bg-gray-3 text-gray-12 bg-gray-4"
                        }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => setPagination((p) => ({ ...p, page: Math.min(pagination.totalPages, p.page + 1) }))}
                disabled={pagination.page >= pagination.totalPages}
                className="lg:hidden size-8 flex items-center justify-center rounded-lg border border-gray-6 text-gray-12 disabled:opacity-50"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          )}
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
