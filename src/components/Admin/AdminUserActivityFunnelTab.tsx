"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { TrendingDown } from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/utils/cn";
import { adminService } from "@/services";
import { queryKeys } from "@/services/cache/QueryClient";
import { formatDateBR } from "@/utils/datetimeBR";
import {
  AdminEventFilterSelect,
  type EventFilterOption,
} from "./AdminEventFilterSelect";
import { FUNNEL_STAGE_LABELS, FUNNEL_STAGE_HINTS } from "./userActivityLabels";

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
const pctFmt = (value: number) => `${Math.round(value * 100)}%`;

/**
 * Funil de compra — sessões/usuários ÚNICOS por etapa da jornada
 * (view da página → reserva → endereço → pagamento → confirmado).
 * Conversões calculadas client-side a partir dos counts do backend.
 */
export function AdminUserActivityFunnelTab() {
  const [periodDays, setPeriodDays] = useState<number>(30);
  const [eventFilter, setEventFilter] = useState<EventFilterOption | null>(
    null
  );

  const from = useMemo(() => fromForPeriod(periodDays), [periodDays]);

  const funnelQuery = useQuery({
    queryKey: queryKeys.admin.userActivity.funnel({
      from,
      eventId: eventFilter?.id ?? "",
    }),
    queryFn: () =>
      adminService.getUserActivityFunnel({
        from,
        eventId: eventFilter?.id || undefined,
      }),
    placeholderData: (prev) => prev,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!funnelQuery.error) return;
    const e = funnelQuery.error as {
      response?: { data?: { message?: string } };
      message?: string;
    };
    toast.error(
      e?.response?.data?.message ||
        e?.message ||
        "Erro ao carregar o funil de compra."
    );
  }, [funnelQuery.error]);

  const funnel = funnelQuery.data;
  const loading = funnelQuery.isLoading;

  /* Conversões derivadas: % vs etapa anterior e % vs topo do funil. O topo
   * (views) pode ser 0 em janelas antigas — o tracking de page view começou
   * em 2026-06-04; guardas de divisão por zero cobrem o caso. */
  const stages = useMemo(() => {
    if (!funnel) return [];
    const top = funnel.stages[0]?.unique ?? 0;
    return funnel.stages.map((stage, i) => {
      const prev = i > 0 ? funnel.stages[i - 1].unique : null;
      return {
        ...stage,
        fromPrevious:
          prev != null && prev > 0 ? stage.unique / prev : null,
        fromTop: top > 0 && i > 0 ? stage.unique / top : null,
      };
    });
  }, [funnel]);

  const maxUnique = useMemo(
    () => stages.reduce((m, s) => Math.max(m, s.unique), 0),
    [stages]
  );

  const inputShell =
    "h-12 w-full rounded-lg border border-gray-6 bg-gray-1 px-3 text-sm text-gray-12 placeholder:text-gray-11 font-family-dm-sans outline-none focus-visible:border-gray-4 focus-visible:ring-[3px] focus-visible:ring-gray-4/50 ";
  const selectShell = cn(
    inputShell,
    "text-base md:text-sm cursor-pointer appearance-none bg-[length:1rem] bg-[right_0.75rem_center] bg-no-repeat pr-10"
  );
  const selectChevron = {
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23737373' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
  };

  const rangeLabel = funnel
    ? `${formatDateBR(funnel.range.from)} – ${formatDateBR(funnel.range.to)}`
    : "";

  const overallConversion =
    stages.length > 0 && stages[0].unique > 0
      ? (stages[stages.length - 1]?.unique ?? 0) / stages[0].unique
      : null;

  return (
    <div className="flex flex-col gap-4 md:gap-5">
      {/* Filtros */}
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
          <div className="w-full sm:w-[min(100%,320px)] shrink-0">
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
          Carregando funil…
        </div>
      ) : !funnel ? (
        <div className="rounded-xl border border-gray-6 bg-gray-1 py-14 text-center text-sm text-gray-11 font-family-dm-sans ">
          Não foi possível carregar o funil de compra.
        </div>
      ) : (
        <>
          {/* Conversão geral (topo → pago) */}
          <div className="rounded-xl border border-gray-6 bg-gray-1 p-4 ">
            <div className="flex items-center gap-2 text-gray-11">
              <TrendingDown className="size-4" />
              <p className="text-xs font-semibold font-family-dm-sans uppercase tracking-wide">
                Conversão geral (visualização → pagamento)
              </p>
            </div>
            <p className="mt-2 text-2xl font-extrabold font-manrope leading-[1.1] text-gray-12 tabular-nums">
              {overallConversion != null ? pctFmt(overallConversion) : "—"}
            </p>
            <p className="mt-1 text-xs text-gray-11 font-family-dm-sans">
              Sessões únicas — recarregar página ou tentar pagar 2x não infla.
              Views passaram a ser coletadas em 2026-06-04; períodos anteriores
              ficam sem o topo do funil.
            </p>
          </div>

          {/* Etapas */}
          <div className="rounded-xl border border-gray-6 bg-gray-1 p-4 ">
            <p className="text-sm font-bold text-gray-12 font-manrope mb-4">
              Etapas do processo de compra
            </p>
            {maxUnique === 0 ? (
              <p className="py-8 text-center text-sm text-gray-11 font-family-dm-sans">
                Nenhuma atividade de compra no período.
              </p>
            ) : (
              <div className="flex flex-col gap-4">
                {stages.map((stage, i) => {
                  const widthPct =
                    maxUnique > 0
                      ? Math.max(2, Math.round((stage.unique / maxUnique) * 100))
                      : 0;
                  return (
                    <div key={stage.action}>
                      <div className="mb-1 flex items-baseline justify-between gap-3">
                        <p
                          className="min-w-0 truncate text-sm text-gray-12 font-family-dm-sans"
                          title={FUNNEL_STAGE_HINTS[stage.action]}
                        >
                          <span className="font-semibold">{i + 1}.</span>{" "}
                          {FUNNEL_STAGE_LABELS[stage.action] ?? stage.action}
                        </p>
                        <p className="shrink-0 text-sm font-semibold text-gray-12 font-family-dm-sans tabular-nums">
                          {numberFmt.format(stage.unique)}
                          <span className="ml-1 font-normal text-gray-11">
                            {stage.unique === 1 ? "sessão" : "sessões"}
                          </span>
                        </p>
                      </div>
                      <div className="h-7 rounded-md bg-gray-3 overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-md transition-[width]",
                            stage.action === "order.paid"
                              ? "bg-primary-9"
                              : "bg-primary-7"
                          )}
                          style={{ width: `${widthPct}%` }}
                        />
                      </div>
                      <div className="mt-1 flex justify-between text-[11px] text-gray-11 font-family-dm-sans">
                        <span>
                          {stage.fromPrevious != null
                            ? `${pctFmt(stage.fromPrevious)} da etapa anterior`
                            : i > 0
                              ? "— sem base na etapa anterior"
                              : "Topo do funil"}
                        </span>
                        <span className="tabular-nums">
                          {stage.fromTop != null
                            ? `${pctFmt(stage.fromTop)} do topo`
                            : ""}
                          {stage.total > stage.unique
                            ? ` · ${numberFmt.format(stage.total)} ações no total`
                            : ""}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
