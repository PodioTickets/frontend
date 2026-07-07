"use client";

import { useEffect, useState } from "react";

/**
 * Carregamento SOB DEMANDA do Google Maps JavaScript API.
 *
 * Filosofia:
 * - O script (≈pesado, cobrado por carregamento de mapa) só é injetado quando
 *   `enabled` vira `true` — i.e. quando o organizador ABRE o seletor de local.
 *   Nenhuma página que apenas monta o formulário paga o custo.
 * - Um único <script> por documento: a Promise é memoizada em escopo de módulo
 *   (singleton), então N modais/reaberturas compartilham a mesma carga.
 * - Falha de rede / chave ausente são estados explícitos ('error'/'no-key') para
 *   o componente degradar graciosamente em vez de quebrar.
 *
 * Segurança: a chave é `NEXT_PUBLIC_...` (pública por natureza no client). A
 * proteção correta é feita no Google Cloud (restrição por HTTP referrer +
 * APIs habilitadas), NUNCA por ocultação da chave.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GoogleNamespace = any;

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

/** `places` habilita a busca por endereço (Autocomplete). */
const LIBRARIES = "places";
const CALLBACK_NAME = "__podioGoogleMapsReady";

export type GoogleMapsStatus =
  | "no-key" // NEXT_PUBLIC_GOOGLE_MAPS_API_KEY não configurada
  | "idle" // ainda não solicitado (enabled === false)
  | "loading"
  | "ready"
  | "error";

// Singleton: memoiza a carga entre montagens/reaberturas do modal.
let loaderPromise: Promise<GoogleNamespace> | null = null;

function loadGoogleMaps(): Promise<GoogleNamespace> {
  if (loaderPromise) return loaderPromise;

  loaderPromise = new Promise<GoogleNamespace>((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("Google Maps só carrega no client"));
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    if (w.google?.maps) {
      resolve(w.google);
      return;
    }

    // Reaproveita um <script> já injetado (ex.: HMR / StrictMode double-mount).
    const existing = document.getElementById(
      "google-maps-js",
    ) as HTMLScriptElement | null;

    w[CALLBACK_NAME] = () => {
      if (w.google?.maps) resolve(w.google);
      else reject(new Error("Google Maps carregou sem o namespace maps"));
    };

    if (existing) {
      // Se já resolveu antes de anexarmos o callback, o guard acima cobre.
      if (w.google?.maps) resolve(w.google);
      return;
    }

    const script = document.createElement("script");
    script.id = "google-maps-js";
    script.async = true;
    // `loading=async` + callback = padrão recomendado (sem warning de perf).
    // `language`/`region` PT-BR para rótulos e viés de busca no Brasil.
    script.src =
      `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(API_KEY)}` +
      `&libraries=${LIBRARIES}&loading=async&language=pt-BR&region=BR` +
      `&callback=${CALLBACK_NAME}`;
    script.onerror = () => {
      // Permite nova tentativa numa próxima abertura.
      loaderPromise = null;
      reject(new Error("Falha ao carregar o Google Maps"));
    };
    document.head.appendChild(script);
  });

  return loaderPromise;
}

/**
 * @param enabled dispara a carga quando `true` (tipicamente: modal aberto).
 * @returns status da carga + o namespace `google` quando pronto.
 */
export function useGoogleMaps(enabled: boolean): {
  status: GoogleMapsStatus;
  google: GoogleNamespace | null;
} {
  const [status, setStatus] = useState<GoogleMapsStatus>(
    API_KEY ? "idle" : "no-key",
  );
  const [google, setGoogle] = useState<GoogleNamespace | null>(null);

  useEffect(() => {
    if (!enabled || !API_KEY) return;

    let active = true;
    // Sem setState SÍNCRONO no corpo do efeito (regra react-hooks/set-state-in-effect
    // + evita cascading renders): a transição de estado ocorre só nos callbacks
    // ASSÍNCRONOS da Promise. Enquanto isso o status permanece "idle" — que o
    // consumidor (modal) já renderiza como "carregando" (qualquer status ≠ ready).
    // `loadGoogleMaps()` resolve na 1ª microtask se o SDK já estiver presente.
    loadGoogleMaps()
      .then((g) => {
        if (!active) return;
        setGoogle(g);
        setStatus("ready");
      })
      .catch(() => {
        if (!active) return;
        setStatus("error");
      });

    return () => {
      active = false;
    };
  }, [enabled]);

  return { status, google };
}

/** `true` quando há chave configurada (para decidir se mostra o botão de mapa). */
export function hasGoogleMapsApiKey(): boolean {
  return API_KEY.length > 0;
}
