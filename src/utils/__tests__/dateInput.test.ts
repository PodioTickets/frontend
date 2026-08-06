import { describe, it, expect } from "vitest";
import { maskDateBR, brDateToYmd } from "../dateInput";

describe("maskDateBR", () => {
  it("insere as barras progressivamente", () => {
    expect(maskDateBR("")).toBe("");
    expect(maskDateBR("1")).toBe("1");
    expect(maskDateBR("15")).toBe("15");
    expect(maskDateBR("158")).toBe("15/8");
    expect(maskDateBR("1508")).toBe("15/08");
    expect(maskDateBR("15081992")).toBe("15/08/1992");
  });

  it("ignora não-dígitos e limita a 8 dígitos", () => {
    expect(maskDateBR("15/08/1992")).toBe("15/08/1992");
    expect(maskDateBR("150819921")).toBe("15/08/1992");
    expect(maskDateBR("ab15cd08")).toBe("15/08");
  });
});

describe("brDateToYmd", () => {
  it("converte data válida para YYYY-MM-DD", () => {
    expect(brDateToYmd("15/08/1992")).toBe("1992-08-15");
    expect(brDateToYmd("01/01/2000")).toBe("2000-01-01");
  });

  it("retorna vazio para incompleto ou inválido", () => {
    expect(brDateToYmd("")).toBe("");
    expect(brDateToYmd("15/08")).toBe("");
    expect(brDateToYmd("15/08/99")).toBe("");
    expect(brDateToYmd("32/08/1992")).toBe(""); // dia inválido
    expect(brDateToYmd("15/13/1992")).toBe(""); // mês inválido
    expect(brDateToYmd("15/08/1800")).toBe(""); // ano < 1900
  });
});
