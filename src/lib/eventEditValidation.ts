import type { EditEventFormData } from "@/contexts/EditEventContext";
import { hasValidCoordinates } from "@/utils/googleMapsGeo";
import {
  isEventDateBeforeRegistrationEnd,
  isRegistrationStartNotBeforeEvent,
  wouldRegistrationEndBeforeStart,
  EVENT_DATE_NOT_BEFORE_REGISTRATION_END_TOAST,
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
  "maxParticipants",
  "cep", "street", "neighborhood", "city", "state", "googleMapsLink",
  "latitude", "longitude", "locationName",
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
  // Vagas do evento: obrigatório e ≥ 1.
  if (!formData.maxParticipants?.toString().trim()) {
    errors.maxParticipants = "Vagas do evento é obrigatório";
  } else if (Number(formData.maxParticipants) < 1) {
    errors.maxParticipants = "As vagas do evento devem ser ao menos 1.";
  }
  // Um erro por vez: só sinaliza "encerramento antes do início" quando o próprio
  // início NÃO está em erro — senão as duas mensagens (input do início + período)
  // apareceriam juntas para o mesmo início tardio (redundante).
  if (!errors.registrationStartDate && wouldRegistrationEndBeforeStart(formData)) {
    errors.registrationPeriod = REGISTRATION_END_BEFORE_START_TOAST;
  }
  // Data do evento não pode ser anterior ao encerramento das inscrições.
  if (isEventDateBeforeRegistrationEnd(formData.eventDate, formData.registrationEndDate)) {
    errors.eventDate = EVENT_DATE_NOT_BEFORE_REGISTRATION_END_TOAST;
  }

  const cepDigits = cepDigitsOf(formData);
  if (!cepDigits) {
    errors.cep = "CEP é obrigatório";
  } else if (cepDigits.length !== CEP_DIGITS) {
    errors.cep = "CEP inválido";
  } else {
    if (!formData.street?.trim()) errors.street = "Rua é obrigatória";
    if (!formData.city?.trim()) errors.city = "Cidade é obrigatória";
    if (!formData.state?.trim()) errors.state = "Estado é obrigatório";
    // Local no mapa: exige a seleção (coordenadas válidas). Eventos LEGADOS que
    // só têm o `googleMapsLink` antigo (sem lat/lng ainda persistidos) continuam
    // válidos — não forçamos re-seleção ao editar. Erro renderizado sob o botão.
    const hasCoords = hasValidCoordinates(formData.latitude, formData.longitude);
    const hasLegacyLink = !!formData.googleMapsLink?.trim();
    if (!hasCoords && !hasLegacyLink) {
      errors.mapLocation = "Selecione o local do evento no mapa";
    }
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
    !!formData.maxParticipants?.toString().trim() &&
    Number(formData.maxParticipants) >= 1 &&
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

/**
 * Tradução do nome do campo do BACKEND (DTO de `PATCH /events/:id`) para a CHAVE
 * de erro do formulário (que o `InformationForm` renderiza inline). A maioria
 * casa 1:1; as exceções são o endereço, que o form chama de outro jeito:
 *   - backend `zipCode`  → input `cep`
 *   - backend `location` → input `street`
 * Campos sem slot inline (neighborhood, redes sociais, description, slug…) ficam
 * de fora de propósito → caem no toast geral.
 */
const BACKEND_FIELD_TO_FORM_ERROR_KEY: Record<string, string> = {
  name: "name",
  eventDate: "eventDate",
  registrationStartDate: "registrationStartDate",
  registrationEndDate: "registrationEndDate",
  maxParticipants: "maxParticipants",
  zipCode: "cep",
  location: "street",
  city: "city",
  state: "state",
  // Local no mapa: qualquer erro de local vindo do backend (link/coordenadas)
  // é destacado no mesmo slot inline do botão de mapa.
  googleMapsLink: "mapLocation",
  latitude: "mapLocation",
  longitude: "mapLocation",
  locationName: "mapLocation",
  contactEmail: "contactEmail",
};

/** Mensagem PT-BR exibida no input para cada erro de validação vindo do backend. */
const FORM_FIELD_ERROR_MESSAGE: Record<string, string> = {
  name: "Nome do evento inválido.",
  eventDate: "Data do evento inválida.",
  registrationStartDate: "Data de início das inscrições inválida.",
  registrationEndDate: "Data de encerramento das inscrições inválida.",
  maxParticipants: "Vagas do evento inválidas.",
  cep: "CEP inválido.",
  street: "Endereço inválido.",
  city: "Cidade inválida.",
  state: "Estado inválido.",
  mapLocation: "Selecione um local válido no mapa.",
  contactEmail: "E-mail de atendimento inválido.",
};

export interface MappedBackendErrors {
  /** Erros por CHAVE de campo do formulário (para `setErrors`). */
  fieldErrors: Record<string, string>;
  /** Mensagem para toast quando o erro não pertence a um campo do form. */
  generalMessage?: string;
}

/**
 * Converte a resposta de erro do `updateEvent` (backend) em erros de campo +
 * mensagem geral, garantindo COBERTURA de todos os casos conhecidos:
 *  - 400 "Validation failed" → mapeia `details[].property` (ou o prefixo das
 *    strings em `errors[]`) para os inputs; o que não tem slot vira toast.
 *  - 409 DUPLICATE_VALUE (slug, derivado do nome) → erro no campo `name`.
 *  - 403/404/permissão/kit/"No fields to update" → mensagem geral (toast).
 */
export function mapEventBackendErrors(error: unknown): MappedBackendErrors {
  const e = error as {
    response?: { status?: number; data?: Record<string, unknown> };
    message?: string;
  };
  const data = e?.response?.data ?? {};
  const fieldErrors: Record<string, string> = {};
  let hadUnmappableField = false;

  const addByBackendField = (backendField: string): void => {
    const key = BACKEND_FIELD_TO_FORM_ERROR_KEY[backendField];
    if (!key) {
      hadUnmappableField = true;
      return;
    }
    if (!fieldErrors[key]) {
      fieldErrors[key] = FORM_FIELD_ERROR_MESSAGE[key] ?? "Campo inválido.";
    }
  };

  // 1) Erros de validação por campo (preferimos `details[].property`).
  const details = (data as { details?: unknown }).details;
  const errorsArr = (data as { errors?: unknown }).errors;
  if (Array.isArray(details)) {
    for (const d of details) {
      const prop = (d as { property?: unknown })?.property;
      if (typeof prop === "string" && prop) addByBackendField(prop);
    }
  } else if (Array.isArray(errorsArr)) {
    // Fallback: "campo mensagem..." → o 1º token é o nome do campo.
    for (const msg of errorsArr) {
      if (typeof msg === "string" && msg.trim()) addByBackendField(msg.trim().split(/\s+/)[0]);
    }
  }

  // 1b) Erro de negócio com CAMPO explícito (`{ code, field, message }`) — ex.:
  //     vagas do evento abaixo dos inscritos atuais. Preserva a MENSAGEM do servidor
  //     (informativa, com os números) no input certo, em vez do texto genérico.
  const bizField = (data as { field?: unknown }).field;
  const bizMsg = (data as { message?: unknown }).message;
  if (typeof bizField === 'string' && bizField && typeof bizMsg === 'string' && bizMsg) {
    const key = BACKEND_FIELD_TO_FORM_ERROR_KEY[bizField];
    if (key && !fieldErrors[key]) fieldErrors[key] = bizMsg;
  }

  // 2) Slug duplicado: o slug é gerado a partir do nome → destaca o campo `name`.
  const code = (data as { code?: unknown }).code;
  const rawMsg = typeof (data as { message?: unknown }).message === "string"
    ? ((data as { message: string }).message)
    : "";
  if (code === "DUPLICATE_VALUE" || /slug/i.test(rawMsg)) {
    fieldErrors.name = "Já existe um evento com esse nome. Escolha outro.";
  }

  // 3) Mensagem geral: usada quando não há campo a destacar, ou para reforçar
  //    quando houve erro sem slot inline.
  let generalMessage: string | undefined;
  if (Object.keys(fieldErrors).length === 0) {
    generalMessage =
      (Array.isArray(errorsArr) && typeof errorsArr[0] === "string" ? errorsArr[0] : "") ||
      rawMsg ||
      e?.message ||
      "Não foi possível salvar o evento. Tente novamente.";
  } else if (hadUnmappableField) {
    generalMessage = "Corrija os campos destacados. Alguns campos extras também precisam de atenção.";
  }

  return { fieldErrors, generalMessage };
}
