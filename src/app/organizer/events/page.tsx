"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { organizerService, userService } from "@/services";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import {
  Plus,
  Search,
  Calendar,
  MapPin,
  Edit,
  Trash2,
  Eye,
  MoreVertical,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

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

  const handlePublish = async (eventId: string) => {
    try {
      await organizerService.publishEvent(eventId);
      toast.success("Evento publicado com sucesso");
      loadEvents();
    } catch (error: any) {
      console.error("Error publishing event:", error);
      toast.error("Erro ao publicar evento");
    }
  };

  const filteredEvents = events.filter((event) =>
    event.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      DRAFT: { label: "Rascunho", className: "bg-yellow-10/20 text-yellow-11" },
      PUBLISHED: {
        label: "Publicado",
        className: "bg-green-10/20 text-green-11",
      },
      CANCELLED: { label: "Cancelado", className: "bg-red-10/20 text-red-11" },
      COMPLETED: {
        label: "Concluído",
        className: "bg-gray-10/20 text-gray-11",
      },
    };
    return statusMap[status] || statusMap.DRAFT;
  };

  if (authLoading || (!authChecked && !authLoading)) {
    return (
      <div className="min-h-screen bg-gray-2 flex items-center justify-center">
        <div className="text-gray-11">Carregando...</div>
      </div>
    );
  }

  if (loading && events.length === 0) {
    return (
      <div className="min-h-screen bg-gray-2 flex items-center justify-center">
        <div className="text-gray-11">Carregando eventos...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-2 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/organizer"
            className="inline-flex items-center text-gray-11 hover:text-gray-12 mb-4"
          >
            <ArrowLeft className="size-4 mr-2" />
            Voltar ao Dashboard
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-12 mb-2">
                Meus Eventos
              </h1>
              <p className="text-gray-11">
                Gerencie todos os seus eventos em um só lugar
              </p>
            </div>
            <Link href="/organizer/events/new">
              <Button>Criar Evento</Button>
            </Link>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-11" />
            <Input
              type="text"
              placeholder="Buscar eventos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            className="px-4 py-2 rounded-lg border border-gray-6 bg-gray-1 text-gray-12 focus:outline-none focus:ring-2 focus:ring-primary-11/50"
          >
            <option value="all">Todos os status</option>
            <option value="DRAFT">Rascunho</option>
            <option value="PUBLISHED">Publicado</option>
            <option value="CANCELLED">Cancelado</option>
            <option value="COMPLETED">Concluído</option>
          </select>
        </div>

        {/* Events List */}
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredEvents.map((event) => {
              const statusBadge = getStatusBadge(event.status);
              return (
                <div
                  key={event.id}
                  className="bg-gray-1 rounded-lg border border-gray-6 p-6 hover:border-primary-10 transition-colors"
                >
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-12 flex-1">
                      {event.name}
                    </h3>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${statusBadge.className}`}
                    >
                      {statusBadge.label}
                    </span>
                  </div>

                  {event.description && (
                    <p className="text-sm text-gray-11 mb-4 line-clamp-2">
                      {event.description}
                    </p>
                  )}

                  <div className="space-y-2 mb-4">
                    {event.city && event.state && (
                      <div className="flex items-center text-sm text-gray-11">
                        <MapPin className="size-4 mr-2" />
                        {event.city}, {event.state}
                      </div>
                    )}
                    {event.eventDate && (
                      <div className="flex items-center text-sm text-gray-11">
                        <Calendar className="size-4 mr-2" />
                        {new Date(event.eventDate).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "long",
                          year: "numeric",
                        })}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-4 border-t border-gray-6">
                    <Link
                      href={`/organizer/events/${event.id}/edit`}
                      className="flex-1"
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-gray-12 border-gray-6"
                      >
                        <Edit className="size-4 mr-2" />
                        Editar
                      </Button>
                    </Link>
                    {event.status === "DRAFT" && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handlePublish(event.id)}
                        className="flex-1"
                      >
                        Publicar
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(event.id, event.name)}
                      className="text-red-10 hover:text-red-11"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setPagination((prev) => ({ ...prev, page: prev.page - 1 }))
              }
              disabled={pagination.page === 1}
            >
              Anterior
            </Button>
            <span className="text-sm text-gray-11">
              Página {pagination.page} de {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setPagination((prev) => ({ ...prev, page: prev.page + 1 }))
              }
              disabled={pagination.page === pagination.totalPages}
            >
              Próxima
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
