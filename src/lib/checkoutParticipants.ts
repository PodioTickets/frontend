import { isBrazilianCountry } from "@/validators/Auth.validator";
import { getPhoneDigitsForBackend } from "@/utils/phone";

/**
 * Builder ÚNICO do payload de `PATCH /orders/:id/participants`. Compartilhado
 * entre o `handleNext` da página `/informacoes` (envio ao avançar) e o
 * eager-sync do `InformationStep` (envio ao salvar/editar quando todos os
 * participantes estão preenchidos), pra os dois NUNCA divergirem — o servidor
 * recebe sempre o mesmo shape e recomputa o `pricing` (cupom de idade por
 * participante, etc.).
 */

export interface CheckoutParticipantInput {
  name?: string;
  cpf?: string;
  email?: string;
  birthDate?: string;
  phone?: string;
  gender?: string;
  nationality?: string;
  emergencyContactName?: string;
  emergencyPhone?: string;
  hasEmergencyContact?: boolean;
  questionAnswers?: Record<string, string | string[]>;
}

export interface BackendParticipant {
  name: string;
  documentType: "CPF" | "PASSPORT";
  documentNumber: string;
  email: string;
  birthDate: string;
  phone: string;
  country?: string;
  gender?: "MALE" | "FEMALE" | "OTHER" | "PREFER_NOT_TO_SAY";
  emergencyContactName?: string;
  emergencyPhone?: string;
  hasEmergencyContact?: boolean;
  questionAnswers?: Array<{ questionId: string; answer: string | boolean | number }>;
}

/** Campos do contato de emergência que o evento pode exigir. */
export type EmergencyContactField = "emergencyContactName" | "emergencyPhone";

/**
 * Contato de emergência exigido pelo evento (`emergencyContactRequired`).
 * Retorna os campos ainda pendentes — lista vazia quando o evento não exige ou
 * quando nome e telefone já estão preenchidos.
 *
 * `hasEmergencyContact` NÃO entra como gate de propósito: quando o evento
 * exige, a pergunta "deseja adicionar?" some do checkout, e participantes
 * salvos ANTES da exigência ser ligada carregam a flag em `false`. Cobrá-la
 * travaria o checkout num estado que o usuário não tem mais como mudar pela UI.
 */
export function getMissingEmergencyContactFields(
  participant: Pick<
    CheckoutParticipantInput,
    "emergencyContactName" | "emergencyPhone"
  >,
  required: boolean,
): EmergencyContactField[] {
  if (!required) return [];
  const missing: EmergencyContactField[] = [];
  if (!participant.emergencyContactName?.trim()) {
    missing.push("emergencyContactName");
  }
  if (!participant.emergencyPhone?.trim()) missing.push("emergencyPhone");
  return missing;
}

// ─── 1 ingresso por CPF ──────────────────────────────────────────────────────

/** Um slot do carrinho, do ponto de vista da regra de documento. */
export interface CheckoutDocumentSlot {
  /** Índice do participante em `participants` — o mesmo que o card exibe. */
  index: number;
  /** Documento como o comprador digitou (com ou sem máscara). */
  doc?: string;
  /** Brasileiro usa CPF (só dígitos); estrangeiro usa passaporte (alfanumérico). */
  isBrazilian: boolean;
  /** Ingresso ao qual o slot pertence. `null` = slot ainda sem ingresso resolvido. */
  ticketId: string | null;
}

/**
 * Normaliza para COMPARAÇÃO. CPF vira só dígitos ("123.456.789-00" ≡
 * "12345678900"); passaporte vira minúsculo, porque a caixa não distingue
 * documento. Espelha o `resolveDocument`/`cleanDocumentNumber` do backend — as
 * duas pontas precisam concordar sobre o que é "o mesmo documento".
 */
export function normalizeCheckoutDocument(
  value: string | undefined,
  isBrazilian: boolean,
): string {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return "";
  return isBrazilian ? trimmed.replace(/\D/g, "") : trimmed.toLowerCase();
}

export type DuplicateDocumentReason = "same-ticket" | "event-single-ticket";

/**
 * Por que o documento do slot `index` está duplicado no carrinho — ou `null`.
 *
 * `allowMultipleTicketsPerCpf` é a opção avançada do evento:
 *
 *  - LIGADA: nada é bloqueado. O organizador optou explicitamente por deixar o
 *    mesmo CPF levar vários ingressos, inclusive dois do MESMO tipo.
 *  - DESLIGADA (default): o documento é único no evento. Qualquer repetição no
 *    carrinho é erro, mesmo entre ingressos de tipos DIFERENTES — que era
 *    justamente o caso que passava antes desta regra existir.
 *
 * `same-ticket` é devolvido quando a colisão é com o mesmo ingresso, só para
 * preservar a mensagem mais específica que o checkout já mostrava.
 *
 * Slots de nacionalidade diferente nunca colidem: um CPF "12345678900" e um
 * passaporte "12345678900" são documentos distintos, e comparar os dois
 * inventaria uma duplicata que não existe.
 */
