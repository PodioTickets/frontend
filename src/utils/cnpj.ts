/**
 * Valida CNPJ pelo algoritmo da Receita Federal (módulo 11 com pesos 2..9
 * cíclicos sobre os 12 primeiros dígitos → 1º DV; sobre os 13 → 2º DV).
 * Não basta ter 14 dígitos.
 */
export function isValidCNPJ(value: string): boolean {
  const cnpj = value.replace(/\D/g, "");
  if (cnpj.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(cnpj)) return false;

  const checkDigit = (len: number): number => {
    // Pesos da Receita: começam em 5 (len 12) ou 6 (len 13) e descem até 2,
    // reiniciando em 9. Equivalente a (len - i) com wrap em [2..9].
    let sum = 0;
    let weight = len - 7;
    for (let i = 0; i < len; i++) {
      sum += parseInt(cnpj.charAt(i), 10) * weight;
      weight = weight === 2 ? 9 : weight - 1;
    }
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };

  if (checkDigit(12) !== parseInt(cnpj.charAt(12), 10)) return false;
  if (checkDigit(13) !== parseInt(cnpj.charAt(13), 10)) return false;
  return true;
}

/** Mensagem de erro para formulários, ou null se válido / vazio só quando opcional */
export function getCnpjValidationMessage(
  cnpj: string | undefined | null,
  options?: { optional?: boolean },
): string | null {
  const raw = (cnpj ?? "").trim();
  if (!raw) {
    return options?.optional ? null : "CNPJ é obrigatório";
  }
  const digits = raw.replace(/\D/g, "");
  if (digits.length !== 14) {
    return "CNPJ deve ter 14 dígitos";
  }
  if (!isValidCNPJ(raw)) {
    return "CNPJ inválido";
  }
  return null;
}
