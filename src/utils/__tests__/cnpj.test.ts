import { describe, it, expect } from "vitest";
import { isValidCNPJ, getCnpjValidationMessage } from "../cnpj";

describe("isValidCNPJ", () => {
  it("aceita CNPJ válido (com e sem máscara)", () => {
    expect(isValidCNPJ("11.222.333/0001-81")).toBe(true);
    expect(isValidCNPJ("11222333000181")).toBe(true);
  });

  it("rejeita dígitos verificadores errados", () => {
    expect(isValidCNPJ("11222333000180")).toBe(false);
    expect(isValidCNPJ("11.444.777/0001-62")).toBe(false);
  });

  it("rejeita tamanho diferente de 14", () => {
    expect(isValidCNPJ("112223330001")).toBe(false);
    expect(isValidCNPJ("112223330001811")).toBe(false);
  });

  it("rejeita todos os dígitos repetidos", () => {
    expect(isValidCNPJ("00000000000000")).toBe(false);
    expect(isValidCNPJ("11111111111111")).toBe(false);
  });
});

describe("getCnpjValidationMessage", () => {
  it("null para CNPJ válido", () => {
    expect(getCnpjValidationMessage("11.222.333/0001-81")).toBeNull();
  });

  it("obrigatório quando vazio e não opcional", () => {
    expect(getCnpjValidationMessage("")).toBe("CNPJ é obrigatório");
    expect(getCnpjValidationMessage("", { optional: true })).toBeNull();
  });

  it("mensagem de tamanho e de inválido", () => {
    expect(getCnpjValidationMessage("112223330001")).toBe("CNPJ deve ter 14 dígitos");
    expect(getCnpjValidationMessage("11222333000180")).toBe("CNPJ inválido");
  });
});
