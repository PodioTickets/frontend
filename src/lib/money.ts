/**
 * Formatação monetária canônica (BRL). Fonte única para o "R$ 1.234,56" que
 * estava reimplementado inline em ~12 componentes do checkout via
 * `new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })`.
 *
 * Unidade EXPLÍCITA no nome pra evitar o erro clássico de misturar reais com
 * centavos:
 *  - `formatBRL` recebe REAIS (ex.: 1234.56 → "R$ 1.234,56");
 *  - `formatBRLFromCents` recebe CENTAVOS (ex.: 123456 → "R$ 1.234,56").
 *
 * Para BRL, o `Intl` já assume 2 casas decimais; fixamos min/max=2 de propósito
 * pra travar o comportamento independente de defaults do runtime.
 */

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Formata um valor em REAIS como moeda BRL ("R$ 1.234,56"). */
export function formatBRL(reais: number): string {
  return BRL.format(Number.isFinite(reais) ? reais : 0);
}

/** Formata um valor em CENTAVOS como moeda BRL ("R$ 1.234,56"). */
export function formatBRLFromCents(cents: number): string {
  return formatBRL((Number.isFinite(cents) ? cents : 0) / 100);
}
