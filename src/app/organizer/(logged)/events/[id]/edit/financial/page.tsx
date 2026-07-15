"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { organizerService } from "@/services";
import { useWizardAuth } from "@/hooks/useWizardAuth";
import { useUnsavedLeaveGuard } from "@/hooks/useUnsavedLeaveGuard";
import { Button } from "@/components/Button";
import { UnsavedChangesModal } from "@/components/UnsavedChangesModal";
import { WizardStepLayout } from "@/components/Organizer/WizardStepLayout";
import { FinancialSection } from "@/components/Organizer/FinancialSection";
import toast from "react-hot-toast";
import { cn } from "@/utils/cn";
import {
  ACCEPTED_PAYMENT_METHODS,
  type AcceptedPaymentMethod,
} from "@/interfaces/event";

/* A divisão da taxa fica travada após a publicação (server: 409
 * FINANCIAL_SETTINGS_LOCKED) — só formas de pagamento + parcelamento são
 * editáveis pelo organizador, então o baseline cobre apenas esses campos. */
type PaymentBaseline = {
  maxInstallments: 1 | 2 | 3;
  acceptedPaymentMethods: AcceptedPaymentMethod[];
};

export default function EditFinancialPage() {
  const params = useParams();
  const eventId = params.id as string;
  const { authChecked } = useWizardAuth();
  const [dataLoaded, setDataLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [organizerPercent, setOrganizerPercent] = useState(4);
  const [maxInstallments, setMaxInstallments] = useState<1 | 2 | 3>(1);
  const [totalFee, setTotalFee] = useState<number>(6);
  const [acceptedPaymentMethods, setAcceptedPaymentMethods] = useState<AcceptedPaymentMethod[]>(
    [...ACCEPTED_PAYMENT_METHODS],
  );

  // Baseline do GET inicial; atualizado a cada save bem-sucedido pra que o
  // botão volte a ficar desabilitado até a próxima edição.
  const baselineRef = useRef<PaymentBaseline | null>(null);

  useEffect(() => {
    if (!authChecked || !eventId) return;
    organizerService
      .getFinancialSettings(eventId)
      .then(({ organizerFeePercent, maxInstallments: mi, totalFee: tf, acceptedPaymentMethods: apm }) => {
        setOrganizerPercent(organizerFeePercent);
        setMaxInstallments(mi);
        setTotalFee(tf);
        setAcceptedPaymentMethods(apm);
        baselineRef.current = { maxInstallments: mi, acceptedPaymentMethods: apm };
      })
      .catch(() => {})
      .finally(() => setDataLoaded(true));
  }, [authChecked, eventId]);

  const handleSave = async () => {
    if (!eventId) return;
    setSaving(true);
    try {
      // Envia SÓ os campos editáveis — incluir a taxa renderia 409 pós-publicação
      await organizerService.saveFinancialSettings(eventId, {
        maxInstallments,
        acceptedPaymentMethods,
      });
      baselineRef.current = { maxInstallments, acceptedPaymentMethods };
      toast.success("Formas de pagamento salvas!");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Erro ao salvar formas de pagamento");
    } finally {
      setSaving(false);
    }
  };

  const baseline = baselineRef.current;
  const hasChanges =
    baseline !== null &&
    (maxInstallments !== baseline.maxInstallments ||
      // Arrays sempre em ordem canônica (service/FinancialSection) → join é comparação segura
      acceptedPaymentMethods.join(",") !== baseline.acceptedPaymentMethods.join(","));

  /* Descarta as edições locais, restaurando o baseline (GET inicial / último save). */
  const discardLocalChanges = useCallback(() => {
    const b = baselineRef.current;
    if (!b) return;
    setMaxInstallments(b.maxInstallments);
    setAcceptedPaymentMethods(b.acceptedPaymentMethods);
  }, []);

  /* Guarda de saída: histórico/popstate + beforeunload + interceptação de
   * cliques em links (stepper) enquanto houver alterações não salvas. */
  const {
    leavePromptOpen,
    confirmLeaveWithoutSaving,
    dismissLeavePrompt,
  } = useUnsavedLeaveGuard(hasChanges, {
    navigateTarget: `/organizer/events/${eventId}/edit/questionnaire`,
    onDiscard: discardLocalChanges,
  });

  return (
    <>
    <WizardStepLayout
      title="Pagamento"
      className="flex-1 bg-gray-2 px-5 pt-0 pb-[176px] max-md:pb-10"
      maxWidth="max-w-7xl"
      gutter="5"
      description="A divisão da taxa fica travada após a publicação, mas você pode alterar as formas de pagamento aceitas."
      showDescriptionOnMobile
      isLoading={!authChecked || !dataLoaded}
      actions={
        <Button
          type="button"
          onClick={handleSave}
          disabled={saving || !hasChanges}
          variant="default"
          className={cn("h-[52px] px-11 font-manrope text-lg font-bold text-gray-12 disabled:cursor-not-allowed disabled:opacity-50", "max-md:h-12 max-md:w-full max-md:px-4")}
        >
          {saving ? "Salvando..." : "Salvar alterações"}
        </Button>
      }
    >
      <FinancialSection
        organizerPercent={organizerPercent}
        maxInstallments={maxInstallments}
        onOrganizerPercentChange={setOrganizerPercent}
        onMaxInstallmentsChange={setMaxInstallments}
        totalFee={totalFee}
        acceptedPaymentMethods={acceptedPaymentMethods}
        onAcceptedPaymentMethodsChange={setAcceptedPaymentMethods}
        readOnly
        paymentMethodsReadOnly={false}
      />
    </WizardStepLayout>

    <UnsavedChangesModal
      open={leavePromptOpen}
      onClose={dismissLeavePrompt}
      title="Alterações não salvas"
      description="Você alterou as formas de pagamento. Se sair agora, as alterações serão perdidas."
      onLeaveWithoutSaving={confirmLeaveWithoutSaving}
    />
    </>
  );
}
