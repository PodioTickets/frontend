import { describe, it, expect } from "vitest";
import {
  formatCpf,
  formatCpfInput,
  validateNewCpf,
  parseCpfCsvText,
  cpfCsvSummary,
} from "../cpfList";

// CPFs válidos (dígitos verificadores corretos) para os testes.
const VALID_A = "52998224725";
const VALID_B = "16899535009";

describe("formatCpf", () => {
  it("formata 11 dígitos", () => {
    expect(formatCpf(VALID_A)).toBe("529.982.247-25");
  });
  it("não-11-dígitos volta como veio", () => {
    expect(formatCpf("123")).toBe("123");
  });
});

describe("formatCpfInput", () => {
  it("máscara progressiva", () => {
    expect(formatCpfInput("529")).toBe("529");
    expect(formatCpfInput("529982")).toBe("529.982");
    expect(formatCpfInput("529982247")).toBe("529.982.247");
    expect(formatCpfInput("52998224725")).toBe("529.982.247-25");
  });
  it("limita a 11 dígitos e ignora não-dígitos", () => {
    expect(formatCpfInput("529.982.247-2599")).toBe("529.982.247-25");
  });
});

describe("validateNewCpf", () => {
  it("aceita CPF válido e novo", () => {
    expect(validateNewCpf("529.982.247-25", [])).toEqual({ ok: true, digits: VALID_A });
  });
  it("rejeita inválido", () => {
    expect(validateNewCpf("111.111.111-11", [])).toEqual({ ok: false, error: "CPF inválido." });
    expect(validateNewCpf("123", [])).toEqual({ ok: false, error: "CPF inválido." });
  });
  it("rejeita duplicado", () => {
    expect(validateNewCpf(VALID_A, [VALID_A])).toEqual({ ok: false, error: "CPF já está na lista." });
  });
});

describe("parseCpfCsvText", () => {
  it("separa por vírgula/;/quebra de linha, valida e deduplica", () => {
    const text = `${VALID_A},${VALID_B};${VALID_A}\n111.111.111-11\nlixo`;
    const r = parseCpfCsvText(text, []);
    expect(r.newCpfs).toEqual([VALID_A, VALID_B]);
    expect(r.duplicates).toBe(1); // VALID_A repetido
    expect(r.invalid).toBe(1); // o "111..." (lixo sem dígitos não conta)
  });
  it("deduplica contra a lista existente", () => {
    const r = parseCpfCsvText(VALID_A, [VALID_A]);
    expect(r.newCpfs).toEqual([]);
    expect(r.duplicates).toBe(1);
  });
});

describe("cpfCsvSummary", () => {
  it("monta a mensagem composta", () => {
    expect(cpfCsvSummary({ newCpfs: [VALID_A], duplicates: 2, invalid: 1 })).toBe(
      "1 CPF(s) importado(s), 2 duplicado(s) ignorado(s), 1 inválido(s) ignorado(s)",
    );
  });
  it("null quando nada aconteceu", () => {
    expect(cpfCsvSummary({ newCpfs: [], duplicates: 0, invalid: 0 })).toBeNull();
  });
});
