import { describe, it, expect } from "vitest";
import {
  toUtcDate,
  formatDateBR,
  formatTimeBR,
  formatDateTimeBR,
  formatInstantBRT,
  formatDateBRT,
  formatTimeBRT,
  toCivilDayString,
  toCivilDayBRT,
  eventWindowInstant,
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

  // ── Dia civil do date-picker (filtros) → YYYY-MM-DD pelos componentes LOCAIS ─
  describe("toCivilDayString", () => {
    it("usa o dia LOCAL clicado, sem shift por toISOString", () => {
      // Date construído como o react-day-picker faz: meia-noite LOCAL do dia.
      // O dia retornado deve ser o componente local, independente do fuso do runtime.
      const picked = new Date(2026, 5, 24, 0, 0, 0); // 24/06 local
      expect(toCivilDayString(picked)).toBe("2026-06-24");
    });

    it("preserva o dia mesmo perto da meia-noite (qualquer hora local)", () => {
      const picked = new Date(2026, 5, 24, 23, 30, 0);
      expect(toCivilDayString(picked)).toBe("2026-06-24");
    });

    it("retorna undefined para ausente/ inválido", () => {
      expect(toCivilDayString(null)).toBeUndefined();
      expect(toCivilDayString(undefined)).toBeUndefined();
      expect(toCivilDayString(new Date("not-a-date"))).toBeUndefined();
    });
  });

  // ── Validade de cupom/voucher: instante (fim do dia BRT) → dia civil ─────────
  describe("toCivilDayBRT", () => {
    it("formato NOVO (fim do dia BRT = (dia+1)T02:59:59.999Z) → o dia escolhido", () => {
      // Cupom "expira 30/06" gravado como fim do dia BRT em UTC.
      expect(toCivilDayBRT("2026-07-01T02:59:59.999Z")).toBe("2026-06-30");
    });

    it("formato LEGADO (fim do dia em UTC = T23:59:59.999Z) → o mesmo dia", () => {
      expect(toCivilDayBRT("2026-06-30T23:59:59.999Z")).toBe("2026-06-30");
    });

    it("date-only passa direto (já é dia civil, sem shift)", () => {
      expect(toCivilDayBRT("2026-06-30")).toBe("2026-06-30");
    });

    it("ausente/ inválido → ''", () => {
      expect(toCivilDayBRT(null)).toBe("");
      expect(toCivilDayBRT(undefined)).toBe("");
      expect(toCivilDayBRT("not-a-date")).toBe("");
    });
  });

  // ── Janela do evento (wall-clock UTC) → instante real BRT (+3h) p/ comparação ─
  describe("eventWindowInstant", () => {
    it("'encerra 09:30' (wall-clock 09:30Z) → instante real 12:30Z (09:30 BRT)", () => {
      // Sem o +3h, comparar 09:30Z com Date.now() fecharia a inscrição às 06:30 BRT.
      expect(eventWindowInstant("2026-06-26T09:30:00.000Z")?.toISOString()).toBe(
        "2026-06-26T12:30:00.000Z",
      );
    });

    it("vira o dia quando o wall-clock é de madrugada (00:30Z → 03:30Z)", () => {
      expect(eventWindowInstant("2026-06-27T00:30:00.000Z")?.toISOString()).toBe(
        "2026-06-27T03:30:00.000Z",
      );
    });

    it("ausente/ inválido → null", () => {
      expect(eventWindowInstant(null)).toBeNull();
      expect(eventWindowInstant(undefined)).toBeNull();
      expect(eventWindowInstant("not-a-date")).toBeNull();
    });
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
