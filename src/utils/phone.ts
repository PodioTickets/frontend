import {
  AsYouType,
  getCountryCallingCode,
  getExampleNumber,
  isValidPhoneNumber,
  parsePhoneNumberFromString,
  type CountryCode,
  type Examples,
} from "libphonenumber-js";
/* Importa o JSON direto em vez de `libphonenumber-js/mobile/examples`
 * (este último envolve interop CJS/ESM que retorna `{ default }` em vez
 * do objeto de exemplos, quebrando `getExampleNumber`). */
import examplesRaw from "libphonenumber-js/examples.mobile.json";
import countries from "i18n-iso-countries";
import ptLocale from "i18n-iso-countries/langs/pt.json";

/* Normaliza interop default: bundlers do Next.js às vezes envolvem o JSON
 * em `{ default: ... }` e às vezes não. Pega o que existir. */
const examples = (
  (examplesRaw as unknown as { default?: Examples }).default ?? examplesRaw
) as Examples;

/**
 * Helpers de formatação/validação de telefone por país.
 *
 * Usa `libphonenumber-js` (algoritmos do Google) pra cobrir TODOS os países
 * do mundo com máscara nacional, validação real e placeholder de exemplo.
 * `i18n-iso-countries` resolve o nome em PT-BR ("Brasil", "Estados Unidos")
 * pro código ISO ALPHA-2 ("BR", "US") que a libphonenumber espera.
 *
 * Importação seletiva: `libphonenumber-js/mobile/examples` é a versão
 * tree-shaked com SÓ exemplos mobile (~50KB), não a `max` (~700KB).
 *
 * Backend: sempre envia dígitos limpos. Pra estrangeiros incluímos o DDI
 * (ex.: BR "11999990000" / US "12025550100") via `getDigitsForBackend`.
 * Brasileiros mantém comportamento histórico (11 dígitos sem DDI), pra não
 * quebrar registros legados.
 */

let localeRegistered = false;
function ensureLocale() {
  if (localeRegistered) return;
  countries.registerLocale(ptLocale);
  localeRegistered = true;
}

/**
 * Override manual de nomes em PT-BR que a `i18n-iso-countries` não resolve
 * (a lib usa nomenclatura PT-PT — "Vietname", "Mianmar (Birmânia)", etc.).
 *
 * Como decisão arquitetural: manter a lista de países em PT-BR (`COUNTRIES_PT_BR`)
 * intacta — ela é a fonte de verdade pra UX. Os aliases ficam isolados aqui.
 *
 * Cobre todos os países da lista atual que falhavam no mapping. Auditável via
 * script no `/tmp` (rodado em 2026-05-22).
 */
const PT_BR_ALIASES: Record<string, string> = {
  "Armênia": "AM",
  "Barém": "BH",
  "Bósnia e Herzegovina": "BA",
  "Brasil": "BR",
  "Catar": "QA",
  "Estados Unidos": "US",
  "Reino Unido": "GB",
  "Djibuti": "DJ",
  "Eslovênia": "SI",
  "Estônia": "EE",
  "Iêmen": "YE",
  "Irã": "IR",
  "Letônia": "LV",
  "Macedônia do Norte": "MK",
  "Mianmar": "MM",
  "Mônaco": "MC",
  "Palestina": "PS",
  "Polônia": "PL",
  "Quênia": "KE",
  "Romênia": "RO",
  "São Cristóvão e Nevis": "KN",
  "Seicheles": "SC",
  "Trinidad e Tobago": "TT",
  "Turcomenistão": "TM",
  "Vaticano": "VA",
  "Vietnã": "VN",
};

/**
 * Resolve nome do país em PT-BR pro código ISO ALPHA-2.
 * `null` quando não encontrado (ex.: string vazia, lista divergente).
 *
 * Helper memoizado pra evitar lookup repetido em cada keystroke.
 */
const codeCache = new Map<string, CountryCode | null>();

export function getCountryCodeFromName(
  countryName: string | null | undefined,
): CountryCode | null {
  ensureLocale();
  const key = (countryName || "").trim();
  if (!key) return null;
  if (codeCache.has(key)) return codeCache.get(key)!;

  // 1) Override manual pros nomes PT-BR que a lib não resolve (Vietnã, Catar, etc.)
  let code: string | undefined = PT_BR_ALIASES[key];

  // 2) Tenta direto (case-sensitive) e depois case-insensitive
  if (!code) code = countries.getAlpha2Code(key, "pt") as string | undefined;
  if (!code) {
    code = countries.getAlpha2Code(key.toLowerCase(), "pt") as string | undefined;
  }
  // 3) Fallback: tenta inglês (alguns nomes coincidem — ex.: "Singapore"/"Singapura"
  //    a lib aceita em ambos, mas pra outros nomes raros é o último recurso).
  if (!code) {
    code = countries.getAlpha2Code(key, "en") as string | undefined;
  }

  const result = (code as CountryCode) || null;
  codeCache.set(key, result);
  return result;
}

