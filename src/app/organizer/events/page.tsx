"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { organizerService, userService } from "@/services";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { FlagIcon } from "@/components/Icons/FlagIcon";
import { SneakersIcon } from "@/components/Icons/SneakersIcon";
import {
  Plus,
  Search,
  Calendar,
  BarChart3,
  Pencil,
  DollarSign,
  Eye,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { PencilIcon } from "@/components/Icons/PencilIcon";
import Image from "next/image";
import { Loading, LoadingAnimation } from "@/components/Loading";

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
    if (!confirm(`Tem certeza que deseja excluir o evento "${eventName}"?`)) {
      return;
    }

    try {
      await organizerService.deleteEvent(eventId);
      toast.success("Evento excluído com sucesso");
      loadEvents();
    } catch (error: any) {
      console.error("Error deleting event:", error);
      toast.error("Erro ao excluir evento");
    }
  };

  const filteredEvents = events.filter((event) =>
    event.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
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
    };
    return statusMap[status] || statusMap.DRAFT;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getEventSales = (event: any) => {
    // TODO: Replace with actual sales data from API
    // For now, using a placeholder or calculating from registrations
    return event.totalRevenue || 0;
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
            <h1 className="text-2xl font-extrabold text-gray-12 font-dm-sans">
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
            <h2 className="text-lg font-semibold text-gray-12 mb-4 font-dm-sans">
              Lista de eventos
            </h2>
            <div className="bg-gray-1 rounded-lg border border-gray-6 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-3 border-b border-gray-6">
                    <tr>
                      <th className="text-left py-4 px-5 text-gray-12 text-sm font-semibold font-dm-sans">
                        Nome do evento
                      </th>
                      <th className="text-center py-4 px-5 text-gray-12 text-sm font-semibold font-dm-sans">
                        Status
                      </th>
                      <th className="text-center py-4 px-5 text-gray-12 text-sm font-semibold font-dm-sans">
                        Inscritos
                      </th>
                      <th className="text-center py-4 px-5 text-gray-12 text-sm font-semibold font-dm-sans">
                        Vendas
                      </th>
                      <th className="text-center py-4 px-5 text-gray-12 text-sm font-semibold font-dm-sans">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-6">
                    {filteredEvents.map((event) => {
                      const statusBadge = getStatusBadge(event.status);
                      const registrations = getEventRegistrations(event);
                      const sales = getEventSales(event);
                      return (
                        <tr
                          key={event.id}
                          className="hover:bg-gray-2 transition-colors"
                        >
                          <td className="py-4 px-5">
                            <div className="flex items-center gap-3">
                              {event.bannerUrl ? (
                                <Image src={event.bannerUrl} alt={event.name} width={36} height={36} className="rounded-lg" />
                              ) : (
                                <FlagIcon className="size-5 text-gray-12" />
                              )}
                              <span className="text-sm text-gray-12 font-semibold font-dm-sans">
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
                            <span className="text-sm font-semibold text-gray-12 font-dm-sans">
                              {registrations}
                            </span>
                          </td>
                          <td className="py-4 px-5 text-center">
                            <span className="text-sm font-semibold text-gray-12 font-dm-sans">
                              {formatCurrency(sales)}
                            </span>
                          </td>
                          <td className="py-4 px-5 text-center">
                            <div className="flex items-center gap-1 justify-center">
                              <Link
                                href={`/organizer/events/${event.id}/stats`}
                                className="size-8 rounded-lg bg-gray-2 border border-gray-6 hover:bg-gray-4 flex items-center justify-center transition-colors"
                                title="Estatísticas"
                              >
                                <BarChart3 className="size-4 text-gray-11" />
                              </Link>
                              <Link
                                href={`/organizer/events/${event.id}/edit`}
                                className="size-8 rounded-lg bg-gray-2 border border-gray-6 hover:bg-gray-4 flex items-center justify-center transition-colors"
                                title="Editar"
                              >
                                <PencilIcon className="size-4 text-gray-11" />
                              </Link>
                              <Link
                                href={`/organizer/events/${event.id}/stats`}
                                className="size-8 rounded-lg bg-gray-2 border border-gray-6 hover:bg-gray-4 flex items-center justify-center transition-colors"
                                title="Ver vendas"
                              >
                                <div className="relative">
                                  <DollarSign className="size-4 text-gray-11" />
                                  <Eye className="size-3 text-gray-11 absolute -top-1 -right-1" />
                                </div>
                              </Link>
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

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-2">
            <button
              onClick={() =>
                setPagination((prev) => ({ ...prev, page: prev.page - 1 }))
              }
              disabled={pagination.page === 1}
              className="size-8 rounded-full border border-gray-6 bg-gray-1 hover:bg-gray-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
            >
              <ChevronLeft className="size-4 text-gray-11" />
            </button>
            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(
              (page) => (
                <button
                  key={page}
                  onClick={() =>
                    setPagination((prev) => ({ ...prev, page }))
                  }
                  className={`size-8 rounded-full border transition-colors font-dm-sans text-sm ${pagination.page === page
                    ? "bg-primary-11 text-white border-primary-11"
                    : "bg-gray-1 border-gray-6 text-gray-12 hover:bg-gray-2"
                    }`}
                >
                  {page}
                </button>
              )
            )}
            <button
              onClick={() =>
                setPagination((prev) => ({ ...prev, page: prev.page + 1 }))
              }
              disabled={pagination.page === pagination.totalPages}
              className="size-8 rounded-full border border-gray-6 bg-gray-1 hover:bg-gray-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
            >
              <ChevronRight className="size-4 text-gray-11" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
