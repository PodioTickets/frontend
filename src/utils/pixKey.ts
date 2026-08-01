/**
 * Helpers de chave PIX compartilhados entre o drawer de edição do admin
 * (`OrganizerEditDrawer`) e a tela de Configurações da organização. Antes viviam
 * privados no drawer; extraídos para evitar duplicação e manter uma única fonte
 * de máscaras/validação/labels de PIX.
 */
import { formatCPF, formatCNPJ } from "@/utils/masks";
import { getCpfValidationMessage } from "@/utils/cpf";
import { getCnpjValidationMessage } from "@/utils/cnpj";

/** Tipos de chave PIX (id do backend → rótulo exibido). */
export const PIX_KEY_LABELS: Record<string, string> = {
  CPF: "CPF",
  CNPJ: "CNPJ",
  EMAIL: "E-mail",
  PHONE: "Telefone",
  EVP: "Chave aleatória",
};

/** Opções do seletor "Tipo de chave", na ordem de exibição. */
export const PIX_KEY_TYPE_OPTIONS: { id: string; label: string }[] = [
  { id: "CPF", label: "CPF" },
  { id: "CNPJ", label: "CNPJ" },
  { id: "EMAIL", label: "E-mail" },
  { id: "PHONE", label: "Telefone" },
  { id: "EVP", label: "Chave aleatória" },
];

/** Aplica máscara de CPF/CNPJ à chave PIX só quando o tipo é documento. */
export function maskPixKey(keyType: string, value: string): string {
  if (keyType === "CPF") return formatCPF(value);
  if (keyType === "CNPJ") return formatCNPJ(value);
  return value;
}

/** Placeholder da chave PIX conforme o tipo selecionado. */
export function pixKeyPlaceholder(keyType: string): string {
  if (keyType === "CPF") return "000.000.000-00";
  if (keyType === "CNPJ") return "00.000.000/0000-00";
  if (keyType === "EMAIL") return "email@exemplo.com";
  if (keyType === "PHONE") return "(00) 00000-0000";
  return "Digite a chave PIX";
}

/**
 * Valida a chave PIX quando o tipo é documento (CPF/CNPJ) — mesma validação do
 * checkout. Demais tipos (e-mail/telefone/aleatória) não passam por validação de
 * documento aqui. Retorna a mensagem de erro ou `null`.
 */
export function getPixKeyValidationMessage(
  keyType: string,
  key: string,
): string | null {
  if (keyType === "CPF") return getCpfValidationMessage(key);
  if (keyType === "CNPJ") return getCnpjValidationMessage(key);
  return null;
}
