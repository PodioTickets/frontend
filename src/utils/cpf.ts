/**
 * Valida CPF pelo algoritmo da Receita Federal (módulo 11 nos 9 primeiros
 * dígitos → 1º DV; nos 10 primeiros → 2º DV). Não basta ter 11 dígitos.
 */
export function isValidCPF(value: string): boolean {
  const cpf = value.replace(/\D/g, "");
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cpf.charAt(i), 10) * (10 - i);
  }
  let digit = 11 - (sum % 11);
  if (digit >= 10) digit = 0;
  if (digit !== parseInt(cpf.charAt(9), 10)) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cpf.charAt(i), 10) * (11 - i);
  }
  digit = 11 - (sum % 11);
  if (digit >= 10) digit = 0;
  if (digit !== parseInt(cpf.charAt(10), 10)) return false;

  return true;
}

/** Mensagem de erro para formulários, ou null se válido / vazio só quando opcional */
export function getCpfValidationMessage(
  cpf: string | undefined | null,
  options?: { optional?: boolean },
): string | null {
  const raw = (cpf ?? "").trim();
  if (!raw) {
    return options?.optional ? null : "CPF é obrigatório";
  }
  const digits = raw.replace(/\D/g, "");
  if (digits.length !== 11) {
    return "CPF deve ter 11 dígitos";
  }
  if (!isValidCPF(raw)) {
    return "CPF inválido: os dígitos verificadores não conferem com o número";
  }
  return null;
}
