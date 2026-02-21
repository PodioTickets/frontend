"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { organizerService, userService } from "@/services";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { mockRegistrations } from "@/constants";
import {
  Search,
  Users,
  Eye,
  CheckCircle,
  XCircle,
  FileText,
  ShoppingCart,
  TrendingUp,
  DollarSign,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { DateRangePicker } from "@/components/DateRangePicker";
import { Dropdown } from "@/components/Dropdown";
import type { DateRange } from "react-day-picker";
import { CalendarIcon } from "@/components/Icons/CalendarIcon";
import { SelectTicketsFilterModal } from "@/components/Registrations/SelectTicketsFilterModal";
import { useTickets } from "@/hooks/useTickets";
import { TicketIcon } from "@/components/Icons/TicketIcon";
import { ArrowButton } from "@/components/ArrowButton";
import { CartIcon } from "@/components/Icons/CartIcon";
import { CheckIcon } from "@/components/Icons/Organizer/CheckIcon";
import { ClockIcon } from "@/components/Icons/Organizer/ClockIcon";
import { DolarIcon } from "@/components/Icons/Organizer/DolarIcon";
import { Loading } from "@/components/Loading";
import { useViewRegistrationModal, useExportDataModal, usePaymentDetailsModal } from "@/stores/modalStore";
import { EventPageHeader } from "@/components/Organizer/EventPageHeader";

export default function EventRegistrationsPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [authChecked, setAuthChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<any>(null);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedTicketIds, setSelectedTicketIds] = useState<string[]>([]);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const { tickets } = useTickets(eventId, true);
  const { openViewRegistrationModal } = useViewRegistrationModal();
  const { openExportDataModal } = useExportDataModal();
  const { openPaymentDetailsModal } = usePaymentDetailsModal();
  const [stats, setStats] = useState({
    total: 0,
    paid: 0,
    cancelled: 0,
    totalCollected: 0,
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });

  useEffect(() => {
    // Aguarda a verificação de autenticação terminar
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
  }, [authChecked, eventId, statusFilter, pagination.page, dateRange, selectedTicketIds]);

  const loadData = async () => {
    try {
      setLoading(true);
      let eventData: any = null;
      let registrationsData: { registrations: any[]; pagination: any } = {
        registrations: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 1 },
      };

      try {
        [eventData, registrationsData] = await Promise.all([
          organizerService.getEventById(eventId),
          organizerService.getEventRegistrations(eventId, {
            page: pagination.page,
            limit: pagination.limit,
            status: statusFilter !== "all" ? statusFilter : undefined,
          }),
        ]);
      } catch (apiError) {
        // Usar mocks quando API falhar
        eventData = { id: eventId, name: "Evento de Exemplo" };
        registrationsData = { registrations: [], pagination: {} };
      }

      setEvent(eventData || { id: eventId, name: "Evento de Exemplo" });

      const regs = registrationsData.registrations || [];
      if (regs.length === 0) {
        // Usar mocks quando não houver inscrições (API vazia ou falhou)
        const filteredMocks =
          statusFilter === "all"
            ? mockRegistrations
            : mockRegistrations.filter((r) => r.status === statusFilter);
        setRegistrations(filteredMocks);
        setPagination({
          page: 1,
          limit: 20,
          total: filteredMocks.length,
          totalPages: Math.ceil(filteredMocks.length / 20) || 1,
        });

        // Calcular estatísticas dos mocks
        const total = filteredMocks.length;
        const paid = filteredMocks.filter((r) => r.status === "CONFIRMED" || r.status === "COMPLETED").length;
        const cancelled = filteredMocks.filter((r) => r.status === "CANCELLED").length;
        const totalCollected = filteredMocks
          .filter((r) => r.status === "CONFIRMED" || r.status === "COMPLETED")
          .reduce((sum, r) => sum + (r.finalAmount || 0), 0);
        setStats({ total, paid, cancelled, totalCollected });
      } else {
        setRegistrations(regs);
        setPagination(registrationsData.pagination || pagination);

        // Calcular estatísticas dos dados reais
        const total = regs.length;
        const paid = regs.filter((r) => r.status === "CONFIRMED" || r.status === "COMPLETED").length;
        const cancelled = regs.filter((r) => r.status === "CANCELLED").length;
        const totalCollected = regs
          .filter((r) => r.status === "CONFIRMED" || r.status === "COMPLETED")
          .reduce((sum, r) => sum + (r.finalAmount || 0), 0);
        setStats({ total, paid, cancelled, totalCollected });
      }
    } catch (error: any) {
      console.error("Error loading data:", error);
      setEvent({ id: eventId, name: "Evento de Exemplo" });
      setRegistrations(mockRegistrations);
      setPagination({
        page: 1,
        limit: 20,
        total: mockRegistrations.length,
        totalPages: 1,
      });

      // Calcular estatísticas dos mocks em caso de erro
      const total = mockRegistrations.length;
      const paid = mockRegistrations.filter((r) => r.status === "CONFIRMED" || r.status === "COMPLETED").length;
      const cancelled = mockRegistrations.filter((r) => r.status === "CANCELLED").length;
      const totalCollected = mockRegistrations
        .filter((r) => r.status === "CONFIRMED" || r.status === "COMPLETED")
        .reduce((sum, r) => sum + (r.finalAmount || 0), 0);
      setStats({ total, paid, cancelled, totalCollected });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<
      string,
      { label: string; className: string; icon: any }
    > = {
      CONFIRMED: {
        label: "Confirmada",
        className: "bg-green-10/20 text-green-11",
        icon: CheckCircle,
      },
      CANCELLED: {
        label: "Cancelada",
        className: "bg-red-10/20 text-red-11",
        icon: XCircle,
      },
      COMPLETED: {
        label: "Concluída",
        className: "bg-blue-10/20 text-blue-11",
        icon: CheckCircle,
      },
      CHARGEBACK: {
        label: "Charge-back",
        className: "bg-orange-10/20 text-orange-11",
        icon: XCircle,
      },
      REFUNDED: {
        label: "Estornado",
        className: "bg-purple-10/20 text-purple-11",
        icon: XCircle,
      },
    };
    return statusMap[status] || statusMap.PENDING;
  };

  const filteredRegistrations = registrations.filter((reg) => {
    const searchLower = searchTerm.toLowerCase().trim();

    // Se não há termo de busca, retorna true
    if (!searchLower) return true;

    const userName = `${reg.user?.firstName || ""} ${reg.user?.lastName || ""}`.toLowerCase();
    // CPF pode estar em documentNumber ou cpf
    const cpf = reg.user?.documentNumber || reg.user?.cpf || "";
    const cpfNumbers = cpf.replace(/\D/g, ""); // Remove formatação do CPF (apenas números)
    const cpfFormatted = cpf.toLowerCase(); // CPF com formatação original
    const orderId = reg.id?.toLowerCase() || "";

    // Buscar por nome do ticket nas modalidades
    const ticketNames = reg.modalities
      ?.map((m: any) => m.modality?.name?.toLowerCase() || "")
      .join(" ") || "";

    // Extrair números do termo de busca
    const searchNumbers = searchLower.replace(/\D/g, "");

    // Busca por CPF: funciona com busca parcial tanto em números quanto com formatação
    const matchesCPF =
      (searchNumbers.length > 0 && cpfNumbers.length > 0 && cpfNumbers.includes(searchNumbers)) || // Busca por números (ex: "123" encontra "12345678900")
      (cpfFormatted.length > 0 && cpfFormatted.includes(searchLower)); // Busca com formatação (ex: "123.456" encontra "123.456.789-00")

    const matchesSearch =
      userName.includes(searchLower) ||
      matchesCPF ||
      orderId.includes(searchLower) ||
      ticketNames.includes(searchLower);

    const matchesStatus = statusFilter === "all" || reg.status === statusFilter;

    // Date range filter - only filter when both dates are selected and different
    const matchesDateRange = !dateRange?.from || !dateRange?.to || dateRange.from.getTime() === dateRange.to.getTime()
      ? true
      : (() => {
        if (!reg.purchaseDate) return false;
        const purchaseDate = new Date(reg.purchaseDate);
        const fromDate = new Date(dateRange.from!);
        fromDate.setHours(0, 0, 0, 0);
        const toDate = new Date(dateRange.to!);
        toDate.setHours(23, 59, 59, 999);
        purchaseDate.setHours(0, 0, 0, 0);
        return purchaseDate >= fromDate && purchaseDate <= toDate;
      })();

    const matchesTickets = selectedTicketIds.length === 0 || (() => {
      if ((reg as any).ticketId) {
        return selectedTicketIds.includes((reg as any).ticketId);
      }
      if (!reg.modalities || reg.modalities.length === 0) return false;
      const selectedTickets = tickets.filter(t => selectedTicketIds.includes(t.id));
      if (selectedTickets.length === 0) return false;
      return reg.modalities.some((regMod: any) =>
        selectedTickets.some(ticket =>
          ticket.name === regMod.modality?.name ||
          ticket.modality === regMod.modality?.name ||
          ticket.id === regMod.modality?.id
        )
      );
    })();

    return matchesSearch && matchesStatus && matchesDateRange && matchesTickets;
  });

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
          { label: "Editar", href: `/organizer/events/${eventId}/edit` },
          { label: "Pedidos", href: `/organizer/events/${eventId}/registrations`, active: true },
          { label: "Dashboard", href: `/organizer/events/${eventId}/dashboard` },
          { label: "Financeiro", href: `/organizer/events/${eventId}/financial` },
        ]}
      />
      <div className="max-w-7xl mx-auto px-4 lg:px-0">
        {/* Page Title */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-12 mb-2">Inscrições</h1>
          <p className="text-gray-11">
            Gerencie todos os projetos e pagamentos deste evento
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Total de inscrições */}
          <div className="bg-gray-1 rounded-lg px-4 py-3 border border-gray-6">
            <div className="mb-2">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-11 mb-1">Total de inscrições</p>
                <div className="w-[28px] h-[28px] p-1 rounded-lg bg-blue-3 flex items-center justify-center">
                  <CartIcon className="size-5 text-blue-12" />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-12">{stats.total.toLocaleString()}</p>
            </div>
            <div className="flex items-center gap-1 text-sm text-primary-11">
              <TrendingUp className="size-4" />
              <span>12% vs. semana passada</span>
            </div>
          </div>

          {/* Pagos */}
          <div className="bg-gray-1 -lg-lg px-4 py-3 border border-gray-6">
            <div className="mb-2">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-11 mb-1">Pagos</p>
                <div className="w-[28px] h-[28px] p-1 rounded-lg bg-primary-4 flex items-center justify-center">
                  <CheckIcon className="size-5 text-gray-12" />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-12">{stats.paid.toLocaleString()}</p>
            </div>
            <div className="flex items-center gap-1 text-sm text-primary-11">
              <TrendingUp className="size-4" />
              <span>12% vs. semana passada</span>
            </div>
          </div>

          {/* Cancelados */}
          <div className="bg-gray-1 rounded-lg px-4 py-3 border border-gray-6">
            <div className="mb-2">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-11 mb-1">Cancelados</p>
                <div className="w-[28px] h-[28px] p-1 rounded-lg bg-yellow-10/20 flex items-center justify-center">
                  <ClockIcon className="size-5 text-yellow-11" />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-12">{stats.cancelled.toLocaleString()}</p>
            </div>
            <div className="flex items-center gap-1 text-sm text-primary-11">
              <TrendingUp className="size-4" />
              <span>12% vs. semana passada</span>
            </div>
          </div>

          {/* Total arrecadado */}
          <div className="bg-gray-1 rounded-lg px-4 py-3 border border-gray-6">
            <div className="mb-2">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-11 mb-1">Total arrecadado</p>
                <div className="w-[28px] h-[28px] p-1 rounded-lg bg-gray-3 flex items-center justify-center">
                  <DolarIcon className="size-5 text-gray-12" />
                </div>
              </div>

              <p className="text-2xl font-bold text-gray-12">
                R$ {stats.totalCollected.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="flex items-center gap-1 text-sm text-primary-11">
              <TrendingUp className="size-4" />
              <span>12% vs. semana passada</span>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4 items-center p-4 bg-gray-1 rounded-lg border border-gray-6">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-11" />
            <Input
              type="text"
              placeholder="Nome, CPF, ID do pedido, ticket..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-[46px]"
            />
          </div>

          {/* Status Filter */}
          <Dropdown
            dataAttribute="status-filter"
            width="w-auto"
            maxHeight="max-h-[300px]"
            className="top-full mt-2"
            align="start"
            options={[
              { id: "all", label: "Todos" },
              { id: "COMPLETED", label: "Concluída", icon: CheckCircle },
              { id: "CANCELLED", label: "Cancelado", icon: XCircle },

              { id: "CHARGEBACK", label: "Charge-back", icon: XCircle },
              { id: "REFUNDED", label: "Estornado", icon: XCircle },
            ]}
            selectedIds={statusFilter !== "all" ? [statusFilter] : []}
            onSelect={(option) => {
              setStatusFilter(option.id || "all");
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            trigger={() => {
              const getStatusLabel = () => {
                const statusMap: Record<string, string> = {
                  all: "Status: Todos",
                  PENDING: "Status: Pendente",
                  CONFIRMED: "Status: Pago",
                  CANCELLED: "Status: Cancelado",
                  COMPLETED: "Status: Concluída",
                  CHARGEBACK: "Status: Charge-back",
                  REFUNDED: "Status: Estornado",
                };
                return statusMap[statusFilter] || "Status: Todos";
              };

              return (
                <div className="flex items-center gap-2 px-4 py-3 rounded-lg border border-gray-6 bg-gray-1 text-gray-12 hover:bg-gray-3 transition-colors cursor-pointer min-w-[140px]">
                  <span className="text-sm flex-1 text-left">{getStatusLabel()}</span>
                  <ArrowButton />
                </div>
              );
            }}
          />

          {/* Ticket Filter */}
          <button
            onClick={() => setIsTicketModalOpen(true)}
            className="flex items-center gap-2 px-4 py-3 rounded-lg border border-gray-6 bg-gray-1 text-gray-12 hover:bg-gray-3 transition-colors cursor-pointer min-w-[140px]"
          >
            <TicketIcon className="size-4 shrink-0" />
            <span className="text-sm flex-1 text-left">
              {selectedTicketIds.length === 0
                ? "Selecionar ingresso"
                : `${selectedTicketIds.length} ingresso${selectedTicketIds.length > 1 ? "s" : ""} selecionado${selectedTicketIds.length > 1 ? "s" : ""}`}
            </span>
            <ArrowButton />
          </button>

          {/* Date Filter */}
          <Dropdown
            dataAttribute="date-range"
            width="w-auto"
            maxHeight="max-h-[500px]"
            className="top-full mt-2 right-0"
            align="end"
            trigger={() => {
              const formatDateRange = () => {
                if (!dateRange?.from) {
                  return "Data: Recentes";
                }

                const formatDate = (date: Date) => {
                  return new Intl.DateTimeFormat("pt-BR", {
                    day: "2-digit",
                    month: "short",
                  }).format(date);
                };

                if (dateRange.from && dateRange.to) {
                  return `Data: ${formatDate(dateRange.from)} - ${formatDate(dateRange.to)}`;
                }

                return `Data: ${formatDate(dateRange.from)}`;
              };

              return (
                <div className="flex items-center gap-2 px-4 py-3 rounded-lg border border-gray-6 bg-gray-1 text-gray-12 hover:bg-gray-3 transition-colors cursor-pointer min-w-[140px]">
                  <CalendarIcon className="size-4 shrink-0" />
                  <span className="text-sm flex-1 text-left">{formatDateRange()}</span>
                  <ArrowButton />
                </div>
              );
            }}
          >
            <DateRangePicker
              onSelect={(range) => {
                setDateRange(range);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              value={dateRange}
            />
          </Dropdown>
        </div>

        {/* Registrations List */}
        {filteredRegistrations.length === 0 ? (
          <div className="bg-gray-1 rounded-lg p-12 border border-gray-6 text-center">
            <Users className="size-12 text-gray-11 mx-auto mb-4" />
            <p className="text-gray-11 mb-4">
              {searchTerm || statusFilter !== "all"
                ? "Nenhuma inscrição encontrada"
                : "Nenhuma inscrição ainda"}
            </p>
          </div>
        ) : (
          <>
            <div className="bg-gray-2 border border-gray-6 rounded-lg overflow-hidden w-full">
              {/* Header */}
              <div className="bg-gray-4 border-b border-gray-6 flex h-[44px] items-center">
                <div className="flex h-full items-center p-4 w-[136px]">
                  <p className="font-inter font-medium leading-[1.3] text-sm text-gray-12">
                    ID do pedido
                  </p>
                </div>
                <div className="flex flex-1 h-full items-center min-h-px min-w-px p-4">
                  <p className="font-inter font-medium leading-[1.3] text-sm text-gray-12">
                    Cliente
                  </p>
                </div>
                <div className="flex flex-1 h-full items-center min-h-px min-w-px p-4">
                  <p className="font-inter font-medium leading-[1.3] text-sm text-gray-12">
                    Ingresso
                  </p>
                </div>
                <div className="flex h-full items-center p-4 w-[140px]">
                  <p className="font-inter font-medium leading-[1.3] text-sm text-gray-12">
                    Data compra
                  </p>
                </div>
                <div className="flex h-full items-center justify-center p-4 w-[120px]">
                  <p className="font-inter font-medium leading-[1.3] text-sm text-gray-12">
                    Valor
                  </p>
                </div>
                <div className="flex h-full items-center justify-center p-4 w-[120px]">
                  <p className="font-inter font-medium leading-[1.3] text-sm text-gray-12">
                    Status
                  </p>
                </div>
                <div className="flex h-full items-center justify-center p-4 w-[112px]">
                  <p className="font-inter font-medium leading-[1.3] text-sm text-gray-12">
                    Ações
                  </p>
                </div>
              </div>

              {/* Rows */}
              <div className="flex flex-col items-start w-full">
                {filteredRegistrations.map((registration) => {
                  const statusBadge = getStatusBadge(registration.status);
                  const isPaid = registration.status === "CONFIRMED" || registration.status === "COMPLETED";
                  const isCancelled = registration.status === "CANCELLED";

                  return (
                    <div
                      key={registration.id}
                      className="bg-gray-1 border-b border-gray-6 flex h-[52px] items-center justify-between w-full last:border-b-0 hover:bg-gray-2 transition-colors"
                    >
                      {/* ID do pedido */}
                      <div className="flex h-full items-center p-4 w-[136px]">
                        <p className="font-inter font-semibold leading-[1.3] text-sm text-gray-12">
                          #{registration.id?.slice(0, 6)}...{registration.id?.slice(-4)}
                        </p>
                      </div>

                      {/* Cliente */}
                      <div className="flex flex-1 h-full items-center gap-3 min-h-px min-w-px p-4">
                        <div className="relative shrink-0">
                          {/*  <Image
                            src={getAvatarUrl(registration.user?.avatarUrl)}
                            alt={`${registration.user?.firstName} ${registration.user?.lastName}`}
                            width={32}
                            height={32}
                            className="rounded-full object-cover"
                          /> */}
                          <div className="size-8 rounded-full bg-gray-6 flex items-center justify-center">
                            <span className="text-gray-12 font-semibold text-sm">
                              {registration.user?.firstName?.charAt(0).toUpperCase()}
                            </span>
                          </div>

                        </div>
                        <div className="flex flex-col min-w-0">
                          <p className="font-inter font-semibold leading-[1.3] text-sm text-gray-12 truncate">
                            {registration.user?.firstName}{" "}
                            {registration.user?.lastName}
                          </p>
                          <p className="font-family-dm-sans font-medium leading-[1.3] text-xs text-gray-11 truncate">
                            {registration.user?.email}
                          </p>
                        </div>
                      </div>

                      {/* Ticket */}
                      <div className="flex flex-1 h-full items-center min-h-px min-w-px p-4">
                        <p className="font-inter font-semibold leading-[1.3] text-sm text-gray-12">
                          {registration.modalities
                            ?.map((m: any) => m.modality?.name)
                            .join(", ") || "—"}
                        </p>
                      </div>

                      {/* Data compra */}
                      <div className="flex h-full items-center p-4 w-[140px]">
                        <p className="font-family-dm-sans font-medium leading-[1.3] text-sm text-gray-11">
                          {registration.purchaseDate
                            ? (() => {
                              const date = new Date(registration.purchaseDate);
                              const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
                              return `${date.getDate().toString().padStart(2, "0")} ${months[date.getMonth()]}, ${date.getFullYear()}`;
                            })()
                            : "—"}
                        </p>
                      </div>

                      {/* Valor */}
                      <div className="flex h-full items-center justify-center p-4 w-[120px]">
                        <p className="font-inter font-semibold leading-[1.3] text-sm text-gray-12 text-center">
                          R$ {registration.finalAmount?.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0,00"}
                        </p>
                      </div>

                      {/* Status */}
                      <div className="flex h-full items-center justify-center p-4 w-[120px]">
                        <span
                          className={`inline-flex items-center justify-center gap-1 px-3 py-1 rounded text-xs font-medium ${isPaid
                            ? "bg-primary-11 text-white"
                            : isCancelled
                              ? "bg-red-11 text-white"
                              : registration.status === "CHARGEBACK"
                                ? "bg-orange-11 text-white"
                                : registration.status === "REFUNDED"
                                  ? "bg-purple-11 text-white"
                                  : statusBadge.className
                            }`}
                        >
                          {isPaid
                            ? "Pago"
                            : isCancelled
                              ? "Cancelado"
                              : registration.status === "CHARGEBACK"
                                ? "Charge-back"
                                : registration.status === "REFUNDED"
                                  ? "Estornado"
                                  : statusBadge.label}
                        </span>
                      </div>

                      {/* Ações */}
                      <div className="flex gap-1 h-full items-center justify-center px-4 py-2 w-[112px]">
                        <button
                          onClick={() => {
                            openPaymentDetailsModal({
                              registration,
                            });
                          }}
                          className="bg-gray-2 border border-gray-6 rounded-lg size-8 flex items-center justify-center hover:bg-gray-3 transition-colors cursor-pointer"
                        >
                          <FileText className="size-4 text-gray-11" />
                        </button>
                        <button
                          onClick={() => {
                            openViewRegistrationModal({
                              registration,
                              registrations: filteredRegistrations,
                            });
                          }}
                          className="bg-gray-2 border border-gray-6 rounded-lg size-8 flex items-center justify-center hover:bg-gray-3 transition-colors cursor-pointer"
                        >
                          <Eye className="size-4 text-gray-11" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 py-4 px-5 border-t border-gray-6">
                  <button
                    onClick={() =>
                      setPagination((prev) => ({
                        ...prev,
                        page: prev.page - 1,
                      }))
                    }
                    disabled={pagination.page === 1}
                    className="size-8 flex items-center justify-center border border-gray-6 rounded-lg hover:bg-gray-3 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="size-4" />
                  </button>
                  {Array.from({ length: Math.min(pagination.totalPages, 8) }, (_, i) => {
                    const pageNum = i + 1;
                    const isActive = pageNum === pagination.page;
                    return (
                      <button
                        key={pageNum}
                        onClick={() =>
                          setPagination((prev) => ({
                            ...prev,
                            page: pageNum,
                          }))
                        }
                        className={`size-8 flex items-center justify-center border rounded-lg ${isActive
                          ? "bg-[#59E373] border-[#59E373] text-gray-12"
                          : "border-gray-6 hover:bg-gray-3"
                          }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  <button
                    onClick={() =>
                      setPagination((prev) => ({
                        ...prev,
                        page: prev.page + 1,
                      }))
                    }
                    disabled={pagination.page >= pagination.totalPages}
                    className="size-8 flex items-center justify-center border border-gray-6 rounded-lg hover:bg-gray-3 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="size-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Export Button */}
            <div className="mt-6 flex justify-end">
              <Button
                onClick={() => {
                  openExportDataModal({
                    registrations: filteredRegistrations,
                  });
                }}
                className="bg-[#59E373] text-[#141414] hover:bg-[#59E373]/90"
              >
                Exportar CSV
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Ticket Selection Modal */}
      <SelectTicketsFilterModal
        isOpen={isTicketModalOpen}
        onClose={() => setIsTicketModalOpen(false)}
        onConfirm={(ticketIds) => {
          setSelectedTicketIds(ticketIds);
          setPagination((prev) => ({ ...prev, page: 1 }));
        }}
        eventId={eventId}
        selectedTicketIds={selectedTicketIds}
      />
    </div>
  );
}

