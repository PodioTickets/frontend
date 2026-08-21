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

  it("mistura, pede 50: min gross (par) e desempate = recomendado + perto de 50", () => {
    // 4 unidades de R$30 → qualquer par consome 6000 (taxa 16,67% p/ 50). Desempate
    // (recomendado + perto de 50): a1(31d,26,90)+p2(40d,26,00) = 52,90 (o menor ≥ 50).
    const units = [
      u({ unitId: "a1", gross: 3000, daysUntilRelease: 31 }),
      u({ unitId: "a2", gross: 3000, daysUntilRelease: 31 }),
      u({ unitId: "p1", gross: 3000, daysUntilRelease: 10, installmentNumber: 1 }),
      u({ unitId: "p2", gross: 3000, daysUntilRelease: 40, installmentNumber: 2 }),
    ];
    const r = computeAnticipation(units, 5000, RATE);
    expect(r.consumedUnitIds).toEqual(["a1", "p2"]);
    expect(r.recommendedNet).toBe(5290); // 52,90
    // Pedindo exatamente 55,90 → par com líquido ≥ 5590 (p1+a1) → taxa 6,83%.
    const rec = computeAnticipation(units, 5590, RATE);
    expect(rec.recommendedNet).toBe(5590);
    expect(rec.effectiveRatePct).toBeCloseTo(6.833, 2);
  });

  it("pedido 0 → vazio; pede acima do total → recebe o líquido total", () => {
    const units = [u({ unitId: "a1", gross: 3000, daysUntilRelease: 31 })];
    expect(computeAnticipation(units, 0, RATE).consumedGross).toBe(0);
    const r = computeAnticipation(units, 999999, RATE);
    expect(r.receive).toBe(2690);
  });

  it("seleção ótima: mesmo dia, prefere a unidade grande sozinha (menor gross)", () => {
    // A=R$10, B=R$100 (31d). Pede R$15 → só B cobre (gross 100), não A+B (110).
    const units = [
      u({ unitId: "a", gross: 1000, daysUntilRelease: 31 }),
      u({ unitId: "b", gross: 10000, daysUntilRelease: 31 }),
    ];
    const r = computeAnticipation(units, 1500, RATE);
    expect(r.consumedUnitIds).toEqual(["b"]);
    expect(r.consumedGross).toBe(10000);
    expect(r.effectiveFee).toBe(8500);
  });

  it("seleção ótima: subset-sum (0d) escolhe {3,8}=11, não a soma gulosa 16", () => {
    const units = [
      u({ unitId: "u3", gross: 300, daysUntilRelease: 0 }),
      u({ unitId: "u5", gross: 500, daysUntilRelease: 0 }),
      u({ unitId: "u8", gross: 800, daysUntilRelease: 0 }),
    ];
    const r = computeAnticipation(units, 900, RATE);
    expect(r.consumedUnitIds).toEqual(["u3", "u8"]);
    expect(r.consumedGross).toBe(1100);
    expect(r.receive).toBe(900);
  });
});
