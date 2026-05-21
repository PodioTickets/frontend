"use client";

import { useState, useEffect } from "react";
import { useOrganizerNavigate } from "@/hooks/useOrganizerNavigate";
import { organizerService } from "@/services";
import { useWizardAuth } from "@/hooks/useWizardAuth";
import { useCreateEvent } from "@/contexts/CreateEventContext";
import { ensureCreateEventSyncedFromDraft } from "@/lib/createEventDraftSync";
import { Button } from "@/components/Button";
import { usePublishEventModal } from "@/stores/modalStore";
import { WizardStepLayout } from "@/components/Organizer/WizardStepLayout";
import { FinancialSection } from "@/components/Organizer/FinancialSection";
import toast from "react-hot-toast";
import { cn } from "@/utils/cn";

export default function FinancialPage() {
  const orgNav = useOrganizerNavigate();
  const { authChecked } = useWizardAuth();
  const { formData, updateFormData } = useCreateEvent();
  const { openPublishEventModal } = usePublishEventModal();
  const [organizerPercent, setOrganizerPercent] = useState(() => formData.organizerFeePercent ?? 0);
  const [maxInstallments, setMaxInstallments] = useState<1 | 2 | 3>(() => formData.maxInstallments ?? 1);

  useEffect(() => {
    updateFormData({ organizerFeePercent: organizerPercent });
  }, [organizerPercent]);

  useEffect(() => {
    updateFormData({ maxInstallments });
  }, [maxInstallments]);

  const handleBack = () => {
    orgNav.push("/organizer/events/new/questionnaire");
  };

  const saveFinancialSettings = async (eventId: string) => {
    try {
      const participantFeePercent = parseFloat((6 - organizerPercent).toFixed(2));
      await organizerService.saveFinancialSettings(eventId, organizerPercent, participantFeePercent, maxInstallments);
    } catch {
      // endpoint pode ainda não existir no servidor — não bloqueia o fluxo
    }
  };

  const handleSaveDraft = async () => {
    const eventId = await ensureCreateEventSyncedFromDraft({ formData, updateFormData });
    await saveFinancialSettings(eventId);
    toast.success("Evento salvo como rascunho com sucesso!");
  };

  const handlePublish = async () => {
    if (!formData.createdEventId) {
      toast.error("Evento não encontrado");
      return;
    }
    await saveFinancialSettings(formData.createdEventId);
    openPublishEventModal({ eventId: formData.createdEventId });
  };

  return (
    <WizardStepLayout
      title="Pagamento"
      onBack={handleBack}
      className="flex-1 bg-gray-2 px-5 pt-[52px] pb-[176px] max-md:pb-40"
      maxWidth="max-w-7xl"
      gutter="5"
      description="Configure a divisão da taxa da plataforma e as formas de pagamento aceitas. Estes dados ficam travados após a publicação."
      showDescriptionOnMobile
      isLoading={!authChecked}
      actions={
        <>
          <Button
            type="button"
            onClick={() => void handleSaveDraft()}
            variant="default"
            className={cn(
              "h-[52px] px-11 font-manrope text-lg font-bold text-gray-12 bg-yellow-3 border border-yellow-6 hover:bg-yellow-4 hover:border-yellow-6 active:bg-yellow-5 active:border-yellow-6",
              "max-md:h-12 max-md:w-full max-md:px-4",
            )}
          >
            Salvar rascunho
          </Button>
          <Button
            type="button"
            onClick={() => void handlePublish()}
            variant="default"
            className={cn(
              "h-[52px] px-11 font-manrope text-lg font-bold text-gray-12",
              "max-md:h-12 max-md:w-full max-md:px-4",
            )}
          >
            Publicar evento
          </Button>
        </>
      }
    >
      <FinancialSection
        organizerPercent={organizerPercent}
        maxInstallments={maxInstallments}
        onOrganizerPercentChange={setOrganizerPercent}
        onMaxInstallmentsChange={setMaxInstallments}
      />
    </WizardStepLayout>
  );
}
