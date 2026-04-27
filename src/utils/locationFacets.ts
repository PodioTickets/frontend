const BRAZIL_UF_NAMES: Record<string, string> = {
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

export interface LocationFacetCity {
  apiValue: string;
  displayLabel: string;
}

export interface LocationFacetState {
  apiValue: string;
  displayLabel: string;
  cities: LocationFacetCity[];
}

/** Lista ordenada de estados brasileiros para selects de formulário. */
export const BRAZIL_STATES: { uf: string; name: string }[] = Object.entries(
  BRAZIL_UF_NAMES
)
  .map(([uf, name]) => ({ uf, name }))
  .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

/** Lookup inverso: nome completo (minúsculo) → sigla UF */
const BRAZIL_NAME_TO_UF: Record<string, string> = Object.fromEntries(
  Object.entries(BRAZIL_UF_NAMES).map(([uf, name]) => [name.toLowerCase(), uf])
);

function formatStateLabel(state: string): string {
  const t = state.trim();
  if (t.length === 2) {
    const uf = t.toUpperCase();
    if (BRAZIL_UF_NAMES[uf]) return BRAZIL_UF_NAMES[uf];
  }
  return t;
}

/**
 * Normaliza o valor do estado para a sigla UF canônica (ex: "São Paulo" → "SP").
 * Garante que dados inconsistentes no banco não gerem entradas duplicadas no picker.
 */
function normalizeStateKey(raw: string): string {
  const t = raw.trim();
  if (!t) return t;
  if (t.length === 2) {
    const uf = t.toUpperCase();
    return BRAZIL_UF_NAMES[uf] ? uf : t;
  }
  return BRAZIL_NAME_TO_UF[t.toLowerCase()] ?? t;
}

function rowState(row: Record<string, unknown>): string {
  const v = row.state ?? row.uf ?? row.code;
  return typeof v === "string" ? v.trim() : "";
}

function rowCity(row: Record<string, unknown>): string | null {
  const v = row.city;
  if (v == null || v === "") return null;
  const s = String(v).trim();
  return s || null;
}

function unwrapEnvelope(payload: unknown): unknown {
  let p: unknown = payload;
  for (let i = 0; i < 5 && p && typeof p === "object" && !Array.isArray(p); i++) {
    const o = p as Record<string, unknown>;
    if (!("data" in o) || o.data === undefined) break;
    p = o.data;
  }
  return p;
}

/** Normaliza corpo da API (vários formatos) para pares estado + cidade. */
export function normalizeSearchLocationsPayload(
  payload: unknown
): { state: string; city: string | null }[] {
  if (payload == null) return [];

  payload = unwrapEnvelope(payload);

  if (Array.isArray(payload)) {
    const out: { state: string; city: string | null }[] = [];
    for (const item of payload) {
      if (!item || typeof item !== "object") continue;
      const row = item as Record<string, unknown>;
      const st = rowState(row);
      if (!st) continue;
      out.push({ state: st, city: rowCity(row) });
    }
    return out;
  }

  if (typeof payload !== "object") return [];

  const obj = payload as Record<string, unknown>;

  const list =
    obj.locations ??
    obj.items ??
    obj.rows ??
    obj.data ??
    obj.results;
  if (Array.isArray(list)) {
    return normalizeSearchLocationsPayload(list);
  }

  const states = obj.states;
  if (Array.isArray(states)) {
    const out: { state: string; city: string | null }[] = [];
    for (const s of states) {
      if (!s || typeof s !== "object") continue;
      const rec = s as Record<string, unknown>;
      const st = rowState(rec);
      if (!st) continue;
      const citiesRaw = rec.cities ?? rec.cityList;
      if (Array.isArray(citiesRaw) && citiesRaw.length > 0) {
        for (const c of citiesRaw) {
          const cityStr =
            typeof c === "string"
              ? c.trim()
              : c && typeof c === "object" && "name" in c
                ? String((c as { name?: string }).name ?? "").trim()
                : String(c ?? "").trim();
          if (cityStr) out.push({ state: st, city: cityStr });
        }
      } else {
        out.push({ state: st, city: rowCity(rec) });
      }
    }
    return out;
  }

  const loneState = rowState(obj);
  if (loneState) {
    return [{ state: loneState, city: rowCity(obj) }];
  }

  return [];
}

/** Monta a árvore estado → cidades usada pelo filtro (valores iguais aos da API). */
export function aggregateLocationFacetPairs(
  pairs: ReadonlyArray<{ state: string; city?: string | null | undefined }>
): LocationFacetState[] {
  const map = new Map<string, { displayLabel: string; cities: Set<string> }>();

  for (const { state, city } of pairs) {
    const st = normalizeStateKey((state || "").trim());
    if (!st) continue;
    const ct = (city || "").trim();

    if (!map.has(st)) {
      map.set(st, {
        displayLabel: formatStateLabel(st),
        cities: new Set(),
      });
    }
    if (ct) {
      map.get(st)!.cities.add(ct);
    }
  }

  const result: LocationFacetState[] = [...map.entries()].map(
    ([apiValue, v]) => ({
      apiValue,
      displayLabel: v.displayLabel,
      cities: [...v.cities]
        .sort((a, b) => a.localeCompare(b, "pt-BR"))
        .map((c) => ({ apiValue: c, displayLabel: c })),
    })
  );

  result.sort((a, b) =>
    a.displayLabel.localeCompare(b.displayLabel, "pt-BR")
  );
  return result;
}
