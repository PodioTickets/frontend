"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { organizerService } from "@/services";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import {
  ArrowLeft,
  Search,
  Users,
  Download,
  Eye,
  Calendar,
  DollarSign,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

export default function EventRegistrationsPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;
  const { isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<any>(null);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/");
      return;
    }

    loadData();
  }, [eventId, isAuthenticated, statusFilter, pagination.page]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [eventData, registrationsData] = await Promise.all([
        organizerService.getEventById(eventId),
        organizerService.getEventRegistrations(eventId, {
          page: pagination.page,
          limit: pagination.limit,
          status: statusFilter !== "all" ? statusFilter : undefined,
        }),
      ]);

      setEvent(eventData);
      setRegistrations(registrationsData.registrations || []);
      setPagination(registrationsData.pagination || pagination);
    } catch (error: any) {
      console.error("Error loading data:", error);
      toast.error("Erro ao carregar dados");
      router.push("/organizer/events");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<
      string,
      { label: string; className: string; icon: any }
    > = {
      PENDING: {
        label: "Pendente",
        className: "bg-yellow-10/20 text-yellow-11",
        icon: Clock,
      },
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
    };
    return statusMap[status] || statusMap.PENDING;
  };

  const filteredRegistrations = registrations.filter((reg) => {
    const searchLower = searchTerm.toLowerCase();
    const userName = `${reg.user?.firstName || ""} ${reg.user?.lastName || ""}`.toLowerCase();
    const userEmail = reg.user?.email?.toLowerCase() || "";
    return (
      userName.includes(searchLower) ||
      userEmail.includes(searchLower) ||
      reg.id.toLowerCase().includes(searchLower)
    );
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-2 flex items-center justify-center">
        <div className="text-gray-11">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-2 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link
          href={`/organizer/events/${eventId}/edit`}
          className="inline-flex items-center text-gray-11 hover:text-gray-12 mb-6"
        >
          <ArrowLeft className="size-4 mr-2" />
          Voltar para Edição
        </Link>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-12 mb-2">
                Inscrições - {event?.name}
              </h1>
              <p className="text-gray-11">
                Visualize e gerencie todas as inscrições do evento
              </p>
            </div>
            <Button variant="outline">
              <Download className="size-4 mr-2" />
              Exportar
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-11" />
            <Input
              type="text"
              placeholder="Buscar por nome, email ou ID..."
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
            <option value="PENDING">Pendente</option>
            <option value="CONFIRMED">Confirmada</option>
            <option value="CANCELLED">Cancelada</option>
            <option value="COMPLETED">Concluída</option>
          </select>
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
            <div className="bg-gray-1 rounded-lg border border-gray-6 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-2 border-b border-gray-6">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-11 uppercase tracking-wider">
                        Participante
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-11 uppercase tracking-wider">
                        Modalidades
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-11 uppercase tracking-wider">
                        Valor
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-11 uppercase tracking-wider">
                        Data
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-11 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-11 uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-6">
                    {filteredRegistrations.map((registration) => {
                      const statusBadge = getStatusBadge(registration.status);
                      const StatusIcon = statusBadge.icon;
                      return (
                        <tr
                          key={registration.id}
                          className="hover:bg-gray-2 transition-colors"
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-12">
                                {registration.user?.firstName}{" "}
                                {registration.user?.lastName}
                              </div>
                              <div className="text-sm text-gray-11">
                                {registration.user?.email}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-12">
                              {registration.modalities
                                ?.map((m: any) => m.modality?.name)
                                .join(", ") || "-"}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-12">
                              R$ {registration.finalAmount?.toFixed(2) || "0.00"}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-11">
                              {registration.purchaseDate
                                ? new Date(
                                    registration.purchaseDate
                                  ).toLocaleDateString("pt-BR", {
                                    day: "2-digit",
                                    month: "2-digit",
                                    year: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                : "-"}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${statusBadge.className}`}
                            >
                              <StatusIcon className="size-3" />
                              {statusBadge.label}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <Button variant="ghost" size="sm">
                              <Eye className="size-4" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setPagination((prev) => ({
                      ...prev,
                      page: prev.page - 1,
                    }))
                  }
                  disabled={pagination.page === 1}
                >
                  Anterior
                </Button>
                <span className="text-sm text-gray-11">
                  Página {pagination.page} de {pagination.totalPages} (
                  {pagination.total} total)
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setPagination((prev) => ({
                      ...prev,
                      page: prev.page + 1,
                    }))
                  }
                  disabled={pagination.page === pagination.totalPages}
                >
                  Próxima
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

