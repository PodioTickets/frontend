import { describe, it, expect } from "vitest";
import {
  dashboardWeekOverWeekPercent,
  showDashboardWeekOverWeek,
  periodComparisonLabel,
} from "../dashboard";

describe("dashboardWeekOverWeekPercent", () => {
  it("arredonda o valor absoluto", () => {
    expect(dashboardWeekOverWeekPercent(12.3)).toBe(12);
    expect(dashboardWeekOverWeekPercent(-12.7)).toBe(13);
    expect(dashboardWeekOverWeekPercent(0)).toBe(0);
  });
});

describe("showDashboardWeekOverWeek", () => {
  it("false quando arredonda para 0", () => {
    expect(showDashboardWeekOverWeek(0)).toBe(false);
    expect(showDashboardWeekOverWeek(0.4)).toBe(false);
    expect(showDashboardWeekOverWeek(-0.2)).toBe(false);
  });
  it("true quando há variação", () => {
    expect(showDashboardWeekOverWeek(1)).toBe(true);
    expect(showDashboardWeekOverWeek(-5.6)).toBe(true);
  });
});

describe("periodComparisonLabel", () => {
  it("mapeia os períodos conhecidos", () => {
    expect(periodComparisonLabel("24h")).toBe("vs. ontem");
    expect(periodComparisonLabel("7d")).toBe("vs. semana passada");
    expect(periodComparisonLabel("15d")).toBe("vs. 15 dias atrás");
    expect(periodComparisonLabel("1m")).toBe("vs. mês passado");
    expect(periodComparisonLabel("2m")).toBe("vs. 2 meses atrás");
  });
  it("retorna null para período sem comparação (ex.: geral)", () => {
    expect(periodComparisonLabel("geral")).toBeNull();
    expect(periodComparisonLabel("qualquer")).toBeNull();
  });
});
