import { COUNTRIES_PT_BR } from "@/data/countries";

/**
 * Converte um valor de nacionalidade (gentílico ou nome do país) pro nome
 * canônico usado no select de nacionalidade (`COUNTRIES_PT_BR`).
 *
 * Necessário pq o backend pode persistir gentílico ("Brasileira") no campo
 * `country` enquanto o select trabalha com nome do país ("Brasil"). Sem
 * normalização, o `defaultValue` do dropdown cai no fallback hardcoded.
 *
 * - Variantes/gentílicos BR ("brasileira"/"brasileiro"/"brasil"/"brazil"/"br") → "Brasil"
 * - Match exato (case-insensitive) com `COUNTRIES_PT_BR` → nome canônico
 * - Demais valores → input trimado (preserva pra fluxos de input livre)
 *
 * As variantes BR cobertas aqui DEVEM ser um superconjunto das aceitas por
 * `isBrazilianCountry` (Auth.validator) — senão um mesmo valor é BR num fluxo e
 * estrangeiro noutro (CPF formatado vs cru, CEP vs fallback de endereço).
 */
const BR_VARIANTS = new Set(["brasileira", "brasileiro", "brasil", "brazil", "br"]);

export function normalizeNationality(value: string | undefined | null): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const lower = trimmed.toLowerCase();
  if (BR_VARIANTS.has(lower)) return "Brasil";
  const canonical = COUNTRIES_PT_BR.find((c) => c.toLowerCase() === lower);
  return canonical ?? trimmed;
}
