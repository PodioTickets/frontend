import { describe, it, expect } from "vitest";
import {
  computeAnticipation,
  unitCost,
  type AnticipationUnit,
} from "../anticipation";

/**
 * Espelho do motor do backend. Os números batem 1:1 com `frontend/adiantamento.md`
 * (taxa 10% = 0.10). Garante que a prévia AO VIVO do modal == recálculo autoritativo.
 */
const RATE = 0.1;

const u = (
  o: Partial<AnticipationUnit> & Pick<AnticipationUnit, "unitId" | "gross" | "daysUntilRelease">,
): AnticipationUnit => ({
  orderId: o.unitId,
  paymentId: o.unitId,
  installmentNumber: null,
  ...o,
});

describe("computeAnticipation (frontend mirror)", () => {
  it("unitCost = gross × taxa × dias/30", () => {
    expect(unitCost(3000, 16, RATE)).toBe(160);
    expect(unitCost(3000, 76, RATE)).toBe(760);
  });

  it("2 à vista (31d), pede 50 → recomendado 53,80; taxa efetiva 16,67%", () => {
    const units = [
      u({ unitId: "a1", gross: 3000, daysUntilRelease: 31 }),
      u({ unitId: "a2", gross: 3000, daysUntilRelease: 31 }),
    ];
    const r = computeAnticipation(units, 5000, RATE);
    expect(r.consumedGross).toBe(6000);
    expect(r.recommendedNet).toBe(5380);
    expect(r.receive).toBe(5000);
    expect(r.effectiveFee).toBe(1000);
    expect(r.effectiveRatePct).toBeCloseTo(16.666, 2);
  });

  it("mistura parcela(10d)+à vista(31d) mais baratas; pede 50 → recomendado 55,90", () => {
    const units = [
      u({ unitId: "a1", gross: 3000, daysUntilRelease: 31 }),
      u({ unitId: "a2", gross: 3000, daysUntilRelease: 31 }),
      u({ unitId: "p1", gross: 3000, daysUntilRelease: 10, installmentNumber: 1 }),
      u({ unitId: "p2", gross: 3000, daysUntilRelease: 40, installmentNumber: 2 }),
    ];
    const r = computeAnticipation(units, 5000, RATE);
    expect(r.consumedUnitIds).toEqual(["p1", "a1"]);
    expect(r.recommendedNet).toBe(5590);
    const rec = computeAnticipation(units, 5590, RATE);
    expect(rec.effectiveRatePct).toBeCloseTo(6.833, 2);
  });

  it("pedido 0 → vazio; pede acima do total → recebe o líquido total", () => {
    const units = [u({ unitId: "a1", gross: 3000, daysUntilRelease: 31 })];
    expect(computeAnticipation(units, 0, RATE).consumedGross).toBe(0);
    const r = computeAnticipation(units, 999999, RATE);
    expect(r.receive).toBe(2690);
  });
});
