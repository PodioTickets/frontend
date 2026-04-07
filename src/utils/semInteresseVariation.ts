/**
 * Variação de opt-out do kit pelo nome (ex.: «Sem interesse», «S/interesse»).
 * Usada no checkout (não cobrar) e na prévia do modal de produto (não listar).
 */
export function normalizeVariationNameForMatch(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ");
}

export function isSemInteresseVariation(variation: { name: string }): boolean {
  const n = normalizeVariationNameForMatch(variation.name);
  if (!n) return false;
  if (n.includes("sem interesse")) return true;
  if (/^s[.\s/]*interesse\b/.test(n)) return true;
  if (n.includes("nao tenho interesse")) return true;
  return false;
}
