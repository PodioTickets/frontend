import type { CountryCode } from "libphonenumber-js";
import { getCountryCodeFromName } from "@/utils/phone";

/**
 * Configuração de código postal por país.
 *
 * Cada país tem seu próprio formato de CEP/ZIP/CAP — formato de exibição,
 * máscara, comprimento e regra de validação mudam. Centralizamos aqui pra
 * que `CheckoutAddressSection` (input) e `PaymentStep` (payload) usem a MESMA
 * fonte de verdade — sem divergência entre o que o usuário digita, o que é
 * validado e o que vai pro backend.
 *
 * O país chega como nome PT-BR ("Brasil", "Argentina", "Estados Unidos") e é
 * resolvido pro código ISO ALPHA-2 via `getCountryCodeFromName` (mesmo helper
 * que alimenta máscara/validação de telefone), garantindo consistência.
 */
export interface PostalCodeConfig {
  /** Rótulo do campo na UI (ex.: "CEP", "ZIP Code", "CAP", "Código Postal"). */
  label: string;
  /** Placeholder de exemplo no formato do país. */
  placeholder: string;
  /** `inputMode` do input (teclado mobile): numérico ou texto (alfanumérico). */
  inputMode: "numeric" | "text";
  /**
   * Sanitiza + formata o valor cru conforme o usuário digita, JÁ limitando o
   * comprimento (o corte aqui é a única proteção de tamanho — não passamos
   * `maxLength` ao input pra não disparar o contador "x/y" do componente).
   */
  format: (raw: string) => string;
  /** Valida se o valor está completo e no formato esperado do país. */
  isValid: (value: string) => boolean;
  /** Normaliza o valor pro envio ao backend. */
  toBackend: (value: string) => string;
}

const onlyDigits = (s: string) => s.replace(/\D/g, "");

/** Máscara numérica simples: corta em `len` dígitos. */
function numericConfig(opts: {
  label: string;
  placeholder: string;
  len: number;
}): PostalCodeConfig {
  const { label, placeholder, len } = opts;
  return {
    label,
    placeholder,
    inputMode: "numeric",
    format: (raw) => onlyDigits(raw).slice(0, len),
    isValid: (value) => onlyDigits(value).length === len,
    toBackend: (value) => onlyDigits(value),
  };
}

/** Brasil — CEP 8 dígitos com máscara `00000-000`. */
const BR: PostalCodeConfig = {
  label: "CEP",
  placeholder: "00000-000",
  inputMode: "numeric",
  format: (raw) => {
    const d = onlyDigits(raw).slice(0, 8);
    return d.length <= 5 ? d : `${d.slice(0, 5)}-${d.slice(5)}`;
  },
  isValid: (value) => onlyDigits(value).length === 8,
  // Backend espera só os 8 dígitos pro Brasil (sem hífen).
  toBackend: (value) => onlyDigits(value),
};

/** Estados Unidos — ZIP 5 dígitos ou ZIP+4 (`12345` / `12345-6789`). */
const US: PostalCodeConfig = {
  label: "ZIP Code",
  placeholder: "12345",
  inputMode: "numeric",
  format: (raw) => {
    const d = onlyDigits(raw).slice(0, 9);
    return d.length <= 5 ? d : `${d.slice(0, 5)}-${d.slice(5)}`;
  },
  isValid: (value) => {
    const len = onlyDigits(value).length;
    return len === 5 || len === 9;
  },
  toBackend: (value) => value.trim(),
};

/**
 * Argentina — código postal antigo (4 dígitos) OU CPA novo `A####AAA`
 * (1 letra + 4 dígitos + 3 letras = 8 caracteres). Alfanumérico, maiúsculo.
 */
const AR: PostalCodeConfig = {
  label: "Código Postal (CPA)",
  placeholder: "C1425DDF",
  inputMode: "text",
  format: (raw) => raw.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 8),
  isValid: (value) => {
    const v = value.trim().toUpperCase();
    return /^\d{4}$/.test(v) || /^[A-Z]\d{4}[A-Z]{3}$/.test(v);
  },
  toBackend: (value) => value.trim().toUpperCase(),
};

/** Paraguai — 4 dígitos. */
const PY = numericConfig({ label: "Código Postal", placeholder: "1209", len: 4 });

/** Itália — CAP 5 dígitos. */
const IT = numericConfig({ label: "CAP", placeholder: "00100", len: 5 });

/** Uruguai — 5 dígitos. */
const UY = numericConfig({ label: "Código Postal", placeholder: "11000", len: 5 });

/**
 * Fallback pros demais países (não mapeados): texto livre, só exige não-vazio.
 * Mantém o comportamento histórico do checkout pra estrangeiros genéricos.
 */
const FALLBACK: PostalCodeConfig = {
  label: "Código Postal",
  placeholder: "Código postal",
  inputMode: "text",
  format: (raw) => raw.replace(/[^a-zA-Z0-9\s-]/g, "").slice(0, 16),
  isValid: (value) => value.trim().length > 0,
  toBackend: (value) => value.trim().replace(/\s+/g, " "),
};

const CONFIG_BY_ISO: Partial<Record<CountryCode, PostalCodeConfig>> = {
  BR,
  US,
  AR,
  PY,
  IT,
  UY,
};

/**
 * Resolve a config de código postal pelo nome do país em PT-BR.
 * Países fora da lista caem no `FALLBACK` (texto livre não-vazio).
 *
 * Retorna sempre a MESMA referência por país (objetos constantes de módulo),
 * então é seguro usar o resultado como dependência de `useCallback`/`useMemo`.
 */
export function getPostalCodeConfig(
  countryName: string | null | undefined,
): PostalCodeConfig {
  const iso = getCountryCodeFromName(countryName);
  return (iso && CONFIG_BY_ISO[iso]) || FALLBACK;
}
