import { useState, useEffect } from "react";

export function useCitiesByState(uf: string) {
  const [cities, setCities] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!uf) {
      setCities([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(`/api/ibge/municipios?uf=${encodeURIComponent(uf)}`)
      .then((r) => r.json())
      .then((data: string[]) => {
        if (!cancelled) setCities(data);
      })
      .catch(() => {
        if (!cancelled) setCities([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [uf]);

  return { cities, loading };
}
