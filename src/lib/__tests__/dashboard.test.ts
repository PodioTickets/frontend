import { describe, it, expect } from "vitest";
import {
  dashboardWeekOverWeekPercent,
  showDashboardWeekOverWeek,
  periodComparisonLabel,
  dashboardTrendIsNew,
  dashboardTrendVisible,
} from "../dashboard";

describe("dashboardWeekOverWeekPercent", () => {
  it("arredonda o valor absoluto", () => {
    expect(dashboardWeekOverWeekPercent(12.3)).toBe(12);
    expect(dashboardWeekOverWeekPercent(-12.7)).toBe(13);
    expect(dashboardWeekOverWeekPercent(0)).toBe(0);
  });
  it("preserva valores grandes (ex.: +100% real)", () => {
    expect(dashboardWeekOverWeekPercent(100)).toBe(100);
    expect(dashboardWeekOverWeekPercent(-250.4)).toBe(250);
  });
  it("guarda contra não-finito (ontem=0 → divisão por zero no backend) → 0", () => {
    // Sem o guard, o card renderizaria "NaN%"/"Infinity% vs ontem".
    expect(dashboardWeekOverWeekPercent(NaN)).toBe(0);
    expect(dashboardWeekOverWeekPercent(Infinity)).toBe(0);
    expect(dashboardWeekOverWeekPercent(-Infinity)).toBe(0);
    // string vazia → Number("") === 0 (finito) → 0; string lixo → NaN → 0.
    expect(dashboardWeekOverWeekPercent("x" as unknown as number)).toBe(0);
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
    expect(showDashboardWeekOverWeek(100)).toBe(true);
  });
  it("false p/ não-finito — não mostra linha de variação com valor inválido", () => {
    expect(showDashboardWeekOverWeek(NaN)).toBe(false);
    expect(showDashboardWeekOverWeek(Infinity)).toBe(false);
    expect(showDashboardWeekOverWeek(-Infinity)).toBe(false);
  });
  it("false p/ null (sem baseline) — % não renderiza; quem exibe 'novo' é o trend", () => {
    expect(showDashboardWeekOverWeek(null)).toBe(false);
  });
});

describe("dashboardTrendIsNew", () => {
  it("true só p/ null (sem baseline: anterior=0)", () => {
    expect(dashboardTrendIsNew(null)).toBe(true);
    expect(dashboardTrendIsNew(0)).toBe(false);
    expect(dashboardTrendIsNew(100)).toBe(false);
    expect(dashboardTrendIsNew(-5)).toBe(false);
  });
});

describe("dashboardTrendVisible", () => {
  it("false em período sem comparação (geral), mesmo com variação/novo", () => {
    expect(dashboardTrendVisible(50, "geral")).toBe(false);
    expect(dashboardTrendVisible(null, "geral")).toBe(false);
  });
  it("true p/ 'novo' (null) quando há período de comparação", () => {
    expect(dashboardTrendVisible(null, "24h")).toBe(true);
    expect(dashboardTrendVisible(null, "7d")).toBe(true);
  });
  it("true p/ variação != 0; false quando arredonda a 0", () => {
    expect(dashboardTrendVisible(12.3, "24h")).toBe(true);
    expect(dashboardTrendVisible(0, "24h")).toBe(false);
    expect(dashboardTrendVisible(0.4, "24h")).toBe(false);
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
