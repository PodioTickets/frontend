"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { organizerService, adminService } from "@/services";
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

type FinancialBaseline = {
  organizerPercent: number;
  maxInstallments: 1 | 2 | 3;
  totalFee: number;
  acceptedPaymentMethods: AcceptedPaymentMethod[];
};

const DEFAULT_BASELINE: FinancialBaseline = {
  organizerPercent: 4,
  maxInstallments: 1,
  totalFee: 6,
  acceptedPaymentMethods: [...ACCEPTED_PAYMENT_METHODS],
};

export default function ReviewFinancialPage() {
  const params = useParams();
  const eventId = params.id as string;
  const router = useRouter();
  const { authChecked } = useWizardAuth();
  const [dataLoaded, setDataLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [organizerPercent, setOrganizerPercent] = useState(DEFAULT_BASELINE.organizerPercent);
  const [maxInstallments, setMaxInstallments] = useState<1 | 2 | 3>(DEFAULT_BASELINE.maxInstallments);
  const [totalFee, setTotalFee] = useState<number>(DEFAULT_BASELINE.totalFee);
  const [acceptedPaymentMethods, setAcceptedPaymentMethods] = useState<AcceptedPaymentMethod[]>(
    DEFAULT_BASELINE.acceptedPaymentMethods,
  );

  // Baseline do GET inicial — usado só pelo guard de saída (não trava o botão
  // de publicar, que deve funcionar mesmo sem alterar a taxa).
  const baselineRef = useRef<FinancialBaseline | null>(null);

  useEffect(() => {
    if (!authChecked || !eventId) return;
    organizerService
      .getFinancialSettings(eventId)
      .then(({ organizerFeePercent, maxInstallments: mi, totalFee: tf, acceptedPaymentMethods: apm }) => {
        setOrganizerPercent(organizerFeePercent);
        setMaxInstallments(mi);
        setTotalFee(tf);
        setAcceptedPaymentMethods(apm);
        baselineRef.current = { organizerPercent: organizerFeePercent, maxInstallments: mi, totalFee: tf, acceptedPaymentMethods: apm };
      })
      .catch(() => {
        baselineRef.current = { ...DEFAULT_BASELINE };
      })
      .finally(() => setDataLoaded(true));
  }, [authChecked, eventId]);

  const handleSave = async () => {
    if (!eventId) return;
    setSaving(true);
    try {
      const participantFeePercent = parseFloat((totalFee - organizerPercent).toFixed(2));
      await organizerService.saveFinancialSettings(eventId, organizerPercent, participantFeePercent, maxInstallments, totalFee, acceptedPaymentMethods);
      await adminService.publishEvent(eventId);
      toast.success("Evento publicado com sucesso!");
      router.push("/admin/auditoria-evento");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Erro ao publicar evento");
    } finally {
      setSaving(false);
    }
  };

  const baseline = baselineRef.current;
  const hasChanges =
    baseline !== null &&
    (organizerPercent !== baseline.organizerPercent ||
      maxInstallments !== baseline.maxInstallments ||
      totalFee !== baseline.totalFee ||
      // Arrays sempre em ordem canônica (service/FinancialSection) → join é comparação segura
      acceptedPaymentMethods.join(",") !== baseline.acceptedPaymentMethods.join(","));

  /* Descarta as edições locais, restaurando o baseline (GET inicial). */
  const discardLocalChanges = useCallback(() => {
    const b = baselineRef.current;
    if (!b) return;
    setOrganizerPercent(b.organizerPercent);
    setMaxInstallments(b.maxInstallments);
    setTotalFee(b.totalFee);
    setAcceptedPaymentMethods(b.acceptedPaymentMethods);
  }, []);

  /* Guarda de saída: histórico/popstate + beforeunload + interceptação de
   * cliques em links (stepper). `handleBack` (botão voltar) e `navigateTarget`
   * levam à etapa anterior (questionário). */
  const {
    leavePromptOpen,
    handleBack,
    confirmLeaveWithoutSaving,
    dismissLeavePrompt,
  } = useUnsavedLeaveGuard(hasChanges, {
    navigateTarget: `/admin/events/${eventId}/review/questionnaire`,
    onDiscard: discardLocalChanges,
  });

  return (
    <>
    <WizardStepLayout
      title="Pagamento"
      onBack={handleBack}
      className="flex-1 bg-gray-2 px-5 pt-[52px] pb-[176px] max-md:pb-40"
      maxWidth="max-w-7xl"
      gutter="5"
      description="Configure a divisão da taxa da plataforma e as formas de pagamento aceitas. Estes dados ficam travados após a publicação."
      showDescriptionOnMobile
      isLoading={!authChecked || !dataLoaded}
      actions={
        <Button
          type="button"
          onClick={handleSave}
          disabled={saving}
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
        onTotalFeeChange={setTotalFee}
        acceptedPaymentMethods={acceptedPaymentMethods}
        onAcceptedPaymentMethodsChange={setAcceptedPaymentMethods}
      />
    </WizardStepLayout>

    <UnsavedChangesModal
      open={leavePromptOpen}
      onClose={dismissLeavePrompt}
      title="Alterações não salvas"
      description="Você alterou a configuração financeira. Se sair agora, as alterações serão perdidas."
      onLeaveWithoutSaving={confirmLeaveWithoutSaving}
    />
    </>
  );
}
