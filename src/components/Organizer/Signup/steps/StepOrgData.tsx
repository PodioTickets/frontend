"use client";

import { AnimatePresence, motion } from "framer-motion";
import { formatCNPJ, formatCPF } from "@/utils/masks";
import { SignupField } from "../SignupField";
import type { OrganizerSignupFlow } from "../useOrganizerSignupFlow";

const TRADE_NAME_TOOLTIP =
  "Este é o nome que será exibido para os participantes na página do evento, ingresso e demais comunicações.";

/** Etapa 3 — Dados da organização (ramifica por PF/PJ). */
export function StepOrgData({ flow }: { flow: OrganizerSignupFlow }) {
  const {
    formData,
    errors,
    setField,
    handleCnpjChange,
    handleOwnerDocumentChange,
    loadingCnpj,
    ownerNameFromReceita,
    cnpjConfirmed,
  } = flow;
  const isPJ = formData.personType === "PJ";

  // PJ: revela os demais campos SÓ quando a Receita confirmou o CNPJ (válido e
  // existente) e os dados foram puxados. CNPJ inválido/não encontrado/incompleto
  // → o resto do formulário permanece oculto.
  const showCnpjRest = cnpjConfirmed;

  return (
    <div className="flex flex-col gap-5">
      {isPJ && (
        <SignupField
          label="CNPJ"
          value={formData.document}
          onChange={(v) => handleCnpjChange(formatCNPJ(v))}
          placeholder={
            loadingCnpj ? "Buscando dados do CNPJ..." : "00.000.000/0000-00"
          }
          error={errors.document}
          inputMode="numeric"
          maxLength={18}
        />
      )}

      {isPJ ? (
        <AnimatePresence initial={false}>
          {showCnpjRest ? (
            <motion.div
              key="cnpj-fields"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="grid grid-cols-1 gap-x-4 gap-y-5 md:grid-cols-2"
            >
              {/* Ordem PJ: Nome fantasia → Razão social → Nome do responsável → CPF.
                  Razão social vem da Receita e fica read-only quando preenchida.
                  O Nome do responsável é read-only SÓ quando veio da Receita; no
                  fallback (nome completo da etapa 1) segue editável para correção.
                  O CPF do responsável valida ao vivo se já é responsável de outra
                  organização (via `handleOwnerDocumentChange`). */}
              <SignupField
                label="Nome fantasia"
                tooltip={TRADE_NAME_TOOLTIP}
                value={formData.tradeName}
                onChange={(v) => setField("tradeName", v)}
                placeholder="Informe o nome fantasia da empresa"
                error={errors.tradeName}
              />

              <SignupField
                label="Razão social"
                value={formData.legalName}
                onChange={(v) => setField("legalName", v)}
                placeholder="Informe o nome jurídico da empresa"
                error={errors.legalName}
                readOnly={!!formData.legalName}
              />

              <SignupField
                label="Nome do responsável"
                value={formData.ownerName}
                onChange={(v) => setField("ownerName", v)}
                placeholder="Nome completo"
                error={errors.ownerName}
                readOnly={ownerNameFromReceita}
              />

              <SignupField
                label="CPF do responsável"
                value={formData.ownerDocument}
                onChange={(v) => handleOwnerDocumentChange(formatCPF(v))}
                placeholder="000.000.000-00"
                error={errors.ownerDocument}
                inputMode="numeric"
                maxLength={14}
              />
            </motion.div>
          ) : null}
        </AnimatePresence>
      ) : (
        // PF: ordem exigida — Nome do responsável, CPF, Nome fantasia.
        <div className="grid grid-cols-1 gap-x-4 gap-y-5 md:grid-cols-2">
          <SignupField
            label="Nome do responsável"
            value={formData.ownerName}
            onChange={(v) => setField("ownerName", v)}
            placeholder="Nome completo"
            error={errors.ownerName}
          />

          {/* PF: o CPF é o documento da ORGANIZAÇÃO → valida disponibilidade ao vivo. */}
          <SignupField
            label="CPF do responsável"
            value={formData.ownerDocument}
            onChange={(v) => handleOwnerDocumentChange(formatCPF(v))}
            placeholder="000.000.000-00"
            error={errors.ownerDocument}
            inputMode="numeric"
            maxLength={14}
          />

          <SignupField
            label="Nome fantasia"
            tooltip={TRADE_NAME_TOOLTIP}
            value={formData.tradeName}
            onChange={(v) => setField("tradeName", v)}
            placeholder="Informe o nome fantasia da empresa"
            error={errors.tradeName}
          />
        </div>
      )}
    </div>
  );
}
