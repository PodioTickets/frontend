import { describe, it, expect } from "vitest";
import {
  getCountryCodeFromName,
  formatPhoneForCountry,
  getPhoneDigitsForBackend,
  isPhoneValidForCountry,
  getPhonePlaceholderForCountry,
  getPhoneMaxLengthForCountry,
} from "../phone";

/**
 * Caracterização do util de telefone i18n (wrapper de libphonenumber). Usa os
 * exemplos documentados no próprio arquivo como golden master. Crítico pro
 * checkout (InformationStep) e pro display do organizador.
 */

describe("getCountryCodeFromName", () => {
  it("resolve nomes PT-BR para ISO alpha-2", () => {
    expect(getCountryCodeFromName("Brasil")).toBe("BR");
    expect(getCountryCodeFromName("Estados Unidos")).toBe("US");
    expect(getCountryCodeFromName("Portugal")).toBe("PT");
    expect(getCountryCodeFromName("Argentina")).toBe("AR");
  });
  it("null/vazio/desconhecido → null", () => {
    expect(getCountryCodeFromName(null)).toBeNull();
    expect(getCountryCodeFromName("")).toBeNull();
    expect(getCountryCodeFromName("Wakanda")).toBeNull();
  });
});

describe("formatPhoneForCountry", () => {
  it("BR aplica máscara nacional e remove DDI", () => {
    expect(formatPhoneForCountry("11999990000", "Brasil")).toBe("(11) 99999-0000");
    expect(formatPhoneForCountry("+5511999990000", "Brasil")).toBe("(11) 99999-0000");
    expect(formatPhoneForCountry("5511999990000", "Brasil")).toBe("(11) 99999-0000");
  });
  it("US remove o DDI 1 (NANP) e formata", () => {
    expect(formatPhoneForCountry("2025550100", "Estados Unidos")).toBe("(202) 555-0100");
    expect(formatPhoneForCountry("12025550100", "Estados Unidos")).toBe("(202) 555-0100");
  });
  it("país não mapeado → só dígitos limpos", () => {
    expect(formatPhoneForCountry("(12) 3abc456", "Wakanda")).toBe("123456");
  });
});

describe("getPhoneDigitsForBackend", () => {
  it("extrai o número nacional (sem DDI) p/ país conhecido", () => {
    expect(getPhoneDigitsForBackend("(11) 99999-0000", "Brasil")).toBe("11999990000");
    expect(getPhoneDigitsForBackend("+55 11 99999-0000", "Brasil")).toBe("11999990000");
  });
  it("vazio → string vazia", () => {
    expect(getPhoneDigitsForBackend("", "Brasil")).toBe("");
  });
  it("país não mapeado → strip de não-dígitos", () => {
    expect(getPhoneDigitsForBackend("(12) 345-678", "Wakanda")).toBe("12345678");
  });
});

describe("isPhoneValidForCountry", () => {
  it("aceita número válido do país", () => {
    expect(isPhoneValidForCountry("11991234567", "Brasil")).toBe(true);
  });
  it("rejeita número curto/ inválido do país", () => {
    expect(isPhoneValidForCountry("111", "Brasil")).toBe(false);
  });
  it("vazio → false", () => {
    expect(isPhoneValidForCountry("", "Brasil")).toBe(false);
    expect(isPhoneValidForCountry("   ", "Brasil")).toBe(false);
  });
  it("país não mapeado → aceita 6+ dígitos", () => {
    expect(isPhoneValidForCountry("123456", "Wakanda")).toBe(true);
    expect(isPhoneValidForCountry("12345", "Wakanda")).toBe(false);
  });
});

describe("placeholder / maxLength", () => {
  it("placeholder é string não-vazia; fallback p/ país desconhecido", () => {
    expect(getPhonePlaceholderForCountry("Brasil").length).toBeGreaterThan(0);
    expect(getPhonePlaceholderForCountry("Wakanda")).toBe("(00) 99999-9999");
  });
  it("maxLength = comprimento do placeholder + folga (4)", () => {
    const ph = getPhonePlaceholderForCountry("Brasil");
    expect(getPhoneMaxLengthForCountry("Brasil")).toBe(ph.length + 4);
  });
});
