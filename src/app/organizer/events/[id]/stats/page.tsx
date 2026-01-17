"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { organizerService, userService } from "@/services";
import { Button } from "@/components/Button";
import {
  ArrowLeft,
  BarChart3,
  Users,
  DollarSign,
  TrendingUp,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

export default function EventStatsPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [authChecked, setAuthChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [revenue, setRevenue] = useState<any>(null);

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
  }, [authChecked, eventId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [eventData, statsData, revenueData] = await Promise.all([
        organizerService.getEventById(eventId),
        organizerService.getEventStats(eventId),
        organizerService.getEventRevenue(eventId),
      ]);

      setEvent(eventData);
      setStats(statsData);
      setRevenue(revenueData);
    } catch (error: any) {
      console.error("Error loading data:", error);
      toast.error("Erro ao carregar dados");
      router.push("/organizer/events");
    } finally {
      setLoading(false);
    }
  };

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
          <div>
            <h1 className="text-3xl font-bold text-gray-12 mb-2">
              Estatísticas - {event?.name}
            </h1>
            <p className="text-gray-11">
              Visualize as estatísticas e receita do seu evento
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-1 rounded-lg p-6 border border-gray-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-11 mb-1">Total de Inscrições</p>
                <p className="text-2xl font-bold text-gray-12">
                  {stats?.totalRegistrations || 0}
                </p>
              </div>
              <Users className="size-8 text-primary-10" />
            </div>
          </div>

          <div className="bg-gray-1 rounded-lg p-6 border border-gray-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-11 mb-1">Confirmadas</p>
                <p className="text-2xl font-bold text-gray-12">
                  {stats?.confirmedRegistrations || 0}
                </p>
              </div>
              <CheckCircle className="size-8 text-green-10" />
            </div>
          </div>

          <div className="bg-gray-1 rounded-lg p-6 border border-gray-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-11 mb-1">Pendentes</p>
                <p className="text-2xl font-bold text-gray-12">
                  {stats?.pendingRegistrations || 0}
                </p>
              </div>
              <Clock className="size-8 text-yellow-10" />
            </div>
          </div>

          <div className="bg-gray-1 rounded-lg p-6 border border-gray-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-11 mb-1">Receita Total</p>
                <p className="text-2xl font-bold text-gray-12">
                  R$ {stats?.totalRevenue?.toFixed(2) || "0.00"}
                </p>
              </div>
              <DollarSign className="size-8 text-green-10" />
            </div>
          </div>
        </div>

        {/* Additional Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Registrations by Status */}
          <div className="bg-gray-1 rounded-lg border border-gray-6 p-6">
            <h2 className="text-lg font-semibold text-gray-12 mb-4">
              Inscrições por Status
            </h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="size-4 text-green-10" />
                  <span className="text-sm text-gray-11">Confirmadas</span>
                </div>
                <span className="text-sm font-medium text-gray-12">
                  {stats?.confirmedRegistrations || 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="size-4 text-yellow-10" />
                  <span className="text-sm text-gray-11">Pendentes</span>
                </div>
                <span className="text-sm font-medium text-gray-12">
                  {stats?.pendingRegistrations || 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <XCircle className="size-4 text-red-10" />
                  <span className="text-sm text-gray-11">Canceladas</span>
                </div>
                <span className="text-sm font-medium text-gray-12">
                  {stats?.cancelledRegistrations || 0}
                </span>
              </div>
            </div>
          </div>

          {/* Revenue Breakdown */}
          <div className="bg-gray-1 rounded-lg border border-gray-6 p-6">
            <h2 className="text-lg font-semibold text-gray-12 mb-4">
              Receita
            </h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-11">Total Arrecadado</span>
                <span className="text-lg font-bold text-gray-12">
                  R$ {revenue?.total?.toFixed(2) || "0.00"}
                </span>
              </div>
              {revenue?.breakdown && revenue.breakdown.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-6">
                  <p className="text-sm font-medium text-gray-12 mb-2">
                    Por Modalidade
                  </p>
                  <div className="space-y-2">
                    {revenue.breakdown.map((item: any, idx: number) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="text-gray-11">{item.name}</span>
                        <span className="text-gray-12">
                          R$ {item.amount?.toFixed(2) || "0.00"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Registrations by Modality */}
        {stats?.registrationsByModality &&
          stats.registrationsByModality.length > 0 && (
            <div className="bg-gray-1 rounded-lg border border-gray-6 p-6">
              <h2 className="text-lg font-semibold text-gray-12 mb-4">
                Inscrições por Modalidade
              </h2>
              <div className="space-y-3">
                {stats.registrationsByModality.map((item: any) => (
                  <div key={item.modalityId} className="flex items-center justify-between">
                    <span className="text-sm text-gray-11">
                      {item.modalityName}
                    </span>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-gray-11">
                        {item.count} inscrições
                      </span>
                      <div className="w-32 h-2 bg-gray-6 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary-10 transition-all"
                          style={{
                            width: `${
                              stats.totalRegistrations > 0
                                ? (item.count / stats.totalRegistrations) * 100
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
      </div>
    </div>
  );
}

