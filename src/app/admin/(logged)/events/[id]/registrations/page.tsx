"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { organizerService, userService } from "@/services";
import type { RegistrationStats } from "@/services/organizer/OrganizerService";
import type { Event } from "@/interfaces/event";
import type { DateRange } from "react-day-picker";
import { Loading } from "@/components/Loading";
import { useViewRegistrationModal, useExportDataModal, usePaymentDetailsModal } from "@/stores/modalStore";
import { AdminEventHeader } from "@/components/Admin/AdminEventHeader";
import {
  toRegistrationApiStatus,
  mergeRegistrationStatsWithTrendFallback,
  getRegistrationStatusBadge,
  type RegistrationListRow,
} from "@/lib/registrations";
import { RegistrationsView } from "@/components/Registrations/RegistrationsView";


export default function EventRegistrationsPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [authChecked, setAuthChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingList, setLoadingList] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [event, setEvent] = useState<Pick<Event, "id" | "name"> & { slug?: string } | null>(null);
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
  const [stats, setStats] = useState<RegistrationStats>({
    total: 0,
    paid: 0,
    cancelled: 0,
    totalCollected: 0,
    refunded: 0,
    refundedChange: 0
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
      router.push("/admin/login");
      return;
    }

    if (!authChecked) {
      setAuthChecked(true);
    }
  }, [authLoading, isAuthenticated, router, authChecked]);

  const loadInitialData = useCallback(async () => {
    try {
      setLoading(true);
      setPageError(null);
      const [eventData, aggregateStats] = await Promise.all([
        organizerService.getEventById(eventId),
        organizerService.getEventRegistrationStats(eventId).catch(() => null),
      ]);
      setEvent(eventData);
      if (aggregateStats) {
        setStats((prev) => mergeRegistrationStatsWithTrendFallback(prev, aggregateStats));
      }
    } catch {
      setPageError("Erro ao carregar dados do evento");
    } finally {
      setLoading(false);
    }
  }, [eventId]);

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
          startDate: appliedDateRange?.from?.toISOString(),
          endDate: appliedDateRange?.to?.toISOString(),
        });
        setRegistrations(registrationsData.registrations as RegistrationListRow[]);
        setPagination(registrationsData.pagination);
        setStats((prev) =>
          mergeRegistrationStatsWithTrendFallback(registrationsData.stats, prev),
        );
      } catch {
        setRegistrations([]);
        setPagination({ page: 1, limit: 20, total: 0, totalPages: 1 });
        setStats({ total: 0, paid: 0, cancelled: 0, totalCollected: 0, refunded: 0, refundedChange: 0 });
      }
    } catch (error: unknown) {
      console.error("Error loading registrations:", error);
      setRegistrations([]);
      setPagination({ page: 1, limit: 20, total: 0, totalPages: 1 });
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

  const getStatusBadge = getRegistrationStatusBadge;


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

  // Full-page loading só na carga inicial (ainda sem dados). Refetch (filtros, data etc.) mostra loading só na lista.
  if (pageError) {
    return (
      <div className="min-h-screen bg-gray-2 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-11 text-lg mb-4">{pageError}</p>
          <button
            onClick={() => void loadInitialData()}
            className="px-4 py-2 rounded-lg bg-primary-11 text-primary-2 font-semibold"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  if (loading && registrations.length === 0) {
    return (
      <div className="min-h-screen bg-gray-2 flex items-center justify-center">
        <Loading />
      </div>
    );
  }

  return (
    <RegistrationsView
      header={
        <AdminEventHeader
          eventId={eventId}
          eventName={event?.name}
          eventSlug={event?.slug}
        />
      }
      event={event}
      eventId={eventId}
      registrations={registrations}
      stats={stats}
      pagination={pagination}
      setPagination={setPagination}
      searchTerm={searchTerm}
      setSearchTerm={handleSearchChange}
      statusFilter={statusFilter}
      setStatusFilter={setStatusFilter}
      selectedTicketIds={selectedTicketIds}
      setSelectedTicketIds={setSelectedTicketIds}
      isTicketModalOpen={isTicketModalOpen}
      setIsTicketModalOpen={setIsTicketModalOpen}
      dateRange={dateRange}
      setDateRange={setDateRange}
      appliedDateRange={appliedDateRange}
      setAppliedDateRange={setAppliedDateRange}
      mobileFiltersOpen={mobileFiltersOpen}
      setMobileFiltersOpen={setMobileFiltersOpen}
      loadingList={loadingList}
      hasActiveFilters={hasActiveFilters}
      handleClearFilters={handleClearFilters}
      getStatusBadge={getStatusBadge}
      openViewRegistrationModal={openViewRegistrationModal}
      openPaymentDetailsModal={openPaymentDetailsModal}
      openExportDataModal={openExportDataModal}
    />
  );
}
