import { describe, it, expect } from "vitest";
import {
  isPersonBr,
  documentLabel,
  formatDocumentDisplay,
  formatPersonPhone,
} from "../documentDisplay";

/**
 * Caracterização da exibição i18n de documento/telefone (comprador/participante).
 * A heurística `isPersonBr` é sutil (a ORDEM dos sinais importa) — trava aqui.
 */

describe("isPersonBr", () => {
  it("country é o sinal mais forte (cobre gentílico/legado)", () => {
    expect(isPersonBr({ country: "Brasil" })).toBe(true);
    expect(isPersonBr({ country: "Brazil" })).toBe(true);
    expect(isPersonBr({ country: "BR" })).toBe(true);
    expect(isPersonBr({ country: "Brasileira" })).toBe(true); // gentílico normalizado
    expect(isPersonBr({ country: "Estados Unidos" })).toBe(false);
  });
  it("country tem prioridade sobre documentType (conta legada com type CPF)", () => {
    expect(isPersonBr({ country: "Estados Unidos", documentType: "CPF" })).toBe(false);
  });
  it("sem country usa documentType", () => {
    expect(isPersonBr({ documentType: "CPF" })).toBe(true);
    expect(isPersonBr({ documentType: "PASSPORT" })).toBe(false);
  });
  it("sem country nem type usa o shape do documento", () => {
    expect(isPersonBr({ document: "123.456.789-09" })).toBe(true); // 11 dígitos
    expect(isPersonBr({ document: "AB123456" })).toBe(false); // tem letras
    expect(isPersonBr({ document: "12345" })).toBe(false); // não tem 11 dígitos
  });
  it("documento ausente → assume brasileiro (histórico)", () => {
    expect(isPersonBr({})).toBe(true);
    expect(isPersonBr({ document: "  " })).toBe(true);
  });
});

describe("documentLabel", () => {
  it("CPF p/ brasileiro, Documento p/ estrangeiro", () => {
    expect(documentLabel(true)).toBe("CPF");
    expect(documentLabel(false)).toBe("Documento");
  });
});

describe("formatDocumentDisplay", () => {
  it("brasileiro com 11 dígitos → CPF formatado", () => {
    expect(formatDocumentDisplay("12345678909", true)).toBe("123.456.789-09");
    expect(formatDocumentDisplay("123.456.789-09", true)).toBe("123.456.789-09");
  });
  it("brasileiro fora do shape de CPF → cru (defensivo)", () => {
    expect(formatDocumentDisplay("123", true)).toBe("123");
  });
  it("estrangeiro → cru (preserva letras do passaporte)", () => {
    expect(formatDocumentDisplay("AB-12345", false)).toBe("AB-12345");
  });
  it("vazio → string vazia", () => {
    expect(formatDocumentDisplay("", true)).toBe("");
    expect(formatDocumentDisplay(null, false)).toBe("");
    expect(formatDocumentDisplay(undefined, true)).toBe("");
  });
});

describe("formatPersonPhone", () => {
  it("vazio → string vazia", () => {
    expect(formatPersonPhone("", "Brasil")).toBe("");
    expect(formatPersonPhone(null, null)).toBe("");
  });
  it("default BR-first quando country ausente", () => {
    expect(formatPersonPhone("11999990000", null)).toBe("(11) 99999-0000");
  });
  it("formata por país conhecido", () => {
    expect(formatPersonPhone("11999990000", "Brasil")).toBe("(11) 99999-0000");
  });
});
