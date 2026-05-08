"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useOrganizerNavigate } from "@/hooks/useOrganizerNavigate";
import { organizerService } from "@/services";
import { useWizardAuth } from "@/hooks/useWizardAuth";
import { WizardStepLayout } from "@/components/Organizer/WizardStepLayout";
import { FinancialSection } from "@/components/Organizer/FinancialSection";

export default function EditFinancialPage() {
  const params = useParams();
  const eventId = params.id as string;
  const orgNav = useOrganizerNavigate();
  const { authChecked } = useWizardAuth();
  const [dataLoaded, setDataLoaded] = useState(false);
  const [organizerPercent, setOrganizerPercent] = useState(0);
  const [maxInstallments, setMaxInstallments] = useState<1 | 2 | 3>(1);
  const [totalFee, setTotalFee] = useState<number>(6);

  useEffect(() => {
    if (!authChecked || !eventId) return;
    organizerService
      .getFinancialSettings(eventId)
      .then(({ organizerFeePercent, maxInstallments: mi, totalFee: tf }) => {
        setOrganizerPercent(organizerFeePercent);
        setMaxInstallments(mi);
        setTotalFee(tf);
      })
      .catch(() => {})
      .finally(() => setDataLoaded(true));
  }, [authChecked, eventId]);

  const handleBack = () => {
    orgNav.push(`/organizer/events/${eventId}/edit/questionnaire`);
  };

  return (
    <WizardStepLayout
      title="Financeiro"
      onBack={handleBack}
      className="flex-1 bg-gray-2 px-5 pt-[52px] pb-[176px] max-md:pb-40"
      maxWidth="max-w-7xl"
      gutter="5"
      description="Confira a divisão da taxa da plataforma e as formas de pagamento aceitas."
      showDescriptionOnMobile
      isLoading={!authChecked || !dataLoaded}
      actions={undefined}
    >
      <FinancialSection
        organizerPercent={organizerPercent}
        maxInstallments={maxInstallments}
        onOrganizerPercentChange={setOrganizerPercent}
        onMaxInstallmentsChange={setMaxInstallments}
        totalFee={totalFee}
        readOnly
      />
    </WizardStepLayout>
  );
}
