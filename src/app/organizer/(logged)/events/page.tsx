"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useOrganizerNavigate } from "@/hooks/useOrganizerNavigate";
import { useAuth } from "@/hooks/useAuth";
import { organizerService, userService } from "@/services";
import { useOrganizerPermissions } from "@/contexts/OrganizerPermissionsContext";
import { Button } from "@/components/Button";
import { FlagIcon } from "@/components/Icons/FlagIcon";
import {
  Plus,
  Calendar,
  ChevronDown,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { PencilIcon } from "@/components/Icons/PencilIcon";
import { RemoveCircleIcon } from "@/components/Icons/RemoveCircleIcon";
import { UndoCircleIcon } from "@/components/Icons/UndoCircleIcon";
import { BadgePercentIcon } from "@/components/Icons/BadgePercentIcon";
import { AnnouncementIcon } from "@/components/Icons/AnnouncementIcon";
import { NotificationIcon } from "@/components/Icons/NotificationIcon";
import { ImageWithInitialFallback } from "@/components/ImageWithInitialFallback";
import { LoadingAnimation } from "@/components/Loading";
import { MoneyIcon } from "@/components/Icons/MoneyIcon";
import { DashboardIcon } from "@/components/Icons/Organizer/DashboardIcon";
import { UsersIcon } from "@/components/Icons/Organizer/UsersIcon";
import { ThreePointsIcon } from "@/components/Icons/Organizer/ThreePointsIcon";
import { OrganizerInfoIcon } from "@/components/Icons/Organizer/InfoIcon";
import { OrganizerTicketIcon } from "@/components/Icons/Organizer/TicketIcon";
import { BannerIcon } from "@/components/Icons/Organizer/BannerIcon";
import { TopicsIcon } from "@/components/Icons/TopicsIcon";
import { QuestionIcon } from "@/components/Icons/QuestionIcon";
import { FinancialStepIcon } from "@/components/Icons/Organizer/FinancialStepIcon";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { SuspendEventModal } from "@/components/Event/SuspendEventModal";
import { ResumeEventModal } from "@/components/Event/ResumeEventModal";
import { cn } from "@/utils/cn";
import { ArrowButton } from "@/components/ArrowButton";

/** Alinhado à API: status SUSPENDED (POST …/suspend e …/resume). */
function isEventSuspended(event: { status?: string }) {
  return event.status === "SUSPENDED";
}

/** Opções do filtro de status — usadas no dropdown mobile. */
const STATUS_FILTER_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "all", label: "Todos" },
  { value: "DRAFT", label: "Rascunhos" },
  { value: "PUBLISHED", label: "Publicados" },
  { value: "REVISION", label: "Em revisão" },
  { value: "SUSPENDED", label: "Suspensos" },
  { value: "COMPLETED", label: "Concluídos" },
  { value: "CANCELLED", label: "Cancelados" },
];

const ALL_STATUS_VALUES = STATUS_FILTER_OPTIONS
  .filter((o) => o.value !== "all")
  .map((o) => o.value);