/**
 * Formata o input do usuário conforme ele digita, usando a máscara nacional
 * do país. SEMPRE remove o DDI (código internacional, `+55` / `+1` / etc.)
 * antes de aplicar a máscara — usuário digita só os dígitos nacionais, mesmo
 * quando cola/digita o DDI por engano.
 *
 * Ex.: BR "11999990000"      → "(11) 99999-0000"
 *      BR "+5511999990000"   → "(11) 99999-0000"  (DDI extraído)
 *      BR "5511999990000"    → "(11) 99999-0000"  (DDI sem `+` removido)
 *      US "2025550100"       → "(202) 555-0100"
 *      US "12025550100"      → "(202) 555-0100"   (DDI `1` removido — NANP)
 *      PT "351912345678"     → "912 345 678"
 *
 * Quando o país não é mapeado (sem ISO), retorna só dígitos limpos.
 */
export function formatPhoneForCountry(
  value: string,
  countryName: string | null | undefined,
): string {
  const isoCode = getCountryCodeFromName(countryName);
  if (!isoCode) return value.replace(/\D/g, "");

  /* Pega só os dígitos nacionais — se o user colou com `+55` ou `+1`,
   * `parsePhoneNumberFromString` extrai o nationalNumber. Sem DDI no input,
   * formatNational do AsYouType fica padronizado por país. */
  let nationalDigits = value.replace(/\D/g, "");
  if (value.includes("+")) {
    try {
      const parsed = parsePhoneNumberFromString(value, isoCode);
      if (parsed?.nationalNumber) {
        nationalDigits = String(parsed.nationalNumber);
      }
    } catch {
      /* ignora — segue com os dígitos brutos */
    }
  }

  const maxDigits = exampleDigitsLengthForCountry(isoCode);

  /* Remove DDI/CC do começo dos dígitos quando inadvertidamente digitado/colado.
   * Sem isso, AsYouType "consome" o CC e formata exibindo-o (`1 (313) 131-31`,
   * `55 11 96123 4567`) — o user espera sempre o formato nacional puro
   * (`(313) 131-3131`, `(11) 96123-4567`).
   *
   * Critérios pra strip:
   * - NANP (CC=1, US/Canada/Caribbean): número nacional NUNCA começa com `1`
   *   (área code começa em 2-9), então `1` inicial é sempre DDI. Strip seguro.
   * - Outros países: só strip quando o total excede `maxDigits` — sinal claro
   *   de DDI duplicado. Evita falso positivo em BR (área 55 PE, área 11 SP). */
  const callingCode = (() => {
    try {
      return getCountryCallingCode(isoCode);
    } catch {
      return "";
    }
  })();

  if (callingCode && nationalDigits.startsWith(callingCode)) {
    const exceedsMax = maxDigits > 0 && nationalDigits.length > maxDigits;
    const isNanp = callingCode === "1" && nationalDigits.length >= 2;
    if (exceedsMax || isNanp) {
      nationalDigits = nationalDigits.slice(callingCode.length);
    }
  }

  /* Limita ao tamanho do placeholder do país — evita digitar a mais. */
  if (maxDigits > 0 && nationalDigits.length > maxDigits) {
    nationalDigits = nationalDigits.slice(0, maxDigits);
  }

  /* `AsYouType` formata conforme digita — comportamento estilo Stripe.
   * Try/catch defensivo: alguns ambientes (bundlers/Node sem interop CJS/ESM
   * correto) podem fazer `new AsYouType()` lançar por causa de metadata
   * malformada. Nesse caso retorna o valor cru pra não bloquear o input. */
  let formatted: string;
  try {
    formatted = new AsYouType(isoCode).input(nationalDigits) || nationalDigits;
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[phone] AsYouType falhou pra", isoCode, err);
    }
    formatted = nationalDigits;
  }

  /* Fallback: AsYouType só formata prefixos válidos do país (ex.: CM aceita
   * `2` fixo e `6/7` móvel — `3...` retorna dígitos crus sem máscara). Pra
   * garantir feedback visual consistente durante digitação, aplica máscara
   * baseada no template do placeholder quando AsYouType não formatou. */
  if (nationalDigits.length > 0 && !HAS_SEPARATOR_RE.test(formatted)) {
    const placeholder = getPhonePlaceholderForCountry(countryName);
    if (placeholder && HAS_SEPARATOR_RE.test(placeholder)) {
      return applyTemplateMask(nationalDigits, placeholder);
    }
  }

  return formatted;
}

