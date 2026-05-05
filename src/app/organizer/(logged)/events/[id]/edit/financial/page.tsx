"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useOrganizerNavigate } from "@/hooks/useOrganizerNavigate";
import { organizerService } from "@/services";
import { useWizardAuth } from "@/hooks/useWizardAuth";
import { Button } from "@/components/Button";
import { WizardStepLayout } from "@/components/Organizer/WizardStepLayout";
import { FinancialSection } from "@/components/Organizer/FinancialSection";
import toast from "react-hot-toast";
import { cn } from "@/utils/cn";

export default function EditFinancialPage() {
  const params = useParams();
  const eventId = params.id as string;
  const orgNav = useOrganizerNavigate();
  const { authChecked } = useWizardAuth();
  const [dataLoaded, setDataLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [organizerPercent, setOrganizerPercent] = useState(0);
  const [maxInstallments, setMaxInstallments] = useState<1 | 2 | 3>(1);

  useEffect(() => {
    if (!authChecked || !eventId) return;
    organizerService
      .getFinancialSettings(eventId)
      .then(({ organizerFeePercent, maxInstallments: mi }) => {
        setOrganizerPercent(organizerFeePercent);
        setMaxInstallments(mi);
      })
      .catch(() => {
        // endpoint may not exist yet — fall back to defaults
      })
      .finally(() => setDataLoaded(true));
  }, [authChecked, eventId]);

  const handleBack = () => {
    orgNav.push(`/organizer/events/${eventId}/edit/questionnaire`);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await organizerService.saveFinancialSettings(eventId, organizerPercent, maxInstallments);
      toast.success("Configurações financeiras salvas com sucesso!");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Erro ao salvar configurações financeiras");
    } finally {
      setSaving(false);
    }
  };

  return (
    <WizardStepLayout
      title="Financeiro"
      onBack={handleBack}
      className="flex-1 bg-gray-2 px-5 pt-[52px] pb-[176px] max-md:pb-40"
      maxWidth="max-w-7xl"
      gutter="5"
      description="Configure a divisão da taxa da plataforma e as formas de pagamento aceitas. Estes dados ficam travados após a publicação."
      showDescriptionOnMobile
      isLoading={!authChecked || !dataLoaded}
      actions={undefined}
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
