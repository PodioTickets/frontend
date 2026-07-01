import { useCallback, useEffect, useRef, useState } from "react";
import type { DateRange } from "react-day-picker";
import { useAuth } from "@/hooks/useAuth";
import { organizerService, userService } from "@/services";
import type { RegistrationStats } from "@/services/organizer/OrganizerService";
import type { Event } from "@/interfaces/event";
import {
  useViewRegistrationModal,
  useExportDataModal,
  usePaymentDetailsModal,
} from "@/stores/modalStore";
import {
  toRegistrationApiStatus,
  mergeRegistrationStatsWithTrendFallback,
  getRegistrationStatusBadge,
  type RegistrationListRow,
} from "@/lib/registrations";
import type { RegistrationsViewProps } from "@/components/Registrations/RegistrationsView";
import { toCivilDayString } from "@/utils/datetimeBR";

/**
 * Controller da listagem de inscrições do evento — compartilhado entre as páginas
 * de admin e organizer (antes ~190 linhas duplicadas em cada). Espelha o padrão
 * de `useEventDashboard`. Diferenças entre as duas viram parâmetros:
 *  - `onUnauthenticated`: para onde redirecionar quando não há sessão.
 *  - `loadAggregateStats`: o admin carrega `getEventRegistrationStats` (stats
 *    agregadas do evento) na carga inicial; o organizer não.
 *
 * Retorna o estado de carga/erro da página + `viewProps`, o pacote exato de
 * props do `<RegistrationsView>` (menos o `header`, injetado por cada página).
 */
export interface UseEventRegistrationsParams {
  eventId: string;
  onUnauthenticated: () => void;
  loadAggregateStats?: boolean;
}

export interface UseEventRegistrationsResult {
  loading: boolean;
  pageError: string | null;
  loadInitialData: () => Promise<void>;
  registrations: RegistrationListRow[];
  viewProps: Omit<RegistrationsViewProps, "header">;
}

const EMPTY_STATS: RegistrationStats = {
  total: 0,
  paid: 0,
  cancelled: 0,
  totalCollected: 0,
  refunded: 0,
  refundedChange: 0,
};

const EMPTY_PAGINATION = { page: 1, limit: 20, total: 0, totalPages: 1 };

