import { useEffect, useState } from "react";

export interface BrowserGeoCoords {
  lat: number;
  lng: number;
}

interface BrowserGeolocationState {
  /** Coordenadas precisas do usuário, ou null enquanto não resolve/negado. */
  coords: BrowserGeoCoords | null;
  /** true quando a tentativa terminou (sucesso, negação, timeout ou indisponível). */
  settled: boolean;
}

/**
 * Localização PRECISA do usuário via `navigator.geolocation` (com permissão do
 * browser). Usada para centralizar o mapa de seleção de local ao CRIAR um evento
 * — muito mais precisa que o fallback por IP (`useIpLocation`, que resolve só a
 * cidade do provedor e costuma "cair" em outro lugar).
 *
 * `enabled` liga a busca só quando faz sentido (fluxo de criação, sem local já
 * escolhido, mapa habilitado). Só dispara UMA vez por montagem. Se o usuário
 * negar, o browser não suportar ou estourar o timeout, retorna `settled=true`
 * com `coords=null` → o caller cai no fallback por IP.
 */
export function useBrowserGeolocation(enabled: boolean): BrowserGeolocationState {
  const [coords, setCoords] = useState<BrowserGeoCoords | null>(null);
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    // SSR / browser sem suporte → resolve como "sem coords" (usa fallback). Defere
    // o setState (queueMicrotask) para não atualizar estado síncrono no effect.
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      queueMicrotask(() => {
        if (!cancelled) setSettled(true);
      });
      return () => {
        cancelled = true;
      };
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (cancelled) return;
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setSettled(true);
      },
      () => {
        // Negado / indisponível / timeout → caller usa o fallback por IP.
        if (cancelled) return;
        setSettled(true);
      },
      // Precisão de cidade basta para centralizar; low-accuracy é mais rápido e
      // aceita cache recente (evita novo fix caro se acabou de localizar).
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 5 * 60 * 1000 },
    );

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return { coords, settled };
}
