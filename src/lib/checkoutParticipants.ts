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
  if (p.hasEmergencyContact) mapped.hasEmergencyContact = true;
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
