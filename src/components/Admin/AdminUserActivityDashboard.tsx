"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, Users, Link2, Ghost, Eye, BadgeCheck } from "lucide-react";
import { cn } from "@/utils/cn";
import { adminService } from "@/services";
import { queryKeys } from "@/services/cache/QueryClient";
import {
  USER_ACTIVITY_CATEGORIES,
  USER_ACTIVITY_SOURCES,
} from "@/services/admin/AdminService";
import toast from "react-hot-toast";
import { formatDateBR, toUtcDate } from "@/utils/datetimeBR";
import {
  CATEGORY_LABELS,
  SOURCE_LABELS,
  CATEGORY_BAR,
} from "./userActivityLabels";
import {
  AdminEventFilterSelect,
  type EventFilterOption,
} from "./AdminEventFilterSelect";

const PERIOD_OPTIONS = [
  { value: 7, label: "Últimos 7 dias" },
  { value: 30, label: "Últimos 30 dias" },
  { value: 90, label: "Últimos 90 dias" },
] as const;

/** `from` (YYYY-MM-DD, UTC) de uma janela de N dias terminando hoje. */
function fromForPeriod(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - (days - 1));
  return d.toISOString().slice(0, 10);
}

const numberFmt = new Intl.NumberFormat("pt-BR");

/**
 * Série diária densa: o backend manda apenas dias COM eventos — preenche os
 * buracos com 0 sobre a janela pra barra de cada dia existir no gráfico.
 * Cap defensivo de 370 pontos — range malformado não trava o render.
 */
