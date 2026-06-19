"use client";

import { useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { useOrganizerNavigate } from "@/hooks/useOrganizerNavigate";
import { organizerService } from "@/services";
import { useWizardAuth } from "@/hooks/useWizardAuth";
import { useEditEvent } from "@/contexts/EditEventContext";
import { useUnsavedLeaveGuard } from "@/hooks/useUnsavedLeaveGuard";
import { Button } from "@/components/Button";
import { UnsavedChangesModal } from "@/components/UnsavedChangesModal";
import { WizardStepLayout } from "@/components/Organizer/WizardStepLayout";
import { InformationForm } from "@/components/Organizer/InformationForm";
import { buildCreateEventBodyFromForm } from "@/lib/createEventDraftSync";
import { organizerEventEditClientPage } from "@/lib/organizerAudit";
import {
  validateEventInformation,
  isEventInformationValid,
  eventInformationHasChanges,
} from "@/lib/eventEditValidation";
import toast from "react-hot-toast";

export default function EditInformationPage() {
  const params = useParams();
  const eventId = params.id as string;
  const orgNav = useOrganizerNavigate();
  const { authChecked } = useWizardAuth();
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
    const newErrors = validateEventInformation(formData);
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
      // Atualiza formData (regulationUrl) e re-fixa o baseline do dirty check
      // num único ato — botão volta a ficar desabilitado até o usuário editar.
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

  const handleBack = () => {
    orgNav.push(`/organizer/events/${eventId}/edit`);
  };

  const isFormValid = isEventInformationValid(formData);
  const hasChanges = eventInformationHasChanges(formData, initialFormData, hasPendingPdf);
  const canSave = isFormValid && hasChanges;

  /* Descarta as edições locais re-aplicando o baseline (`initialFormData`) sobre
   * o `formData`. Necessário porque o `EditEventProvider` vive no LAYOUT (acima
   * dos steps): sem o reset, uma alteração não salva aqui vazaria pros demais
   * passos do editor ao navegar. Também limpa os erros de validação pendentes. */
  const discardLocalChanges = useCallback(() => {
    updateFormData(initialFormData);
    setErrors({});
  }, [initialFormData, updateFormData, setErrors]);

  /* Guarda de saída: histórico/popstate + beforeunload + interceptação de
   * cliques em links (ex.: o stepper de etapas no layout) enquanto houver
   * alterações não salvas. `navigateTarget` é o destino padrão do "voltar"
   * (sair do editor) — cliques em outras etapas guardam o próprio alvo. */
  const {
    leavePromptOpen,
    confirmLeaveWithoutSaving,
    dismissLeavePrompt,
  } = useUnsavedLeaveGuard(hasChanges, {
    navigateTarget: `/organizer/events`,
    onDiscard: discardLocalChanges,
  });

  return (
    <>
    <WizardStepLayout
      title="Informações"
      description="Edite as informações principais do evento."
      className="bg-gray-2 flex-1 pb-28 md:pb-44 -mx-4 md:px-[124px] pt-0 mt-0 min-w-0"
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
