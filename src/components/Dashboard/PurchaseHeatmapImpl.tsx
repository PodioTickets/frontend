"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

/**
 * `leaflet.heat` é um plugin GLOBAL: ele registra `L.heatLayer` no `L` global
 * (bare `L` → `window.L`), NÃO na instância importada por ESM. Então setamos
 * `window.L = L` e importamos o plugin DINAMICAMENTE (imports estáticos são
 * içados e rodariam antes do window.L). Assim o plugin augmenta a MESMA instância.
 */
let heatPluginPromise: Promise<void> | null = null;
async function ensureHeatPlugin(): Promise<void> {
  if ((L as any).heatLayer) return;
  if (!heatPluginPromise) {
    (window as any).L = L;
    heatPluginPromise = import("leaflet.heat").then(() => undefined);
  }
  await heatPluginPromise;
}
import type { PurchaseLocation } from "@/services/organizer/OrganizerService.types";

/**
 * Mapa de CALOR de compras — Leaflet + leaflet.heat sobre tiles do OpenStreetMap
 * (aberto, sem chave/sem custo). `leaflet.heat` é uma lib dedicada só a heatmap
 * (gradiente real por densidade + peso).
 *
 * O backend entrega compras agregadas por BAIRRO + cidade/UF (endereço de
 * cobrança). Geocodificamos cada bairro UMA vez via Nominatim (geocoder do OSM,
 * grátis) e guardamos o resultado no `localStorage` PERMANENTEMENTE (bairro não
 * muda de lugar; falhas viram `null` p/ não re-tentar). As buscas não-cacheadas
 * são serializadas com atraso ≥1s (política de uso do Nominatim).
 *
 * Carregado por `PurchaseHeatmap` (wrapper lazy + IntersectionObserver) → nada
 * disso pesa até a seção entrar na tela.
 */

const BRAZIL_CENTER: [number, number] = [-14.235, -51.925];
const BRAZIL_ZOOM = 4;

// Teto de bairros geocodificados no 1º load (os de maior volume dominam o calor;
// o backend já ordena desc). Evita dezenas de segundos de geocoding.
const MAX_GEOCODE = 150;
// Atraso entre geocodes NÃO cacheados (ms). Nominatim exige ≤1 req/s (política).
const GEOCODE_THROTTLE_MS = 1000;

// v2: v1 podia ter cacheado `null` de tentativas bloqueadas pela CSP (antes da
// liberação do Nominatim). Trocar a versão descarta esses nulls "envenenados".
const GEO_CACHE_KEY = "podio:geo:bairro:v2";

type LatLng = { lat: number; lng: number };
type GeoCache = Record<string, LatLng | null>;

const normalize = (s: string) =>
  s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/\s+/g, " ").trim();

const cacheKeyFor = (loc: PurchaseLocation) =>
  `${loc.neighborhood ? normalize(loc.neighborhood) : ""}|${normalize(loc.city)}|${loc.state ? normalize(loc.state) : ""}`;

const queryFor = (loc: PurchaseLocation) =>
  [loc.neighborhood, loc.city, loc.state, "Brasil"].filter(Boolean).join(", ");

function readGeoCache(): GeoCache {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(GEO_CACHE_KEY) ?? "{}") as GeoCache;
  } catch {
    return {};
  }
}

