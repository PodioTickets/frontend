"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { organizerService } from "@/services";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import {
  Calendar,
  Plus,
  TrendingUp,
  Users,
  DollarSign,
  FileText,
  Settings,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

export default function OrganizerDashboardPage() {
  const router = useRouter();
  const { isAuthenticated, refetchUser } = useAuth();
  const [organizer, setOrganizer] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalEvents: 0,
    publishedEvents: 0,
    totalRegistrations: 0,
    totalRevenue: 0,
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const user = await refetchUser();
        const userRole = user?.role;
        if (userRole !== "ORGANIZER" && userRole !== "ADMIN") {
          router.push("/organizer/create");
          return;
        }

        try {
          const org = await organizerService.getOrganizer();
          setOrganizer(org);
        } catch (error: any) {
          if (error.response?.status === 404) {
            router.push("/organizer/create");
            return;
          }
          throw error;
        }

        const eventsData = await organizerService.getMyEvents({
          page: 1,
          limit: 100,
          includePast: true,
        });

        const allEvents = eventsData.events || [];
        const futureEvents = allEvents
          .filter((e) => {
            if (!e.eventDate) return false;
            return new Date(e.eventDate) >= new Date();
          })
          .slice(0, 10);
        setEvents(futureEvents);
        const totalEvents = eventsData.pagination?.total || allEvents.length;
        const published = allEvents.filter(
          (e) => e.status === "PUBLISHED"
        ).length;

        const totalRegistrations = allEvents.reduce(
          (sum, event) => sum + (event._count?.registrations || 0),
          0
        );

        setStats({
          totalEvents,
          publishedEvents: published,
          totalRegistrations,
          totalRevenue: 0,
        });
      } catch (error: any) {
        console.error("Error loading organizer data:", error);
        toast.error("Erro ao carregar dados do organizador");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [router, refetchUser]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-2 flex items-center justify-center">
        <div className="text-gray-11">Carregando...</div>
      </div>
    );
  }

  if (!organizer) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-2 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-12 mb-2">
            Dashboard do Organizador
          </h1>
          <p className="text-gray-11">
            Bem-vindo, {organizer.name}! Gerencie seus eventos aqui.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-1 rounded-lg p-6 border border-gray-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-11 mb-1">Total de Eventos</p>
                <p className="text-2xl font-bold text-gray-12">
                  {stats.totalEvents}
                </p>
              </div>
              <Calendar className="size-8 text-primary-10" />
            </div>
          </div>

          <div className="bg-gray-1 rounded-lg p-6 border border-gray-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-11 mb-1">Eventos Publicados</p>
                <p className="text-2xl font-bold text-gray-12">
                  {stats.publishedEvents}
                </p>
              </div>
              <TrendingUp className="size-8 text-primary-10" />
            </div>
          </div>

          <div className="bg-gray-1 rounded-lg p-6 border border-gray-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-11 mb-1">Inscrições</p>
                <p className="text-2xl font-bold text-gray-12">
                  {stats.totalRegistrations}
                </p>
              </div>
              <Users className="size-8 text-primary-10" />
            </div>
          </div>

          <div className="bg-gray-1 rounded-lg p-6 border border-gray-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-11 mb-1">Receita Total</p>
                <p className="text-2xl font-bold text-gray-12">
                  R$ {stats.totalRevenue.toFixed(2)}
                </p>
              </div>
              <DollarSign className="size-8 text-primary-10" />
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-12">Ações Rápidas</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link href="/organizer/events/new">
              <Button className="w-full h-auto p-6 flex flex-col items-center gap-2">
                <Plus className="size-6" />
                <span>Criar Novo Evento</span>
              </Button>
            </Link>
            <Link href="/organizer/events">
              <Button
                variant="outline"
                className="w-full h-auto p-6 flex flex-col items-center gap-2 text-gray-12 border-gray-6"
              >
                <FileText className="size-6" />
                <span>Ver Todos os Eventos</span>
              </Button>
            </Link>
            <Link href="/organizer/settings">
              <Button
                variant="outline"
                className="w-full h-auto p-6 flex flex-col items-center gap-2 text-gray-12 border-gray-6"
              >
                <Settings className="size-6" />
                <span>Configurações</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Recent Events */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-12">Eventos Recentes</h2>
            <Link href="/organizer/events">
              <Button variant="ghost" size="sm">
                Ver todos <ArrowRight className="size-4 ml-2" />
              </Button>
            </Link>
          </div>

          {events.length === 0 ? (
            <div className="bg-gray-1 rounded-lg p-12 border border-gray-6 text-center">
              <Calendar className="size-12 text-gray-11 mx-auto mb-4" />
              <p className="text-gray-11 mb-4">
                Você ainda não criou nenhum evento
              </p>
              <Link href="/organizer/events/new">
                <Button>
                  <Plus className="size-4 mr-2" />
                  Criar Primeiro Evento
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {events.map((event) => (
                <Link
                  key={event.id}
                  href={`/organizer/events/${event.id}/edit`}
                  className="bg-gray-1 rounded-lg p-6 border border-gray-6 hover:border-primary-10 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-lg font-semibold text-gray-12">
                      {event.name}
                    </h3>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        event.status === "PUBLISHED"
                          ? "bg-green-10/20 text-green-11"
                          : event.status === "DRAFT"
                          ? "bg-yellow-10/20 text-yellow-11"
                          : "bg-gray-10/20 text-gray-11"
                      }`}
                    >
                      {event.status === "PUBLISHED"
                        ? "Publicado"
                        : event.status === "DRAFT"
                        ? "Rascunho"
                        : event.status}
                    </span>
                  </div>
                  {event.city && event.state && (
                    <p className="text-sm text-gray-11 mb-2">
                      {event.city}, {event.state}
                    </p>
                  )}
                  {event.eventDate && (
                    <p className="text-sm text-gray-11">
                      {new Date(event.eventDate).toLocaleDateString("pt-BR")}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
