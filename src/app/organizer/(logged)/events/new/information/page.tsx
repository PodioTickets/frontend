"use client";

import { useEffect, useState } from "react";
import { useOrganizerNavigate } from "@/hooks/useOrganizerNavigate";
import { useAuth } from "@/hooks/useAuth";
import { organizerService } from "@/services";
import { useWizardAuth } from "@/hooks/useWizardAuth";
import { useCreateEvent } from "@/contexts/CreateEventContext";
import { Button } from "@/components/Button";
import { WizardStepLayout } from "@/components/Organizer/WizardStepLayout";
import { InformationForm } from "@/components/Organizer/InformationForm";
import toast from "react-hot-toast";
import { organizerNewEventClientPage } from "@/lib/organizerAudit";
import {
  clearRegulationPdfDraft,
  loadRegulationPdfDraft,
} from "@/lib/createEventWizardPersistence";
import { buildCreateEventBodyFromForm } from "@/lib/createEventDraftSync";
import { useOrganizerPermissions } from "@/contexts/OrganizerPermissionsContext";
import { useOrganizerAppSurface } from "@/contexts/OrganizerAppSurfaceContext";
import { organizerExternalHref } from "@/lib/organizerPathPresentation";
import { wouldRegistrationEndBeforeStart, REGISTRATION_END_BEFORE_START_TOAST, isRegistrationStartNotBeforeEvent, REGISTRATION_START_NOT_BEFORE_EVENT_TOAST } from "@/utils/registrationPeriod";

