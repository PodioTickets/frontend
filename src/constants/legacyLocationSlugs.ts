/** Slugs antigos do param `location` → valores usados na API (`state` / `city`). */
export const LEGACY_LOCATION_SLUG: Record<
  string,
  { state: string; city: string | null }
> = {
  "sao-paulo": { state: "SP", city: "São Paulo" },
  "rio-de-janeiro": { state: "RJ", city: "Rio de Janeiro" },
  "belo-horizonte": { state: "MG", city: "Belo Horizonte" },
  brasilia: { state: "DF", city: "Brasília" },
  curitiba: { state: "PR", city: "Curitiba" },
  "porto-alegre": { state: "RS", city: "Porto Alegre" },
  salvador: { state: "BA", city: "Salvador" },
  fortaleza: { state: "CE", city: "Fortaleza" },
  manaus: { state: "AM", city: "Manaus" },
  recife: { state: "PE", city: "Recife" },
  "sao-luis": { state: "MA", city: "São Luís" },
};

export function resolveLegacyLocationSlug(
  slug: string | null | undefined
): { state: string; city: string | null } | null {
  if (!slug) return null;
  return LEGACY_LOCATION_SLUG[slug] ?? null;
}
