"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useOrganizerNavigate } from "@/hooks/useOrganizerNavigate";
import { organizerService } from "@/services";
import { useWizardAuth } from "@/hooks/useWizardAuth";
import { WizardStepLayout } from "@/components/Organizer/WizardStepLayout";
import { FinancialSection } from "@/components/Organizer/FinancialSection";
import {
  ACCEPTED_PAYMENT_METHODS,
  type AcceptedPaymentMethod,
} from "@/interfaces/event";

export default function EditFinancialPage() {
  const params = useParams();
  const eventId = params.id as string;
  const { authChecked } = useWizardAuth();
  const [dataLoaded, setDataLoaded] = useState(false);
  const [organizerPercent, setOrganizerPercent] = useState(4);
  const [maxInstallments, setMaxInstallments] = useState<1 | 2 | 3>(1);
  const [totalFee, setTotalFee] = useState<number>(6);
  const [acceptedPaymentMethods, setAcceptedPaymentMethods] = useState<AcceptedPaymentMethod[]>(
    [...ACCEPTED_PAYMENT_METHODS],
  );

  useEffect(() => {
    if (!authChecked || !eventId) return;
    organizerService
      .getFinancialSettings(eventId)
      .then(({ organizerFeePercent, maxInstallments: mi, totalFee: tf, acceptedPaymentMethods: apm }) => {
        setOrganizerPercent(organizerFeePercent);
        setMaxInstallments(mi);
        setTotalFee(tf);
        setAcceptedPaymentMethods(apm);
      })
      .catch(() => {})
      .finally(() => setDataLoaded(true));
  }, [authChecked, eventId]);

  return (
    <WizardStepLayout
      title="Pagamento"
      className="flex-1 bg-gray-2 -mx-3 px-4 pt-0 pb-[176px] max-md:pb-10"
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
        acceptedPaymentMethods={acceptedPaymentMethods}
        readOnly
      />
    </WizardStepLayout>
  );
}
