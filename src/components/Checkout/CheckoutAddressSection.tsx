"use client";

import { useMemo, useCallback, useRef, useState } from "react";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { Dropdown, type DropdownOption } from "@/components/Dropdown";
import toast from "react-hot-toast";
import { cn } from "@/utils/cn";
import { ArrowButton } from "../ArrowButton";
import { lookupCepDigits } from "@/utils/lookupCep";
import { CountrySearchSelect } from "@/components/CountrySearchSelect";
import { AnimatePresence, motion } from "framer-motion";

const BRAZIL_UFS: Record<string, string> = {
  AC: "Acre",
  AL: "Alagoas",
  AP: "Amapá",
  AM: "Amazonas",
  BA: "Bahia",
  CE: "Ceará",
  DF: "Distrito Federal",
  ES: "Espírito Santo",
  GO: "Goiás",
  MA: "Maranhão",
  MT: "Mato Grosso",
  MS: "Mato Grosso do Sul",
  MG: "Minas Gerais",
  PA: "Pará",
  PB: "Paraíba",
  PR: "Paraná",
  PE: "Pernambuco",
  PI: "Piauí",
  RJ: "Rio de Janeiro",
  RN: "Rio Grande do Norte",
  RS: "Rio Grande do Sul",
  RO: "Rondônia",
  RR: "Roraima",
  SC: "Santa Catarina",
  SP: "São Paulo",
  SE: "Sergipe",
  TO: "Tocantins",
};

function formatCep(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

const selectTriggerClass =
  "w-full h-12 px-3 rounded-lg border border-gray-7 bg-gray-1 text-gray-12 focus:outline-none focus:border-primary-10 transition-colors cursor-pointer hover:border-gray-8 flex items-center justify-between gap-2";

const inputClass =
  "h-12 px-3 rounded-lg border border-gray-6 bg-gray-1 text-base text-gray-12 font-family-dm-sans placeholder:text-gray-11 w-full focus:outline-none focus:border-primary-10";

export interface CheckoutBillingAddress {
  /** Nome do país em português (lista igual ao cadastro; padrão "Brasil") */
  country: string;
  cep: string;
  stateUf: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
}

interface CheckoutAddressSectionProps {
  onConfirmedChange: (confirmed: boolean) => void;
  values: CheckoutBillingAddress;
  onChange: (patch: Partial<CheckoutBillingAddress>) => void;
  className?: string;
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-family-dm-sans text-base text-gray-12 leading-[1.3]">
      {children}
    </span>
  );
}

