import { describe, it, expect } from "vitest";
import {
  computeAnticipation,
  computeAnticipationByGross,
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

describe("mais de 16 recebíveis (DP) — o conjunto escolhido cobre o pedido", () => {
  // Regressão 20/11: com > 16 recebíveis a reconstrução da DP devolvia conjuntos que
  // não cobriam o pedido (recomendado < pedido, valor total < disponível).
  let seed = 7;
  const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  const rates = [0.02, 0.05, 0.1];

  it("Antecipar tudo consome tudo e qualquer valor é coberto", () => {
    for (let t = 0; t < 15; t++) {
      const rate = rates[t % 3];
      const units: AnticipationUnit[] = Array.from({ length: 17 + Math.floor(rnd() * 40) }, (_, i) => ({
        unitId: "u" + i,
        orderId: "o" + i,
        paymentId: "p" + i,
        installmentNumber: null,
        gross: 2000 + Math.floor(rnd() * 30000),
        daysUntilRelease: 1 + Math.floor(rnd() * 330),
      })).filter((u) => unitCost(u.gross, u.daysUntilRelease, rate) < u.gross);
      const available = units.reduce((s, u) => s + u.gross, 0);
      const max = computeAnticipation(units, available, rate).recommendedNet;
      const all = computeAnticipation(units, max, rate);
      expect(all.consumedGross).toBe(available);
      expect(all.recommendedNet).toBe(max);
      for (const req of [Math.floor(max / 3), Math.floor(max * rnd())]) {
        if (req <= 0) continue;
        expect(computeAnticipation(units, req, rate).recommendedNet).toBeGreaterThanOrEqual(req);
      }
    }
  });
});

describe("computeAnticipationByGross — input = bruto a antecipar", () => {
  const R = 0.02;
  const units: AnticipationUnit[] = [
    { unitId: "a", orderId: "a", paymentId: "a", installmentNumber: null, gross: 10000, daysUntilRelease: 30 }, // custo 200
    { unitId: "b", orderId: "b", paymentId: "b", installmentNumber: null, gross: 20000, daysUntilRelease: 15 }, // custo 200
  ];

  it("antecipar tudo: total = disponível e recebe disponível − custo", () => {
    const r = computeAnticipationByGross(units, 30000, R);
    expect(r.consumedGross).toBe(30000);
    expect(r.realCost).toBe(400);
    expect(r.receive).toBe(29600);
    expect(r.effectiveFee).toBe(400);
  });

  it("valor numa fronteira: sem sobra", () => {
    const r = computeAnticipationByGross(units, 20000, R);
    expect(r.consumedUnitIds).toEqual(["b"]);
    expect(r.receive).toBe(19800);
    expect(r.recommendedGross).toBe(20000);
  });

  it("valor entre fronteiras: menor conjunto que cobre, sobra vira taxa", () => {
    const r = computeAnticipationByGross(units, 15000, R);
    expect(r.consumedGross).toBe(20000);
    expect(r.recommendedGross).toBe(20000);
    expect(r.receive).toBe(14800); // 150,00 − custo 2,00
    expect(r.effectiveFee).toBe(5200); // sobra 50,00 + custo 2,00
  });

  it("acima do disponível: limita ao total", () => {
    expect(computeAnticipationByGross(units, 99999, R).receive).toBe(29600);
  });

  it("mais de 16 recebíveis: cobre o bruto pedido", () => {
    const many: AnticipationUnit[] = Array.from({ length: 30 }, (_, i) => ({
      unitId: "u" + i, orderId: "o" + i, paymentId: "p" + i, installmentNumber: null,
      gross: 1000 + i * 137, daysUntilRelease: 5 + i * 7,
    }));
    const total = many.reduce((s, u) => s + u.gross, 0);
    for (const req of [total, Math.floor(total / 2), Math.floor(total / 7)]) {
      const r = computeAnticipationByGross(many, req, R);
      expect(r.consumedGross).toBeGreaterThanOrEqual(req);
    }
    expect(computeAnticipationByGross(many, total, R).consumedGross).toBe(total);
  });
});
