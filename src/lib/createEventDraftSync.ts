import type { CreateEventFormData } from "@/contexts/CreateEventContext";
import { organizerService } from "@/services";
import { organizerNewEventClientPage } from "@/lib/organizerAudit";
import {
  clearRegulationPdfDraft,
  loadRegulationPdfDraft,
} from "@/lib/createEventWizardPersistence";
import {
  dataUrlToFile,
  getOrganizerAccessToken,
  getOrganizerApiUrl,
  uploadOrganizerImage,
} from "@/lib/uploadOrganizerImage";

async function uploadPdfFileToApi(file: File): Promise<string> {
  const apiUrl = getOrganizerApiUrl();
  const token = getOrganizerAccessToken();
  if (!token) {
    throw new Error("Sessão expirada. Faça login novamente.");
  }

  const formDataUpload = new FormData();
  formDataUpload.append("file", file);

  const response = await fetch(`${apiUrl}/api/v1/upload/pdf`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formDataUpload,
  });

  let result: Record<string, unknown> = {};
  try {
    const text = await response.text();
    result = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    result = {};
  }

  if (!response.ok) {
    throw new Error(
      (result.message as string) ||
      ((result.error as { message?: string })?.message as string) ||
      "Erro ao fazer upload do PDF",
    );
  }

  const fileUrl =
    (result.url as string) ||
    (result.fileUrl as string) ||
    ((result.data as Record<string, unknown>)?.url as string) ||
    ((result.data as Record<string, unknown>)?.fileUrl as string);

  if (!fileUrl) {
    throw new Error("Resposta do servidor inválida — URL do PDF não encontrada");
  }

  return fileUrl.startsWith("http")
    ? fileUrl
    : `${apiUrl}${fileUrl.startsWith("/") ? "" : "/"}${fileUrl}`;
}

/**
 * Corpo de criação/atualização alinhado à página de informações.
 * `regulationUrlForCreate` só URLs remotas já conhecidas (não data URL).
 */
export function buildCreateEventBodyFromForm(
  formData: CreateEventFormData,
  regulationUrlForCreate?: string | null,
): Record<string, unknown> {
  const rs = formData.registrationStartDate?.trim();
  const re = formData.registrationEndDate?.trim();
  const rst = (formData.registrationStartTime?.trim() || "00:00").slice(0, 5);
  const ret = (formData.registrationEndTime?.trim() || "00:00").slice(0, 5);

  const registrationStartDateTime = rs ? `${rs}T${rst}:00` : undefined;
  const registrationEndDateTime = re ? `${re}T${ret}:00` : undefined;

  const eventData: Record<string, unknown> = {
    name: formData.name.trim(),
    eventDate: formData.eventDate,
    country: "BR",
    location: (formData.street ?? "").trim(),
    city: (formData.city ?? "").trim(),
    state: (formData.state ?? "").trim(),
  };

  if ((formData.cep ?? "").trim()) {
    eventData.zipCode = formData.cep.trim();
  }
  if ((formData.neighborhood ?? "").trim()) {
    eventData.neighborhood = formData.neighborhood.trim();
  }
  if (formData.googleMapsLink) {
    eventData.googleMapsLink = formData.googleMapsLink;
  }
  if (registrationStartDateTime) {
    eventData.registrationStartDate = registrationStartDateTime;
  }
  if (registrationEndDateTime) {
    eventData.registrationEndDate = registrationEndDateTime;
  }
  const reg = regulationUrlForCreate?.trim();
  if (reg && !reg.startsWith("data:")) {
    eventData.regulationUrl = reg;
  }

  eventData.contactEmail = formData.contactEmail?.trim() || null;
  eventData.instagram = formData.instagram?.trim() || null;
  eventData.facebook = formData.facebook?.trim() || null;
  eventData.youtube = formData.youtube?.trim() || null;
  eventData.tiktok = formData.tiktok?.trim() || null;
  eventData.website = formData.website?.trim() || null;

  return eventData;
}

/**
 * Primeira persistência no servidor: cria o evento e envia regulamento (rascunho),
 * banner e card quando ainda estão como data URL no formulário.
 */
export async function ensureCreateEventSyncedFromDraft(options: {
  formData: CreateEventFormData;
  updateFormData: (patch: Partial<CreateEventFormData>) => void;
}): Promise<string> {
  const { formData, updateFormData } = options;
  const existingId = formData.createdEventId?.trim();
  if (existingId) {
    return existingId;
  }

  const pdfDraft = loadRegulationPdfDraft();
  const regRemote = formData.regulationUrl?.trim() || "";
  const regulationForCreate =
    !pdfDraft && regRemote && !regRemote.startsWith("data:")
      ? regRemote
      : undefined;

  const eventData = buildCreateEventBodyFromForm(
    formData,
    regulationForCreate,
  );

  const event = await organizerService.createEvent(
    eventData as unknown as Parameters<typeof organizerService.createEvent>[0],
  );
  const id = event.id;
  updateFormData({ createdEventId: id });

  let nextRegulation = formData.regulationUrl || "";
  if (pdfDraft?.dataUrl) {
    const file = dataUrlToFile(
      pdfDraft.dataUrl,
      pdfDraft.fileName || "regulamento.pdf",
    );
    const url = await uploadPdfFileToApi(file);
    nextRegulation = url;
    clearRegulationPdfDraft();
    await organizerService.updateEvent(
      id,
      { regulationUrl: url } as Parameters<
        typeof organizerService.updateEvent
      >[1],
      { clientPage: organizerNewEventClientPage("information") },
    );
    updateFormData({ regulationUrl: url });
  }

  let bannerUrl = (formData.bannerUrl || "").trim();
  if (bannerUrl.startsWith("data:")) {
    const file = dataUrlToFile(bannerUrl, "banner.jpg");
    bannerUrl = await uploadOrganizerImage(file);
    await organizerService.updateEvent(
      id,
      { bannerUrl },
      { clientPage: organizerNewEventClientPage("banner") },
    );
    updateFormData({ bannerUrl });
  }

  let cardImageUrl = (formData.cardImageUrl || "").trim();
  if (cardImageUrl.startsWith("data:")) {
    const file = dataUrlToFile(cardImageUrl, "card.jpg");
    cardImageUrl = await uploadOrganizerImage(file);
    await organizerService.updateEvent(
      id,
      { cardImageUrl },
      { clientPage: organizerNewEventClientPage("banner") },
    );
    updateFormData({ cardImageUrl: cardImageUrl });
  }

  return id;
}
