"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useOrganizerNavigate } from "@/hooks/useOrganizerNavigate";
import { useEventPermissionGuard } from "@/hooks/useEventPermissionGuard";
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
import { EventMobileHeader } from "@/components/Organizer/EventMobileHeader";
import { Tooltip } from "@/components/Tooltip";

function TicketsPagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  return (
    <div className="flex items-center justify-center gap-2 py-3">
      <button
        onClick={() => onChange(Math.max(1, page - 1))}
        disabled={page <= 1}
        className="size-8 flex items-center justify-center rounded-lg border border-gray-6 text-gray-12 disabled:opacity-50 hover:bg-gray-3 transition-colors"
      >
        <ChevronLeft className="size-4" />
      </button>
      <div className="flex items-center gap-1">
        {Array.from({ length: Math.min(totalPages, 8) }, (_, i) => {
          const pageNum = i + 1;
          const isActive = pageNum === page;
          return (
            <button
              key={pageNum}
              onClick={() => onChange(pageNum)}
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
        onClick={() => onChange(Math.min(totalPages, page + 1))}
        disabled={page >= totalPages}
        className="size-8 flex items-center justify-center rounded-lg border border-gray-6 text-gray-12 disabled:opacity-50 hover:bg-gray-3 transition-colors"
      >
        <ChevronRight className="size-4" />
      </button>
    </div>
  );
}

export default function EventFinancialPage() {
  const router = useRouter();
  const orgNav = useOrganizerNavigate();
  const params = useParams();
  const eventId = params.id as string;
  useEventPermissionGuard("financial");
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
  const [ticketsPage, setTicketsPage] = useState(1);
  const [ticketsPagination, setTicketsPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });

  useEffect(() => {
    if (authLoading) return;

    const hasToken = userService.isAuthenticated();
    if (!hasToken && !isAuthenticated) {
      orgNav.push("/organizer/login");
      return;
    }

    if (!authChecked) {
      setAuthChecked(true);
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!authChecked || authLoading || !eventId) return;
    loadData();
  }, [authChecked, eventId, periodFilter, ticketsPage]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [eventData, financialDataResponse] = await Promise.all([
        organizerService.getEventById(eventId),
        organizerService.getEventFinancial(eventId, {
          period: (periodFilter === "geral" ? "2m" : periodFilter) as "hoje" | "7d" | "15d" | "1m" | "2m",
          page: ticketsPage,
          limit: 20,
        }),
      ]);
      setEvent(eventData);
      setFinancialData({
        availableBalance: financialDataResponse.summary.availableBalance,
        installmentsToReceive: financialDataResponse.summary.installmentsToReceive,
        awaitingRelease: financialDataResponse.summary.pendingRelease,
        totalTransferred: financialDataResponse.summary.totalWithdrawn,
        refunded: financialDataResponse.summary.totalRefunded,
        chargebacks: financialDataResponse.summary.totalChargebacks,
        grossRevenue: financialDataResponse.summary.grossRevenue,
        revenueChange: 0,
        revenueChart: financialDataResponse.revenueChart,
      });

      const rawTickets: any[] = financialDataResponse.tickets.data.tickets;
      const formattedTickets: FinancialTicket[] = rawTickets.map((ticket) => {
        const categoryName = ticket.category?.name || "Ingresso avulso";
        const totalSold = ticket.quantitySold || 0;
        const totalRevenue = (ticket.batches as any[]).reduce(
          (sum: number, b: any) => sum + (b.quantitySold || 0) * (b.price || 0),
          0,
        );
        return {
          id: ticket.id,
          type: "category",
          name: ticket.name,
          subtitle: categoryName,
          categoryId: ticket.categoryId,
          sold: totalSold.toString(),
          revenue: totalRevenue,
          createdAt: ticket.createdAt,
          lots: ticket.batches,
        };
      });
      setTicketsData(formattedTickets);
      setTicketsPagination(financialDataResponse.tickets.data.pagination);
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
    { label: "Notificações", href: `/organizer/events/${eventId}/notifications` },
  ];

  return (
    <div className="min-h-screen bg-gray-2">
      {/* Desktop header */}
      <div className="hidden md:block">
        <EventPageHeader eventName={event?.name} />
      </div>

      <EventMobileHeader
        eventId={eventId}
        eventName={event?.name}
        activeHref={`/organizer/events/${eventId}/financial`}
        backHref={`/organizer/events/${eventId}/registrations`}
        backLinkClassName="rotate-180"
      />

      <div className="max-w-7xl mx-auto px-4 lg:px-6 2xl:px-0">

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
              eventId,
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
                eventId,
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
                          const lotSold = lot.quantitySold || 0;
                          const lotRevenue = lotSold * (lot.price || 0);
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
            <TicketsPagination
              page={ticketsPage}
              totalPages={ticketsPagination.totalPages}
              onChange={setTicketsPage}
            />
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
                          <div className="flex flex-col gap-0 w-[200px]">
                            {item.subtitle && (
                              <Tooltip
                                contentClassName="w-auto px-3 py-2 gap-0"
                                position="topRight"
                                content={
                                  <p className="font-inter font-normal text-xs text-gray-11 leading-[1.3] whitespace-nowrap">
                                    {item.subtitle}
                                  </p>
                                }
                              >
                                <p className="font-inter font-normal leading-[1.3] text-sm text-gray-11 truncate">
                                  {item.subtitle}
                                </p>
                              </Tooltip>
                            )}
                            <Tooltip
                              contentClassName="w-auto px-3 py-2 gap-0"
                              position="topRight"
                              content={
                                <p className="font-family-dm-sans text-xs font-semibold text-gray-12 leading-[1.3] whitespace-nowrap">
                                  {item.name}
                                </p>
                              }
                            >
                              <p className="overflow-hidden text-ellipsis whitespace-nowrap font-family-dm-sans text-sm font-semibold leading-[1.3] text-gray-12">
                                {item.name}
                              </p>
                            </Tooltip>
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
                      const lotSold = lot.quantitySold || 0;
                      const lotRevenue = (lot.price || 0) * lotSold;
                      const lotCreatedAt = lot.createdAt || item.createdAt;
                      const lotName = `Lote ${lotIndex + 1}`;

                      return (
                        <div
                          key={`${item.id}-lot-${lot.id}`}
                          className="bg-blue-2 border-b border-blue-6 flex items-center justify-between w-full h-[48px] hover:bg-blue-3 transition-colors last:border-b-0"
                        >
                          {/* Ingresso/Lotes */}
                          <div className="flex h-full items-center px-4 py-3 w-[289.5px]">
                            <div className="flex items-center gap-3">
                              <div className="flex flex-col gap-0">
                                <p className="font-inter max-w-[250px] font-semibold leading-[1.3] text-sm text-gray-12 truncate">
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
            <div className="px-4">
              <TicketsPagination
                page={ticketsPage}
                totalPages={ticketsPagination.totalPages}
                onChange={setTicketsPage}
              />
            </div>
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
