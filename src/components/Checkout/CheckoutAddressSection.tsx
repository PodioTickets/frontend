"use client";

import { useMemo, useCallback, useRef, useState } from "react";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { Dropdown, type DropdownOption } from "@/components/Dropdown";
import toast from "react-hot-toast";
import { cn } from "@/utils/cn";
import { ArrowButton } from "../ArrowButton";
import { lookupCepDigits } from "@/utils/lookupCep";
import { getPostalCodeConfig } from "@/utils/postalCode";
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

const selectTriggerClass =
  "w-full h-12 px-3 rounded-lg border border-gray-6 bg-gray-1 text-gray-12 focus:outline-none focus:border-primary-10 transition-colors cursor-pointer hover:border-gray-8 flex items-center justify-between gap-2";

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

type AddressErrors = {
  country?: string;
  cep?: string;
  stateUf?: string;
  street?: string;
  number?: string;
  neighborhood?: string;
  city?: string;
};

export function CheckoutAddressSection({
  onConfirmedChange,
  values,
  onChange,
  className,
}: CheckoutAddressSectionProps) {
  const [loadingCep, setLoadingCep] = useState(false);
  const [errors, setErrors] = useState<AddressErrors>({});
  const cepLookupSeq = useRef(0);

  // Estrangeiro = qualquer país != Brasil. Define quais campos aparecem
  // (sem complemento/bairro) e qual config de código postal usar.
  const isForeign = values.country !== "Brasil";
  const postalConfig = getPostalCodeConfig(values.country);

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

  const clearError = useCallback((field: keyof AddressErrors) => {
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const handleCepChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const formatted = postalConfig.format(e.target.value);
      onChange({ cep: formatted });
      clearError("cep");
      invalidateConfirm();

      // Lookup automático (ViaCEP) só existe pro Brasil. Estrangeiros digitam
      // o endereço manualmente.
      if (values.country !== "Brasil") {
        cepLookupSeq.current += 1;
        setLoadingCep(false);
        return;
      }

      const raw = formatted.replace(/\D/g, "");
      if (raw.length !== 8) {
        cepLookupSeq.current += 1;
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
    [onChange, invalidateConfirm, values.country, postalConfig, clearError]
  );

  const cepDigits = values.cep.replace(/\D/g, "");
  const showAddressRest = isForeign || cepDigits.length === 8;

  const handleConfirm = () => {
    const newErrors: AddressErrors = {};

    if (!values.country?.trim()) {
      newErrors.country = "Selecione o país.";
    }
    if (!postalConfig.isValid(values.cep)) {
      newErrors.cep = isForeign
        ? "Informe um código postal válido."
        : "Informe um CEP válido.";
    }
    if (!values.stateUf?.trim()) {
      newErrors.stateUf = isForeign
        ? "Informe o estado ou província."
        : "Selecione o estado.";
    }
    if (!values.street.trim()) {
      newErrors.street = "Informe a rua.";
    }
    if (!values.number.trim()) {
      newErrors.number = "Informe o número.";
    }
    // Bairro só é obrigatório no Brasil — estrangeiro não tem o campo.
    if (!isForeign && !values.neighborhood.trim()) {
      newErrors.neighborhood = "Informe o bairro.";
    }
    if (!values.city.trim()) {
      newErrors.city = "Informe a cidade.";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }

    setErrors({});
    onConfirmedChange(true);
    toast.success("Endereço confirmado.");
  };

  /* Campos pré-montados — facilita reordenar entre layouts (BR / estrangeiro)
   * mantendo as mesmas larguras (flex-1 / 136px) independente da posição. */
  const streetField = (
    <div className="flex flex-col gap-2 flex-1 min-w-[min(100%,280px)]">
      <FieldLabel>Rua</FieldLabel>
      <Input
        type="text"
        autoComplete="street-address"
        placeholder="Nome da sua rua"
        value={values.street}
        onChange={(e) => {
          onChange({ street: e.target.value });
          clearError("street");
          invalidateConfirm();
        }}
        aria-invalid={!!errors.street}
        className={inputClass}
      />
      {errors.street && <p className="text-sm text-red-11">{errors.street}</p>}
    </div>
  );

  const cityField = (
    <div className="flex flex-col gap-2 flex-1 min-w-[min(100%,200px)]">
      <FieldLabel>Cidade</FieldLabel>
      <Input
        type="text"
        autoComplete="address-level2"
        placeholder="Digite sua cidade"
        value={values.city}
        onChange={(e) => {
          onChange({ city: e.target.value });
          clearError("city");
          invalidateConfirm();
        }}
        aria-invalid={!!errors.city}
        className={inputClass}
      />
      {errors.city && <p className="text-sm text-red-11">{errors.city}</p>}
    </div>
  );

  const stateField = (
    <div className="flex flex-col gap-2 flex-1 min-w-[min(100%,280px)]">
      <FieldLabel>{isForeign ? "Estado/Província" : "Estado"}</FieldLabel>
      {isForeign ? (
        // Estrangeiro: texto livre — não existe lista de UFs fora do Brasil.
        <Input
          type="text"
          autoComplete="address-level1"
          placeholder="Estado ou província"
          value={values.stateUf}
          onChange={(e) => {
            onChange({ stateUf: e.target.value });
            clearError("stateUf");
            invalidateConfirm();
          }}
          aria-invalid={!!errors.stateUf}
          className={inputClass}
        />
      ) : (
        <Dropdown
          options={stateOptions}
          selectedIds={values.stateUf ? [values.stateUf] : []}
          onSelect={(opt) => {
            onChange({ stateUf: opt.id || "" });
            clearError("stateUf");
            invalidateConfirm();
          }}
          width="w-full"
          maxHeight="max-h-240"
          trigger={(isOpen) => (
            <button
              type="button"
              className={cn(selectTriggerClass, errors.stateUf && "border-red-11")}
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
      )}
      {errors.stateUf && <p className="text-sm text-red-11">{errors.stateUf}</p>}
    </div>
  );

  const numberField = (
    <div className="flex flex-col gap-2 w-full sm:w-[136px] shrink-0">
      <FieldLabel>Número</FieldLabel>
      <Input
        type="text"
        autoComplete="off"
        placeholder="Nº"
        value={values.number}
        onChange={(e) => {
          onChange({ number: e.target.value });
          clearError("number");
          invalidateConfirm();
        }}
        aria-invalid={!!errors.number}
        className={inputClass}
      />
      {errors.number && <p className="text-sm text-red-11">{errors.number}</p>}
    </div>
  );

  const complementField = (
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
  );

  const neighborhoodField = (
    <div className="flex flex-col gap-2 flex-1 min-w-[min(100%,280px)]">
      <FieldLabel>Bairro</FieldLabel>
      <Input
        type="text"
        placeholder="Digite seu bairro"
        value={values.neighborhood}
        onChange={(e) => {
          onChange({ neighborhood: e.target.value });
          clearError("neighborhood");
          invalidateConfirm();
        }}
        aria-invalid={!!errors.neighborhood}
        className={inputClass}
      />
      {errors.neighborhood && <p className="text-sm text-red-11">{errors.neighborhood}</p>}
    </div>
  );

  return (
    <div
      className={cn(
        "border border-gray-6 rounded-lg p-5 flex flex-col gap-6 w-full bg-gray-1",
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
                onChange({ country, cep: "", stateUf: "" });
                clearError("country");
                clearError("cep");
                clearError("stateUf");
                invalidateConfirm();
              }}
            />
            {errors.country && <p className="text-sm text-red-11">{errors.country}</p>}
          </div>
          <div className="flex flex-col gap-2 flex-1 min-w-[min(100%,280px)]">
            <FieldLabel>{postalConfig.label}</FieldLabel>
            <Input
              type="text"
              inputMode={postalConfig.inputMode}
              autoComplete="postal-code"
              placeholder={postalConfig.placeholder}
              value={values.cep}
              onChange={handleCepChange}
              aria-invalid={!!errors.cep}
              className={inputClass}
            />
            {loadingCep ? (
              <p className="text-sm text-gray-11 font-family-dm-sans">
                Buscando endereço...
              </p>
            ) : errors.cep ? (
              <p className="text-sm text-red-11">{errors.cep}</p>
            ) : !isForeign && cepDigits.length > 0 && cepDigits.length < 8 ? (
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
              {/* Linha 1: Rua + Cidade */}
              <div className="flex flex-wrap gap-x-3 gap-y-4 w-full">
                {stateField}
                {cityField}
              </div>

              {/* Linha 2: Estado + Complemento (BR) | Estado + Número (estrangeiro) */}
              <div className="flex flex-wrap gap-x-3 gap-y-4 w-full items-start">
                {streetField}
                {isForeign ? numberField : complementField}
              </div>

              {/* Linha 3: BR só — Bairro + Número (estrangeiro não tem bairro) */}
              {!isForeign && (
                <div className="flex flex-wrap gap-x-3 gap-y-4 w-full items-start">
                  {neighborhoodField}
                  {numberField}
                </div>
              )}
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
