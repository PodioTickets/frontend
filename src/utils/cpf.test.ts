import { describe, it, expect } from "vitest";
import { isValidCPF, getCpfValidationMessage } from "@/utils/cpf";

// Smoke test: valida que o harness do Vitest + alias "@/" funcionam,
// e cobre o validador de CPF (algoritmo da Receita).
describe("cpf", () => {
  it("aceita CPF válido (com e sem máscara)", () => {
    expect(isValidCPF("529.982.247-25")).toBe(true);
    expect(isValidCPF("52998224725")).toBe(true);
  });

  it("rejeita dígitos repetidos e DV inválido", () => {
    expect(isValidCPF("111.111.111-11")).toBe(false);
    expect(isValidCPF("52998224724")).toBe(false);
  });

  it("rejeita tamanho diferente de 11 dígitos", () => {
    expect(isValidCPF("123")).toBe(false);
    expect(isValidCPF("")).toBe(false);
  });

  it("getCpfValidationMessage respeita optional", () => {
    expect(getCpfValidationMessage("", { optional: true })).toBeNull();
    expect(getCpfValidationMessage("")).toBe("CPF é obrigatório");
    expect(getCpfValidationMessage("529.982.247-25")).toBeNull();
    expect(getCpfValidationMessage("123")).toBe("CPF deve ter 11 dígitos");
  });
});