export default function InformacoesPage() {
  const orgNav = useOrganizerNavigate();
  const appSurface = useOrganizerAppSurface();
  const { isAuthenticated } = useAuth();
  const { formData, updateFormData, errors, setErrors } = useCreateEvent();
  const { hasPermission, loading: permissionsLoading } = useOrganizerPermissions();
  const { authChecked } = useWizardAuth();
  const [loading, setLoading] = useState(false);
  const [hasLocalRegulationDraft, setHasLocalRegulationDraft] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setHasLocalRegulationDraft(!!loadRegulationPdfDraft());
  }, [formData.regulationUrl, formData.createdEventId]);

  useEffect(() => {
    if (authChecked && !isAuthenticated) {
      orgNav.push("/organizer/login");
    }
  }, [authChecked, isAuthenticated, orgNav]);

  if (!authChecked || permissionsLoading) return null;

  if (!hasPermission("create_event")) {
    orgNav.replace("/organizer/events");
    return null;
  }

  const cepDigits = (formData.cep ?? "").replace(/\D/g, "");
  const canSave =
    !!formData.name?.trim() &&
    !!formData.eventDate &&
    !!formData.registrationStartDate?.trim() &&
    !!formData.registrationEndDate?.trim() &&
    cepDigits.length === 8 &&
    !!formData.street?.trim() &&
    !!formData.city?.trim() &&
    !!formData.state?.trim() &&
    !!formData.googleMapsLink?.trim() &&
    !!formData.contactEmail?.trim();

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = "Nome do evento é obrigatório";
    if (!formData.eventDate) newErrors.eventDate = "Data do evento é obrigatória";
    if (!formData.registrationStartDate?.trim()) {
      newErrors.registrationStartDate = "Data de início das inscrições é obrigatória";
    } else if (isRegistrationStartNotBeforeEvent(formData.registrationStartDate, formData.registrationStartTime, formData.eventDate)) {
      // Início das inscrições deve ser ANTES da data do evento.
      newErrors.registrationStartDate = REGISTRATION_START_NOT_BEFORE_EVENT_TOAST;
    }
    if (!formData.registrationEndDate?.trim()) newErrors.registrationEndDate = "Data de encerramento das inscrições é obrigatória";
    if (wouldRegistrationEndBeforeStart(formData)) newErrors.registrationPeriod = REGISTRATION_END_BEFORE_START_TOAST;
    const cepDigitsValidation = (formData.cep ?? "").replace(/\D/g, "");
    if (!cepDigitsValidation) {
      newErrors.cep = "CEP é obrigatório";
    } else if (cepDigitsValidation.length !== 8) {
      newErrors.cep = "CEP inválido";
    } else {
      if (!formData.street?.trim()) newErrors.street = "Rua é obrigatória";
      if (!formData.city?.trim()) newErrors.city = "Cidade é obrigatória";
      if (!formData.state?.trim()) newErrors.state = "Estado é obrigatório";
      if (!formData.googleMapsLink?.trim()) newErrors.googleMapsLink = "URL do Google Maps é obrigatória";
    }
    if (!formData.contactEmail?.trim()) {
      newErrors.contactEmail = "Email de atendimento é obrigatório";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contactEmail.trim())) {
      newErrors.contactEmail = "Email inválido";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (_e: React.FormEvent, resolvedPdfUrl: string | null) => {
    if (!validateForm()) {
      toast.error("Por favor, corrija os erros no formulário");
      return;
    }
    setLoading(true);
    try {
      const regForBody = resolvedPdfUrl?.trim() && !resolvedPdfUrl.startsWith("data:") ? resolvedPdfUrl.trim() : null;
      const eventBody = buildCreateEventBodyFromForm(formData, regForBody);

      if (formData.createdEventId) {
        await organizerService.updateEvent(
          formData.createdEventId,
          eventBody as never,
          { clientPage: organizerNewEventClientPage("information") },
        );
        if (resolvedPdfUrl) updateFormData({ regulationUrl: resolvedPdfUrl });
        toast.success("Informações salvas com sucesso!");
        orgNav.push("/organizer/events/new/banner");
        return;
      }

      const createdEvent = await organizerService.createEvent(eventBody as never);
      const newEventId = createdEvent.id;
      updateFormData({ createdEventId: newEventId });
      if (resolvedPdfUrl) {
        updateFormData({ regulationUrl: resolvedPdfUrl });
        await organizerService.updateEvent(newEventId, { regulationUrl: resolvedPdfUrl } as never, { clientPage: organizerNewEventClientPage("information") });
      }
      clearRegulationPdfDraft();
      toast.success("Rascunho salvo!");
      orgNav.push("/organizer/events/new/banner");
    } catch (error: any) {
      let errorMessage = "Erro ao salvar evento";
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.errors?.length) {
        errorMessage = error.response.data.errors.map((e: any) => e.message || e).join(", ");
      } else if (error.message) {
        errorMessage = error.message;
      }
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const eventsListHref = organizerExternalHref("/organizer/events", appSurface);

  return (
    <WizardStepLayout
      title="Criar evento"
      backHref={eventsListHref}
      stickyMobileHeader
      description="Comece pelo básico. Defina nome, data, local e as imagens principais. Você poderá ajustar os detalhes depois."
      className="bg-gray-2 flex-1 pb-28 md:pb-44 px-4 md:px-[124px] mt-0 pt-0 md:mt-10 min-w-0"
      maxWidth="max-w-[1060px]"
      actions={
        <>
          <Button
            form="create-event-information-form"
            type="submit"
            disabled={loading}
            className="hidden h-[52px] px-11 text-xl font-bold font-manrope md:block"
          >
            {loading ? "Salvando..." : "Próxima etapa"}
          </Button>
          <Button
            form="create-event-information-form"
            type="submit"
            disabled={loading}
            className="h-12 w-full text-base font-bold font-manrope md:hidden"
          >
            {loading ? "Salvando..." : "Próxima etapa"}
          </Button>
        </>
      }
    >
      <p className="md:hidden text-sm text-gray-11 font-family-dm-sans leading-[1.4]">
        Comece pelo básico. Defina nome, data, local e as imagens principais. Você poderá ajustar os detalhes depois.
      </p>

      <InformationForm
        formId="create-event-information-form"
        values={formData}
        onChange={updateFormData}
        errors={errors}
        onErrorsChange={setErrors}
        onSubmit={handleSubmit}
        loading={loading}
        hasLocalRegulationDraft={hasLocalRegulationDraft}
        onClearLocalRegulationDraft={() => {
          clearRegulationPdfDraft();
          setHasLocalRegulationDraft(false);
        }}
      />
    </WizardStepLayout>
  );
}
