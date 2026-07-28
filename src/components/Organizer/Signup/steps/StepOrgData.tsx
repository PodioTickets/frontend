"use client";

import { Button } from "@/components/Button";
import { formatCNPJ, formatCPF } from "@/utils/masks";
import { SignupField } from "../SignupField";
import type { OrganizerSignupFlow } from "../useOrganizerSignupFlow";

const TRADE_NAME_TOOLTIP =
  "Nome público da organização, exibido para os compradores.";

/** Etapa 3 — Dados da organização (ramifica por PF/PJ). */
export function StepOrgData({ flow }: { flow: OrganizerSignupFlow }) {
  const { formData, errors, setField, consultarCnpj, loadingCnpj } = flow;
  const isPJ = formData.personType === "PJ";

  return (
    <div className="flex flex-col gap-5">
      {isPJ && (
        <SignupField
          label="CNPJ"
          value={formData.document}
          onChange={(v) => setField("document", formatCNPJ(v))}
          placeholder="00.000.000/0000-00"
          error={errors.document}
          inputMode="numeric"
          maxLength={18}
          rightSlot={
            <Button
              type="button"
              variant="outline"
              size="sm"
              isLoading={loadingCnpj}
              onClick={() => void consultarCnpj()}
              className="h-8"
            >
              Consultar
            </Button>
          }
        />
      )}

      <div className="grid grid-cols-1 gap-x-4 gap-y-5 md:grid-cols-2">
        <SignupField
          label="Nome fantasia"
          tooltip={TRADE_NAME_TOOLTIP}
          value={formData.tradeName}
          onChange={(v) => setField("tradeName", v)}
          placeholder="Informe o nome fantasia da empresa"
          error={errors.tradeName}
        />

        {isPJ ? (
          <SignupField
            label="Razão social"
            value={formData.legalName}
            onChange={(v) => setField("legalName", v)}
            placeholder="Informe o nome jurídico da empresa"
            error={errors.legalName}
          />
        ) : (
          <SignupField
            label="Nome do responsável"
            value={formData.ownerName}
            onChange={(v) => setField("ownerName", v)}
            placeholder="Nome completo"
            error={errors.ownerName}
          />
        )}

        {isPJ && (
          <SignupField
            label="Nome do responsável"
            value={formData.ownerName}
            onChange={(v) => setField("ownerName", v)}
            placeholder="Nome completo"
            error={errors.ownerName}
          />
        )}

        <SignupField
          label="CPF do responsável"
          value={formData.ownerDocument}
          onChange={(v) => setField("ownerDocument", formatCPF(v))}
          placeholder="000.000.000-00"
          error={errors.ownerDocument}
          inputMode="numeric"
          maxLength={14}
        />
      </div>
    </div>
  );
}
