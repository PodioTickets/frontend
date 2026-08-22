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
import {
  ACCEPTED_PAYMENT_METHODS,
  type AcceptedPaymentMethod,
} from "@/interfaces/event";

export default function FinancialPage() {
  const orgNav = useOrganizerNavigate();
  const { authChecked } = useWizardAuth();
  const { formData, updateFormData } = useCreateEvent();
  const { openPublishEventModal } = usePublishEventModal();
  const [organizerPercent, setOrganizerPercent] = useState(() => formData.organizerFeePercent ?? 0);
  const [maxInstallments, setMaxInstallments] = useState<1 | 2 | 3>(() => formData.maxInstallments ?? 1);
  const [acceptedPaymentMethods, setAcceptedPaymentMethods] = useState<AcceptedPaymentMethod[]>(
    // Rascunhos antigos (sem o campo) caem no default = todas as formas
    () => (formData.acceptedPaymentMethods?.length ? formData.acceptedPaymentMethods : [...ACCEPTED_PAYMENT_METHODS]),
  );
  // Taxa TOTAL do evento (organizador + comprador). Fixa em 6% quando a org não tem
  // taxa personalizada; editável até o teto da org (`maxTotalFeePercent`) quando tem.
  const [totalFee, setTotalFee] = useState<number>(() => formData.totalFeePercent ?? 6);
  const [customFeeEnabled, setCustomFeeEnabled] = useState(false);
  const [maxTotalFee, setMaxTotalFee] = useState(6);

  // Busca a config de taxa da ORGANIZAÇÃO: quando personalizada (admin ligou no drawer),
  // o organizador pode definir a taxa total do evento até o teto; senão, 6% fixo. O
  // enforcement de fato é no backend (saveFinancialSettings) — isto é só UX.
  useEffect(() => {
    if (!authChecked) return;
    let cancelled = false;
    (async () => {
      try {
        const { organization } = await organizerService.getOrganization();
        if (cancelled) return;
        const enabled = organization.customFeeEnabled === true;
        const ceiling =
          typeof organization.maxTotalFeePercent === "number" ? organization.maxTotalFeePercent : 6;
        setCustomFeeEnabled(enabled);
        setMaxTotalFee(enabled ? ceiling : 6);
        // Sem taxa personalizada → total fixo em 6%. Com taxa personalizada e sem valor
        // salvo no rascunho → default = teto do admin ("a taxa que o admin colocou").
        setTotalFee(enabled ? formData.totalFeePercent ?? ceiling : 6);
      } catch {
        // Sem org acessível → mantém o comportamento fixo de 6%.
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authChecked]);

  useEffect(() => {
    updateFormData({ organizerFeePercent: organizerPercent });
  }, [organizerPercent]);

  useEffect(() => {
    updateFormData({ totalFeePercent: totalFee });
  }, [totalFee]);

  useEffect(() => {
    updateFormData({ maxInstallments });
  }, [maxInstallments]);

  useEffect(() => {
    updateFormData({ acceptedPaymentMethods });
  }, [acceptedPaymentMethods]);

  const handleBack = () => {
    orgNav.push("/organizer/events/new/questionnaire");
  };

  const saveFinancialSettings = async (eventId: string) => {
    try {
      // Participante paga o restante da taxa TOTAL (total − o que o organizador absorve).
      // Total = 6% fixo, ou o valor escolhido até o teto da org quando personalizada.
      const participantFeePercent = parseFloat((totalFee - organizerPercent).toFixed(2));
      await organizerService.saveFinancialSettings(eventId, {
        organizerFeePercent: organizerPercent,
        participantFeePercent,
        maxInstallments,
        acceptedPaymentMethods,
      });
    } catch {
      // endpoint pode ainda não existir no servidor — não bloqueia o fluxo
    }
  };

  const handleSaveDraft = async () => {
    try {
      const eventId = await ensureCreateEventSyncedFromDraft({ formData, updateFormData });
      await saveFinancialSettings(eventId);
      toast.success("Evento salvo como rascunho com sucesso!");
      // Rascunho salvo → sai do wizard e volta para a lista de eventos.
      orgNav.push("/organizer/events");
    } catch (e) {
      // Só navega em caso de sucesso — se a sincronização do rascunho falhar,
      // mantém o usuário na etapa para não perder o que foi preenchido.
      console.error(e);
      toast.error("Não foi possível salvar o rascunho.");
    }
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
      // `pt-[52px]` reserva a ProgressBar do wizard, que é `hidden md:block` — no
      // mobile virava espaço morto acima do header. `md:` restringe ao desktop,
      // igual ao irmão `new/questionnaire`.
      className="flex-1 bg-gray-2 px-5 pt-0 md:pt-[52px] pb-[176px] max-md:pb-40"
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
        totalFee={totalFee}
        // Só habilita a edição do total (e o teto) quando a org tem taxa personalizada;
        // senão o total fica read-only em 6% (comportamento atual).
        {...(customFeeEnabled && { onTotalFeeChange: setTotalFee, maxTotalFee })}
        acceptedPaymentMethods={acceptedPaymentMethods}
        onAcceptedPaymentMethodsChange={setAcceptedPaymentMethods}
      />
    </WizardStepLayout>
  );
}
