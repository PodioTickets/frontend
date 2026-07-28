"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/Button";
import { OrganizerSignupLayout } from "@/components/Organizer/Signup/OrganizerSignupLayout";
import { useOrganizerSignupFlow } from "@/components/Organizer/Signup/useOrganizerSignupFlow";
import { StepAccess } from "@/components/Organizer/Signup/steps/StepAccess";
import { StepPersonType } from "@/components/Organizer/Signup/steps/StepPersonType";
import { StepOrgData } from "@/components/Organizer/Signup/steps/StepOrgData";
import { StepAddress } from "@/components/Organizer/Signup/steps/StepAddress";
import { StepContacts } from "@/components/Organizer/Signup/steps/StepContacts";
import { StepContractsReview } from "@/components/Organizer/Signup/steps/StepContractsReview";
import { StepDone } from "@/components/Organizer/Signup/steps/StepDone";

/**
 * Auto-cadastro público de organizador (`/organizer/create`). Wizard single-page
 * que cria a conta + organização ativa e autologa como organizador. Fora do
 * grupo `(logged)` → sem guard de auth. Rota já coberta por `isOrganizerSurfacePath`.
 *
 * A etapa "contratos" é o ponto de submit (cria a conta) e renderiza suas
 * próprias ações; a "conclusão" é a tela de sucesso (sem cabeçalho/voltar).
 */
export default function OrganizerCreatePage() {
  const flow = useOrganizerSignupFlow();
  const stepKey = flow.currentMeta.key;

  const renderStep = () => {
    switch (stepKey) {
      case "access":
        return <StepAccess flow={flow} />;
      case "type":
        return <StepPersonType flow={flow} />;
      case "orgData":
        return <StepOrgData flow={flow} />;
      case "address":
        return <StepAddress flow={flow} />;
      case "contacts":
        return <StepContacts flow={flow} />;
      case "contracts":
        return <StepContractsReview flow={flow} />;
      case "done":
        return <StepDone flow={flow} />;
      default:
        return null;
    }
  };

  const animatedStep = (
    <AnimatePresence mode="wait">
      <motion.div
        key={stepKey}
        initial={{ opacity: 0, x: 16 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -16 }}
        transition={{ duration: 0.2 }}
      >
        {renderStep()}
      </motion.div>
    </AnimatePresence>
  );

  // Tela de sucesso: sem cabeçalho, sem voltar, card mais estreito.
  if (stepKey === "done") {
    return (
      <OrganizerSignupLayout cardClassName="max-w-[400px]">
        {animatedStep}
      </OrganizerSignupLayout>
    );
  }

  // Contratos: o step renderiza suas próprias ações (checkbox + "Aceitar e continuar").
  if (stepKey === "contracts") {
    return (
      <OrganizerSignupLayout
        title={flow.currentMeta.title}
        subtitle={flow.currentMeta.subtitle}
        onBack={flow.handleBack}
        onSubmit={flow.handleNext}
      >
        {animatedStep}
      </OrganizerSignupLayout>
    );
  }

  return (
    <OrganizerSignupLayout
      title={flow.currentMeta.title}
      subtitle={flow.currentMeta.subtitle}
      onBack={flow.handleBack}
      onSubmit={flow.handleNext}
      actions={
        <Button type="submit" className="min-w-[120px]">
          Continuar
        </Button>
      }
    >
      {animatedStep}
    </OrganizerSignupLayout>
  );
}
