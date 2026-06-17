import { isValidCPF } from "@/utils/cpf";

/**
 * Lógica pura da "lista de CPF" usada nos modais de Cupom e Voucher (antes
 * duplicada byte a byte). O estado/efeitos ficam no hook `useCpfList`; aqui só
 * as funções puras (formatação, validação, parse de CSV) — fáceis de testar.
 */

/** "12345678901" → "123.456.789-01". Não-11-dígitos volta como veio. */
export function formatCpf(cpf: string): string {
  const numbers = cpf.replace(/\D/g, "");
  if (numbers.length === 11) {
    return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9)}`;
  }
  return cpf;
}

/** Máscara progressiva enquanto digita (limita a 11 dígitos). */
export function formatCpfInput(value: string): string {
  const raw = value.replace(/\D/g, "").slice(0, 11);
  if (raw.length > 9) return `${raw.slice(0, 3)}.${raw.slice(3, 6)}.${raw.slice(6, 9)}-${raw.slice(9)}`;
  if (raw.length > 6) return `${raw.slice(0, 3)}.${raw.slice(3, 6)}.${raw.slice(6)}`;
  if (raw.length > 3) return `${raw.slice(0, 3)}.${raw.slice(3)}`;
  return raw;
}

export type CpfValidation =
  | { ok: true; digits: string }
  | { ok: false; error: string };

/** Valida um CPF novo contra a lista existente (inválido / duplicado). */
export function validateNewCpf(input: string, existing: readonly string[]): CpfValidation {
  const digits = input.replace(/\D/g, "");
  if (digits.length !== 11 || !isValidCPF(digits)) {
    return { ok: false, error: "CPF inválido." };
  }
  if (existing.includes(digits)) {
    return { ok: false, error: "CPF já está na lista." };
  }
  return { ok: true, digits };
}

export interface CpfCsvResult {
  /** CPFs válidos e novos (sem duplicar entre si nem com `existing`). */
  newCpfs: string[];
  duplicates: number;
  invalid: number;
}

/**
 * Faz o parse do conteúdo de um CSV de CPFs (separadores: vírgula, ponto-e-vírgula
 * ou quebras de linha), validando e deduplicando contra `existing`.
 */
export function parseCpfCsvText(text: string, existing: readonly string[]): CpfCsvResult {
  const lines = text.split(/[\r\n,;]+/);
  const newCpfs: string[] = [];
  let duplicates = 0;
  let invalid = 0;
  for (const line of lines) {
    const digits = line.replace(/\D/g, "");
    if (digits.length !== 11 || !isValidCPF(digits)) {
      if (digits.length > 0) invalid++;
      continue;
    }
    if (existing.includes(digits) || newCpfs.includes(digits)) {
      duplicates++;
      continue;
    }
    newCpfs.push(digits);
  }
  return { newCpfs, duplicates, invalid };
}

/** Mensagem de resumo do import de CSV (ex.: "3 CPF(s) importado(s), 1 duplicado(s)…"). */
export function cpfCsvSummary(result: CpfCsvResult): string | null {
  const parts: string[] = [];
  if (result.newCpfs.length > 0) parts.push(`${result.newCpfs.length} CPF(s) importado(s)`);
  if (result.duplicates > 0) parts.push(`${result.duplicates} duplicado(s) ignorado(s)`);
  if (result.invalid > 0) parts.push(`${result.invalid} inválido(s) ignorado(s)`);
  return parts.length > 0 ? parts.join(", ") : null;
}
