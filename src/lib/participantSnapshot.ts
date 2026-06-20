/**
 * Snapshot dos participantes do checkout (estado "salvo" persistido em
 * sessionStorage entre navegações dos steps). Extraído do `InformationStep`
 * (arquivo-monstro) para isolar a leitura SSR-safe e o shape do snapshot.
 */

/** Mapa por índice de participante do que foi salvo (dados + respostas). */
export type SavedSnapshotMap = Record<
  number,
  { participant: Record<string, string>; questionAnswers: Record<string, string | string[]> }
>;

/** Leitura SSR-safe de JSON do sessionStorage (estado "salvo" dos participantes). */
export function readSavedState<T>(key: string | null, fallback: T): T {
  if (typeof window === "undefined" || !key) return fallback;
  try {
    const raw = window.sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
