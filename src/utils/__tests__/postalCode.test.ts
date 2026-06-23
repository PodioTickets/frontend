import { describe, it, expect } from "vitest";
import { getPostalCodeConfig } from "../postalCode";

/**
 * Caracterização da config de código postal por país (CEP/ZIP/CAP). Fonte única
 * usada por CheckoutAddressSection (input) e PaymentStep (payload).
 */

describe("getPostalCodeConfig — Brasil (CEP)", () => {
  const c = getPostalCodeConfig("Brasil");
  it("rótulo e teclado numérico", () => {
    expect(c.label).toBe("CEP");
    expect(c.inputMode).toBe("numeric");
  });
  it("format aplica máscara 00000-000 e corta em 8 dígitos", () => {
    expect(c.format("123456789")).toBe("12345-678");
    expect(c.format("123")).toBe("123");
    expect(c.format("12345")).toBe("12345");
  });
  it("isValid exige 8 dígitos; toBackend só dígitos", () => {
    expect(c.isValid("12345-678")).toBe(true);
    expect(c.isValid("1234567")).toBe(false);
    expect(c.toBackend("12345-678")).toBe("12345678");
  });
});

describe("getPostalCodeConfig — EUA (ZIP)", () => {
  const c = getPostalCodeConfig("Estados Unidos");
  it("rótulo ZIP Code", () => {
    expect(c.label).toBe("ZIP Code");
  });
  it("aceita 5 ou ZIP+4 (9)", () => {
    expect(c.format("12345")).toBe("12345");
    expect(c.format("123456789")).toBe("12345-6789");
    expect(c.isValid("12345")).toBe(true);
    expect(c.isValid("12345-6789")).toBe(true);
    expect(c.isValid("1234")).toBe(false);
  });
});

describe("getPostalCodeConfig — Argentina (CPA alfanumérico)", () => {
  const c = getPostalCodeConfig("Argentina");
  it("rótulo CPA e teclado texto", () => {
    expect(c.label).toBe("Código Postal (CPA)");
    expect(c.inputMode).toBe("text");
  });
  it("format remove não-alfanuméricos, sobe pra maiúscula, corta em 8", () => {
    expect(c.format("c1425ddf")).toBe("C1425DDF");
    expect(c.format("c1425-ddf-extra")).toBe("C1425DDF");
  });
  it("isValid aceita 4 dígitos (antigo) OU CPA A####AAA", () => {
    expect(c.isValid("1425")).toBe(true);
    expect(c.isValid("C1425DDF")).toBe(true);
    expect(c.isValid("ABC")).toBe(false);
  });
});

describe("getPostalCodeConfig — fallback (país não mapeado)", () => {
  const c = getPostalCodeConfig("Wakanda");
  it("usa config genérica de texto livre não-vazio", () => {
    expect(c.label).toBe("Código Postal");
    expect(c.inputMode).toBe("text");
    expect(c.isValid("abc 123")).toBe(true);
    expect(c.isValid("   ")).toBe(false);
    expect(c.toBackend("  ab   cd ")).toBe("ab cd");
  });
  it("country nulo também cai no fallback", () => {
    expect(getPostalCodeConfig(null).label).toBe("Código Postal");
  });
});

describe("getPostalCodeConfig — estabilidade de referência", () => {
  it("retorna a MESMA referência por país (seguro p/ deps de hooks)", () => {
    expect(getPostalCodeConfig("Brasil")).toBe(getPostalCodeConfig("Brasil"));
  });
});
