import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { organizerService } from "@/services";
import { queryKeys } from "@/services/cache/QueryClient";
import type {
  DashboardOverviewData,
  DashboardRankingsData,
  DashboardSecondaryData,
} from "@/services/organizer/OrganizerService";

/**
 * Hooks pra as 3 rotas do dashboard split.
 *
 * Cada hook tem queryKey própria com params como sub-chave — paginar/filtrar
 * uma rota não invalida as outras. `placeholderData: keepPreviousData` mantém
 * os dados anteriores visíveis durante o refetch (zero flash de loading).
 *
 * `staleTime` alinhado com o cache backend (Redis): overview/rankings 30s,
 * secondary 60s. Dentro desse intervalo, voltar pra page reaproveita o cache
 * client-side sem refetch.
 */

type Period = "geral" | "24h" | "7d" | "15d" | "1m" | "2m";

interface BaseParams {
  period?: Period;
  ticketIds?: string[];
}

interface RankingsParams extends BaseParams {
  ticketRankingPage?: number;
  ticketRankingLimit?: number;
  ticketsPage?: number;
  ticketsLimit?: number;
}

const STALE_30S = 30_000;
const STALE_60S = 60_000;

export function useDashboardOverview(
  eventId: string | null,
  params: BaseParams,
  enabled = true,
) {
  return useQuery<DashboardOverviewData>({
    queryKey: queryKeys.events.dashboard.overview(eventId ?? "", params),
    queryFn: () => organizerService.getEventDashboardOverview(eventId!, params),
    enabled: enabled && !!eventId,
    staleTime: STALE_30S,
    placeholderData: keepPreviousData,
  });
}

export function useDashboardRankings(
  eventId: string | null,
  params: RankingsParams,
  enabled = true,
) {
  return useQuery<DashboardRankingsData>({
    queryKey: queryKeys.events.dashboard.rankings(eventId ?? "", params),
    queryFn: () => organizerService.getEventDashboardRankings(eventId!, params),
    enabled: enabled && !!eventId,
    staleTime: STALE_30S,
    placeholderData: keepPreviousData,
  });
}

export function useDashboardSecondary(
  eventId: string | null,
  params: BaseParams,
  enabled = true,
) {
  return useQuery<DashboardSecondaryData>({
    queryKey: queryKeys.events.dashboard.secondary(eventId ?? "", params),
    queryFn: () => organizerService.getEventDashboardSecondary(eventId!, params),
    enabled: enabled && !!eventId,
    staleTime: STALE_60S,
    placeholderData: keepPreviousData,
  });
}
