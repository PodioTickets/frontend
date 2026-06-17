import { describe, it, expect } from "vitest";
import {
  toUtcDate,
  formatDateBR,
  formatTimeBR,
  formatDateTimeBR,
  formatInstantBRT,
  formatDateBRT,
  formatTimeBRT,
} from "../datetimeBR";

/**
 * Garante que a formatação preserva o horário do servidor (UTC), sem reaplicar
 * o fuso do runtime — independente do TZ onde os testes rodam.
 */
describe("datetimeBR", () => {
  it("formata data UTC sem shift de fuso", () => {
    // 23:30Z — num fuso -3 (Brasil) o `toLocaleDateString` local cairia em 20:30
    // do MESMO dia, mas perto da meia-noite poderia virar o dia. Em UTC: 02/06.
    expect(formatDateBR("2026-06-02T23:30:00.000Z")).toBe("02/06/2026");
  });

  it("formata hora UTC sem shift (mantém a hora do servidor)", () => {
    expect(formatTimeBR("2026-06-01T09:20:08.201Z")).toBe("09:20");
  });

  it("date-only (YYYY-MM-DD) não sofre bug de -1 dia", () => {
    expect(formatDateBR("2026-06-01")).toBe("01/06/2026");
  });

  it("respeita options customizadas (mês por extenso) em UTC", () => {
    expect(
      formatDateTimeBR("2026-06-01T00:00:00.000Z", { day: "numeric", month: "long" }),
    ).toBe("1 de junho");
  });

  it("retorna '' para valores ausentes/ inválidos", () => {
    expect(formatDateBR(null)).toBe("");
    expect(formatDateBR(undefined)).toBe("");
    expect(formatDateBR("")).toBe("");
    expect(formatDateBR("not-a-date")).toBe("");
  });

  it("toUtcDate ancora date-only em meia-noite UTC", () => {
    const d = toUtcDate("2026-06-01");
    expect(d?.toISOString()).toBe("2026-06-01T00:00:00.000Z");
  });

  it("toUtcDate aceita Date e number", () => {
    const ms = Date.UTC(2026, 5, 1, 12, 0, 0);
    expect(toUtcDate(ms)?.toISOString()).toBe("2026-06-01T12:00:00.000Z");
    expect(toUtcDate(new Date(ms))?.toISOString()).toBe("2026-06-01T12:00:00.000Z");
  });

  // ── Instante REAL (compra/pagamento) → fuso de Brasília (UTC-3) ──────────────
  describe("instante real em Brasília (formatInstantBRT)", () => {
    it("converte hora UTC para Brasília (-3h)", () => {
      // 23:30Z → 20:30 em Brasília, e o dia volta pro 01/06.
      expect(formatTimeBRT("2026-06-01T23:30:00.000Z")).toBe("20:30");
      expect(formatDateBRT("2026-06-01T23:30:00.000Z")).toBe("01/06/2026");
    });

    it("vira o dia anterior quando a hora UTC é de madrugada", () => {
      // 02:00Z do dia 02 → 23:00 do dia 01 em Brasília.
      expect(formatDateBRT("2026-06-02T02:00:00.000Z")).toBe("01/06/2026");
      expect(formatTimeBRT("2026-06-02T02:00:00.000Z")).toBe("23:00");
    });

    it("formatInstantBRT junta data + hora de Brasília por padrão", () => {
      expect(formatInstantBRT("2026-06-01T23:30:00.000Z")).toBe("01/06/2026, 20:30");
    });

    it("retorna '' para valor ausente/ inválido", () => {
      expect(formatInstantBRT(null)).toBe("");
      expect(formatInstantBRT("not-a-date")).toBe("");
    });
  });
});
