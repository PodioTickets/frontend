import { getCardBrand } from "@/utils/cardValidation";

/**
 * Formatação/validação pura ligada a pagamento, extraída do `PaymentStep`
 * (arquivo-monstro). Os validadores de cartão de baixo nível (Luhn, bandeira,
 * validade, CVV, máscara de validade) seguem em `@/utils/cardValidation`
 * (já cobertos por `cardValidation.test.ts`); aqui ficam os helpers de UI que
 * estavam duplicados inline entre o formulário de crédito e o de débito.
 */

/**
 * Agrupa os dígitos do cartão em blocos de 4 ("5400 7975 6026 4737").
 * Ignora não-dígitos e limita a 16 dígitos (maior PAN suportado aqui).
 */
export function formatCardNumber(value: string): string {
  const digits = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
  const match = digits.match(/\d{4,16}/g)?.[0] ?? "";
  const parts: string[] = [];
  for (let i = 0; i < match.length; i += 4) {
    parts.push(match.substring(i, i + 4));
  }
  return parts.length ? parts.join(" ") : digits;
}

/** CVV tem 4 dígitos em Amex, 3 nas demais bandeiras. */
export function cvvMaxLengthForCard(cardNumber?: string): number {
  return cardNumber && getCardBrand(cardNumber) === "AMEX" ? 4 : 3;
}
