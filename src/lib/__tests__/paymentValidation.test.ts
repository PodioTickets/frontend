import { describe, it, expect } from "vitest";
import { formatCardNumber, cvvMaxLengthForCard } from "../paymentValidation";

describe("formatCardNumber", () => {
  it("agrupa dígitos em blocos de 4", () => {
    expect(formatCardNumber("5400797560264737")).toBe("5400 7975 6026 4737");
  });

  it("ignora não-dígitos durante a digitação", () => {
    expect(formatCardNumber("5400-7975-6026")).toBe("5400 7975 6026");
    expect(formatCardNumber("5400 79a75")).toBe("5400 7975");
  });

  it("retorna parcial sem espaço quando há menos de 4 dígitos", () => {
    expect(formatCardNumber("540")).toBe("540");
    expect(formatCardNumber("")).toBe("");
  });

  it("limita a 16 dígitos (descarta excedente)", () => {
    expect(formatCardNumber("54007975602647371234")).toBe("5400 7975 6026 4737");
  });
});

describe("cvvMaxLengthForCard", () => {
  it("retorna 4 para Amex", () => {
    // Amex começa com 34/37
    expect(cvvMaxLengthForCard("3782 822463 10005")).toBe(4);
  });

  it("retorna 3 para demais bandeiras", () => {
    expect(cvvMaxLengthForCard("5400 7975 6026 4737")).toBe(3);
    expect(cvvMaxLengthForCard("4111 1111 1111 1111")).toBe(3);
  });

  it("retorna 3 quando o número é vazio/indefinido", () => {
    expect(cvvMaxLengthForCard()).toBe(3);
    expect(cvvMaxLengthForCard("")).toBe(3);
  });
});
