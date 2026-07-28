"use client";

import { User } from "lucide-react";
import { HotelsIcon } from "@/components/Icons/Organizer/HotelsIcon";
import { PersonTypeCard } from "../PersonTypeCard";
import type { OrganizerSignupFlow } from "../useOrganizerSignupFlow";

/** Etapa 2 — Tipo de cadastro (Pessoa jurídica x Pessoa física). */
export function StepPersonType({ flow }: { flow: OrganizerSignupFlow }) {
  const { formData, selectPersonType } = flow;
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <PersonTypeCard
        icon={<HotelsIcon className="size-7" />}
        title="Pessoa jurídica"
        description="Tenho um CNPJ (empresa, MEI, associação)"
        selected={formData.personType === "PJ"}
        onSelect={() => selectPersonType("PJ")}
      />
      <PersonTypeCard
        icon={<User className="size-7" />}
        title="Pessoa Física"
        description="Organizo com meu CPF, sem empresa"
        selected={formData.personType === "PF"}
        onSelect={() => selectPersonType("PF")}
      />
    </div>
  );
}
