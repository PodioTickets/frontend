import { describe, it, expect } from "vitest";
import { formatBRL, formatBRLFromCents } from "../money";

// O separador entre "R$" e o número no Intl pt-BR é NBSP (U+00A0), não espaço.
const NBSP = " ";

describe("formatBRL (reais)", () => {
  it("formata reais com 2 casas e milhar", () => {
    expect(formatBRL(1234.56)).toBe(`R$${NBSP}1.234,56`);
    expect(formatBRL(50)).toBe(`R$${NBSP}50,00`);
    expect(formatBRL(0)).toBe(`R$${NBSP}0,00`);
  });

  it("arredonda para 2 casas", () => {
    expect(formatBRL(10.999)).toBe(`R$${NBSP}11,00`);
  });

  it("trata valores não-finitos como 0 (defensivo)", () => {
    expect(formatBRL(NaN)).toBe(`R$${NBSP}0,00`);
    expect(formatBRL(Infinity)).toBe(`R$${NBSP}0,00`);
  });
});

describe("formatBRLFromCents (centavos)", () => {
  it("converte centavos → reais antes de formatar", () => {
    expect(formatBRLFromCents(123456)).toBe(`R$${NBSP}1.234,56`);
    expect(formatBRLFromCents(5000)).toBe(`R$${NBSP}50,00`);
    expect(formatBRLFromCents(0)).toBe(`R$${NBSP}0,00`);
  });

  it("trata não-finito como 0", () => {
    expect(formatBRLFromCents(NaN)).toBe(`R$${NBSP}0,00`);
  });
});