export function getDuplicateDocumentReason(
  slots: readonly CheckoutDocumentSlot[],
  index: number,
  allowMultipleTicketsPerCpf: boolean,
): DuplicateDocumentReason | null {
  if (allowMultipleTicketsPerCpf) return null;

  const current = slots.find((s) => s.index === index);
  if (!current) return null;

  const currentDoc = normalizeCheckoutDocument(current.doc, current.isBrazilian);
  if (!currentDoc) return null;

  let reason: DuplicateDocumentReason | null = null;
  for (const other of slots) {
    if (other.index === index) continue;
    if (other.isBrazilian !== current.isBrazilian) continue;
    if (normalizeCheckoutDocument(other.doc, other.isBrazilian) !== currentDoc) {
      continue;
    }
    // Mesmo ingresso ganha da colisão genérica: a mensagem é mais precisa e a
    // varredura continua, então a ordem dos slots não muda o resultado.
    if (
      current.ticketId !== null &&
      other.ticketId !== null &&
      other.ticketId === current.ticketId
    ) {
      return "same-ticket";
    }
    reason = "event-single-ticket";
  }
  return reason;
}

/** Mapeia o valor PT do select de gênero pro enum canônico do backend. */
function mapGender(value?: string): BackendParticipant["gender"] {
  if (!value) return undefined;
  const v = value.toLowerCase();
  if (v.startsWith("m")) return "MALE";
  if (v.startsWith("f")) return "FEMALE";
  if (v.includes("prefere") || v.includes("prefer")) return "PREFER_NOT_TO_SAY";
  return "OTHER";
}

export function mapParticipantForBackend(p: CheckoutParticipantInput): BackendParticipant {
  const isBr = isBrazilianCountry(p.nationality ?? null);
  /* Brasileiros: doc clean (só dígitos). Estrangeiros: doc cru — passaporte/RNE
   * pode ter letras essenciais; o backend normaliza via `documentType`. */
  const documentNumber = isBr
    ? (p.cpf || "").replace(/\D/g, "")
    : (p.cpf || "").trim();

  const mapped: BackendParticipant = {
    name: p.name ?? "",
    documentType: isBr ? "CPF" : "PASSPORT",
    documentNumber,
    email: p.email ?? "",
    birthDate: p.birthDate ?? "",
    phone: p.phone ? getPhoneDigitsForBackend(p.phone, p.nationality ?? null) : "",
    // Nacionalidade do participante — usada no snapshot/PDF/email do backend.
    country: p.nationality || undefined,
  };

  const gender = mapGender(p.gender);
  if (gender) mapped.gender = gender;
  if (p.emergencyContactName?.trim()) mapped.emergencyContactName = p.emergencyContactName.trim();
  if (p.emergencyPhone?.trim()) {
    mapped.emergencyPhone = getPhoneDigitsForBackend(p.emergencyPhone, p.nationality ?? null);
  }
  /* A flag acompanha o DADO, não o clique. Quando o evento exige o contato, a
   * pergunta "deseja adicionar?" some do checkout e `hasEmergencyContact` nunca
   * é marcada — sem isto o backend receberia nome e telefone preenchidos junto
   * de um `false`, e os relatórios diriam "sem contato de emergência". Dizer
   * "Não" limpa os dois campos, então preenchido ⇒ existe contato. */
  if (
    p.hasEmergencyContact ||
    mapped.emergencyContactName ||
    mapped.emergencyPhone
  ) {
    mapped.hasEmergencyContact = true;
  }
  if (p.questionAnswers && Object.keys(p.questionAnswers).length > 0) {
    mapped.questionAnswers = Object.entries(p.questionAnswers).map(([questionId, answer]) => ({
      questionId,
      answer: Array.isArray(answer) ? JSON.stringify(answer) : (answer as string | boolean | number),
    }));
  }
  return mapped;
}

/**
 * Monta o payload do PATCH a partir da lista de participantes, limitada à
 * quantidade de tickets reservados (`totalNeeded`). IMPORTANTE: enviar a lista
 * COMPLETA (do tamanho da reserva) — o backend usa o tamanho pra controlar a
 * reserva; uma lista parcial liberaria os tickets ainda não preenchidos.
 */
export function buildParticipantsPatchPayload(
  participants: CheckoutParticipantInput[],
  totalNeeded: number,
): { participants: BackendParticipant[] } {
  const active = participants.slice(0, Math.max(0, totalNeeded));
  return { participants: active.map(mapParticipantForBackend) };
}

export interface ProductPatchItem {
  productId: string;
  variationId?: string;
  quantity: number;
  participantEmail: string;
  /**
   * Índice do slot (participante↔ingresso). Desambigua o vínculo produto→inscrição
   * quando 2 participantes têm o MESMO e-mail (mesma pessoa em 2 ingressos) — o
   * e-mail sozinho colapsava os produtos numa só inscrição no finalize.
   */
  participantIndex: number;
}

/**
 * Builder ÚNICO do payload de `PATCH /orders/:id/products`. Agrega as variações
 * escolhidas por participante (`participants[].productVariations`). Compartilhado
 * entre o `handleNext` da página `/produtos` e o eager-patch do `SubscriptionStep`
 * pra não divergirem — o servidor recomputa o `pricing` (taxa/cupom sobre o
 * subtotal com produtos) a cada mudança.
 */
export function buildProductsPatchPayload(
  participants: Array<{ email?: string; productVariations?: Record<string, string | null> }>,
): { products: ProductPatchItem[] } {
  const products: ProductPatchItem[] = [];
  // O índice do forEach é o slot canônico (participante↔ingresso) — mesma ordem de
  // `reservedTickets`/`participants` no backend. Enviado como `participantIndex`.
  participants.forEach((p, participantIndex) => {
    if (!p.productVariations) return;
    Object.entries(p.productVariations).forEach(([productId, variationId]) => {
      if (!variationId) return;
      products.push({
        productId,
        variationId,
        quantity: 1,
        participantEmail: p.email ?? "",
        participantIndex,
      });
    });
  });
  return { products };
}
