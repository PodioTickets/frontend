import { describe, it, expect } from "vitest";
import { activityPeriodRange } from "../activityPeriod";

// 30/09/2026 22:30 BRT = 01/10/2026 01:30 UTC — o "hoje" tem que ser 30/09 (BRT).
const NIGHT_BRT = new Date("2026-10-01T01:30:00Z");

describe("activityPeriodRange", () => {
  it("Hoje usa o dia de Brasília, não o de UTC", () => {
    expect(activityPeriodRange("today", NIGHT_BRT)).toEqual({ from: "2026-09-30", to: "2026-09-30" });
  });

  it("Ontem é só o dia anterior (from = to)", () => {
    expect(activityPeriodRange("yesterday", NIGHT_BRT)).toEqual({ from: "2026-09-29", to: "2026-09-29" });
  });

  it("Ontem na virada do mês/ano", () => {
    expect(activityPeriodRange("yesterday", new Date("2026-01-01T12:00:00Z"))).toEqual({
      from: "2025-12-31",
      to: "2025-12-31",
    });
  });

  it("Últimos 7 dias inclui hoje", () => {
    expect(activityPeriodRange("7", NIGHT_BRT)).toEqual({ from: "2026-09-24", to: "2026-09-30" });
  });

  it("Geral começa antes do primeiro registro e vai até hoje", () => {
    expect(activityPeriodRange("all", NIGHT_BRT)).toEqual({ from: "2025-11-01", to: "2026-09-30" });
  });
});
