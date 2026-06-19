import { describe, it, expect } from "vitest";
import {
  formatEventListCurrency,
  formatEventListDate,
} from "../eventListFormatters";

describe("formatEventListCurrency", () => {
  it("formata centavos como BRL", () => {
    //   = NBSP que o Intl insere entre o símbolo e o número.
    expect(formatEventListCurrency(123456)).toBe("R$ 1.234,56");
    expect(formatEventListCurrency(0)).toBe("R$ 0,00");
    expect(formatEventListCurrency(99)).toBe("R$ 0,99");
  });

  it("trata null/undefined como zero", () => {
    expect(formatEventListCurrency(null)).toBe("R$ 0,00");
    expect(formatEventListCurrency(undefined)).toBe("R$ 0,00");
  });
});

describe("formatEventListDate", () => {
  it("formata data curta em UTC (sem shift de fuso)", () => {
    // Date-only ancorada em meia-noite UTC: NUNCA volta um dia (bug antigo).
    expect(formatEventListDate("2026-06-08")).toBe("08 Jun, 2026");
    expect(formatEventListDate("2026-01-01")).toBe("01 Jan, 2026");
    expect(formatEventListDate("2026-12-31")).toBe("31 Dez, 2026");
  });

  it("usa o componente UTC de ISO com horário", () => {
    // 2026-06-08T23:00:00Z continua dia 08 em UTC (em UTC-3 local seria 08 às 20h,
    // mas instantes próximos da meia-noite UTC não deslocam o dia aqui).
    expect(formatEventListDate("2026-06-08T23:00:00.000Z")).toBe("08 Jun, 2026");
  });

  it("retorna travessão para valores ausentes/inválidos", () => {
    expect(formatEventListDate(null)).toBe("—");
    expect(formatEventListDate(undefined)).toBe("—");
    expect(formatEventListDate("")).toBe("—");
    expect(formatEventListDate("not-a-date")).toBe("—");
  });
});
