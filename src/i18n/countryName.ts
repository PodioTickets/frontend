import { COUNTRIES_PT_BR } from "@/data/countries";
import { getCountryCodeFromName } from "@/utils/phone";

const displayNames = new Map<string, Intl.DisplayNames>();

/**
 * Nome do país NA TELA a partir do valor salvo (sempre pt-BR, ex.: "Brasil" — é o que o
 * backend/telefone/CPF esperam). Tradução via ISO (`getCountryCodeFromName`) +
 * `Intl.DisplayNames` nativo: sem dicionário extra no bundle. pt-BR ou sem ISO → o próprio valor.
 */
export function countryDisplayName(ptName: string | null | undefined, intl: string): string {
  const name = ptName ?? "";
  if (!name || intl.startsWith("pt")) return name;
  const code = getCountryCodeFromName(name);
  if (!code) return name;
  let dn = displayNames.get(intl);
  if (!dn) {
    dn = new Intl.DisplayNames([intl], { type: "region" });
    displayNames.set(intl, dn);
  }
  return dn.of(code) ?? name;
}

export type CountryOption = { id: string; label: string; display: string };

const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");

/**
 * Opções dos seletores de nacionalidade/país: `label` = valor salvo (pt-BR), `display` = texto
 * mostrado. Brasil continua primeiro; o resto é reordenado pelo nome traduzido.
 */
export function countryOptions(intl: string): CountryOption[] {
  const [first, ...rest] = COUNTRIES_PT_BR.map((name) => ({
    id: normalize(name).replace(/\s+/g, "-"),
    label: name,
    display: countryDisplayName(name, intl),
  }));
  if (intl.startsWith("pt")) return [first, ...rest];
  return [first, ...rest.sort((a, b) => a.display.localeCompare(b.display, intl))];
}

/** Busca casa o nome traduzido OU o pt-BR (quem digita "Alemanha" no inglês também acha). */
export function countryMatches(option: CountryOption, query: string): boolean {
  const q = normalize(query);
  return normalize(option.display).includes(q) || normalize(option.label).includes(q);
}