function densifyDailySeries(
  series: Array<{ day: string; count: number }>,
  fromIso: string,
  toIso: string
): Array<{ day: string; count: number }> {
  const byDay = new Map(series.map((p) => [p.day, p.count]));
  const start = toUtcDate(fromIso.slice(0, 10));
  const end = toUtcDate(toIso.slice(0, 10));
  if (!start || !end) return series;
  const out: Array<{ day: string; count: number }> = [];
  const cursor = new Date(start.getTime());
  while (cursor.getTime() <= end.getTime() && out.length < 370) {
    const key = cursor.toISOString().slice(0, 10);
    out.push({ day: key, count: byDay.get(key) ?? 0 });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return out;
}

/** Gráfico de barras diário (CSS puro — sem custo de bundle de chart lib). */
function DailyBars({
  series,
  unitLabel,
}: {
  series: Array<{ day: string; count: number }>;
  unitLabel: string;
}) {
  const max = series.reduce((m, p) => Math.max(m, p.count), 0);
  if (max === 0) {
    return (
      <p className="py-8 text-center text-sm text-gray-11 font-family-dm-sans">
        Nenhum registro no período.
      </p>
    );
  }
  return (
    <>
      <div className="flex h-[160px] items-end gap-px md:gap-0.5">
        {series.map((p) => (
          <div
            key={p.day}
            className="group relative flex-1 min-w-0 h-full flex items-end"
            title={`${formatDateBR(p.day)} — ${numberFmt.format(p.count)} ${unitLabel}`}
          >
            <div
              className={cn(
                "w-full rounded-t-sm transition-colors",
                p.count > 0
                  ? "bg-primary-9 group-hover:bg-primary-11"
                  : "bg-gray-4"
              )}
              style={{
                height:
                  p.count > 0
                    ? `${Math.max(4, (p.count / max) * 100)}%`
                    : "2px",
              }}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-gray-11 font-family-dm-sans">
        <span>{formatDateBR(series[0]?.day)}</span>
        <span>{formatDateBR(series[series.length - 1]?.day)}</span>
      </div>
    </>
  );
}

function StatCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-gray-6 bg-gray-1 p-4 ">
      <div className="flex items-center gap-2 text-gray-11">
        {icon}
        <p className="text-xs font-semibold font-family-dm-sans uppercase tracking-wide">
          {label}
        </p>
      </div>
      <p className="mt-2 text-2xl font-extrabold font-manrope leading-[1.1] text-gray-12 tabular-nums">
        {numberFmt.format(value)}
      </p>
      {hint ? (
        <p className="mt-1 text-xs text-gray-11 font-family-dm-sans">{hint}</p>
      ) : null}
    </div>
  );
}

/** Linha de distribuição: label + barra proporcional + contagem. */
function DistributionRow({
  label,
  count,
  max,
  barClass,
}: {
  label: string;
  count: number;
  max: number;
  barClass?: string;
}) {
  const pct = max > 0 ? Math.max(2, Math.round((count / max) * 100)) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-[150px] shrink-0 truncate text-sm text-gray-12 font-family-dm-sans">
        {label}
      </span>
      <div className="flex-1 h-2.5 rounded-full bg-gray-3 overflow-hidden">
        <div
          className={cn("h-full rounded-full", barClass ?? "bg-primary-9")}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-16 shrink-0 text-right text-sm font-semibold text-gray-12 font-family-dm-sans tabular-nums">
        {numberFmt.format(count)}
      </span>
    </div>
  );
}

export function AdminUserActivityDashboard() {
  const [periodDays, setPeriodDays] = useState<number>(30);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [eventFilter, setEventFilter] = useState<EventFilterOption | null>(
    null
  );

  const from = useMemo(() => fromForPeriod(periodDays), [periodDays]);

  const statsQuery = useQuery({
    queryKey: queryKeys.admin.userActivity.stats({
      from,
      category: categoryFilter,
      source: sourceFilter,
      eventId: eventFilter?.id ?? "",
    }),
    queryFn: () =>
      adminService.getUserActivityStats({
        from,
        category: categoryFilter || undefined,
        source: sourceFilter || undefined,
        eventId: eventFilter?.id || undefined,
      }),
    placeholderData: (prev) => prev,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!statsQuery.error) return;
    const e = statsQuery.error as {
      response?: { status?: number; data?: { message?: string } };
      message?: string;
    };
    toast.error(
      e?.response?.data?.message ||
        e?.message ||
        "Erro ao carregar as métricas de atividade."
    );
  }, [statsQuery.error]);

  const stats = statsQuery.data;
  const loading = statsQuery.isLoading;

  const dailySeries = useMemo(
    () =>
      stats ? densifyDailySeries(stats.perDay, stats.range.from, stats.range.to) : [],
    [stats]
  );

  /* Views da página de evento por dia — "quantos eventos (views) deu no dia". */
  const viewsSeries = useMemo(
    () =>
      stats
        ? densifyDailySeries(stats.viewsPerDay, stats.range.from, stats.range.to)
        : [],
    [stats]
  );

  const categoryMax = stats?.byCategory[0]?.count ?? 0;
  const sourceMax = stats?.bySource[0]?.count ?? 0;
  const topActionMax = stats?.topActions[0]?.count ?? 0;

  const inputShell =
    "h-12 w-full rounded-lg border border-gray-6 bg-gray-1 px-3 text-sm text-gray-12 placeholder:text-gray-11 font-family-dm-sans outline-none focus-visible:border-gray-4 focus-visible:ring-[3px] focus-visible:ring-gray-4/50 ";
  const selectShell = cn(
    inputShell,
    "text-base md:text-sm cursor-pointer appearance-none bg-[length:1rem] bg-[right_0.75rem_center] bg-no-repeat pr-10"
  );
  const selectChevron = {
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23737373' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
  };

  const rangeLabel = stats
    ? `${formatDateBR(stats.range.from)} – ${formatDateBR(stats.range.to)}`
    : "";

  return (
    <div className="flex flex-col gap-4 md:gap-5">
      {/* Filtros do dashboard */}
      <div className="rounded-xl border border-gray-6 bg-gray-1 p-3 md:p-4 ">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch sm:flex-wrap">
          <div className="w-full sm:w-[min(100%,200px)] shrink-0">
            <label className="sr-only">Período</label>
            <select
              value={periodDays}
              onChange={(e) => setPeriodDays(Number(e.target.value))}
              className={selectShell}
              style={selectChevron}
            >
              {PERIOD_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="w-full sm:w-[min(100%,220px)] shrink-0">
            <label className="sr-only">Filtrar por categoria</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className={selectShell}
              style={selectChevron}
            >
              <option value="">Todas as categorias</option>
              {USER_ACTIVITY_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c] ?? c}
                </option>
              ))}
            </select>
          </div>
          <div className="w-full sm:w-[min(100%,180px)] shrink-0">
            <label className="sr-only">Filtrar por origem</label>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className={selectShell}
              style={selectChevron}
            >
              <option value="">Todas as origens</option>
              {USER_ACTIVITY_SOURCES.map((s) => (
                <option key={s} value={s}>
                  {SOURCE_LABELS[s] ?? s}
                </option>
              ))}
            </select>
          </div>
          <div className="w-full sm:w-[min(100%,280px)] shrink-0">
            <label className="sr-only">Filtrar por evento</label>
            <AdminEventFilterSelect
              value={eventFilter}
              onChange={setEventFilter}
            />
          </div>
          {rangeLabel ? (
            <p className="flex items-center text-sm text-gray-11 font-family-dm-sans sm:ml-auto">
              {rangeLabel}
            </p>
          ) : null}
        </div>
      </div>

      {loading ? (
        <div className="rounded-xl border border-gray-6 bg-gray-1 py-14 text-center text-sm text-gray-11 font-family-dm-sans ">
          Carregando métricas…
        </div>
      ) : !stats ? (
        <div className="rounded-xl border border-gray-6 bg-gray-1 py-14 text-center text-sm text-gray-11 font-family-dm-sans ">
          Não foi possível carregar as métricas.
        </div>
      ) : (
        <>
          {/* Cards de totais */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
            <StatCard
              icon={<Activity className="size-4" />}
              label="Eventos"
              value={stats.totals.events}
            />
            <StatCard
              icon={<Users className="size-4" />}
              label="Usuários únicos"
              value={stats.totals.uniqueUsers}
            />
            <StatCard
              icon={<Link2 className="size-4" />}
              label="Sessões únicas"
              value={stats.totals.uniqueSessions}
            />
            <StatCard
              icon={<Ghost className="size-4" />}
              label="Eventos anônimos"
              value={stats.totals.anonymousEvents}
              hint={
                stats.totals.events > 0
                  ? `${Math.round((stats.totals.anonymousEvents / stats.totals.events) * 100)}% do total`
                  : undefined
              }
            />
            <StatCard
              icon={<Eye className="size-4" />}
              label="Views de evento"
              value={stats.totals.eventPageViews}
              hint="Página pública do evento"
            />
            <StatCard
              icon={<BadgeCheck className="size-4" />}
              label="Pagamentos confirmados"
              value={stats.totals.paymentsConfirmed}
              hint={
                stats.totals.eventPageViews > 0
                  ? `${Math.round((stats.totals.paymentsConfirmed / stats.totals.eventPageViews) * 100)}% das views`
                  : undefined
              }
            />
          </div>

          {/* Série diária — todas as atividades */}
          <div className="rounded-xl border border-gray-6 bg-gray-1 p-4 ">
            <p className="text-sm font-bold text-gray-12 font-manrope mb-4">
              Eventos por dia
            </p>
            <DailyBars series={dailySeries} unitLabel="evento(s)" />
          </div>

          {/* Série diária — views da página de evento */}
          <div className="rounded-xl border border-gray-6 bg-gray-1 p-4 ">
            <p className="text-sm font-bold text-gray-12 font-manrope mb-4">
              Views de evento por dia
            </p>
            <DailyBars series={viewsSeries} unitLabel="view(s)" />
          </div>

          {/* Distribuições */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-gray-6 bg-gray-1 p-4 ">
              <p className="text-sm font-bold text-gray-12 font-manrope mb-4">
                Por categoria
              </p>
              {stats.byCategory.length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-11 font-family-dm-sans">
                  Sem dados no período.
                </p>
              ) : (
                <div className="flex flex-col gap-3">
                  {stats.byCategory.map((g) => (
                    <DistributionRow
                      key={g.category}
                      label={CATEGORY_LABELS[g.category] ?? g.category}
                      count={g.count}
                      max={categoryMax}
                      barClass={CATEGORY_BAR[g.category]}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-gray-6 bg-gray-1 p-4 ">
              <p className="text-sm font-bold text-gray-12 font-manrope mb-4">
                Por origem
              </p>
              {stats.bySource.length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-11 font-family-dm-sans">
                  Sem dados no período.
                </p>
              ) : (
                <div className="flex flex-col gap-3">
                  {stats.bySource.map((g) => (
                    <DistributionRow
                      key={g.source}
                      label={SOURCE_LABELS[g.source] ?? g.source}
                      count={g.count}
                      max={sourceMax}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Top ações */}
          <div className="rounded-xl border border-gray-6 bg-gray-1 p-4 ">
            <p className="text-sm font-bold text-gray-12 font-manrope mb-4">
              Top 10 ações
            </p>
            {stats.topActions.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-11 font-family-dm-sans">
                Sem dados no período.
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {stats.topActions.map((g) => (
                  <div key={g.action} className="flex items-center gap-3">
                    <span className="w-[40%] min-w-0 shrink-0 truncate text-xs font-mono text-gray-12">
                      {g.action}
                    </span>
                    <div className="flex-1 h-2.5 rounded-full bg-gray-3 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary-9"
                        style={{
                          width: `${topActionMax > 0 ? Math.max(2, Math.round((g.count / topActionMax) * 100)) : 0}%`,
                        }}
                      />
                    </div>
                    <span className="w-16 shrink-0 text-right text-sm font-semibold text-gray-12 font-family-dm-sans tabular-nums">
                      {numberFmt.format(g.count)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
