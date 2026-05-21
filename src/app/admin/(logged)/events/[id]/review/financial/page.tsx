"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { organizerService, adminService } from "@/services";
import { useWizardAuth } from "@/hooks/useWizardAuth";
import { Button } from "@/components/Button";
import { WizardStepLayout } from "@/components/Organizer/WizardStepLayout";
import { FinancialSection } from "@/components/Organizer/FinancialSection";
import toast from "react-hot-toast";
import { cn } from "@/utils/cn";

export default function ReviewFinancialPage() {
  const params = useParams();
  const eventId = params.id as string;
  const router = useRouter();
  const { authChecked } = useWizardAuth();
  const [dataLoaded, setDataLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
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
      .catch(() => { /* fallback to defaults */ })
      .finally(() => setDataLoaded(true));
  }, [authChecked, eventId]);

  const handleBack = () => {
    router.push(`/admin/events/${eventId}/review/questionnaire`);
  };

  const handleSave = async () => {
    if (!eventId) return;
    setSaving(true);
    try {
      const participantFeePercent = parseFloat((totalFee - organizerPercent).toFixed(2));
      await organizerService.saveFinancialSettings(eventId, organizerPercent, participantFeePercent, maxInstallments, totalFee);
      await adminService.publishEvent(eventId);
      toast.success("Evento publicado com sucesso!");
      router.push("/admin/auditoria-evento");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Erro ao publicar evento");
    } finally {
      setSaving(false);
    }
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
      />
    </WizardStepLayout>
  );
}
