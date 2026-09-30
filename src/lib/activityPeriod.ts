import { toCivilDayBRT } from "@/utils/datetimeBR";

/**
 * Períodos do filtro das telas de atividade do admin (dashboard e funil).
 * `from`/`to` são dias civis (YYYY-MM-DD) — o backend os lê como fronteiras do
 * DIA em BRT, então o "hoje" também é calculado em BRT (em UTC, depois das 21h
 * o "hoje" já seria amanhã).
 */
export const ACTIVITY_PERIOD_OPTIONS = [
  { value: "today", label: "Hoje" },
  { value: "yesterday", label: "Ontem" },
  { value: "7", label: "Últimos 7 dias" },
  { value: "30", label: "Últimos 30 dias" },
  { value: "90", label: "Últimos 90 dias" },
  { value: "all", label: "Geral" },
] as const;

export type ActivityPeriod = (typeof ACTIVITY_PERIOD_OPTIONS)[number]["value"];

/**
 * Início do "Geral": antes do primeiro registro possível (projeto começou em
 * nov/2025). Sem `from` o backend cairia na janela default de 30 dias. A retenção
 * (90d analytics / 2 anos auditoria) limita o volume que a query varre.
 */
const ALL_TIME_FROM = "2025-11-01";

function shiftDays(day: string, delta: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

/** Janela `{ from, to }` do período, terminando hoje (BRT) — exceto "Ontem". */
export function activityPeriodRange(
  period: ActivityPeriod,
  now: Date = new Date()
): { from: string; to: string } {
  const today = toCivilDayBRT(now);
  if (period === "yesterday") {
    const yesterday = shiftDays(today, -1);
    return { from: yesterday, to: yesterday };
  }
  if (period === "all") return { from: ALL_TIME_FROM, to: today };
  const days = period === "today" ? 1 : Number(period);
  return { from: shiftDays(today, -(days - 1)), to: today };
}