export function useEventRegistrations({
  eventId,
  onUnauthenticated,
  loadAggregateStats = false,
}: UseEventRegistrationsParams): UseEventRegistrationsResult {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [authChecked, setAuthChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingList, setLoadingList] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [event, setEvent] = useState<
    (Pick<Event, "id" | "name"> & { slug?: string }) | null
  >(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [registrations, setRegistrations] = useState<RegistrationListRow[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedTicketIds, setSelectedTicketIds] = useState<string[]>([]);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [appliedDateRange, setAppliedDateRange] = useState<DateRange | undefined>(undefined);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const { openViewRegistrationModal } = useViewRegistrationModal();
  const { openExportDataModal } = useExportDataModal();
  const { openPaymentDetailsModal } = usePaymentDetailsModal();
  const [stats, setStats] = useState<RegistrationStats>(EMPTY_STATS);
  const [pagination, setPagination] = useState(EMPTY_PAGINATION);

  useEffect(() => {
    // Aguarda a verificação de autenticação terminar
    if (authLoading) return;

    const hasToken = userService.isAuthenticated();
    if (!hasToken && !isAuthenticated) {
      onUnauthenticated();
      return;
    }

    if (!authChecked) {
      setAuthChecked(true);
    }
  }, [authLoading, isAuthenticated, onUnauthenticated, authChecked]);

  const loadInitialData = useCallback(async () => {
    try {
      setLoading(true);
      setPageError(null);
      // Admin também busca as stats agregadas do evento; organizer só o evento.
      const [eventData, aggregateStats] = await Promise.all([
        organizerService.getEventById(eventId),
        loadAggregateStats
          ? organizerService.getEventRegistrationStats(eventId).catch(() => null)
          : Promise.resolve(null),
      ]);
      setEvent(eventData);
      if (aggregateStats) {
        // `aggregateStats` (endpoint dedicado) é a FONTE primária dos totais —
        // inclusive `totalCollected` (Receita Líquida). `prev` entra só como
        // fallback de tendência (*Change). Passar `prev` como primário (bug
        // anterior) descartava o totalCollected real, zerando a Receita Líquida
        // de forma intermitente conforme a ordem das requisições. Mesma ordem
        // de args do merge em `loadRegistrations`.
        setStats((prev) => mergeRegistrationStatsWithTrendFallback(aggregateStats, prev));
      }
    } catch {
      setPageError("Erro ao carregar dados do evento");
    } finally {
      setLoading(false);
    }
  }, [eventId, loadAggregateStats]);

  const loadRegistrations = useCallback(async () => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();
    try {
      setLoadingList(true);
      try {
        const registrationsData = await organizerService.getEventRegistrationsEnhanced(eventId, {
          page: pagination.page,
          limit: pagination.limit,
          status:
            statusFilter !== "all"
              ? toRegistrationApiStatus(statusFilter)
              : undefined,
          search: searchTerm || undefined,
          ticketIds: selectedTicketIds.length > 0 ? selectedTicketIds : undefined,
          startDate: toCivilDayString(appliedDateRange?.from),
          endDate: toCivilDayString(appliedDateRange?.to),
        });
        setRegistrations(registrationsData.registrations as RegistrationListRow[]);
        setPagination(registrationsData.pagination);
        setStats((prev) =>
          mergeRegistrationStatsWithTrendFallback(registrationsData.stats, prev),
        );
      } catch {
        setRegistrations([]);
        setPagination(EMPTY_PAGINATION);
        setStats(EMPTY_STATS);
      }
    } catch (error: unknown) {
      console.error("Error loading registrations:", error);
      setRegistrations([]);
      setPagination(EMPTY_PAGINATION);
    } finally {
      setLoadingList(false);
    }
  }, [
    appliedDateRange?.from,
    appliedDateRange?.to,
    eventId,
    pagination.limit,
    pagination.page,
    searchTerm,
    selectedTicketIds,
    statusFilter,
  ]);

  useEffect(() => {
    if (!authChecked || authLoading || !eventId) return;
    void loadInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authChecked, authLoading, eventId]);

  useEffect(() => {
    if (!authChecked || authLoading || !eventId) return;
    const timeoutId = setTimeout(() => {
      void loadRegistrations();
    }, searchTerm ? 500 : 0);

    return () => clearTimeout(timeoutId);
  }, [
    appliedDateRange,
    authChecked,
    authLoading,
    eventId,
    loadRegistrations,
    pagination.page,
    searchTerm,
    selectedTicketIds,
    statusFilter,
  ]);

  /* Estorno/cancelamento de pedido acontece no PaymentDetailsModal (montado FORA
   * dos providers da página — [[feedback_modals_outside_providers]]), que notifica
   * via `window` event `orderRefunded`. Sem escutar aqui, a LISTA e as STATS só
   * atualizavam no refresh. Refaz a busca (traz status + stats novos do backend). */
  useEffect(() => {
    if (!authChecked || !eventId) return;
    // `Event` (DOM) está sombreado pelo import de `@/interfaces/event`; usamos
    // `CustomEvent` (não sombreado) e castamos p/ `EventListener` no add/remove.
    const handler = (e: CustomEvent<{ eventId?: string }>) => {
      const detail = e.detail;
      // Ignora eventos de outro evento (guarda contra múltiplas telas montadas).
      if (detail?.eventId && detail.eventId !== eventId) return;
      void loadRegistrations();
    };
    window.addEventListener("orderRefunded", handler as EventListener);
    return () => window.removeEventListener("orderRefunded", handler as EventListener);
  }, [authChecked, eventId, loadRegistrations]);

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

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  return {
    loading,
    pageError,
    loadInitialData,
    registrations,
    viewProps: {
      event,
      eventId,
      registrations,
      stats,
      pagination,
      setPagination,
      searchTerm,
      setSearchTerm: handleSearchChange,
      statusFilter,
      setStatusFilter,
      selectedTicketIds,
      setSelectedTicketIds,
      isTicketModalOpen,
      setIsTicketModalOpen,
      dateRange,
      setDateRange,
      appliedDateRange,
      setAppliedDateRange,
      mobileFiltersOpen,
      setMobileFiltersOpen,
      loadingList,
      hasActiveFilters,
      handleClearFilters,
      getStatusBadge: getRegistrationStatusBadge,
      openViewRegistrationModal,
      openPaymentDetailsModal,
      openExportDataModal,
    },
  };
}
