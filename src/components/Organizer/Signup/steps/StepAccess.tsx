"use client";

import { SignupField } from "../SignupField";
import type { OrganizerSignupFlow } from "../useOrganizerSignupFlow";

/** Etapa 1 — Dados de acesso (nome, e-mail, senha, confirmar). */
export function StepAccess({ flow }: { flow: OrganizerSignupFlow }) {
  const { formData, errors, setField, handleEmailBlur } = flow;
  return (
    <div className="grid grid-cols-1 gap-x-4 gap-y-5 md:grid-cols-2">
      <SignupField
        label="Nome completo"
        value={formData.completeName}
        onChange={(v) => setField("completeName", v)}
        placeholder="Digite seu nome completo"
        error={errors.completeName}
        autoComplete="name"
      />
      <SignupField
        label="E-mail de login"
        type="email"
        inputMode="email"
        value={formData.email}
        onChange={(v) => setField("email", v)}
        onBlur={handleEmailBlur}
        placeholder="seu@email.com"
        error={errors.email}
        autoComplete="email"
      />
      <SignupField
        label="Senha"
        type="password"
        value={formData.password}
        onChange={(v) => setField("password", v)}
        placeholder="Mínimo 8 caracteres"
        error={errors.password}
        autoComplete="new-password"
      />
      <SignupField
        label="Confirmar senha"
        type="password"
        value={formData.confirmPassword}
        onChange={(v) => setField("confirmPassword", v)}
        placeholder="Repita a senha"
        error={errors.confirmPassword}
        autoComplete="new-password"
      />
    </div>
  );
}
