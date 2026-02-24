"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { organizerService, userService } from "@/services";
import {
  ArrowUp,
  ArrowDown,
  DollarSign,
  TrendingUp,
  Users,
  XCircle,
  RotateCcw,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { Loading } from "@/components/Loading";
import { EventPageHeader } from "@/components/Organizer/EventPageHeader";
import { RevenueChart } from "@/components/Organizer/RevenueChart";
import { SalesHeatmap } from "@/components/Organizer/SalesHeatmap";
import type { SalesHeatmapData, TicketRanking, TopCity, LotNearDepletion, RegistrationsTrend } from "@/services/organizer/OrganizerService";
import { ArrowButton } from "@/components/ArrowButton";
import { SelectTicketsFilterModal } from "@/components/Registrations/SelectTicketsFilterModal";
import { useTickets } from "@/hooks/useTickets";

export default function EventDashboardPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [authChecked, setAuthChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<any>(null);
  const [periodFilter, setPeriodFilter] = useState("geral");
  const [selectedTicketIds, setSelectedTicketIds] = useState<string[]>([]);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const { tickets } = useTickets(eventId, true);

  // Mock data - substituir com dados reais da API
  const [dashboardData, setDashboardData] = useState<{
    netRevenue: number;
    netRevenueChange: number;
    averageTicket: number;
    averageTicketChange: number;
    totalRegistrations: number;
    totalRegistrationsChange: number;
    cancellations: number;
    cancellationsStatus: string;
    refunds: number;
    refundsStatus: string;
    registrationsTrend: {
      amount: number;
      change: number;
      confirmed: number;
      canceled: number;
      refunded: number;
      chartData: {
        labels: string[];
        revenue: number[];
      };
    };
    ticketRanking: Array<{
      name: string;
      category: string;
      quantity: number;
      total: number;
    }>;
    topCities: Array<{
      city: string;
      buyers: number;
    }>;
    lotsNearDepletion: Array<{
      name: string;
      status: "Normal" | "Atenção" | "Crítico";
      sold: number;
      total: number;
      remaining: number;
    }>;
    salesHeatmap: SalesHeatmapData[];
    dailyData: any[];
  }>({
    netRevenue: 0,
    netRevenueChange: 0,
    averageTicket: 0,
    averageTicketChange: 0,
    totalRegistrations: 0,
    totalRegistrationsChange: 0,
    cancellations: 0,
    cancellationsStatus: "Normal",
    refunds: 0,
    refundsStatus: "Normal",
    registrationsTrend: {
      amount: 0,
      change: 0,
      confirmed: 0,
      canceled: 0,
      refunded: 0,
      chartData: {
        labels: [],
        revenue: [],
      },
    },
    ticketRanking: [],
    topCities: [],
    lotsNearDepletion: [],
    salesHeatmap: [],
    dailyData: [],
  });

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
  }, [authChecked, eventId, periodFilter, selectedTicketIds]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [eventData, dashboardDataResponse] = await Promise.all([
        organizerService.getEventById(eventId),
        organizerService.getEventDashboard(eventId, {
          period: periodFilter as "geral" | "24h" | "7d" | "15d" | "1m" | "2m",
          ticketIds: selectedTicketIds.length > 0 ? selectedTicketIds : undefined,
        }),
      ]);
      setEvent(eventData);
      setDashboardData({
        netRevenue: dashboardDataResponse.metrics.netRevenue,
        netRevenueChange: dashboardDataResponse.metrics.netRevenueChange,
        averageTicket: dashboardDataResponse.metrics.averageTicket,
        averageTicketChange: dashboardDataResponse.metrics.averageTicketChange,
        totalRegistrations: dashboardDataResponse.metrics.totalRegistrations,
        totalRegistrationsChange: dashboardDataResponse.metrics.totalRegistrationsChange,
        cancellations: dashboardDataResponse.metrics.cancellations,
        cancellationsStatus: dashboardDataResponse.metrics.cancellationsStatus,
        refunds: dashboardDataResponse.metrics.refunds,
        refundsStatus: dashboardDataResponse.metrics.refundsStatus,
        registrationsTrend: {
          amount: dashboardDataResponse.registrationsTrend.amount,
          change: dashboardDataResponse.registrationsTrend.change,
          confirmed: dashboardDataResponse.registrationsTrend.confirmed,
          canceled: dashboardDataResponse.registrationsTrend.canceled,
          refunded: dashboardDataResponse.registrationsTrend.refunded,
          chartData: dashboardDataResponse.registrationsTrend.chartData,
        },
        ticketRanking: dashboardDataResponse.ticketRanking.map((t) => ({
          name: t.name,
          category: t.category,
          quantity: t.quantity,
          total: t.total,
        })),
        topCities: dashboardDataResponse.topCities.map((c) => ({
          city: c.city,
          buyers: c.buyers,
        })),
        lotsNearDepletion: dashboardDataResponse.lotsNearDepletion.map((l) => ({
          name: l.name,
          status: l.status,
          sold: l.sold,
          total: l.total,
          remaining: l.remaining,
        })),
        salesHeatmap: dashboardDataResponse.salesHeatmap,
        dailyData: [],
      });
    } catch (error: any) {
      console.error("Error loading data:", error);
      toast.error("Erro ao carregar dados");
      // Não redirecionar, apenas mostrar erro - manter dados mockados como fallback
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-2 flex items-center justify-center">
        <Loading />
      </div>
    );
  }

  const tabs = [
    { label: "Editar", href: `/organizer/events/${eventId}/edit` },
    { label: "Pedidos", href: `/organizer/events/${eventId}/registrations` },
    { label: "Dashboard", href: `/organizer/events/${eventId}/dashboard`, active: true },
    { label: "Financeiro", href: `/organizer/events/${eventId}/financial` },
  ];

  const periodOptions = [
    { value: "geral", label: "Geral" },
    { value: "24h", label: "Hoje" },
    { value: "7d", label: "7D" },
    { value: "15d", label: "15D" },
    { value: "1m", label: "1M" },
    { value: "2m", label: "2M" },
  ];

  const getTicketButtonLabel = () => {
    if (selectedTicketIds.length === 0) {
      return "Todos os ingressos";
    }
    if (selectedTicketIds.length === 1) {
      const ticket = tickets.find((t) => t.id === selectedTicketIds[0]);
      return ticket?.name || "1 ingresso selecionado";
    }
    return `${selectedTicketIds.length} ingressos selecionados`;
  };

  return (
    <div className="min-h-screen bg-gray-2">
      <EventPageHeader eventName={event?.name} tabs={tabs} />
      <div className="max-w-7xl mx-auto px-4 lg:px-0">
        {/* Title and Description */}
        <div className="mb-6 flex items-center justify-between w-full">
          <div>
            <h1 className="font-manrope font-bold text-[20px] leading-[1.3] text-gray-12 mb-2">
              Dashboard
            </h1>
            <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-11">
              Acompanhe o desempenho do seu evento em tempo real
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-8 flex items-center gap-3">
          {/* Period Filter - Segment Buttons */}
          <div className="bg-gray-3 flex items-center p-1 rounded-lg h-[48px]">
            {periodOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setPeriodFilter(option.value)}
                className={`px-4 py-2 rounded-lg text-[14px] font-family-dm-sans border transition-all ease-in-out cursor-pointer duration-200 font-medium h-[40px] flex items-center ${periodFilter === option.value
                  ? "bg-gray-1 border-gray-6 text-gray-12"
                  : "text-gray-11 hover:text-gray-12 border-transparent"
                  }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          {/* Ticket Filter Button */}
          <button
            onClick={() => setIsTicketModalOpen(true)}
            className="flex items-center gap-2 px-4 py-3 rounded-lg border border-gray-6 bg-gray-1 text-gray-12 hover:bg-gray-3 transition-colors cursor-pointer min-w-[187px] h-[48px]"
          >
            <span className="text-[14px] font-family-dm-sans font-normal flex-1 text-left">{getTicketButtonLabel()}</span>
            <ArrowButton />
          </button>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-4 gap-3 mb-8 w-full">
          {/* Receita Líquida */}
          <div className="bg-gray-1 border border-gray-6 rounded-lg h-[133px] flex flex-col">
            <div className="flex items-center justify-between px-4 pt-3 pb-2 h-[44px]">
              <p className="font-family-dm-sans font-normal text-[16px] text-gray-11">Receita Líquida</p>
              <div className="w-[28px] h-[28px] p-1 rounded-lg bg-primary-4 flex items-center justify-center">
                <DollarSign className="size-5 text-gray-12" />
              </div>
            </div>
            <div className="px-4 h-[49px] flex items-center">
              <p className="font-manrope font-bold text-[24px] leading-[1.1] text-gray-12">
                R$ {(dashboardData.netRevenue / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="px-4 pb-3 pt-1 h-[40px] flex items-center gap-2">
              {dashboardData.netRevenueChange >= 0 ? (
                <ArrowUp className="size-6 text-primary-11" />
              ) : (
                <ArrowDown className="size-6 text-red-11" />
              )}
              <span className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-primary-11">
                {Math.abs(dashboardData.netRevenueChange)}% vs. semana passada
              </span>
            </div>
          </div>

          {/* Ticket Médio */}
          <div className="bg-gray-1 border border-gray-6 rounded-lg h-[133px] flex flex-col">
            <div className="flex items-center justify-between px-4 pt-3 pb-2 h-[44px]">
              <p className="font-family-dm-sans font-normal text-[16px] text-gray-11">Ticket Médio</p>
              <div className="w-[28px] h-[28px] p-1 rounded-lg bg-primary-4 flex items-center justify-center">
                <TrendingUp className="size-5 text-gray-12" />
              </div>
            </div>
            <div className="px-4 h-[49px] flex items-center">
              <p className="font-manrope font-bold text-[24px] leading-[1.1] text-gray-12">
                R$ {(dashboardData.averageTicket / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="px-4 pb-3 pt-1 h-[40px] flex items-center gap-2">
              {dashboardData.averageTicketChange >= 0 ? (
                <ArrowUp className="size-6 text-primary-11" />
              ) : (
                <ArrowDown className="size-6 text-red-11" />
              )}
              <span className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-primary-11">
                {Math.abs(dashboardData.averageTicketChange)}% vs. semana passada
              </span>
            </div>
          </div>

          {/* Total de Inscrições */}
          <div className="bg-gray-1 border border-gray-6 rounded-lg h-[133px] flex flex-col">
            <div className="flex items-center justify-between px-4 pt-3 pb-2 h-[44px]">
              <p className="font-family-dm-sans font-normal text-[16px] text-gray-11">Total de Inscrições</p>
              <div className="w-[28px] h-[28px] p-1 rounded-lg bg-primary-4 flex items-center justify-center">
                <Users className="size-5 text-gray-12" />
              </div>
            </div>
            <div className="px-4 h-[49px] flex items-center">
              <p className="font-manrope font-bold text-[24px] leading-[1.1] text-gray-12">
                {dashboardData.totalRegistrations.toLocaleString("pt-BR")}
              </p>
            </div>
            <div className="px-4 pb-3 pt-1 h-[40px] flex items-center gap-2">
              <ArrowUp className="size-6 text-primary-11" />
              <span className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-primary-11">
                {dashboardData.totalRegistrationsChange}% vs. semana passada
              </span>
            </div>
          </div>

          {/* Cancelamentos / Estornos */}
          <div className="bg-gray-1 border border-gray-6 rounded-lg h-[133px] flex flex-col">
            <div className="flex items-center justify-between px-4 pt-3 pb-2 h-[44px]">
              <p className="font-family-dm-sans font-normal text-[16px] text-gray-11">Cancelamentos / Estornos</p>
              <div className="w-[28px] h-[28px] p-1 rounded-lg bg-primary-4 flex items-center justify-center">
                <XCircle className="size-5 text-gray-12" />
              </div>
            </div>
            <div className="flex-1 flex">
              <div className="flex-1 flex flex-col border-r border-gray-6">
                <div className="px-4 pt-4 pb-3 h-[49px] flex items-start">
                  <p className="font-manrope font-bold text-[24px] leading-[1.1] text-gray-12">
                    {dashboardData.cancellations}
                  </p>
                </div>
                <div className="px-4 pb-3 pt-1 flex-1 flex items-center">
                  <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-11">
                    Cancelados
                  </p>
                </div>
              </div>
              <div className="flex-1 flex flex-col">
                <div className="px-4 pt-4 pb-3 h-[49px] flex items-start">
                  <p className="font-manrope font-bold text-[24px] leading-[1.1] text-gray-12">
                    {dashboardData.refunds}
                  </p>
                </div>
                <div className="px-4 pb-3 pt-1 flex-1 flex items-center">
                  <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-11">
                    Estornos
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="flex gap-3 mb-8 w-full">
          {/* Tendência de Inscrições */}
          <div className="bg-gray-1 border border-gray-6 rounded-lg p-4 w-3/4">
            <div className="mb-4">
              <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-11">Tendência de inscrições</p>
            </div>
            <div className="flex items-center gap-3 mb-4">
              <p className="font-manrope font-bold text-[24px] leading-[1.1] text-gray-12">
                R$ {(dashboardData.registrationsTrend.amount / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <div className="flex items-center gap-1">
                <ArrowUp className="size-6 text-primary-11" />
                <span className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-primary-11">
                  {dashboardData.registrationsTrend.change}% vs. semana passada
                </span>
              </div>
            </div>
            <div className="h-[316px]">
              <RevenueChart
                data={{
                  labels: dashboardData.registrationsTrend.chartData?.labels || ["Jan", "Fev", "Mar", "Abr"],
                  revenue: dashboardData.registrationsTrend.chartData?.revenue?.map((val: number) => val / 100) || [4000, 12000, 8000, 10000],
                }}
              />
            </div>
          </div>

          {/* Ranking de Ingressos */}
          <div className="bg-gray-1 border border-gray-6 rounded-lg">
            <div className="px-4 py-5 border-b border-gray-6 flex items-center justify-between">
              <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-11">Ranking de ingressos</p>
              <button className="text-[14px] font-family-dm-sans font-semibold text-gray-11 hover:text-gray-12 underline">
                Ver mais
              </button>
            </div>
            <div>
              {/* Header */}
              <div className="grid grid-cols-[199px_81px_112px] border-b border-t border-gray-6 bg-gray-4">
                <div className="px-4 py-4">
                  <p className="font-inter font-medium text-[14px] leading-[1.3] text-gray-12">Nome</p>
                </div>
                <div className="px-4 py-4 flex items-center justify-center">
                  <p className="font-inter font-medium text-[14px] leading-[1.3] text-gray-12">QT</p>
                </div>
                <div className="px-4 py-4 flex items-center justify-end">
                  <p className="font-inter font-medium text-[14px] leading-[1.3] text-gray-12">Total</p>
                </div>
              </div>
              {/* Rows */}
              {dashboardData.ticketRanking.map((ticket, index) => (
                <div
                  key={index}
                  className="grid grid-cols-[199px_81px_112px] border-b border-gray-6 last:border-b-0 bg-gray-1"
                >
                  <div className="px-4 py-3 flex flex-col gap-2 justify-center">
                    <p className="font-family-dm-sans font-normal text-[14px] leading-[1.3] text-gray-11 overflow-hidden text-ellipsis whitespace-nowrap">{ticket.category}</p>
                    <p className="font-family-dm-sans font-semibold text-[14px] leading-[1.3] text-gray-12 overflow-hidden text-ellipsis whitespace-nowrap">{ticket.name}</p>
                  </div>
                  <div className="px-4 py-3 flex items-center justify-center">
                    <p className="font-inter font-semibold text-[14px] leading-[1.3] text-gray-12">{ticket.quantity.toLocaleString("pt-BR")}</p>
                  </div>
                  <div className="px-4 py-3 flex items-center justify-end">
                    <p className="font-inter font-semibold text-[14px] leading-[1.3] text-gray-12">
                      R$ {(ticket.total / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Cities Section */}
        <div className="grid grid-cols-2 gap-3 mb-8 w-full">
          {dashboardData.topCities.map((city, index) => {
            const isFirst = index === 0;
            return (
              <div
                key={index}
                className={`${isFirst ? "bg-primary-2 border-primary-6" : "bg-blue-2 border-blue-6"} border rounded-lg p-3`}
              >
                <div className={`inline-block px-2 py-1 rounded text-[14px] font-family-dm-sans font-medium mb-2 ${isFirst ? "bg-primary-5 text-primary-12" : "bg-blue-5 text-blue-12"}`}>
                  {isFirst ? "1º Cidade com mais vendas" : "2º Cidade com mais vendas"}
                </div>
                <p className="font-family-dm-sans font-semibold text-[16px] text-gray-12 mb-2">{city.city}</p>
                <p className="font-family-dm-sans font-normal text-[14px] text-gray-11">
                  QT de compradores: <span className="font-family-dm-sans font-semibold text-[14px] leading-[1.3] text-gray-12">{city.buyers}</span>
                </p>
              </div>
            )
          })}
        </div>

        {/* Bottom Section */}
        <div className="grid grid-cols-[392px_1fr] gap-3 w-full">
          {/* Lotes Próximos de Esgotamento */}
          <div className="bg-gray-1 border border-gray-6 rounded-lg">
            <div className="px-4 py-5 border-b border-gray-6 flex items-center justify-between">
              <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-11">Lotes próximos de esgotamento</p>
              <button className="text-[14px] font-family-dm-sans font-semibold text-gray-11 hover:text-gray-12 underline">
                Ver mais
              </button>
            </div>
            <div>
              {dashboardData.lotsNearDepletion.map((lot, index) => {
                const percentage = (lot.sold / lot.total) * 100;
                const getStatusColor = (status: string) => {
                  if (status === "Crítico") return "bg-red-11";
                  if (status === "Atenção") return "bg-yellow-11";
                  return "bg-gray-11";
                };
                return (
                  <div key={index} className="px-4 py-2 border-b border-gray-6 last:border-b-0">
                    <div className="flex items-center justify-between mb-4">
                      <p className="font-family-dm-sans font-semibold text-[16px] leading-[1.2] text-gray-12">{lot.name}</p>
                      <div className={`px-2 py-1 rounded ${getStatusColor(lot.status)} text-[14px] font-family-dm-sans font-normal text-gray-1`}>
                        {lot.status}
                      </div>
                    </div>
                    <div className="mb-2">
                      <div className="relative h-3 bg-gray-6 rounded-full overflow-hidden">
                        <div
                          className={`absolute left-0 top-0 h-full rounded-full ${getStatusColor(lot.status)}`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-family-dm-sans font-normal text-[14px] leading-[1.3] text-gray-11">Restantes: </span>
                        <span className="font-family-dm-sans font-semibold text-[14px] leading-[1.3] text-gray-12">{lot.remaining}</span>
                      </div>
                      <div>
                        <span className="font-family-dm-sans font-normal text-[14px] leading-[1.3] text-gray-11">Total: </span>
                        <span className="font-family-dm-sans font-semibold text-[14px] leading-[1.3] text-gray-12">{lot.total}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Heatmap de Dias e Horários */}
          <div className="bg-gray-1 border border-gray-6 rounded-lg">
            <SalesHeatmap />
          </div>
        </div>
      </div>

      {/* Modal de seleção de ingressos */}
      <SelectTicketsFilterModal
        isOpen={isTicketModalOpen}
        onClose={() => setIsTicketModalOpen(false)}
        onConfirm={(ids) => setSelectedTicketIds(ids)}
        eventId={eventId}
        selectedTicketIds={selectedTicketIds}
      />
    </div>
  );
}
