import { isBrazilianCountry } from "@/validators/Auth.validator";
import { formatPhoneForCountry } from "@/utils/phone";
import { normalizeNationality } from "@/utils/nationality";

/**
 * Exibição i18n de documento + telefone de uma pessoa (comprador/participante).
 *
 * Centraliza a heurística CANÔNICA de "é brasileiro?" e a formatação de
 * documento/telefone que antes estava duplicada inline em várias telas
 * (tela do usuário, checkout e — agora — painel do organizador).
 *
 * Por que um util: a heurística é sutil (a ORDEM dos sinais importa) e fácil de
 * errar quando replicada. Fonte única de verdade evita divergência entre as
 * superfícies que mostram o mesmo dado.
 */

/**
 * Identidade mínima pra decidir como exibir o documento. Todos os campos são
 * opcionais — diferentes endpoints trazem subconjuntos diferentes, então a
 * heurística precisa degradar com segurança.
 */
export interface PersonDocumentInfo {
  /** País/nacionalidade (nome PT-BR vindo do cadastro i18n). Sinal mais forte. */
  country?: string | null;
  /** "CPF" | "PASSPORT". Sinal intermediário (não confiável sozinho). */
  documentType?: string | null;
  /** Número do documento (CPF ou passaporte/RNE). Aceita máscara. */
  document?: string | null;
}

/**
 * Heurística CANÔNICA pra classificar a pessoa como brasileira.
 *
 * Ordem do sinal mais confiável pro menos:
 *   1. `country` preenchido → casa com BR/Brasil/Brazil (vem do cadastro i18n);
 *   2. sem country, mas `documentType === "CPF"` (registros legados sem país);
 *   3. sem ambos → shape do doc (CPF = 11 dígitos puros, sem letras).
 *
 * NÃO confiar em `documentType` ANTES de `country`: contas pré-migração têm
 * `documentType="CPF"` mesmo com país estrangeiro, e um passaporte (6 chars)
 * seria classificado como CPF inválido.
 *
 * Documento ausente → assume brasileiro (comportamento histórico do produto).
 */
export function isPersonBr(info: PersonDocumentInfo): boolean {
  if (info.country) {
    // Normaliza gentílico/legado ("Brasileira"/"Brazil"/"BR") antes de decidir —
    // o backend persiste esses valores e `isBrazilianCountry` sozinho não os cobre.
    const normalized = normalizeNationality(info.country) ?? info.country;
    return isBrazilianCountry(normalized);
  }
  if (info.documentType) return info.documentType === "CPF";
  const raw = (info.document || "").trim();
  if (!raw) return true;
  if (/[A-Za-z]/.test(raw)) return false;
  return raw.replace(/\D/g, "").length === 11;
}

/**
 * Label do campo de documento conforme a nacionalidade.
 *
 * Decisão de produto (telas de exibição do organizador): o VALOR do documento
 * é mostrado CRU (sem máscara/formatação) — apenas o label muda. Quem recebe
 * máscara é o telefone (`formatPersonPhone`).
 */
export function documentLabel(isBr: boolean): "CPF" | "Documento" {
  return isBr ? "CPF" : "Documento";
}

/**
 * Documento formatado pra EXIBIÇÃO (sem mascaramento/asteriscos).
 *
 * - Brasileiro com 11 dígitos → CPF completo `xxx.xxx.xxx-xx`.
 * - Brasileiro fora do shape de CPF (defensivo) → cru.
 * - Estrangeiro → cru (passaporte/RNE não têm formatação canônica; letras
 *   essenciais não podem ser perdidas).
 *
 * Difere de `maskDocument` (mascaramento parcial de PII): aqui o número é
 * mostrado por inteiro, só agrupado.
 */
export function formatDocumentDisplay(
  document: string | null | undefined,
  isBr: boolean,
): string {
  const raw = (document || "").trim();
  if (!raw) return "";
  if (!isBr) return raw;
  const digits = raw.replace(/\D/g, "");
  if (digits.length !== 11) return raw;
  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

/**
 * Telefone formatado por país via libphonenumber (mesma máscara do cadastro).
 *
 * Default BR-first: quando `country` não vem do backend, assume "Brasil" — o
 * produto é majoritariamente brasileiro, e mascarar como BR é melhor que exibir
 * os dígitos crus. País estrangeiro CONHECIDO formata conforme o país (US, PT…).
 */
export function formatPersonPhone(
  phone: string | null | undefined,
  country: string | null | undefined,
): string {
  if (!phone) return "";
  return formatPhoneForCountry(phone, country ?? "Brasil") || phone;
}
