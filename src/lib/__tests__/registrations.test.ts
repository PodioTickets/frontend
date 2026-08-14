import { describe, it, expect } from "vitest";
import { CheckCircle, XCircle } from "lucide-react";

import {
  REG_API_STATUSES,
  toRegistrationApiStatus,
  normalizeRegistrationStats,
  mergeRegistrationStatsWithTrendFallback,
  registrationsWeekOverWeekPercent,
  getFinalStatus,
  getRegistrationStatusBadge,
  isVoucherRegistration,
  type RegistrationListRow,
} from "../registrations";

describe("toRegistrationApiStatus", () => {
  it("aceita status válidos da API", () => {
    for (const s of REG_API_STATUSES) {
      expect(toRegistrationApiStatus(s)).toBe(s);
    }
  });
  it("retorna undefined para status desconhecido", () => {
    expect(toRegistrationApiStatus("all")).toBeUndefined();
    expect(toRegistrationApiStatus("")).toBeUndefined();
    expect(toRegistrationApiStatus("confirmed")).toBeUndefined(); // case-sensitive
  });
});

describe("normalizeRegistrationStats", () => {
  it("retorna zeros para entrada inválida", () => {
    const z = { total: 0, paid: 0, cancelled: 0, totalCollected: 0, refunded: 0, refundedChange: 0 };
    expect(normalizeRegistrationStats(null)).toEqual(z);
    expect(normalizeRegistrationStats(undefined)).toEqual(z);
    expect(normalizeRegistrationStats("x")).toEqual(z);
  });

  it("lê camelCase e snake_case (total_collected)", () => {
    const out = normalizeRegistrationStats({ total: 10, paid: 7, cancelled: 3, total_collected: 999 });
    expect(out.total).toBe(10);
    expect(out.paid).toBe(7);
    expect(out.cancelled).toBe(3);
    expect(out.totalCollected).toBe(999);
  });

  it("achata weekOverWeek aninhado nos campos *Change", () => {
    const out = normalizeRegistrationStats({
      total: 5,
      weekOverWeek: { totalChange: 12, paid_change: 4 },
    });
    expect(out.totalChange).toBe(12);
    expect(out.paidChange).toBe(4);
  });

  it("optNum: string numérica vira número; string vazia/NaN vira undefined", () => {
    expect(normalizeRegistrationStats({ totalChange: "15" }).totalChange).toBe(15);
    expect(normalizeRegistrationStats({ totalChange: "" }).totalChange).toBeUndefined();
    expect(normalizeRegistrationStats({ totalChange: "abc" }).totalChange).toBeUndefined();
  });
});

describe("mergeRegistrationStatsWithTrendFallback", () => {
  it("sem agregado, retorna só os stats da lista normalizados", () => {
    const out = mergeRegistrationStatsWithTrendFallback({ total: 3 }, null);
    expect(out.total).toBe(3);
    expect(out.totalChange).toBeUndefined();
  });

  it("usa *Change do agregado quando a lista não tem", () => {
    const out = mergeRegistrationStatsWithTrendFallback(
      { total: 3 }, // sem *Change
      normalizeRegistrationStats({ totalChange: 9, paidChange: 2 }),
    );
    expect(out.total).toBe(3);
    expect(out.totalChange).toBe(9);
    expect(out.paidChange).toBe(2);
  });

  it("a lista tem prioridade sobre o agregado nos *Change", () => {
    const out = mergeRegistrationStatsWithTrendFallback(
      { total: 3, totalChange: 1 },
      normalizeRegistrationStats({ totalChange: 99 }),
    );
    expect(out.totalChange).toBe(1);
  });
});

describe("registrationsWeekOverWeekPercent", () => {
  it("zero/não-finito → 0", () => {
    expect(registrationsWeekOverWeekPercent(0)).toBe(0);
    expect(registrationsWeekOverWeekPercent(NaN)).toBe(0);
    expect(registrationsWeekOverWeekPercent(Infinity)).toBe(0);
  });
  it("arredonda valor absoluto", () => {
    expect(registrationsWeekOverWeekPercent(12.3)).toBe(12);
    expect(registrationsWeekOverWeekPercent(-12.7)).toBe(13);
  });
  it("variação que arredonda a 0 some (não infla p/ 1% — consistente c/ dashboard)", () => {
    expect(registrationsWeekOverWeekPercent(0.2)).toBe(0);
    expect(registrationsWeekOverWeekPercent(-0.3)).toBe(0);
    expect(registrationsWeekOverWeekPercent(0.5)).toBe(1); // round(0.5)=1
  });
});

describe("getFinalStatus", () => {
  const base = (over: Partial<RegistrationListRow>): RegistrationListRow =>
    ({ id: "1", status: "CONFIRMED", user: {}, ...over } as RegistrationListRow);

  it("sem pagamento especial, devolve o status da inscrição", () => {
    expect(getFinalStatus(base({ status: "CONFIRMED" }))).toBe("CONFIRMED");
  });

  it("metadata + refundType REFUND → REFUNDED", () => {
    const r = base({ order: { finalAmount: 0, payment: { metadata: {}, refundType: "REFUND" } } });
    expect(getFinalStatus(r)).toBe("REFUNDED");
  });

  it("metadata + refundType CHARGEBACK → CHARGEBACK", () => {
    const r = base({ order: { finalAmount: 0, payment: { metadata: {}, refundType: "CHARGEBACK" } } });
    expect(getFinalStatus(r)).toBe("CHARGEBACK");
  });

  it("sem metadata, paymentStatus REFUNDED/CHARGEBACK prevalece", () => {
    const r = base({ order: { finalAmount: 0, payment: { status: "REFUNDED" } } });
    expect(getFinalStatus(r)).toBe("REFUNDED");
  });
});

describe("isVoucherRegistration", () => {
  const base = (over: Partial<RegistrationListRow>): RegistrationListRow =>
    ({ id: "1", status: "CONFIRMED", user: {}, ...over } as RegistrationListRow);

  it("cortesia (criada pelo painel) → voucher, independente do valor", () => {
    expect(
      isVoucherRegistration(base({ order: { finalAmount: 0, isCourtesy: true } })),
    ).toBe(true);
  });

  it("voucher totalmente grátis (voucherId + finalAmount 0) → voucher", () => {
    expect(
      isVoucherRegistration(base({ order: { finalAmount: 0, voucherId: "v1" } })),
    ).toBe(true);
  });

  it("voucher com valor pago (adicionais → finalAmount > 0) → NÃO é voucher", () => {
    expect(
      isVoucherRegistration(base({ order: { finalAmount: 1500, voucherId: "v1" } })),
    ).toBe(false);
  });

  it("grátis sem voucher e sem cortesia (ingresso gratuito comum) → NÃO é voucher", () => {
    expect(
      isVoucherRegistration(base({ order: { finalAmount: 0 } })),
    ).toBe(false);
  });

  it("sem pedido → NÃO é voucher", () => {
    expect(isVoucherRegistration(base({}))).toBe(false);
  });
});

describe("getRegistrationStatusBadge", () => {
  it("mapeia status conhecidos", () => {
    expect(getRegistrationStatusBadge("CONFIRMED")).toMatchObject({ label: "Pago", icon: CheckCircle });
    expect(getRegistrationStatusBadge("CANCELLED")).toMatchObject({ label: "Cancelada", icon: XCircle });
    expect(getRegistrationStatusBadge("REFUNDED")).toMatchObject({ label: "Estornado" });
  });
  it("status desconhecido cai no fallback PENDING", () => {
    expect(getRegistrationStatusBadge("ZZZ").label).toBe("Pendente");
  });
});
