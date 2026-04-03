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
  CheckCircle,
  XCircle,
  FileText,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
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
import { EventMobileHeader } from "@/components/Organizer/EventMobileHeader";
import Image from "next/image";
import { getAvatarUrl } from "@/utils/avatar";

// Função auxiliar para calcular o status final de um registro
function getFinalStatus(registration: any): string {
  const paymentStatus = registration.order?.payment?.status;
  const registrationStatus = registration.status;
  const paymentMetadata = registration.order?.payment?.metadata;
  const refundType = registration.order?.payment?.refundType;

  return paymentMetadata && refundType
    ? refundType === "REFUND" ? "REFUNDED" : refundType === "CHARGEBACK" ? "CHARGEBACK" : refundType
    : paymentStatus === "REFUNDED" || paymentStatus === "CHARGEBACK"
      ? paymentStatus
      : registrationStatus;
}

// Componente para linha de registro com gerenciamento de estado do avatar
function RegistrationRow({
  registration,
  onViewRegistration,
  onViewPaymentDetails,
  getStatusBadge
}: {
  registration: any;
  onViewRegistration: () => void;
  onViewPaymentDetails: () => void;
  getStatusBadge: (status: string) => { label: string; className: string; icon: any };
}) {
  const [imageError, setImageError] = useState(false);

  // Calcular o status final usando a função auxiliar
  const finalStatus = getFinalStatus(registration);
  const paymentStatus = registration.order?.payment?.status;
  const paymentMetadata = registration.order?.payment?.metadata;
  const refundType = registration.order?.payment?.refundType;

  const statusBadge = getStatusBadge(finalStatus);
  const isPaid = finalStatus === "CONFIRMED" || finalStatus === "COMPLETED" || paymentStatus === "PAID";
  const isCancelled = finalStatus === "CANCELLED" || paymentStatus === "FAILED";
  const isRefunded = finalStatus === "REFUNDED" || paymentStatus === "REFUNDED" || (paymentMetadata && refundType === "REFUND");
  const isChargeback = finalStatus === "CHARGEBACK" || paymentStatus === "CHARGEBACK" || (paymentMetadata && refundType === "CHARGEBACK");

  // Avatar com fallback para primeira letra
  const fullName = `${registration.user?.firstName || ""} ${registration.user?.lastName || ""}`.trim();
  const firstLetter = fullName ? fullName.charAt(0).toUpperCase() : "U";
  const hasAvatar = !!registration.user?.avatarUrl && !imageError;

  return (
    <div
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
        <div className="relative shrink-0 size-8 rounded-full overflow-hidden">
          {hasAvatar ? (
            <Image
              src={getAvatarUrl(registration.user?.avatarUrl ?? "") as string}
              alt={fullName || "User"}
              width={32}
              height={32}
              className="rounded-full object-cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="size-8 rounded-full bg-primary-10/20 flex items-center justify-center">
              <span className="text-primary-11 font-semibold text-sm">
                {firstLetter}
              </span>
            </div>
          )}
        </div>
        <div className="flex flex-col min-w-0">
          <p className="font-inter font-semibold leading-[1.3] text-sm text-gray-12 truncate">
            {registration.user?.firstName}{" "}
            {registration.user?.lastName && `${registration.user?.lastName} `}
          </p>
          <p className="font-family-dm-sans font-medium leading-[1.3] text-xs text-gray-11 truncate">
            {registration.user?.email}
          </p>
        </div>
      </div>

      {/* Ticket */}
      <div className="flex flex-1 h-full items-center w-[140px] p-4">
        <p className="font-inter font-semibold leading-[1.3] text-sm text-gray-12">
          <span className="text-gray-11 text-xs truncate max-w-[140px] block">
            {registration.ticket?.category?.name ?? "—"}
          </span>
          <span className="text-gray-12">
            {registration.ticket?.name ?? "—"}
          </span>
        </p>
      </div>

      {/* Data compra */}
      <div className="flex h-full items-center p-4 w-[140px]">
        <p className="font-family-dm-sans font-medium leading-[1.3] text-sm text-gray-12">
          <span>{registration.createdAt
            ? (() => {
              const date = new Date(registration.createdAt);
              const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
              return `${date.getDate().toString().padStart(2, "0")} ${months[date.getMonth()]}, ${date.getFullYear()}`;
            })()
            : "—"}</span>
        </p>
      </div>

      {/* Valor */}
      <div className="flex h-full items-center justify-center p-4 w-[120px]">
        <p className="font-inter font-semibold leading-[1.3] text-sm text-gray-12 text-center">
          R$ {(registration.ticket?.price
            ? (registration.ticket.price / 100).toLocaleString("pt-BR", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })
            : "0,00")}
        </p>
      </div>

      {/* Status */}
      <div className="flex h-full items-center justify-center text-center p-4 w-[120px]">
        <span
          className={`inline-flex items-center justify-center gap-1 px-3 py-1 rounded text-xs font-medium ${isPaid
            ? "bg-primary-11 text-white"
            : isCancelled
              ? "bg-red-11 text-white"
              : isChargeback
                ? "bg-red-11 text-white"
                : isRefunded
                  ? "bg-red-11 text-white"
                  : statusBadge?.className || "bg-gray-10/20 text-gray-11"
            }`}
        >
          {isPaid
            ? "Pago"
            : isCancelled
              ? "Cancelado"
              : isChargeback
                ? "ChargeBack"
                : isRefunded
                  ? "Estornado"
                  : statusBadge?.label || "Desconhecido"}
        </span>
      </div>

      {/* Ações */}
      <div className="flex gap-1 h-full items-center justify-center px-4 py-2 w-[112px]">
        <button
          onClick={onViewPaymentDetails}
          className="bg-gray-2 border border-gray-6 rounded-lg size-8 flex items-center justify-center hover:bg-gray-3 transition-colors cursor-pointer"
        >
          <FileText className="size-4 text-gray-11" />
        </button>
        <button
          onClick={onViewRegistration}
          className="bg-gray-2 border border-gray-6 rounded-lg size-8 flex items-center justify-center hover:bg-gray-3 transition-colors cursor-pointer"
        >
          <TicketIcon className="size-4 text-gray-11" />
        </button>
      </div>
    </div>
  );
}

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
  const [appliedDateRange, setAppliedDateRange] = useState<DateRange | undefined>(undefined);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
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
      router.push("/organizer/login");
      return;
    }

    if (!authChecked) {
      setAuthChecked(true);
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!authChecked || authLoading || !eventId) return;
    // Debounce search term
    const timeoutId = setTimeout(() => {
      loadData();
    }, searchTerm ? 500 : 0);

    return () => clearTimeout(timeoutId);
  }, [authChecked, eventId, statusFilter, pagination.page, appliedDateRange, selectedTicketIds, searchTerm]);

  const loadData = async () => {
    try {
      setLoading(true);
      let eventData: any = null;
      let registrationsData: { registrations: any[]; pagination: any } = {
        registrations: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 1 },
      };

      try {
        const [eventData, registrationsData] = await Promise.all([
          organizerService.getEventById(eventId),
          organizerService.getEventRegistrationsEnhanced(eventId, {
            page: pagination.page,
            limit: pagination.limit,
            status: statusFilter !== "all" ? statusFilter as any : undefined,
            search: searchTerm || undefined,
            ticketIds: selectedTicketIds.length > 0 ? selectedTicketIds : undefined,
            startDate: appliedDateRange?.from?.toISOString(),
            endDate: appliedDateRange?.to?.toISOString(),
          }),
        ]);

        setEvent(eventData || { id: eventId, name: "Evento de Exemplo" });
        setRegistrations(registrationsData.registrations);
        setPagination(registrationsData.pagination);
        setStats(registrationsData.stats);
      } catch (apiError) {
        // Usar mocks quando API falhar
        const eventData = { id: eventId, name: "Evento de Exemplo" };
        setEvent(eventData);

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
        label: "ChargeBack",
        className: "bg-red-10 text-red-11",
        icon: XCircle,
      },
      REFUNDED: {
        label: "Estornado",
        className: "bg-red-10 text-red-11",
        icon: XCircle,
      },
      PENDING: {
        label: "Pendente",
        className: "bg-yellow-10/20 text-yellow-11",
        icon: XCircle,
      },
    };
    return statusMap[status] || statusMap.PENDING || {
      label: "Desconhecido",
      className: "bg-gray-10/20 text-gray-11",
      icon: XCircle,
    };
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

    // Calcular o status final usando a mesma lógica do componente
    const finalStatus = getFinalStatus(reg);
    const matchesStatus = statusFilter === "all" || finalStatus === statusFilter;

    // Date range filter - only filter when both dates are selected and different (usa o range aplicado)
    const matchesDateRange = !appliedDateRange?.from || !appliedDateRange?.to || appliedDateRange.from.getTime() === appliedDateRange.to.getTime()
      ? true
      : (() => {
        if (!reg.purchaseDate) return false;
        const purchaseDate = new Date(reg.purchaseDate);
        const fromDate = new Date(appliedDateRange.from!);
        fromDate.setHours(0, 0, 0, 0);
        const toDate = new Date(appliedDateRange.to!);
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

  const hasActiveFilters =
    searchTerm.trim().length > 0 ||
    statusFilter !== "all" ||
    selectedTicketIds.length > 0 ||
    Boolean(dateRange?.from || dateRange?.to) ||
    Boolean(appliedDateRange?.from || appliedDateRange?.to);

  const handleClearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setSelectedTicketIds([]);
    setDateRange(undefined);
    setAppliedDateRange(undefined);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  // Full-page loading só na carga inicial (ainda sem dados). Refetch (filtros, data etc.) mostra loading só na lista.
  if (loading && registrations.length === 0) {
    return (
      <div className="min-h-screen bg-gray-2 flex items-center justify-center">
        <Loading />
      </div>
    );
  }

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
      <div className="hidden md:block">
        <EventPageHeader eventName={event?.name} />
      </div>

      <EventMobileHeader
        eventId={eventId}
        eventName={event?.name}
        activeHref={`/organizer/events/${eventId}/registrations`}
        backHref={`/organizer/events/${eventId}/dashboard`}
        backLinkClassName="rotate-180"
      />

      <div className="max-w-7xl mx-auto px-4 lg:px-0">
        {/* Page Title - Desktop only */}
        <div className="mb-6 hidden md:block">
          <h1 className="text-3xl font-bold text-gray-12 mb-2">Inscrições</h1>
          <p className="text-gray-11">
            Acompanhe todas as inscrições do evento e gerencie pedidos, pagamentos e status.
          </p>
        </div>

        {/* Mobile: 3 summary cards */}
        <div className="md:hidden flex flex-col gap-5 mb-5 mt-4">
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-gray-1 border border-gray-6 rounded-lg p-3 flex flex-col gap-2">
              <div className="flex flex-col gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-4 flex items-center justify-center shrink-0">
                  <CartIcon className="size-5 text-blue-12" />
                </div>
                <p className="font-family-dm-sans font-normal text-base text-gray-11">Inscrições Confirmadas</p>
              </div>
              <p className="font-manrope font-extrabold text-lg text-gray-12">{stats.total.toLocaleString()}</p>
              <div className="flex items-center gap-1">
                <TrendingUp className="size-3 text-primary-11" />
                <span className="font-family-dm-sans font-normal text-xs text-primary-11">12% vs. sem. passada</span>
              </div>
            </div>
            <div className="bg-gray-1 border border-gray-6 rounded-lg p-3 flex flex-col gap-2">
              <div className="flex flex-col gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary-4 flex items-center justify-center shrink-0">
                  <CheckIcon className="size-5 text-gray-12" />
                </div>
                <p className="font-family-dm-sans font-normal text-base text-gray-11">Inscrições confirmadas</p>
              </div>
              <p className="font-manrope font-extrabold text-lg text-gray-12">{stats.paid.toLocaleString()}</p>
              <div className="flex items-center gap-1">
                <TrendingUp className="size-3 text-primary-11" />
                <span className="font-family-dm-sans font-normal text-xs text-primary-11">12% vs. sem. passada</span>
              </div>
            </div>
          </div>
          <div className="bg-gray-1 border border-gray-6 rounded-lg p-3 flex flex-col gap-2">
            <div className="flex gap-2 items-center">
              <div className="w-8 h-8 rounded-lg bg-[#EBE4FF] flex items-center justify-center shrink-0">
                <DolarIcon className="size-5 text-gray-12" />
              </div>
              <p className="font-family-dm-sans font-normal text-sm text-gray-11">Total arrecadado</p>
            </div>
            <p className="font-manrope font-extrabold text-lg text-gray-12">
              R$ {(stats.totalCollected / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <div className="flex items-center gap-1">
              <TrendingUp className="size-3 text-primary-11" />
              <span className="font-family-dm-sans font-normal text-xs text-primary-11">12% vs. sem. passada</span>
            </div>
          </div>
        </div>

        {/* Summary Cards - Desktop */}
        <div className="hidden md:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Inscrições Confirmadas */}
          <div className="bg-gray-1 rounded-lg px-4 py-3 border border-gray-6">
            <div className="mb-2">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-11 mb-1">Inscrições Confirmadas</p>
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
          <div className="bg-gray-1 rounded-lg px-4 py-3 border border-gray-6">
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
                R$ {(stats.totalCollected / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="flex items-center gap-1 text-sm text-primary-11">
              <TrendingUp className="size-4" />
              <span>12% vs. semana passada</span>
            </div>
          </div>
        </div>

        {/* Mobile: Search + Limpar + Filtros row */}
        <div className="md:hidden flex flex-wrap gap-2 items-center mb-4">
          <div className="flex-1 min-w-[140px] border border-gray-6 rounded-lg h-10 flex items-center gap-2 px-3 bg-gray-1">
            <Search className="size-5 text-gray-11 shrink-0" />
            <input
              type="text"
              placeholder="Nome, CPF, IDs.."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 min-w-0 bg-transparent font-family-dm-sans font-normal text-sm text-gray-12 placeholder:text-gray-11 outline-none"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={!hasActiveFilters}
            onClick={handleClearFilters}
            className="shrink-0 h-10 px-3 text-sm border-gray-6 text-gray-12 disabled:opacity-50"
          >
            Limpar filtros
          </Button>
          <button
            type="button"
            onClick={() => setMobileFiltersOpen((v) => !v)}
            className="shrink-0 flex items-center gap-2 px-3 rounded-lg border border-gray-6 bg-gray-1 text-gray-11 font-family-dm-sans font-normal text-sm h-10"
          >
            Filtros
            <ArrowButton isOpen={mobileFiltersOpen} />
          </button>
        </div>

        {/* Mobile: Filters panel (when open) */}
        {mobileFiltersOpen && (
          <div className="md:hidden flex flex-col gap-2 mb-4 p-3 bg-gray-1 rounded-lg border border-gray-6">
            <Dropdown
              dataAttribute="status-filter-mobile"
              width="w-full"
              maxHeight="max-h-[300px]"
              align="start"
              options={[
                { id: "all", label: "Todos" },
                { id: "COMPLETED", label: "Pago", icon: CheckCircle },
                { id: "CANCELLED", label: "Cancelado", icon: XCircle },
                { id: "CHARGEBACK", label: "ChargeBack", icon: XCircle },
                { id: "REFUNDED", label: "Estornado", icon: XCircle },
              ]}
              selectedIds={statusFilter !== "all" ? [statusFilter] : []}
              onSelect={(option) => {
                setStatusFilter(option.id || "all");
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              trigger={() => {
                const statusLabels: Record<string, string> = {
                  all: "Todos",
                  COMPLETED: "Pago",
                  CANCELLED: "Cancelado",
                  CHARGEBACK: "ChargeBack",
                  REFUNDED: "Estornado",
                };
                return (
                  <div className="flex items-center justify-between px-3 py-2 rounded-lg border border-gray-6 bg-gray-2 text-gray-12 text-sm w-full">
                    <span>Status: {statusLabels[statusFilter] ?? "Todos"}</span>
                    <ArrowButton isOpen={false} />
                  </div>
                );
              }}
            />
            <button
              type="button"
              onClick={() => setIsTicketModalOpen(true)}
              className="flex items-center justify-between px-3 py-2 rounded-lg border border-gray-6 bg-gray-2 text-gray-12 text-sm"
            >
              <span>{selectedTicketIds.length === 0 ? "Ingressos: Todos" : `${selectedTicketIds.length} selecionado(s)`}</span>
              <ArrowButton isOpen={false} />
            </button>
            <Dropdown
              width="w-max"
              align="start"
              trigger={() => {
                const fmt = !dateRange?.from ? "Data: Recentes" : dateRange.from && dateRange.to && dateRange.from.getTime() !== dateRange.to.getTime()
                  ? `Data: ${dateRange.from.getDate()}/${dateRange.from.getMonth() + 1} - ${dateRange.to.getDate()}/${dateRange.to.getMonth() + 1}`
                  : `Data: ${dateRange.from.getDate()}/${dateRange.from.getMonth() + 1}`;
                return (
                  <div className="flex items-center justify-between px-3 py-2 rounded-lg border border-gray-6 bg-gray-2 text-gray-12 text-sm">
                    <span>{fmt}</span>
                    <ArrowButton isOpen={false} />
                  </div>
                );
              }}
            >
              <DateRangePicker
                allowPastDates
                onSelect={(range) => {
                  setDateRange(range);
                  const hasTwo = range?.from && range?.to && range.from.getTime() !== range.to.getTime();
                  const isCleared = !range || (!range.from && !range.to);
                  if (hasTwo || isCleared) {
                    setAppliedDateRange(isCleared ? undefined : range ?? undefined);
                    setPagination((prev) => ({ ...prev, page: 1 }));
                  }
                }}
                value={dateRange}
              />
            </Dropdown>
          </div>
        )}

        {/* Search and Filters - Desktop */}
        <div className="hidden md:flex mb-6 flex-col sm:flex-row gap-4 items-center p-4 bg-gray-1 rounded-lg border border-gray-6 flex-wrap">
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
              { id: "COMPLETED", label: "Pago", icon: CheckCircle },
              { id: "CANCELLED", label: "Cancelado", icon: XCircle },

              { id: "CHARGEBACK", label: "ChargeBack", icon: XCircle },
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
                  CHARGEBACK: "Status: ChargeBack",
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

                // Só mostra intervalo quando são duas datas diferentes (range completo)
                if (dateRange.from && dateRange.to && dateRange.from.getTime() !== dateRange.to.getTime()) {
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
              allowPastDates
              onSelect={(range) => {
                setDateRange(range);
                // Só aplica o filtro e busca quando há duas datas diferentes no range (segunda data selecionada) ou foi limpo
                const hasTwoDifferentDates =
                  range?.from != null &&
                  range?.to != null &&
                  range.from.getTime() !== range.to.getTime();
                const isCleared = range == null || (range.from == null && range.to == null);
                if (hasTwoDifferentDates || isCleared) {
                  setAppliedDateRange(isCleared ? undefined : range ?? undefined);
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }
              }}
              value={dateRange}
            />
          </Dropdown>

          <Button
            type="button"
            variant="outline"
            disabled={!hasActiveFilters}
            onClick={handleClearFilters}
            className="h-[46px] shrink-0 border-gray-6 text-gray-12 disabled:opacity-50 px-4"
          >
            Limpar filtros
          </Button>
        </div>

        {/* Registrations List */}
        <div className="relative">
          {loading && registrations.length > 0 && (
            <div className="absolute inset-0 bg-gray-2/80 z-10 flex items-center justify-center rounded-lg min-h-[200px]">
              <Loading />
            </div>
          )}
          {filteredRegistrations.length === 0 && !loading ? (
            <div className="bg-gray-1 rounded-lg p-12 border border-gray-6 text-center">
              <Users className="size-12 text-gray-11 mx-auto mb-4" />
              <p className="text-gray-11 mb-4">
                {hasActiveFilters
                  ? "Nenhuma inscrição encontrada"
                  : "Nenhuma inscrição ainda"}
              </p>
            </div>
          ) : filteredRegistrations.length === 0 && loading ? (
            <div className="bg-gray-1 rounded-lg p-12 border border-gray-6 text-center min-h-[200px] flex items-center justify-center">
              <Loading />
            </div>
          ) : (
            <>
              {/* Mobile: Lista de inscrições + cards */}
              <div className="md:hidden flex flex-col gap-4">
                <h2 className="font-manrope font-bold text-xl text-gray-12">Lista de inscrições</h2>
                <div className="flex flex-col gap-3">
                  {filteredRegistrations.map((registration) => {
                    const finalStatus = getFinalStatus(registration);
                    const paymentStatus = registration.order?.payment?.status;
                    const isPaid = finalStatus === "CONFIRMED" || finalStatus === "COMPLETED" || paymentStatus === "PAID";
                    const isCancelled = finalStatus === "CANCELLED" || paymentStatus === "FAILED";
                    const isRefunded = finalStatus === "REFUNDED";
                    const isChargeback = finalStatus === "CHARGEBACK";
                    const statusLabel = isPaid ? "Pago" : isCancelled ? "Cancelado" : isRefunded ? "Estornado" : isChargeback ? "ChargeBack" : "Pendente";
                    const statusClass = isPaid ? "bg-[#21835d] text-primary-1" : isCancelled || isRefunded || isChargeback ? "bg-red-11 text-white" : "bg-yellow-11 text-yellow-1";
                    const fullName = `${registration.user?.firstName || ""} ${registration.user?.lastName || ""}`.trim();
                    const createdDate = registration.createdAt ? new Date(registration.createdAt) : null;
                    const timeStr = createdDate ? createdDate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) + "H" : "—";
                    const dateStr = createdDate ? createdDate.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";
                    const price = registration.ticket?.price != null ? (registration.ticket.price / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0,00";
                    return (
                      <div key={registration.id} className="bg-gray-1 border border-gray-6 rounded-lg overflow-hidden">
                        <div className="flex flex-col gap-5 px-3 py-4">
                          <div className="flex items-center justify-between">
                            <div className="flex gap-2 items-center min-w-0 flex-1">
                              {registration.user?.avatarUrl ? (
                                <Image src={getAvatarUrl(registration.user.avatarUrl ?? "") as string} alt={fullName} width={36} height={36} className="size-9 rounded-full object-cover shrink-0" />
                              ) : (
                                <div className="size-9 rounded-full bg-primary-10/20 flex items-center justify-center shrink-0">
                                  <span className="text-primary-11 font-semibold text-sm">{(fullName || "U").charAt(0).toUpperCase()}</span>
                                </div>
                              )}
                              <div className="flex flex-col gap-1 min-w-0">
                                <p className="font-family-dm-sans font-medium text-base text-gray-12 truncate">{fullName || "—"}</p>
                                <div className="flex items-center gap-2">
                                  <span className="font-family-dm-sans font-normal text-sm text-gray-11">{timeStr}</span>
                                  <span className="size-1 rounded-full bg-gray-11 shrink-0" />
                                  <span className="font-family-dm-sans font-normal text-sm text-gray-11">{dateStr}</span>
                                </div>
                              </div>
                            </div>
                            <span className={`shrink-0 px-3 py-2 rounded text-xs font-family-dm-sans font-normal ${statusClass}`}>{statusLabel}</span>
                          </div>
                          <div className="flex flex-col gap-2">
                            <p className="font-family-dm-sans font-normal text-xs text-gray-11">Nome da categoria</p>
                            <p className="font-manrope font-semibold text-base text-gray-12">{registration.ticket?.name || "—"}</p>
                          </div>
                          <div className="flex items-center justify-between">
                            <p className="font-manrope font-extrabold text-xl text-gray-12">R$ {price}</p>
                            <p className="font-family-dm-sans font-medium text-sm text-gray-12">
                              ID inscrição: {registration.id?.length > 10 ? `${registration.id.slice(0, 4)}-${registration.id.slice(-4)}` : registration.id}
                            </p>
                          </div>
                        </div>
                        <div className="h-px bg-gray-6" />
                        <div className="flex gap-2 p-3">
                          <button
                            type="button"
                            onClick={() => openViewRegistrationModal({ registrationId: registration.id, eventId, eventName: event?.name })}
                            className="flex-1 h-11 flex items-center justify-center rounded-lg border border-gray-6 font-manrope font-bold text-base text-gray-12 hover:bg-gray-3 transition-colors"
                          >
                            Ver ingresso
                          </button>
                          <button
                            type="button"
                            onClick={() => openPaymentDetailsModal({ registrationId: registration.id, eventId, eventName: event?.name })}
                            className="flex-1 h-11 flex items-center justify-center rounded-lg border border-gray-6 font-manrope font-bold text-base text-gray-12 hover:bg-gray-3 transition-colors"
                          >
                            Ver pedido
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {pagination.totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPagination((p) => ({ ...p, page: Math.max(1, p.page - 1) }))}
                      disabled={pagination.page === 1}
                      className="size-8 flex items-center justify-center rounded-lg border border-gray-6 disabled:opacity-50"
                    >
                      <ChevronLeft className="size-4" />
                    </button>
                    {Array.from({ length: Math.min(pagination.totalPages, 8) }, (_, i) => {
                      const pageNum = i + 1;
                      const isActive = pageNum === pagination.page;
                      return (
                        <button
                          key={pageNum}
                          type="button"
                          onClick={() => setPagination((p) => ({ ...p, page: pageNum }))}
                          className={`size-8 flex items-center justify-center rounded-lg text-sm font-family-dm-sans font-medium transition-colors ${isActive ? "bg-primary-11 border-primary-11 text-primary-2" : "border border-gray-6 bg-gray-4 text-gray-12"}`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => setPagination((p) => ({ ...p, page: Math.min(pagination.totalPages, p.page + 1) }))}
                      disabled={pagination.page >= pagination.totalPages}
                      className="size-8 flex items-center justify-center rounded-lg border border-gray-6 disabled:opacity-50"
                    >
                      <ChevronRight className="size-4" />
                    </button>
                  </div>
                )}
                <Button
                  className="w-full h-12 rounded-lg font-manrope font-bold"
                  onClick={() => openExportDataModal({ registrations: filteredRegistrations, eventId, eventName: event?.name })}
                >
                  Exportar CSV
                </Button>
              </div>

              {/* Desktop: Table */}
              <div className="hidden md:block bg-gray-2 border border-gray-6 rounded-lg overflow-hidden w-full">
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
                  {filteredRegistrations.map((registration) => (
                    <RegistrationRow
                      key={registration.id}
                      registration={registration}
                      getStatusBadge={getStatusBadge}
                      onViewRegistration={() => {
                        openViewRegistrationModal({
                          registrationId: registration.id,
                          eventId,
                          eventName: event?.name,
                        });
                      }}
                      onViewPaymentDetails={() => {
                        openPaymentDetailsModal({
                          registrationId: registration.id,
                          eventId,
                          eventName: event?.name,
                        });
                      }}
                    />
                  ))}
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
                          className={`size-8 flex items-center justify-center border rounded-lg cursor-pointer ${isActive
                            ? "bg-primary-11 border-primary-11 text-gray-1"
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

              {/* Export Button - Desktop only (mobile has full-width button above) */}
              <div className="mt-6 justify-end hidden md:flex">
                <Button
                  onClick={() => {
                    openExportDataModal({
                      registrations: filteredRegistrations,
                      eventId,
                      eventName: event?.name,
                    });
                  }}
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
    </div>
  );
}