export function CheckoutAddressSection({
  onConfirmedChange,
  values,
  onChange,
  className,
}: CheckoutAddressSectionProps) {
  const [loadingCep, setLoadingCep] = useState(false);
  const cepLookupSeq = useRef(0);

  const stateOptions = useMemo(
    () =>
      Object.entries(BRAZIL_UFS)
        .map(([id, name]) => ({ id, label: `${name} (${id})` }))
        .sort((a, b) => a.label.localeCompare(b.label, "pt-BR")),
    []
  );

  const invalidateConfirm = useCallback(() => {
    onConfirmedChange(false);
  }, [onConfirmedChange]);

  const handleCepChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value.replace(/\D/g, "").slice(0, 8);
      const formatted = formatCep(e.target.value);
      onChange({ cep: formatted });
      invalidateConfirm();

      if (raw.length !== 8) {
        cepLookupSeq.current += 1;
        setLoadingCep(false);
        return;
      }

      if (values.country !== "Brasil") {
        setLoadingCep(false);
        return;
      }

      const seq = ++cepLookupSeq.current;
      setLoadingCep(true);
      try {
        const result = await lookupCepDigits(raw);
        if (seq !== cepLookupSeq.current) return;

        if (!result.ok) {
          toast.error(result.message);
          return;
        }

        const d = result.data;
        onChange({
          street: d.logradouro || "",
          neighborhood: d.bairro || "",
          city: d.localidade || "",
          stateUf: (d.uf || "").toUpperCase(),
        });
        toast.success("Endereço encontrado!");
      } catch {
        if (seq === cepLookupSeq.current) {
          toast.error("Erro ao buscar CEP");
        }
      } finally {
        if (seq === cepLookupSeq.current) {
          setLoadingCep(false);
        }
      }
    },
    [onChange, invalidateConfirm, values.country]
  );

  const cepDigits = values.cep.replace(/\D/g, "");
  const showAddressRest =
    values.country !== "Brasil" || cepDigits.length === 8;

  const handleConfirm = () => {
    if (!values.country?.trim()) {
      toast.error("Selecione o país.");
      return;
    }
    if (values.country === "Brasil") {
      if (cepDigits.length !== 8) {
        toast.error("Informe um CEP válido.");
        return;
      }
    } else if (!values.cep.trim()) {
      toast.error("Informe o CEP ou código postal.");
      return;
    }
    if (!values.stateUf) {
      toast.error("Selecione o estado.");
      return;
    }
    if (!values.street.trim()) {
      toast.error("Informe a rua.");
      return;
    }
    if (!values.number.trim()) {
      toast.error("Informe o número.");
      return;
    }
    if (!values.neighborhood.trim()) {
      toast.error("Informe o bairro.");
      return;
    }
    if (!values.city.trim()) {
      toast.error("Informe a cidade.");
      return;
    }
    onConfirmedChange(true);
    toast.success("Endereço confirmado.");
  };

  return (
    <div
      className={cn(
        "border border-gray-6 rounded-xl p-5 flex flex-col gap-6 w-full bg-gray-1",
        className
      )}
    >
      <h2 className="font-manrope font-bold text-xl leading-[1.1] text-gray-12">
        Endereço
      </h2>

      <div className="flex flex-col w-full gap-4">
        {/* País + CEP */}
        <div className="flex flex-wrap gap-x-3 gap-y-4 w-full">
          <div className="flex flex-col gap-2 flex-1 min-w-[min(100%,280px)]">
            <FieldLabel>País</FieldLabel>
            <CountrySearchSelect
              value={values.country}
              onChange={(country) => {
                onChange({ country });
                invalidateConfirm();
              }}
            />
          </div>
          <div className="flex flex-col gap-2 flex-1 min-w-[min(100%,280px)]">
            <FieldLabel>CEP</FieldLabel>
            <Input
              type="text"
              inputMode="numeric"
              autoComplete="postal-code"
              placeholder="00000-000"
              value={values.cep}
              onChange={handleCepChange}
              className={inputClass}
            />
            {loadingCep ? (
              <p className="text-sm text-gray-11 font-family-dm-sans">
                Buscando endereço...
              </p>
            ) : null}
            {values.country === "Brasil" && cepDigits.length > 0 && cepDigits.length < 8 ? (
              <p className="text-sm text-gray-11 font-family-dm-sans">
                Preencha o CEP com 8 dígitos para liberar o restante do endereço.
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {showAddressRest ? (
          <motion.div
            key="checkout-address-rest"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.28, ease: [0.25, 0.1, 0.25, 1] }}
            className="flex flex-col gap-6 w-full"
          >
            <div className="flex flex-col w-full gap-4">
        {/* Estado + Rua */}
        <div className="flex flex-wrap gap-x-3 gap-y-4 w-full">
          <div className="flex flex-col gap-2 flex-1 min-w-[min(100%,280px)]">
            <FieldLabel>Estado</FieldLabel>
            <Dropdown
              options={stateOptions}
              selectedIds={values.stateUf ? [values.stateUf] : []}
              onSelect={(opt) => {
                onChange({ stateUf: opt.id || "" });
                invalidateConfirm();
              }}
              width="w-full"
              maxHeight="max-h-240"
              trigger={(isOpen) => (
                <button
                  type="button"
                  className={selectTriggerClass}
                  aria-label="Selecionar estado"
                >
                  <span
                    className={cn(
                      "text-base font-family-dm-sans truncate text-left",
                      values.stateUf ? "text-gray-12" : "text-gray-11"
                    )}
                  >
                    {stateOptions.find((o) => o.id === values.stateUf)?.label ??
                      "Selecione"}
                  </span>
                  <ArrowButton isOpen={isOpen} className="size-3 text-gray-12 shrink-0" />
                </button>
              )}
            />
          </div>
          <div className="flex flex-col gap-2 flex-1 min-w-[min(100%,280px)]">
            <FieldLabel>Rua</FieldLabel>
            <Input
              type="text"
              autoComplete="street-address"
              placeholder="Nome da sua rua"
              value={values.street}
              onChange={(e) => {
                onChange({ street: e.target.value });
                invalidateConfirm();
              }}
              className={inputClass}
            />
          </div>
        </div>

        {/* Número + Complemento */}
        <div className="flex flex-wrap gap-x-3 gap-y-4 w-full items-end">
          <div className="flex flex-col gap-2 w-full sm:w-[136px] shrink-0">
            <FieldLabel>Número</FieldLabel>
            <Input
              type="text"
              autoComplete="off"
              placeholder="Nº"
              value={values.number}
              onChange={(e) => {
                onChange({ number: e.target.value });
                invalidateConfirm();
              }}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-2 flex-1 min-w-[min(100%,200px)]">
            <FieldLabel>Complemento (opcional)</FieldLabel>
            <Input
              type="text"
              autoComplete="off"
              placeholder="Apto, bloco, etc"
              value={values.complement}
              onChange={(e) => {
                onChange({ complement: e.target.value });
                invalidateConfirm();
              }}
              className={inputClass}
            />
          </div>
        </div>

        {/* Bairro + Cidade */}
        <div className="flex flex-wrap gap-x-3 gap-y-4 w-full">
          <div className="flex flex-col gap-2 flex-1 min-w-[min(100%,280px)]">
            <FieldLabel>Bairro</FieldLabel>
            <Input
              type="text"
              placeholder="Digite seu bairro"
              value={values.neighborhood}
              onChange={(e) => {
                onChange({ neighborhood: e.target.value });
                invalidateConfirm();
              }}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-2 flex-1 min-w-[min(100%,280px)]">
            <FieldLabel>Cidade</FieldLabel>
            <Input
              type="text"
              autoComplete="address-level2"
              placeholder="Digite sua cidade"
              value={values.city}
              onChange={(e) => {
                onChange({ city: e.target.value });
                invalidateConfirm();
              }}
              className={inputClass}
            />
          </div>
        </div>
            </div>

            <Button
              type="button"
              variant="default"
              className="w-full h-12 font-bold font-manrope text-base"
              onClick={handleConfirm}
            >
              Confirmar endereço
            </Button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export const initialBillingAddress = (): CheckoutBillingAddress => ({
  country: "Brasil",
  cep: "",
  stateUf: "",
  street: "",
  number: "",
  complement: "",
  neighborhood: "",
  city: "",
});
