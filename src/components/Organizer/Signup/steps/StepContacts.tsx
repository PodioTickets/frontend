"use client";

import { formatPhone } from "@/utils/masks";
import { SignupField } from "../SignupField";
import type { OrganizerSignupFlow } from "../useOrganizerSignupFlow";

/** Etapa 5 — Contatos da organização (e-mail, WhatsApp). */
export function StepContacts({ flow }: { flow: OrganizerSignupFlow }) {
  const { formData, errors, setField } = flow;
  return (
    <div className="grid grid-cols-1 gap-x-4 gap-y-5 md:grid-cols-2">
      <SignupField
        label="E-mail"
        type="email"
        inputMode="email"
        value={formData.orgEmail}
        onChange={(v) => setField("orgEmail", v)}
        placeholder="contato@meuevento.com.br"
        error={errors.orgEmail}
      />
      <SignupField
        label="WhatsApp"
        inputMode="tel"
        value={formData.whatsapp}
        onChange={(v) => setField("whatsapp", formatPhone(v))}
        placeholder="(42) 99999-0000"
        error={errors.whatsapp}
        maxLength={16}
      />
    </div>
  );
}