function writeGeoCache(cache: GeoCache) {
  try {
    window.localStorage.setItem(GEO_CACHE_KEY, JSON.stringify(cache));
  } catch {
    /* localStorage cheio/indisponível — segue sem cache persistente. */
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Uma consulta ao Nominatim. Retorna coord, null (sem resultado) ou lança (rede/CSP). */
async function geocodeQuery(q: string): Promise<LatLng | null> {
  const url =
    "https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=br&q=" +
    encodeURIComponent(q);
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) return null;
  const data = (await res.json()) as Array<{ lat: string; lon: string }>;
  const first = data?.[0];
  if (!first) return null;
  const lat = Number(first.lat);
  const lng = Number(first.lon);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}

/**
 * Geocodifica um local: tenta "bairro, cidade, UF"; se não achar (bairro
 * inexistente/dado sujo), cai pra "cidade, UF" — assim o ponto ainda aparece no
 * mapa (nível cidade) em vez de sumir. Retorna null só se nem a cidade resolver.
 * Propaga erro de REDE/CSP (o chamador distingue de "sem resultado").
 */
async function geocode(loc: PurchaseLocation): Promise<LatLng | null> {
  const withHood = await geocodeQuery(queryFor(loc));
  if (withHood) return withHood;
  if (loc.neighborhood) {
    await sleep(GEOCODE_THROTTLE_MS); // respeita ≤1 req/s do Nominatim
    return geocodeQuery([loc.city, loc.state, "Brasil"].filter(Boolean).join(", "));
  }
  return null;
}

export default function PurchaseHeatmapImpl({ data }: { data: PurchaseLocation[] }) {
  const mapElRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const heatRef = useRef<any>(null);
  const [phase, setPhase] = useState<"loading" | "geocoding" | "done">("loading");
  const [resolved, setResolved] = useState(0);
  const [noPoints, setNoPoints] = useState(false);
  const [networkError, setNetworkError] = useState(false);

  const dataKey = useMemo(
    () => data.map((d) => `${cacheKeyFor(d)}:${d.purchases}`).join(","),
    [data],
  );
  const totalToPlot = Math.min(data.length, MAX_GEOCODE);

  useEffect(() => {
    if (!mapElRef.current) return;
    let active = true;

    if (!mapRef.current) {
      mapRef.current = L.map(mapElRef.current, {
        center: BRAZIL_CENTER,
        zoom: BRAZIL_ZOOM,
        scrollWheelZoom: false,
        attributionControl: true,
      });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap",
        maxZoom: 19,
      }).addTo(mapRef.current);
    }
    // Container pode ter montado antes do layout → recalcula o tamanho.
    setTimeout(() => mapRef.current?.invalidateSize(), 60);

    const run = async () => {
      if (!data.length) {
        setPhase("done");
        return;
      }
      setPhase("geocoding");
      setResolved(0);

      // Garante que `L.heatLayer` exista (plugin global carregado no L importado).
      await ensureHeatPlugin();
      if (!active) return;

      const cache = readGeoCache();
      let cacheDirty = false;
      const points: Array<[number, number, number]> = [];
      const latlngs: L.LatLng[] = [];
      // `max` mais baixo que o pico (metade) + `minOpacity` alto = bairros de baixo
      // volume ainda visíveis. `maxZoom` do heat = zoom do fitBounds (senão o fator
      // de zoom da lib deixa os pontos quase transparentes em vistas afastadas).
      const maxPurchases = Math.max(...data.map((d) => d.purchases), 1);
      const HEAT_MAX_ZOOM = 12;
      let count = 0;

      // (re)cria a camada de calor vazia
      if (heatRef.current) mapRef.current.removeLayer(heatRef.current);
      heatRef.current = (L as any)
        .heatLayer([], {
          radius: 30,
          blur: 20,
          minOpacity: 0.45,
          maxZoom: HEAT_MAX_ZOOM,
          max: Math.max(1, Math.ceil(maxPurchases / 2)),
        })
        .addTo(mapRef.current);

      let networkError = false;
      for (const loc of data.slice(0, MAX_GEOCODE)) {
        if (!active) return;
        const key = cacheKeyFor(loc);
        let coord = cache[key];
        if (coord === undefined) {
          try {
            coord = await geocode(loc);
            cache[key] = coord; // só cacheia resultado real (achou/não achou); erro NÃO cacheia
            cacheDirty = true;
          } catch (e) {
            // Rede/CSP: NÃO cacheia (pra re-tentar depois) e sinaliza a causa.
            networkError = true;
            coord = null;
            // eslint-disable-next-line no-console
            console.warn("[PurchaseHeatmap] geocode falhou (rede/CSP):", (e as Error)?.message);
          }
          await sleep(GEOCODE_THROTTLE_MS);
        }
        if (!active) return;
        if (coord) {
          points.push([coord.lat, coord.lng, loc.purchases]);
          latlngs.push(L.latLng(coord.lat, coord.lng));
        }
        count += 1;
        setResolved(count);
      }

      // Desenha o heat UMA vez, no fim — durante o geocoding a sobreposição
      // "Localizando…" cobre o mapa, então redraw por ponto só desperdiçava
      // getImageData (warning "willReadFrequently") e CPU.
      if (points.length > 0) heatRef.current?.setLatLngs(points);

      if (cacheDirty) writeGeoCache(cache);
      if (!active) return;

      // Diagnóstico (remover depois): quantos bairros viraram ponto no mapa.
      // eslint-disable-next-line no-console
      console.log(
        `[PurchaseHeatmap] ${points.length}/${totalToPlot} bairros no mapa` +
          (networkError ? " — houve ERRO DE REDE/CSP no geocoding" : ""),
      );

      setNetworkError(networkError);
      setNoPoints(points.length === 0);
      if (latlngs.length > 0) {
        mapRef.current.fitBounds(L.latLngBounds(latlngs).pad(0.2), { maxZoom: HEAT_MAX_ZOOM });
      }
      setPhase("done");
    };

    void run();

    return () => {
      active = false;
    };
  }, [dataKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Destrói o mapa ao desmontar (evita "map container already initialized").
  useEffect(
    () => () => {
      mapRef.current?.remove();
      mapRef.current = null;
      heatRef.current = null;
    },
    [],
  );

  if (data.length === 0) {
    return (
      <p className="text-sm text-gray-11 font-family-dm-sans py-8 text-center">
        Ainda não há compras com endereço para exibir no mapa.
      </p>
    );
  }

  return (
    <div className="relative w-full">
      <div
        ref={mapElRef}
        className="h-[320px] md:h-[420px] w-full rounded-xl overflow-hidden bg-gray-3 z-0"
      />
      {phase === "geocoding" && (
        <div className="absolute inset-0 z-[500] flex items-center justify-center rounded-xl bg-gray-1/60 pointer-events-none">
          <span className="text-sm font-medium text-gray-11 font-family-dm-sans">
            Localizando bairros… ({resolved}/{totalToPlot})
          </span>
        </div>
      )}
      {phase === "done" && noPoints && (
        <div className="absolute inset-0 z-[500] flex items-center justify-center rounded-xl bg-gray-1/70 px-6 text-center">
          <span className="text-sm font-medium text-gray-11 font-family-dm-sans">
            {networkError
              ? "Erro de rede ao localizar os bairros. Tente recarregar."
              : "Não foi possível localizar os bairros das compras no mapa."}
          </span>
        </div>
      )}
    </div>
  );
}
