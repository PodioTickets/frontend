"use client";

import { useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { organizerService } from "@/services";
import { useWizardAuth } from "@/hooks/useWizardAuth";
import { useEditEvent } from "@/contexts/EditEventContext";
import { useUnsavedLeaveGuard } from "@/hooks/useUnsavedLeaveGuard";
import { Button } from "@/components/Button";
import { UnsavedChangesModal } from "@/components/UnsavedChangesModal";
import { WizardStepLayout } from "@/components/Organizer/WizardStepLayout";
import { InformationForm } from "@/components/Organizer/InformationForm";
import { buildCreateEventBodyFromForm } from "@/lib/createEventDraftSync";
import { eventInformationHasChanges } from "@/lib/eventEditValidation";
import { organizerEventEditClientPage } from "@/lib/organizerAudit";
import { wouldRegistrationEndBeforeStart, REGISTRATION_END_BEFORE_START_TOAST, isRegistrationStartNotBeforeEvent, REGISTRATION_START_NOT_BEFORE_EVENT_TOAST } from "@/utils/registrationPeriod";
import toast from "react-hot-toast";

export default function ReviewInformationPage() {
  const params = useParams();
  const eventId = params.id as string;
  const { authChecked } = useWizardAuth();
  // Baseline do dirty-check vem do CONTEXTO (reidrata junto com o evento). Antes
  // esta página capturava o baseline num useRef local na 1ª render — quando o
  // `formData` ainda estava vazio/stale → `hasChanges=true` fantasma (modal de
  // "alterações não salvas" ao só ENTRAR na tela, sem editar nada).
  const {
    formData,
    initialFormData,
    updateFormData,
    commitInitialFormData,
    errors,
    setErrors,
    loading: eventLoading,
  } = useEditEvent();
  const [saving, setSaving] = useState(false);
  const [hasPendingPdf, setHasPendingPdf] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = "Nome do evento é obrigatório";
    if (!formData.eventDate) newErrors.eventDate = "Data do evento é obrigatória";
    if (!formData.registrationStartDate?.trim()) {
      newErrors.registrationStartDate = "Data de início das inscrições é obrigatória";
    } else if (isRegistrationStartNotBeforeEvent(formData.registrationStartDate, formData.registrationStartTime, formData.eventDate)) {
      newErrors.registrationStartDate = REGISTRATION_START_NOT_BEFORE_EVENT_TOAST;
    }
    if (!formData.registrationEndDate?.trim()) newErrors.registrationEndDate = "Data de encerramento das inscrições é obrigatória";
    if (wouldRegistrationEndBeforeStart(formData)) newErrors.registrationPeriod = REGISTRATION_END_BEFORE_START_TOAST;
    const cepDigits = (formData.cep ?? "").replace(/\D/g, "");
    if (!cepDigits) {
      newErrors.cep = "CEP é obrigatório";
    } else if (cepDigits.length !== 8) {
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
    setSaving(true);
    try {
      const regForBody = resolvedPdfUrl?.trim() && !resolvedPdfUrl.startsWith("data:") ? resolvedPdfUrl.trim() : null;
      const eventBody = buildCreateEventBodyFromForm(formData as any, regForBody);
      await organizerService.updateEvent(
        eventId,
        eventBody as never,
        { clientPage: organizerEventEditClientPage(eventId, "general") },
      );
      if (resolvedPdfUrl) updateFormData({ regulationUrl: resolvedPdfUrl });
      // Re-fixa o baseline no contexto (zera o dirty após salvar).
      commitInitialFormData(resolvedPdfUrl ? { regulationUrl: resolvedPdfUrl } : undefined);
      toast.success("Informações salvas com sucesso!");
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
      setSaving(false);
    }
  };

  const cepDigits = (formData.cep ?? "").replace(/\D/g, "");
  const isFormValid =
    !!formData.name?.trim() &&
    !!formData.eventDate &&
    !!formData.registrationStartDate?.trim() &&
    !!formData.registrationEndDate?.trim() &&
    cepDigits.length === 8 &&
    !!formData.street?.trim() &&
    !!formData.city?.trim() &&
    !!formData.state?.trim() &&
    !!formData.contactEmail?.trim();

  const hasChanges = eventInformationHasChanges(formData, initialFormData, hasPendingPdf);

  const canSave = isFormValid && hasChanges;

  /* Descarta as edições locais re-aplicando o baseline (`initialFormData` do
   * contexto, compartilhado entre os steps via layout) + limpa erros. Sem o
   * reset, a edição não salva vazaria para os demais passos. */
  const discardLocalChanges = useCallback(() => {
    updateFormData(initialFormData);
    setErrors({});
  }, [initialFormData, updateFormData, setErrors]);

  /* Guarda de saída: histórico/popstate + beforeunload + interceptação de
   * cliques em links (stepper) enquanto houver alterações não salvas.
   * `handleBack` (no botão voltar) e `navigateTarget` levam à auditoria. */
  const {
    leavePromptOpen,
    handleBack,
    confirmLeaveWithoutSaving,
    dismissLeavePrompt,
  } = useUnsavedLeaveGuard(hasChanges, {
    navigateTarget: `/admin/auditoria-evento`,
    onDiscard: discardLocalChanges,
  });

  return (
    <>
    <WizardStepLayout
      title="Informações"
      onBack={handleBack}
      description="Edite as informações principais do evento."
      className="bg-gray-2 flex-1 pb-28 md:pb-44 px-4 md:px-[124px] mt-0 md:mt-10 min-w-0"
      maxWidth="max-w-[1060px]"
      isLoading={!authChecked || eventLoading}
      actions={
        <>
          <Button
            form="edit-event-information-form"
            type="submit"
            disabled={saving || !canSave}
            className="hidden h-[52px] px-11 text-xl font-bold font-manrope md:block disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Salvando..." : "Salvar alterações"}
          </Button>
          <Button
            form="edit-event-information-form"
            type="submit"
            disabled={saving || !canSave}
            className="h-12 w-full text-base font-bold font-manrope md:hidden disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Salvando..." : "Salvar alterações"}
          </Button>
        </>
      }
    >
      <InformationForm
        formId="edit-event-information-form"
        values={formData}
        onChange={updateFormData}
        errors={errors}
        onErrorsChange={setErrors}
        onSubmit={handleSubmit}
        loading={saving}
        onHasPendingPdfChange={setHasPendingPdf}
      />
    </WizardStepLayout>

    <UnsavedChangesModal
      open={leavePromptOpen}
      onClose={dismissLeavePrompt}
      title="Alterações não salvas"
      description="Você fez alterações nas informações do evento. Se sair agora, elas serão perdidas."
      onLeaveWithoutSaving={confirmLeaveWithoutSaving}
    />
    </>
  );
}
