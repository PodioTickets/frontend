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

/** Documento do titular: sempre CPF ou CNPJ — nunca ambíguo. */
export type HolderDocType = "CPF" | "CNPJ";

/**
 * Resolve o tipo de documento do TITULAR da chave PIX. Chaves CPF/CNPJ ditam o
 * tipo diretamente; para E-mail/Telefone/Aleatória (chave não-documento) cai no
 * tipo de pessoa da organização (PF → CPF, PJ → CNPJ). Assim o rótulo/máscara
 * nunca fica "CPF/CNPJ".
 */
export function resolveHolderDocType(
  keyType: string,
  orgIsPj: boolean,
): HolderDocType {
  if (keyType === "CPF") return "CPF";
  if (keyType === "CNPJ") return "CNPJ";
  return orgIsPj ? "CNPJ" : "CPF";
}

/** Máscara do documento do titular conforme o tipo resolvido. */
export function maskHolderDoc(docType: HolderDocType, value: string): string {
  return docType === "CNPJ" ? formatCNPJ(value) : formatCPF(value);
}

/** Placeholder do documento do titular conforme o tipo resolvido. */
export function holderDocPlaceholder(docType: HolderDocType): string {
  return docType === "CNPJ" ? "00.000.000/0000-00" : "000.000.000-00";
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
