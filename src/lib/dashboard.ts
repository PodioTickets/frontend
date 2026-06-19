/**
 * Lógica pura e constantes compartilhadas das páginas de dashboard do evento
 * (admin e organizer). Antes duplicado byte a byte entre as duas.
 */

export const LOTS_NEAR_DEPLETION_PAGE_SIZE = 4;
export const TICKETS_WITH_LOTS_PAGE_SIZE = 10;
export const TICKET_RANKING_PAGE_SIZE = 4;

/**
 * Variação semana-a-semana em % (valor absoluto arredondado).
 *
 * O backend manda o valor JÁ em % (ex.: 12.5 = +12,5%). Quando o período
 * anterior é 0 (ex.: ontem sem vendas), a variação é matematicamente indefinida
 * — se o backend não tratar, pode chegar `NaN`/`Infinity` aqui. Guardamos contra
 * não-finito (retorna 0 → o card esconde a linha via `showDashboardWeekOverWeek`)
 * pra NUNCA renderizar "NaN%"/"Infinity%". Espelha `registrationsWeekOverWeekPercent`.
 */
export function dashboardWeekOverWeekPercent(change: number | null): number {
  const n = Number(change);
  if (!Number.isFinite(n)) return 0;
  return Math.round(Math.abs(n));
}

/** Só exibe a variação % quando ela arredonda para != 0. (null/não-finito → false) */
export function showDashboardWeekOverWeek(change: number | null): boolean {
  return dashboardWeekOverWeekPercent(change) !== 0;
}

/**
 * Sem baseline: o backend manda `null` quando o período anterior foi 0 (variação
 * indefinida). Nesse caso o card exibe "novo" em vez de um percentual.
 */
export function dashboardTrendIsNew(change: number | null): boolean {
  return change === null;
}

/**
 * O bloco de tendência aparece quando: (a) há label de comparação no período
 * (não em `geral`) E (b) há variação a mostrar (% != 0) OU é "novo" (sem baseline).
 */
export function dashboardTrendVisible(
  change: number | null,
  period: string,
): boolean {
  if (!periodComparisonLabel(period)) return false;
  return dashboardTrendIsNew(change) || showDashboardWeekOverWeek(change);
}

/** Rótulo de comparação de período (ex.: "vs. semana passada"). */
export function periodComparisonLabel(period: string): string | null {
  switch (period) {
    case "24h": return "vs. ontem";
    case "7d": return "vs. semana passada";
    case "15d": return "vs. 15 dias atrás";
    case "1m": return "vs. mês passado";
    case "2m": return "vs. 2 meses atrás";
    default: return null;
  }
}
