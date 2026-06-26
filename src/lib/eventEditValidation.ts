import type { EditEventFormData } from "@/contexts/EditEventContext";
import {
  isRegistrationStartNotBeforeEvent,
  wouldRegistrationEndBeforeStart,
  REGISTRATION_END_BEFORE_START_TOAST,
  REGISTRATION_START_NOT_BEFORE_EVENT_TOAST,
} from "@/utils/registrationPeriod";

/**
 * Lógica de validação/dirty-check da etapa "Informações" do editor de evento.
 * Compartilhada entre `admin/events/[id]/edit` e `organizer/events/[id]/edit`
 * (corpos 98% idênticos). Funções PURAS — não tocam estado nem `setErrors`; a
 * página decide o que fazer com o resultado.
 */

/** Campos da etapa de informações usados no dirty check (`hasChanges`). */
export const INFORMATION_FIELDS = [
  "name", "eventDate",
  "registrationStartDate", "registrationStartTime",
  "registrationEndDate", "registrationEndTime",
  "cep", "street", "neighborhood", "city", "state", "googleMapsLink",
  "contactEmail", "instagram", "facebook", "youtube", "tiktok", "website",
  "regulationUrl",
] as const satisfies readonly (keyof EditEventFormData)[];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CEP_DIGITS = 8;

/** Só os dígitos do CEP (remove máscara). */
function cepDigitsOf(formData: Pick<EditEventFormData, "cep">): string {
  return (formData.cep ?? "").replace(/\D/g, "");
}

/**
 * Valida os campos obrigatórios da etapa de informações e retorna o mapa de
 * erros (vazio = válido). Não muta nada. Endereço (rua/cidade/estado/maps) só é
 * exigido quando o CEP é válido — espelha a UI condicional.
 */
export function validateEventInformation(
  formData: EditEventFormData,
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!formData.name.trim()) errors.name = "Nome do evento é obrigatório";
  if (!formData.eventDate) errors.eventDate = "Data do evento é obrigatória";
  if (!formData.registrationStartDate?.trim()) {
    errors.registrationStartDate = "Data de início das inscrições é obrigatória";
  } else if (isRegistrationStartNotBeforeEvent(formData.registrationStartDate, formData.registrationStartTime, formData.eventDate)) {
    // Início das inscrições deve ser ANTES da data do evento.
    errors.registrationStartDate = REGISTRATION_START_NOT_BEFORE_EVENT_TOAST;
  }
  if (!formData.registrationEndDate?.trim()) errors.registrationEndDate = "Data de encerramento das inscrições é obrigatória";
  if (wouldRegistrationEndBeforeStart(formData)) errors.registrationPeriod = REGISTRATION_END_BEFORE_START_TOAST;

  const cepDigits = cepDigitsOf(formData);
  if (!cepDigits) {
    errors.cep = "CEP é obrigatório";
  } else if (cepDigits.length !== CEP_DIGITS) {
    errors.cep = "CEP inválido";
  } else {
    if (!formData.street?.trim()) errors.street = "Rua é obrigatória";
    if (!formData.city?.trim()) errors.city = "Cidade é obrigatória";
    if (!formData.state?.trim()) errors.state = "Estado é obrigatório";
    if (!formData.googleMapsLink?.trim()) errors.googleMapsLink = "URL do Google Maps é obrigatória";
  }

  if (!formData.contactEmail?.trim()) {
    errors.contactEmail = "Email de atendimento é obrigatório";
  } else if (!EMAIL_RE.test(formData.contactEmail.trim())) {
    errors.contactEmail = "Email inválido";
  }

  return errors;
}

/**
 * Versão "leve" para habilitar o botão Salvar (não popula mensagens). Mantém o
 * mesmo conjunto de campos obrigatórios da `validateEventInformation`.
 */
export function isEventInformationValid(formData: EditEventFormData): boolean {
  return (
    !!formData.name?.trim() &&
    !!formData.eventDate &&
    !!formData.registrationStartDate?.trim() &&
    !!formData.registrationEndDate?.trim() &&
    cepDigitsOf(formData).length === CEP_DIGITS &&
    !!formData.street?.trim() &&
    !!formData.city?.trim() &&
    !!formData.state?.trim() &&
    !!formData.contactEmail?.trim()
  );
}

/**
 * `true` se o formulário diverge do baseline (`initialFormData`) em algum campo
 * de informações, ou se há um PDF de regulamento pendente de upload.
 */
export function eventInformationHasChanges(
  formData: EditEventFormData,
  initialFormData: EditEventFormData,
  hasPendingPdf: boolean,
): boolean {
  if (hasPendingPdf) return true;
  return INFORMATION_FIELDS.some(
    (k) => (formData[k] ?? "") !== (initialFormData[k] ?? ""),
  );
}
