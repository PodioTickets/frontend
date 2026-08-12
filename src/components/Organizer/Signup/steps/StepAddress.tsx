"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { Dropdown } from "@/components/Dropdown";
import { BRAZIL_STATES } from "@/constants/brazilStates";
import { formatCEP, onlyDigits } from "@/utils/masks";
import { cn } from "@/utils/cn";
import { SignupField } from "../SignupField";
import type { OrganizerSignupFlow } from "../useOrganizerSignupFlow";

/** Select de UF com aparência de campo (label + caixa + chevron). */
function StateSelect({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (uf: string) => void;
  error?: string;
}) {
  const selected = BRAZIL_STATES.find((s) => s.id === value);
  return (
    <div className="flex flex-1 min-w-0 flex-col gap-2">
      {/* Mesma altura de label do FormField (`min-h-6` + flex items-center) para
          alinhar a caixa do "Estado" com a de "Cidade" na mesma linha do grid. */}
      <label className="flex min-h-6 items-center gap-1.5 text-sm font-normal font-family-dm-sans text-gray-12 leading-[1.3]">
        Estado
      </label>
      <Dropdown
        options={BRAZIL_STATES.map((s) => ({ id: s.id, label: s.label }))}
        onSelect={(o) => onChange(String(o.id))}
        width="w-full"
        maxHeight="max-h-[280px]"
        trigger={
          <div
            className={cn(
              "flex h-12 w-full items-center justify-between rounded-lg border bg-gray-1 px-3 text-base font-family-dm-sans leading-[1.3] transition-colors",
              error ? "border-red-8" : "border-gray-6",
            )}
          >
            <span className={selected ? "text-gray-12" : "text-gray-11"}>
              {selected ? selected.label : "Selecione o estado"}
            </span>
            <ChevronRight className="size-4 shrink-0 text-gray-11" />
          </div>
        }
      />
      {error ? (
        <p className="text-sm text-red-11 font-family-dm-sans leading-[1.3]">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Etapa 4 — Endereço (CEP autopreenche rua/bairro/cidade/estado). */
export function StepAddress({ flow }: { flow: OrganizerSignupFlow }) {
  const { formData, errors, setField, handleZipChange, loadingCep } = flow;

  // Revela os demais campos só quando o CEP está completo (8 dígitos). O reveal
  // não depende do sucesso do lookup — se a busca falhar, o usuário preenche à mão.
  const showRest = onlyDigits(formData.zipCode).length === 8;

  return (
    <div className="flex flex-col gap-5">
      {/* CEP sempre visível. Enquanto não preenchido (form ainda colapsado) o
          campo fica estreito — só o suficiente para o placeholder. Ao completar
          o CEP a Rua entra AO LADO e o campo volta à largura da coluna (metade).
          O grid só vira 2 colunas com `showRest`, senão o CEP sozinho ocuparia
          metade do container mesmo estreito. */}
      <div
        className={cn(
          "grid grid-cols-1 gap-x-4 gap-y-5",
          showRest && "md:grid-cols-2",
        )}
      >
        {/* Wrapper controla a largura: colapsado = estreito (cabe o texto);
            expandido = `w-full` (preenche a coluna do grid). */}
        <div className={cn(!showRest && "max-w-[11rem]")}>
          <SignupField
            label="CEP"
            value={formData.zipCode}
            onChange={(v) => handleZipChange(formatCEP(v))}
            placeholder={loadingCep ? "Buscando..." : "00000-000"}
            error={errors.zipCode}
            inputMode="numeric"
            maxLength={9}
          />
        </div>
        <AnimatePresence initial={false}>
          {showRest ? (
            <motion.div
              key="street-field"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="min-w-0"
            >
              <SignupField
                label="Rua"
                value={formData.street}
                onChange={(v) => setField("street", v)}
                placeholder="Digite o nome da sua rua"
                error={errors.street}
              />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      <AnimatePresence initial={false}>
        {showRest ? (
          <motion.div
            key="address-fields"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="grid grid-cols-1 gap-x-4 gap-y-5 md:grid-cols-2"
          >
            <SignupField
              label="Número"
              value={formData.number}
              onChange={(v) => setField("number", v)}
              placeholder="Ex: 123"
              error={errors.number}
              inputMode="numeric"
            />
            <SignupField
              label="Bairro"
              value={formData.neighborhood}
              onChange={(v) => setField("neighborhood", v)}
              placeholder="Digite o nome do seu bairro"
              error={errors.neighborhood}
            />
            <SignupField
              label="Cidade"
              value={formData.city}
              onChange={(v) => setField("city", v)}
              placeholder="Nome da cidade"
              error={errors.city}
            />
            <StateSelect
              value={formData.state}
              onChange={(v) => setField("state", v)}
              error={errors.state}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