/* Detecta se a string tem algum caractere não-dígito (espaço, parêntese, hífen).
 * Usado pra decidir se AsYouType aplicou máscara ou retornou dígitos crus. */
const HAS_SEPARATOR_RE = /\D/;

/**
 * Aplica máscara baseada em template, preservando separadores do template
 * e substituindo posições de dígitos pelos dígitos do input.
 *
 * Ex.: digits="3333333", template="6 71 23 45 67" → "3 33 33 33"
 *      digits="20155", template="(201) 555-0123" → "(201) 55"
 */
function applyTemplateMask(digits: string, template: string): string {
  let out = "";
  let digitIndex = 0;
  for (const ch of template) {
    if (digitIndex >= digits.length) break;
    if (ch >= "0" && ch <= "9") {
      out += digits[digitIndex++];
    } else {
      out += ch;
    }
  }
  /* Se o input tem mais dígitos que o template (shouldn't happen por causa
   * do `maxDigits` slice), anexa o restante cru. */
  if (digitIndex < digits.length) {
    out += digits.slice(digitIndex);
  }
  return out;
}

/* Quantidade de dígitos nacionais do exemplo do país — usado pra cortar
 * o input antes de formatar (evita o user digitar números maiores que o
 * padrão do país, mesmo que a máscara aceite). */
const exampleDigitsCache = new Map<CountryCode, number>();
function exampleDigitsLengthForCountry(isoCode: CountryCode): number {
  if (exampleDigitsCache.has(isoCode)) return exampleDigitsCache.get(isoCode)!;
  try {
    const example = getExampleNumber(isoCode, examples);
    const digits = example ? String(example.nationalNumber).length : 0;
    exampleDigitsCache.set(isoCode, digits);
    return digits;
  } catch {
    exampleDigitsCache.set(isoCode, 0);
    return 0;
  }
}

/**
 * Placeholder de exemplo formatado pra mostrar como deve digitar.
 *
 * Ex.: BR "(11) 91234-5678", US "(201) 555-0123", PT "912 345 678".
 *
 * Fallback "(00) 99999-9999" quando o país não tem exemplo na base mobile.
 */
const placeholderCache = new Map<string, string>();

export function getPhonePlaceholderForCountry(
  countryName: string | null | undefined,
): string {
  const isoCode = getCountryCodeFromName(countryName);
  if (!isoCode) return "(00) 99999-9999";
  if (placeholderCache.has(isoCode)) return placeholderCache.get(isoCode)!;

  try {
    const example = getExampleNumber(isoCode, examples);
    if (!example) {
      placeholderCache.set(isoCode, "(00) 99999-9999");
      return "(00) 99999-9999";
    }
    const formatted = example.formatNational();
    placeholderCache.set(isoCode, formatted);
    return formatted;
  } catch {
    return "(00) 99999-9999";
  }
}

/**
 * Tamanho máximo do input formatado pra o país (`maxLength` do input).
 * Igual ao comprimento exato do placeholder do país — formato padronizado
 * sem folga. Combinado com o corte em `formatPhoneForCountry`, garante que
 * o user não digite além do padrão nacional.
 */
export function getPhoneMaxLengthForCountry(
  countryName: string | null | undefined,
): number {
  const placeholder = getPhonePlaceholderForCountry(countryName);
  return placeholder.length;
}

/**
 * Dígitos limpos pra enviar ao backend.
 *
 * Brasileiros: 11 dígitos sem DDI (compat retroativo com registros antigos
 * que nunca tiveram DDI).
 * Estrangeiros: número nacional completo incluindo dígitos do DDI quando
 * `withDdi=true` (default `false` — backend hoje espera nacional).
 */
export function getPhoneDigitsForBackend(
  value: string,
  countryName: string | null | undefined,
): string {
  if (!value) return "";
  const isoCode = getCountryCodeFromName(countryName);
  if (!isoCode) return value.replace(/\D/g, "");

  // Parse normalizado pra extrair só os dígitos nacionais.
  try {
    const parsed = parsePhoneNumberFromString(value, isoCode);
    if (parsed) return parsed.nationalNumber as string;
  } catch {
    // ignore
  }
  return value.replace(/\D/g, "");
}

/**
 * Valida número conforme regras do país (length, prefixos, área codes).
 * `true` quando válido OU quando o país não é mapeado (não bloqueia).
 */
export function isPhoneValidForCountry(
  value: string,
  countryName: string | null | undefined,
): boolean {
  if (!value?.trim()) return false;
  const isoCode = getCountryCodeFromName(countryName);
  if (!isoCode) {
    // Sem ISO: aceita qualquer string com 6+ dígitos
    return value.replace(/\D/g, "").length >= 6;
  }
  try {
    return isValidPhoneNumber(value, isoCode);
  } catch {
    return false;
  }
}
