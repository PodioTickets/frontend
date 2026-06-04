import { describe, it, expect } from "vitest";
import { maskCardExpiry } from "./cardValidation";

// Regressão: a validade do cartão (MM/AA) não apagava — a máscara recolocava a
// barra a cada backspace, travando em "12/". `maskCardExpiry` é deletion-aware.
describe("cardValidation.maskCardExpiry", () => {
  it("digitando: barra aparece sozinha ao começar o ano", () => {
    expect(maskCardExpiry("1", "")).toBe("1");
    expect(maskCardExpiry("12", "1")).toBe("12/"); // 2º dígito → auto-barra
    expect(maskCardExpiry("12/3", "12/")).toBe("12/3");
    expect(maskCardExpiry("12/34", "12/3")).toBe("12/34");
  });

  it("ignora não-dígitos e limita a 4 números (MM/AA)", () => {
    expect(maskCardExpiry("12/3456", "12/345")).toBe("12/34");
    expect(maskCardExpiry("ab12cd", "")).toBe("12/");
  });

  it("apagando: NÃO re-adiciona a barra em 'MM/' → deixa apagar até zerar", () => {
    // O bug: "12/" + backspace virava "12" e a máscara devolvia "12/" (travava).
    expect(maskCardExpiry("12", "12/")).toBe("12"); // apagou a barra → fica "12"
    expect(maskCardExpiry("1", "12")).toBe("1");
    expect(maskCardExpiry("", "1")).toBe("");
  });

  it("apagando do ano remove a barra junto ao chegar no mês", () => {
    expect(maskCardExpiry("12/", "12/3")).toBe("12"); // "12/3" → backspace → "12"
  });
});