export default function OrganizerEventsPage() {
  const router = useRouter();
  const orgNav = useOrganizerNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { hasPermission } = useOrganizerPermissions();
  const canCreateEvent = hasPermission("create_event");
  const canViewDashboard = hasPermission("dashboard"); // true se tiver qualquer permissão real
  const canEditEvent = hasPermission("edit_event");
  const canViewEvent = hasPermission("view_event");
  const canViewFinancial = hasPermission("financial");
  const canViewCoupons = hasPermission("coupons");
  const canViewPixel = hasPermission("pixel");
  const canViewNotification = hasPermission("notify");
  const [authChecked, setAuthChecked] = useState(false);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });
  const [menuOpenForId, setMenuOpenForId] = useState<string | null>(null);
  const [mobileMenuOpenForId, setMobileMenuOpenForId] = useState<string | null>(null);
  const [mobileEditMenuOpenForId, setMobileEditMenuOpenForId] = useState<string | null>(null);
  const [statusFilterOpen, setStatusFilterOpen] = useState(false);
  const [suspendingId, setSuspendingId] = useState<string | null>(null);
  const [suspendModalEvent, setSuspendModalEvent] = useState<any>(null);
  const [resumeModalEvent, setResumeModalEvent] = useState<any>(null);
  // Status que realmente existem nos eventos do organizador. Inicializa com
  // todos pra UI não piscar enquanto a checagem roda; o useEffect reconcilia.
  const [availableStatuses, setAvailableStatuses] = useState<Set<string>>(
    () => new Set(ALL_STATUS_VALUES),
  );

  const currentStatusLabel =
    STATUS_FILTER_OPTIONS.find((o) => o.value === statusFilter)?.label ??
    "Todos";

  // Opções visíveis no dropdown: "Todos" + apenas status com >=1 evento.
  const visibleStatusOptions = STATUS_FILTER_OPTIONS.filter(
    (opt) => opt.value === "all" || availableStatuses.has(opt.value),
  );

  const formatCurrencyBRL = (cents: number) =>
    `R$ ${(cents / 100).toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  useEffect(() => {
    // Aguarda a verificação de autenticação terminar
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
    if (!authChecked || authLoading) return;
    loadEvents();
  }, [authChecked, statusFilter, pagination.page]);

  // Descobre quais status têm pelo menos 1 evento. Faz uma chamada por status
  // com `limit: 1` em paralelo — leve no backend (COUNT + LIMIT 1) e robusto
  // contra paginação (não dá pra derivar da página atual quando há filtro).
  const refreshAvailableStatuses = useCallback(async () => {
    try {
      const results = await Promise.all(
        ALL_STATUS_VALUES.map(async (status) => {
          try {
            const res = await organizerService.getMyEvents({
              status,
              limit: 1,
              page: 1,
              // Inclui eventos passados pra contar COMPLETED corretamente.
              includePast: true,
            });
            const total = res.pagination?.total ?? res.events?.length ?? 0;
            return { status, has: total > 0 };
          } catch {
            return { status, has: false };
          }
        }),
      );
      setAvailableStatuses(
        new Set(results.filter((r) => r.has).map((r) => r.status)),
      );
    } catch (e) {
      console.error("Erro ao verificar status disponíveis:", e);
    }
  }, []);

  useEffect(() => {
    if (!authChecked || authLoading) return;
    void refreshAvailableStatuses();
  }, [authChecked, authLoading, refreshAvailableStatuses]);

  // Reseta o filtro se o status atualmente selecionado deixou de existir
  // (ex.: usuário reativou o último evento suspenso enquanto filtrava por
  // "Suspensos"). Evita lista vazia sem motivo aparente.
  useEffect(() => {
    if (statusFilter === "all") return;
    if (availableStatuses.size === 0) return;
    if (!availableStatuses.has(statusFilter)) {
      setStatusFilter("all");
      setPagination((prev) => ({ ...prev, page: 1 }));
    }
  }, [availableStatuses, statusFilter]);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: pagination.page,
        limit: pagination.limit,
        // "Meus eventos" precisa mostrar eventos passados também
        // (status COMPLETED). Default do backend é filtrar por data futura.
        includePast: true,
      };
      if (statusFilter !== "all") {
        params.status = statusFilter;
      }

      const data = await organizerService.getMyEvents(params);
      setEvents(data.events || []);
      setPagination(data.pagination || pagination);
    } catch (error: any) {
      console.error("Error loading events:", error);
      toast.error("Erro ao carregar eventos");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (eventId: string, eventName: string) => {
    if (!confirm(`Tem certeza que deseja deletar o evento "${eventName}"?`)) {
      return;
    }

    try {
      await organizerService.deleteEvent(eventId);
      toast.success("Evento deletado com sucesso");
      loadEvents();
    } catch (error: any) {
      console.error("Error deleting event:", error);
      toast.error("Erro ao deletar evento");
    }
  };

  const filteredEvents = events.filter((event) =>
    event.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const eventsPaginationTotalPages = Math.max(1, pagination.totalPages || 1);

  const getStatusBadge = (event: { status: string }) => {
    if (isEventSuspended(event)) {
      return {
        label: "Suspenso",
        className: "bg-red-11 text-red-1",
      };
    }
    const statusMap: Record<string, { label: string; className: string }> = {
      DRAFT: { label: "Rascunhos", className: "bg-gray-5 text-gray-12" },
      PUBLISHED: {
        label: "Públicado",
        className: "bg-[#21835D] text-[#FBFEFB]",
      },
      REVISION: {
        label: "Em revisão",
        className: "bg-yellow-11 text-yellow-1",
      },
      CANCELLED: { label: "Cancelado", className: "bg-red-10/20 text-red-11" },
      COMPLETED: {
        label: "Concluído",
        className: "bg-gray-10/20 text-gray-11",
      },
      SUSPENDED: {
        label: "Suspenso",
        className: "bg-red-11 text-red-1",
      },
    };
    return statusMap[event.status] || statusMap.DRAFT;
  };

  const openSuspendModal = (event: any) => {
    if (event.status !== "PUBLISHED") {
      toast.error("Somente eventos publicados podem ser suspensos.");
      setMenuOpenForId(null);
      return;
    }
    setMenuOpenForId(null);
    setSuspendModalEvent(event);
  };

  const openResumeModal = (event: any) => {
    if (event.status !== "SUSPENDED") {
      toast.error("Somente eventos suspensos podem ser reativados desta forma.");
      setMenuOpenForId(null);
      return;
    }
    setMenuOpenForId(null);
    setResumeModalEvent(event);
  };

  const handleSuspendConfirm = async () => {
    if (!suspendModalEvent) return;
    setSuspendingId(suspendModalEvent.id);
    try {
      const { message } = await organizerService.suspendEvent(
        suspendModalEvent.id
      );
      toast.success(message || "Evento suspenso com sucesso.");
      loadEvents();
      void refreshAvailableStatuses();
    } catch (e: any) {
      console.error(e);
      toast.error(
        e?.response?.data?.message ||
        "Não foi possível suspender o evento."
      );
    } finally {
      setSuspendingId(null);
    }
  };

  const handleResumeConfirm = async () => {
    if (!resumeModalEvent) return;
    setSuspendingId(resumeModalEvent.id);
    try {
      const { message } = await organizerService.resumeEvent(
        resumeModalEvent.id
      );
      toast.success(message || "Evento reativado com sucesso.");
      loadEvents();
      void refreshAvailableStatuses();
    } catch (e: any) {
      console.error(e);
      toast.error(
        e?.response?.data?.message ||
        "Não foi possível reativar o evento."
      );
    } finally {
      setSuspendingId(null);
    }
  };

  const getEventRegistrations = (event: any) => {
    return event._count?.registrations || 0;
  };

  if (authLoading || (!authChecked && !authLoading)) {
    return (
      <div className="min-h-screen bg-gray-2 flex items-center justify-center">
        <LoadingAnimation />
      </div>
    );
  }

  if (loading && events.length === 0) {
    return (
      <div className="min-h-screen bg-gray-2 flex items-center justify-center">
        <LoadingAnimation />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-2 pt-6 md:pt-8 pb-8 px-4 md:px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header — Desktop */}
        <div className="hidden md:flex mb-8 items-center justify-between">
          <div className="flex items-center gap-3">
            <FlagIcon className="size-6 text-gray-12" />
            <h1 className="text-2xl font-extrabold text-gray-12 font-family-dm-sans">
              Meus eventos
            </h1>
          </div>
          {canCreateEvent && (
            <Link href="/organizer/events/new?reset=1">
              <Button className="">
                Criar evento
              </Button>
            </Link>
          )}
        </div>

        {/* Header — Mobile */}
        <div className="md:hidden mb-6 flex flex-col gap-6">
          <div className="flex flex-col gap-3 py-5">
            <h1 className="text-lg font-bold text-gray-12 font-manrope leading-[1.1]">
              Meus eventos
            </h1>
            <p className="text-base text-gray-11 font-family-dm-sans leading-[1.3]">
              Gerencie todos os projetos e pagamentos deste evento
            </p>
          </div>
          {canCreateEvent && (
            <Link href="/organizer/events/new?reset=1" className="w-full">
              <Button className="w-full h-11">
                <Plus className="size-5" />
                Criar novo evento
              </Button>
            </Link>
          )}
        </div>

        {/* Status filter — Mobile */}
        <div className="md:hidden mb-6">
          <Popover open={statusFilterOpen} onOpenChange={setStatusFilterOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="h-10 min-w-[147px] inline-flex items-center justify-between gap-2 px-3 py-4 rounded-lg border border-gray-7 bg-transparent text-sm font-family-dm-sans text-gray-11"
              >
                <span>Status: {currentStatusLabel}</span>
                <ChevronDown className="size-4 text-gray-11 shrink-0" />
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="start"
              sideOffset={6}
              className="w-56 p-1 border-gray-6 bg-gray-1 shadow-lg"
            >
              <div className="flex flex-col gap-0.5">
                {visibleStatusOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setStatusFilter(opt.value);
                      // Reseta paginação ao trocar de filtro p/ evitar página vazia.
                      setPagination((prev) => ({ ...prev, page: 1 }));
                      setStatusFilterOpen(false);
                    }}
                    className={cn(
                      "w-full text-left px-3 py-2.5 text-sm font-family-dm-sans rounded-md transition-colors hover:bg-gray-3",
                      statusFilter === opt.value
                        ? "text-gray-12 font-semibold bg-gray-2"
                        : "text-gray-12"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Events */}
        {filteredEvents.length === 0 ? (
          <div className="bg-gray-1 rounded-lg p-8 md:p-12 border border-gray-6 text-center">
            <Calendar className="size-12 text-gray-11 mx-auto mb-4" />
            <p className="text-gray-11 mb-4">
              {searchTerm
                ? "Nenhum evento encontrado com essa busca"
                : "Você ainda não criou nenhum evento"}
            </p>
            {!searchTerm && canCreateEvent && (
              <Link href="/organizer/events/new?reset=1">
                <Button>
                  <Plus className="size-4 mr-2" />
                  Criar Primeiro Evento
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <>
            <h2 className="hidden md:block text-lg font-semibold text-gray-12 mb-4 font-family-dm-sans">
              Lista de eventos
            </h2>
            <div className="hidden md:block bg-gray-1 rounded-lg border border-gray-6 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-3 border-b border-gray-6">
                    <tr>
                      <th className="text-left py-4 px-5 text-gray-12 text-sm font-semibold font-family-dm-sans">
                        Nome do evento
                      </th>
                      <th className="text-center py-4 px-5 text-gray-12 text-sm font-semibold font-family-dm-sans">
                        Status
                      </th>
                      <th className="text-center py-4 px-5 text-gray-12 text-sm font-semibold font-family-dm-sans">
                        Inscritos
                      </th>
                      <th className="text-center py-4 px-5 text-gray-12 text-sm font-semibold font-family-dm-sans">
                        Receita Líquida
                      </th>
                      <th className="text-center py-4 px-5 text-gray-12 text-sm font-semibold font-family-dm-sans">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-6">
                    {filteredEvents.map((event) => {
                      const statusBadge = getStatusBadge(event);
                      const registrations = getEventRegistrations(event);
                      const isCreationDraft = event.status === "DRAFT";
                      const isRevision = event.status === "REVISION"

                      return (
                        <tr
                          key={event.id}
                          className="hover:bg-gray-2 transition-colors"
                        >
                          <td className="py-4 px-5">
                            <div className="flex items-center gap-3">
                              <div className="size-9 rounded-lg border border-gray-6 overflow-hidden shrink-0 relative">
                                <ImageWithInitialFallback
                                  src={event.bannerUrl}
                                  alt={event.name}
                                  name={event.name}
                                  fallbackId={event.id}
                                  fill
                                  sizes="36px"
                                  className="size-full border-transparent border-0"
                                  letterClassName="text-sm font-semibold"
                                />
                              </div>
                              <span className="text-sm text-gray-12 font-semibold font-family-dm-sans">
                                {event.name}
                              </span>
                            </div>
                          </td>
                          <td className="py-4 px-5 text-center">
                            <span
                              className={`px-3 py-1 rounded text-xs font-medium text-center ${statusBadge.className}`}
                            >
                              {statusBadge.label}
                            </span>
                          </td>
                          <td className="py-4 px-5 text-center">
                            <span className="text-sm font-semibold text-gray-12 font-family-dm-sans">
                              {registrations}
                            </span>
                          </td>
                          <td className="py-4 px-5 text-center">
                            <span className="text-sm font-semibold text-gray-12 font-family-dm-sans">
                              R$ {(event.totalSales / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </td>
                          <td className="py-4 px-5 text-center min-w-[130px] w-[130px]">
                            {isCreationDraft ? (
                              canCreateEvent ? (
                                <Link
                                  href={`/organizer/events/new?resume=${event.id}`}
                                >
                                  <Button variant="outline" size="default" className="border-gray-6 text-gray-12 font-semibold font-family-dm-sans h-10 w-full"> Continuar criação</Button>
                                </Link>
                              ) : null
                            ) : isRevision ? null : (
                              <div className="flex items-center gap-1 justify-center">
                                {canViewDashboard && (
                                  <Link
                                    href={`/organizer/events/${event.id}/dashboard`}
                                    className="size-8 rounded-lg bg-gray-2 border border-gray-6 hover:bg-gray-4 flex items-center justify-center transition-colors"
                                    title="Dashboard"
                                  >
                                    <DashboardIcon className="size-4 text-gray-11" />
                                  </Link>
                                )}
                                {(canEditEvent || canViewEvent) && (
                                  <Link
                                    href={`/organizer/events/${event.id}/edit`}
                                    className="size-8 rounded-lg bg-gray-2 border border-gray-6 hover:bg-gray-4 flex items-center justify-center transition-colors"
                                    title={canEditEvent ? "Editar" : "Visualizar"}
                                  >
                                    <PencilIcon className="size-4 text-gray-11" />
                                  </Link>
                                )}
                                {canViewFinancial && (
                                  <Link
                                    href={`/organizer/events/${event.id}/financial`}
                                    className="size-8 rounded-lg bg-gray-2 border border-gray-6 hover:bg-gray-4 flex items-center justify-center transition-colors"
                                    title="Ver financeiro"
                                  >
                                    <MoneyIcon className="size-5 text-gray-11" />
                                  </Link>
                                )}
                                <Link
                                  href={`/organizer/events/${event.id}/registrations`}
                                  className="size-8 rounded-lg bg-gray-2 border border-gray-6 hover:bg-gray-4 flex items-center justify-center transition-colors"
                                  title="Ver inscritos"
                                >
                                  <UsersIcon className="size-5 text-gray-11" />
                                </Link>

                                {(canViewCoupons || canViewPixel) && (<Popover
                                  open={menuOpenForId === event.id}
                                  onOpenChange={(open) =>
                                    setMenuOpenForId(open ? event.id : null)
                                  }
                                >
                                  <PopoverTrigger asChild>
                                    <button
                                      type="button"
                                      className="size-8 rounded-lg bg-transparent hover:bg-gray-4 flex items-center justify-center transition-colors"
                                      title="Menu"
                                      aria-label="Menu"
                                    >
                                      <ThreePointsIcon className="size-5 text-gray-11" />
                                    </button>
                                  </PopoverTrigger>
                                  <PopoverContent
                                    align="end"
                                    sideOffset={6}
                                    className="w-52 p-1 border-gray-6 bg-gray-1 shadow-lg"
                                  >
                                    <div className="flex flex-col gap-0.5">
                                      {canViewCoupons && (
                                        <Link
                                          href={`/organizer/events/${event.id}/discount/cupom`}
                                          onClick={() => setMenuOpenForId(null)}
                                          className="flex items-center gap-2 px-3 py-2.5 text-sm font-family-dm-sans rounded-md hover:bg-gray-3 text-gray-12"
                                        >
                                          <BadgePercentIcon className="size-4 shrink-0 text-gray-11" />
                                          Cupom
                                        </Link>
                                      )}
                                      {canViewCoupons && (
                                        <Link
                                          href={`/organizer/events/${event.id}/discount/voucher`}
                                          onClick={() => setMenuOpenForId(null)}
                                          className="flex items-center gap-2 px-3 py-2.5 text-sm font-family-dm-sans rounded-md hover:bg-gray-3 text-gray-12"
                                        >
                                          <BadgePercentIcon className="size-4 shrink-0 text-gray-11" />
                                          Voucher
                                        </Link>
                                      )}
                                      {canViewPixel && (
                                        <Link
                                          href={`/organizer/events/${event.id}/ads`}
                                          onClick={() => setMenuOpenForId(null)}
                                          className="flex items-center gap-2 px-3 py-2.5 text-sm font-family-dm-sans rounded-md hover:bg-gray-3 text-gray-12"
                                        >
                                          <AnnouncementIcon className="size-4 shrink-0 text-gray-11" />
                                          ADS
                                        </Link>
                                      )}
                                      {canViewNotification && (
                                        <Link
                                          href={`/organizer/events/${event.id}/notifications`}
                                          onClick={() => setMenuOpenForId(null)}
                                          className="flex items-center gap-2 px-3 py-2.5 text-sm font-family-dm-sans rounded-md hover:bg-gray-3 text-gray-12"
                                        >
                                          <NotificationIcon className="size-4 shrink-0 text-gray-11" />
                                          Notificação
                                        </Link>
                                      )}
                                      {canEditEvent && (
                                        <button
                                          type="button"
                                          disabled={
                                            suspendingId === event.id ||
                                            (isEventSuspended(event)
                                              ? event.status !== "SUSPENDED"
                                              : event.status !== "PUBLISHED")
                                          }
                                          onClick={() =>
                                            isEventSuspended(event)
                                              ? openResumeModal(event)
                                              : openSuspendModal(event)
                                          }
                                          className={cn(
                                            "w-full flex items-center gap-2 px-3 py-2.5 text-sm font-family-dm-sans rounded-md transition-colors",
                                            "hover:bg-gray-3 text-gray-12",
                                            "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                                          )}
                                        >
                                          {isEventSuspended(event) ? (
                                            <UndoCircleIcon className="size-4 shrink-0 text-gray-11" />
                                          ) : (
                                            <RemoveCircleIcon className="size-4 shrink-0 text-gray-11" />
                                          )}
                                          {isEventSuspended(event)
                                            ? "Reativar evento"
                                            : "Suspender evento"}
                                        </button>
                                      )}
                                    </div>
                                  </PopoverContent>
                                </Popover>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden flex flex-col gap-3">
              {filteredEvents.map((event) => {
                const statusBadge = getStatusBadge(event);
                const registrations = getEventRegistrations(event);
                const isCreationDraft = event.status === "DRAFT";
                const isRevision = event.status === "REVISION";
                const hasSecondaryMenu =
                  canViewDashboard ||
                  canViewFinancial ||
                  canViewCoupons ||
                  canViewPixel ||
                  canViewNotification ||
                  canEditEvent;

                return (
                  <div
                    key={event.id}
                    className="bg-gray-1 border border-gray-6 rounded-lg px-3 py-4 flex flex-col gap-5"
                  >
                    {/* Image + name */}
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="size-11 rounded-lg border border-gray-6 overflow-hidden shrink-0 relative">
                        <ImageWithInitialFallback
                          src={event.bannerUrl}
                          alt={event.name}
                          name={event.name}
                          fallbackId={event.id}
                          fill
                          sizes="44px"
                          className="size-full border-transparent border-0"
                          letterClassName="text-sm font-semibold"
                        />
                      </div>
                      <span className="text-base font-medium text-gray-12 font-family-dm-sans truncate min-w-0">
                        {event.name}
                      </span>
                    </div>

                    {/* Status tag */}
                    <span
                      className={cn(
                        "self-start px-3 py-2 rounded text-sm font-family-dm-sans",
                        statusBadge.className
                      )}
                    >
                      {statusBadge.label}
                    </span>

                    {/* Stats: Inscritos | Vendas */}
                    <div className="flex items-start w-full">
                      <div className="flex-1 min-w-0 flex flex-col gap-3 items-start justify-center">
                        <p className="text-sm text-gray-11 font-family-dm-sans">
                          Inscritos
                        </p>
                        <p className="text-base font-extrabold text-gray-12 font-manrope truncate w-full">
                          {registrations}
                        </p>
                      </div>
                      <div className="self-stretch w-px bg-gray-6" />
                      <div className="flex-1 min-w-0 flex flex-col gap-3 items-start justify-center pl-4">
                        <p className="text-sm text-gray-11 font-family-dm-sans">
                          Vendas
                        </p>
                        <p className="text-base font-extrabold text-gray-12 font-manrope truncate w-full">
                          {formatCurrencyBRL(event.totalSales || 0)}
                        </p>
                      </div>
                    </div>

                    {/* Divider */}
                    <div className="h-px w-full bg-gray-6" />

                    {/* Actions */}
                    {isCreationDraft ? (
                      canCreateEvent ? (
                        <Link
                          href={`/organizer/events/new?resume=${event.id}`}
                          className="w-full"
                        >
                          <Button
                            variant="outline"
                            className="w-full h-11 border-gray-6 text-gray-12 font-manrope"
                          >
                            Continuar criação
                          </Button>
                        </Link>
                      ) : null
                    ) : isRevision ? null : (
                      <div className="flex gap-2 w-full">
                        {hasSecondaryMenu && (
                          <Popover
                            open={mobileMenuOpenForId === event.id}
                            onOpenChange={(open) =>
                              setMobileMenuOpenForId(open ? event.id : null)
                            }
                          >
                            <PopoverTrigger asChild>
                              <button
                                type="button"
                                className="flex-1 h-11 px-5 rounded-lg border border-gray-6 flex items-center justify-center font-manrope text-base font-bold text-gray-12 hover:bg-gray-2 transition-colors"
                              >
                                Menu
                              </button>
                            </PopoverTrigger>
                            <PopoverContent
                              align="start"
                              sideOffset={6}
                              className="w-[calc(100vw-2rem)] max-w-72 p-1 border-gray-6 bg-gray-1 shadow-lg"
                            >
                              <div className="flex flex-col gap-0.5">
                                {canViewDashboard && (
                                  <Link
                                    href={`/organizer/events/${event.id}/dashboard`}
                                    onClick={() => setMobileMenuOpenForId(null)}
                                    className="px-3 py-2.5 text-sm font-family-dm-sans rounded-md hover:bg-gray-3 text-gray-12 flex items-center gap-2"
                                  >
                                    <DashboardIcon className="size-4 text-gray-11" />
                                    Dashboard
                                  </Link>
                                )}
                                <Link
                                  href={`/organizer/events/${event.id}/registrations`}
                                  onClick={() => setMobileMenuOpenForId(null)}
                                  className="px-3 py-2.5 text-sm font-family-dm-sans rounded-md hover:bg-gray-3 text-gray-12 flex items-center gap-2"
                                >
                                  <UsersIcon className="size-4 text-gray-11" />
                                  Inscritos
                                </Link>
                                {canViewFinancial && (
                                  <Link
                                    href={`/organizer/events/${event.id}/financial`}
                                    onClick={() => setMobileMenuOpenForId(null)}
                                    className="px-3 py-2.5 text-sm font-family-dm-sans rounded-md hover:bg-gray-3 text-gray-12 flex items-center gap-2"
                                  >
                                    <MoneyIcon className="size-4 text-gray-11" />
                                    Financeiro
                                  </Link>
                                )}
                                {canViewCoupons && (
                                  <Link
                                    href={`/organizer/events/${event.id}/discount/cupom`}
                                    onClick={() => setMobileMenuOpenForId(null)}
                                    className="flex items-center gap-2 px-3 py-2.5 text-sm font-family-dm-sans rounded-md hover:bg-gray-3 text-gray-12"
                                  >
                                    <BadgePercentIcon className="size-4 shrink-0 text-gray-11" />
                                    Cupom
                                  </Link>
                                )}
                                {canViewCoupons && (
                                  <Link
                                    href={`/organizer/events/${event.id}/discount/voucher`}
                                    onClick={() => setMobileMenuOpenForId(null)}
                                    className="flex items-center gap-2 px-3 py-2.5 text-sm font-family-dm-sans rounded-md hover:bg-gray-3 text-gray-12"
                                  >
                                    <BadgePercentIcon className="size-4 shrink-0 text-gray-11" />
                                    Voucher
                                  </Link>
                                )}
                                {canViewPixel && (
                                  <Link
                                    href={`/organizer/events/${event.id}/ads`}
                                    onClick={() => setMobileMenuOpenForId(null)}
                                    className="flex items-center gap-2 px-3 py-2.5 text-sm font-family-dm-sans rounded-md hover:bg-gray-3 text-gray-12"
                                  >
                                    <AnnouncementIcon className="size-4 shrink-0 text-gray-11" />
                                    ADS
                                  </Link>
                                )}
                                {canViewNotification && (
                                  <Link
                                    href={`/organizer/events/${event.id}/notifications`}
                                    onClick={() => setMobileMenuOpenForId(null)}
                                    className="flex items-center gap-2 px-3 py-2.5 text-sm font-family-dm-sans rounded-md hover:bg-gray-3 text-gray-12"
                                  >
                                    <NotificationIcon className="size-4 shrink-0 text-gray-11" />
                                    Notificação
                                  </Link>
                                )}
                                {canEditEvent && (
                                  <button
                                    type="button"
                                    disabled={
                                      suspendingId === event.id ||
                                      (isEventSuspended(event)
                                        ? event.status !== "SUSPENDED"
                                        : event.status !== "PUBLISHED")
                                    }
                                    onClick={() => {
                                      setMobileMenuOpenForId(null);
                                      isEventSuspended(event)
                                        ? openResumeModal(event)
                                        : openSuspendModal(event);
                                    }}
                                    className={cn(
                                      "w-full flex items-center gap-2 text-left px-3 py-2.5 text-sm font-family-dm-sans rounded-md transition-colors",
                                      "hover:bg-gray-3 text-gray-12",
                                      "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                                    )}
                                  >
                                    {isEventSuspended(event) ? (
                                      <UndoCircleIcon className="size-4 shrink-0 text-gray-11" />
                                    ) : (
                                      <RemoveCircleIcon className="size-4 shrink-0 text-gray-11" />
                                    )}
                                    {isEventSuspended(event)
                                      ? "Reativar evento"
                                      : "Suspender evento"}
                                  </button>
                                )}
                              </div>
                            </PopoverContent>
                          </Popover>
                        )}
                        {(canEditEvent || canViewEvent) && (
                          <Popover
                            open={mobileEditMenuOpenForId === event.id}
                            onOpenChange={(open) =>
                              setMobileEditMenuOpenForId(open ? event.id : null)
                            }
                          >
                            <PopoverTrigger asChild>
                              <button
                                type="button"
                                className="flex-1 h-11 px-5 rounded-lg border border-gray-6 flex items-center justify-center gap-2 font-manrope text-base font-bold text-gray-12 hover:bg-gray-2 transition-colors"
                              >
                                <PencilIcon className="size-5 text-gray-12" />
                                {canEditEvent ? "Editar" : "Visualizar"}
                              </button>
                            </PopoverTrigger>
                            <PopoverContent
                              align="end"
                              sideOffset={6}
                              className="w-[calc(100vw-2rem)] max-w-72 p-1 border-gray-6 bg-gray-1 shadow-lg"
                            >
                              <div className="flex flex-col gap-0.5">
                                <Link
                                  href={`/organizer/events/${event.id}/edit`}
                                  onClick={() => setMobileEditMenuOpenForId(null)}
                                  className="px-3 py-2.5 text-sm font-family-dm-sans rounded-md hover:bg-gray-3 text-gray-12 flex items-center gap-2"
                                >
                                  <OrganizerInfoIcon className="size-4 text-gray-11" />
                                  Informações
                                </Link>
                                <Link
                                  href={`/organizer/events/${event.id}/edit/banner`}
                                  onClick={() => setMobileEditMenuOpenForId(null)}
                                  className="px-3 py-2.5 text-sm font-family-dm-sans rounded-md hover:bg-gray-3 text-gray-12 flex items-center gap-2"
                                >
                                  <BannerIcon className="size-4 text-gray-11" />
                                  Banner
                                </Link>
                                <Link
                                  href={`/organizer/events/${event.id}/edit/tickets`}
                                  onClick={() => setMobileEditMenuOpenForId(null)}
                                  className="px-3 py-2.5 text-sm font-family-dm-sans rounded-md hover:bg-gray-3 text-gray-12 flex items-center gap-2"
                                >
                                  <OrganizerTicketIcon className="size-4 text-gray-11" />
                                  Ingressos
                                </Link>
                                <Link
                                  href={`/organizer/events/${event.id}/edit/topics`}
                                  onClick={() => setMobileEditMenuOpenForId(null)}
                                  className="px-3 py-2.5 text-sm font-family-dm-sans rounded-md hover:bg-gray-3 text-gray-12 flex items-center gap-2"
                                >
                                  <TopicsIcon className="size-4 text-gray-11" />
                                  Tópicos
                                </Link>
                                <Link
                                  href={`/organizer/events/${event.id}/edit/questionnaire`}
                                  onClick={() => setMobileEditMenuOpenForId(null)}
                                  className="px-3 py-2.5 text-sm font-family-dm-sans rounded-md hover:bg-gray-3 text-gray-12 flex items-center gap-2"
                                >
                                  <QuestionIcon className="size-4 text-gray-11" />
                                  Questionário
                                </Link>
                                {canViewFinancial && (
                                  <Link
                                    href={`/organizer/events/${event.id}/edit/financial`}
                                    onClick={() => setMobileEditMenuOpenForId(null)}
                                    className="px-3 py-2.5 text-sm font-family-dm-sans rounded-md hover:bg-gray-3 text-gray-12 flex items-center gap-2"
                                  >
                                    <FinancialStepIcon className="size-4 text-gray-11" />
                                    Pagamento
                                  </Link>
                                )}
                              </div>
                            </PopoverContent>
                          </Popover>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={() =>
              setPagination((prev) => ({
                ...prev,
                page: Math.max(1, prev.page - 1),
              }))
            }
            disabled={pagination.page <= 1}
            className="size-8 rotate-180 rounded-md border border-gray-6 bg-gray-1 hover:bg-gray-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
          >
            <ArrowButton isOpen={false} />
          </button>
          {Array.from(
            { length: eventsPaginationTotalPages },
            (_, i) => i + 1
          ).map((page) => (
            <button
              type="button"
              key={page}
              onClick={() =>
                setPagination((prev) => ({ ...prev, page }))
              }
              className={`size-8 rounded-md border transition-colors font-family-dm-sans text-sm ${pagination.page === page
                ? "bg-primary-11 text-white border-primary-11"
                : "bg-gray-1 border-gray-6 text-gray-12 hover:bg-gray-2"
                }`}
            >
              {page}
            </button>
          ))}
          <button
            type="button"
            onClick={() =>
              setPagination((prev) => ({
                ...prev,
                page: Math.min(eventsPaginationTotalPages, prev.page + 1),
              }))
            }
            disabled={pagination.page >= eventsPaginationTotalPages}
            className="size-8 rounded-md border border-gray-6 bg-gray-1 hover:bg-gray-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
          >
            <ArrowButton isOpen={false} />
          </button>
        </div>

        <SuspendEventModal
          open={!!suspendModalEvent}
          onClose={() => setSuspendModalEvent(null)}
          event={suspendModalEvent}
          onConfirm={handleSuspendConfirm}
          loading={suspendingId === suspendModalEvent?.id}
        />
        <ResumeEventModal
          open={!!resumeModalEvent}
          onClose={() => setResumeModalEvent(null)}
          event={resumeModalEvent}
          onConfirm={handleResumeConfirm}
          loading={suspendingId === resumeModalEvent?.id}
        />

      </div>
    </div>
  );
}
