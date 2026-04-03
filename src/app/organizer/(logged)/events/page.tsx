"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { organizerService, userService } from "@/services";
import { Button } from "@/components/Button";
import { FlagIcon } from "@/components/Icons/FlagIcon";
import {
  Plus,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { PencilIcon } from "@/components/Icons/PencilIcon";
import { ImageWithInitialFallback } from "@/components/ImageWithInitialFallback";
import { LoadingAnimation } from "@/components/Loading";
import { MoneyIcon } from "@/components/Icons/MoneyIcon";
import { DashboardIcon } from "@/components/Icons/Organizer/DashboardIcon";
import { UsersIcon } from "@/components/Icons/Organizer/UsersIcon";
import { ThreePointsIcon } from "@/components/Icons/Organizer/ThreePointsIcon";
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

export default function OrganizerEventsPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
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
  const [suspendingId, setSuspendingId] = useState<string | null>(null);
  const [suspendModalEvent, setSuspendModalEvent] = useState<any>(null);
  const [resumeModalEvent, setResumeModalEvent] = useState<any>(null);

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
    if (!authChecked || authLoading) return;
    loadEvents();
  }, [authChecked, statusFilter, pagination.page]);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: pagination.page,
        limit: pagination.limit,
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
    <div className="min-h-screen bg-gray-2 py-8 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FlagIcon className="size-6 text-gray-12" />
            <h1 className="text-2xl font-extrabold text-gray-12 font-family-dm-sans">
              Meus eventos
            </h1>
          </div>
          <Link href="/organizer/events/new">
            <Button className="">
              Criar evento
            </Button>
          </Link>
        </div>

        {/* Events Table */}
        {filteredEvents.length === 0 ? (
          <div className="bg-gray-1 rounded-lg p-12 border border-gray-6 text-center">
            <Calendar className="size-12 text-gray-11 mx-auto mb-4" />
            <p className="text-gray-11 mb-4">
              {searchTerm
                ? "Nenhum evento encontrado com essa busca"
                : "Você ainda não criou nenhum evento"}
            </p>
            {!searchTerm && (
              <Link href="/organizer/events/new">
                <Button>
                  <Plus className="size-4 mr-2" />
                  Criar Primeiro Evento
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <>
            <h2 className="text-lg font-semibold text-gray-12 mb-4 font-family-dm-sans">
              Lista de eventos
            </h2>
            <div className="bg-gray-1 rounded-lg border border-gray-6 overflow-hidden">
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
                        Vendas
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
                                  className="size-full"
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
                          <td className="py-4 px-5 text-center">
                            <div className="flex items-center gap-1 justify-center">
                              <Link
                                href={`/organizer/events/${event.id}/dashboard`}
                                className="size-8 rounded-lg bg-gray-2 border border-gray-6 hover:bg-gray-4 flex items-center justify-center transition-colors"
                                title="Dashboard"
                              >
                                <DashboardIcon className="size-4 text-gray-11" />
                              </Link>
                              <Link
                                href={`/organizer/events/${event.id}/edit`}
                                className="size-8 rounded-lg bg-gray-2 border border-gray-6 hover:bg-gray-4 flex items-center justify-center transition-colors"
                                title="Editar"
                              >
                                <PencilIcon className="size-4 text-gray-11" />
                              </Link>
                              <Link
                                href={`/organizer/events/${event.id}/financial`}
                                className="size-8 rounded-lg bg-gray-2 border border-gray-6 hover:bg-gray-4 flex items-center justify-center transition-colors"
                                title="Ver financeiro"
                              >
                                <MoneyIcon className="size-5 text-gray-11" />
                              </Link>

                              <Link
                                href={`/organizer/events/${event.id}/registrations`}
                                className="size-8 rounded-lg bg-gray-2 border border-gray-6 hover:bg-gray-4 flex items-center justify-center transition-colors"
                                title="Ver inscritos"
                              >
                                <UsersIcon className="size-5 text-gray-11" />
                              </Link>

                              <Popover
                                open={menuOpenForId === event.id}
                                onOpenChange={(open) =>
                                  setMenuOpenForId(open ? event.id : null)
                                }
                              >
                                <PopoverTrigger asChild>
                                  <button
                                    type="button"
                                    className="size-8 rounded-lg bg-transparent hover:bg-gray-4 flex items-center justify-center transition-colors"
                                    title="Mais opções"
                                    aria-label="Mais opções"
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
                                    <Link
                                      href={`/organizer/events/${event.id}/discount/cupom`}
                                      onClick={() => setMenuOpenForId(null)}
                                      className="px-3 py-2.5 text-sm font-family-dm-sans rounded-md hover:bg-gray-3 text-gray-12"
                                    >
                                      Cupom
                                    </Link>
                                    <Link
                                      href={`/organizer/events/${event.id}/discount/voucher`}
                                      onClick={() => setMenuOpenForId(null)}
                                      className="px-3 py-2.5 text-sm font-family-dm-sans rounded-md hover:bg-gray-3 text-gray-12"
                                    >
                                      Voucher
                                    </Link>
                                    <Link
                                      href={`/organizer/events/${event.id}/ads`}
                                      onClick={() => setMenuOpenForId(null)}
                                      className="px-3 py-2.5 text-sm font-family-dm-sans rounded-md hover:bg-gray-3 text-gray-12"
                                    >
                                      ADS
                                    </Link>
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
                                        "w-full text-left px-3 py-2.5 text-sm font-family-dm-sans rounded-md transition-colors",
                                        "hover:bg-gray-3 text-gray-12",
                                        "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                                      )}
                                    >
                                      {isEventSuspended(event)
                                        ? "Reativar evento"
                                        : "Suspender evento"}
                                    </button>
                                  </div>
                                </PopoverContent>
                              </Popover>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        <div className="mt-8 flex items-center justify-center gap-2">
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
