import { toUtcDate, type DateInput } from "@/utils/datetimeBR";

/**
 * Formatadores compartilhados das LISTAS de evento (`admin/events` e
 * `organizer/events`). Antes cada página reimplementava moeda/data inline,
 * inclusive com getters locais de `Date` que deslocavam a data em fusos
 * negativos (date-only "2026-06-08" virava 07 no Brasil). Fonte única aqui.
 */

const MONTHS_ABBR_PT = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
] as const;

/**
 * Moeda BRL a partir de CENTAVOS (inteiro do backend). Usa `Intl.NumberFormat`
 * (`style: "currency"`) — saída canônica "R$ 1.234,56". Trata `null`/`undefined`
 * como 0 para nunca renderizar "R$ NaN".
 */
export function formatEventListCurrency(cents: number | null | undefined): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format((cents ?? 0) / 100);
}

/**
 * Data curta "08 Jun, 2026" formatada em UTC (sem shift de fuso). Date-only
 * (`YYYY-MM-DD`) é ancorada em meia-noite UTC pelo `toUtcDate`, eliminando o
 * bug de "-1 dia". Retorna "—" para valores ausentes/inválidos.
 */
export function formatEventListDate(value: DateInput): string {
  const d = toUtcDate(value);
  if (!d) return "—";
  return `${String(d.getUTCDate()).padStart(2, "0")} ${MONTHS_ABBR_PT[d.getUTCMonth()]}, ${d.getUTCFullYear()}`;
}
