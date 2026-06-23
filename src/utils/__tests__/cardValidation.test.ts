import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import {
  validateCardNumber,
  getCardBrand,
  validateExpiry,
  maskCardExpiry,
  validateCVV,
} from "../cardValidation";

/**
 * Caracterização da validação de cartão (Luhn, bandeira, validade, máscara, CVV).
 * Trava o comportamento atual antes de refatorar o PaymentStep. A validade usa
 * tempo fixo (2026-06-18) pra ser determinística.
 */

describe("validateCardNumber (Luhn)", () => {
  it("aceita números válidos de teste", () => {
    expect(validateCardNumber("4242 4242 4242 4242")).toBe(true); // VISA test
    expect(validateCardNumber("5555555555554444")).toBe(true); // Mastercard test
  });
  it("rejeita falha de Luhn", () => {
    expect(validateCardNumber("4242424242424241")).toBe(false);
  });
  it("rejeita comprimento fora de 13–19 dígitos", () => {
    expect(validateCardNumber("4242")).toBe(false);
    expect(validateCardNumber("42424242424242424242")).toBe(false);
  });
});

describe("getCardBrand", () => {
  it("detecta as bandeiras por BIN", () => {
    expect(getCardBrand("4111111111111111")).toBe("VISA");
    expect(getCardBrand("5105105105105100")).toBe("MASTERCARD");
    expect(getCardBrand("2221000000000009")).toBe("MASTERCARD"); // série 2
    expect(getCardBrand("378282246310005")).toBe("AMEX");
    expect(getCardBrand("6011000990139424")).toBe("DISCOVER");
  });
  it("desconhecida quando nenhum padrão bate", () => {
    expect(getCardBrand("9999999999999999")).toBe("UNKNOWN");
  });
});

describe("validateExpiry", () => {
  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-18T12:00:00Z"));
  });
  afterAll(() => vi.useRealTimers());

  it("válido até o fim do mês de expiração", () => {
    expect(validateExpiry("06/26")).toBe(true); // mês atual ainda válido
    expect(validateExpiry("12/26")).toBe(true);
  });
  it("rejeita mês já expirado", () => {
    expect(validateExpiry("05/26")).toBe(false);
    expect(validateExpiry("01/20")).toBe(false);
  });
  it("aceita ano com 4 dígitos", () => {
    expect(validateExpiry("06/2026")).toBe(true);
  });
  it("rejeita mês inválido ou formato incompleto", () => {
    expect(validateExpiry("13/30")).toBe(false);
    expect(validateExpiry("00/30")).toBe(false);
    expect(validateExpiry("12")).toBe(false);
    expect(validateExpiry("")).toBe(false);
  });
});

describe("maskCardExpiry", () => {
  it("adiciona a barra ao digitar o ano", () => {
    expect(maskCardExpiry("12", "1")).toBe("12/");
    expect(maskCardExpiry("123")).toBe("12/3");
    expect(maskCardExpiry("1225")).toBe("12/25");
  });
  it("NÃO re-adiciona a barra ao apagar (deletion-aware)", () => {
    expect(maskCardExpiry("12", "12/")).toBe("12");
  });
  it("strip de não-dígitos e cap de 4 dígitos", () => {
    expect(maskCardExpiry("1a2b3c4d5e")).toBe("12/34");
  });
  it("um dígito fica como está", () => {
    expect(maskCardExpiry("1")).toBe("1");
  });
});

describe("validateCVV", () => {
  it("aceita 3 ou 4 dígitos", () => {
    expect(validateCVV("123")).toBe(true);
    expect(validateCVV("1234")).toBe(true);
  });
  it("rejeita comprimentos diferentes", () => {
    expect(validateCVV("12")).toBe(false);
    expect(validateCVV("12345")).toBe(false);
    expect(validateCVV("")).toBe(false);
  });
});
