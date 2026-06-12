/**
 * Lógica pura e constantes compartilhadas das páginas de dashboard do evento
 * (admin e organizer). Antes duplicado byte a byte entre as duas.
 */

export const LOTS_NEAR_DEPLETION_PAGE_SIZE = 4;
export const TICKETS_WITH_LOTS_PAGE_SIZE = 10;
export const TICKET_RANKING_PAGE_SIZE = 4;

/** Variação semana-a-semana em % (valor absoluto arredondado). */
export function dashboardWeekOverWeekPercent(change: number): number {
  return Math.round(Math.abs(Number(change)));
}

/** Só exibe a variação quando ela arredonda para != 0. */
export function showDashboardWeekOverWeek(change: number): boolean {
  return dashboardWeekOverWeekPercent(change) !== 0;
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
