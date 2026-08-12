import { describe, it, expect } from "vitest";
import {
  onlyDigits,
  formatCNPJ,
  formatCPF,
  formatCPFOrCNPJ,
  formatPhone,
  formatCEP,
} from "@/utils/masks";

describe("masks", () => {
  it("onlyDigits remove tudo que não é dígito", () => {
    expect(onlyDigits("12.345-6/a")).toBe("123456");
    expect(onlyDigits(null)).toBe("");
  });

  it("formatCNPJ progressivo e limitado a 14 dígitos", () => {
    expect(formatCNPJ("11222333000181")).toBe("11.222.333/0001-81");
    expect(formatCNPJ("112")).toBe("11.2");
    // ignora dígitos além de 14
    expect(formatCNPJ("1122233300018199")).toBe("11.222.333/0001-81");
  });

  it("formatCPF progressivo e limitado a 11 dígitos", () => {
    expect(formatCPF("52998224725")).toBe("529.982.247-25");
    expect(formatCPF("529")).toBe("529");
    expect(formatCPF("5299822472599")).toBe("529.982.247-25");
  });

  it("formatCPFOrCNPJ escolhe pelo tamanho", () => {
    expect(formatCPFOrCNPJ("52998224725")).toBe("529.982.247-25");
    expect(formatCPFOrCNPJ("11222333000181")).toBe("11.222.333/0001-81");
  });

  it("formatPhone descarta DDI 55 e formata celular", () => {
    expect(formatPhone("5542999990000")).toBe("(42) 99999-0000");
    expect(formatPhone("4232220000")).toBe("(42) 3222-0000");
  });

  it("formatCEP", () => {
    expect(formatCEP("84010000")).toBe("84010-000");
    expect(formatCEP("8401")).toBe("8401");
  });
});
