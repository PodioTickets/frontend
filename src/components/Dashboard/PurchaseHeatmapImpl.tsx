"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useMemo, useRef, useState } from "react";
import { useGoogleMaps } from "@/hooks/useGoogleMaps";
import type { PurchaseLocation } from "@/services/organizer/OrganizerService.types";

/**
 * Mapa de CALOR de compras (bolhas ponderadas sobre o Google Maps).
 *
 * O `HeatmapLayer` da lib `visualization` foi REMOVIDO do Maps JS API (a partir
 * da v3.65 dá "Heatmap Layer functionality is no longer available"). Em vez de
 * pinar uma versão antiga (frágil, some de vez) ou puxar deck.gl (pesado),
 * desenhamos o calor com `google.maps.Circle` vermelhos: raio e opacidade
 * escalam pelo nº de compras (raiz quadrada, pra a maior cidade não dominar a
 * área), e a SOBREPOSIÇÃO dos círculos semi-transparentes cria o efeito de
 * calor/concentração. Só usa API core estável — sem lib `visualization`.
 *
 * O backend entrega compras por cidade/UF (endereço de cobrança). O Google
 * precisa de lat/lng, então geocodificamos CADA cidade uma vez via
 * `google.maps.Geocoder` e guardamos no `localStorage` PERMANENTEMENTE (cidade
 * não muda de lugar; falhas viram `null` p/ não re-tentar). Buscas não-cacheadas
 * são serializadas com um pequeno atraso (rate limit do Geocoding).
 *
 * Carregado por `PurchaseHeatmap` (wrapper lazy + IntersectionObserver) → o SDK
 * pago do Google só é injetado quando a seção entra na tela.
 */

const BRAZIL_CENTER = { lat: -14.235, lng: -51.925 };
const BRAZIL_ZOOM = 4;

// Teto de cidades geocodificadas no 1º load (maior volume domina o calor). O
// backend já ordena desc por compras.
const MAX_GEOCODE = 150;
// Atraso entre geocodes NÃO cacheados (ms) — só afeta o 1º load de cada cidade.
const GEOCODE_THROTTLE_MS = 90;
// Raio (metros) das bolhas: piso + escala √(peso). Ajustado p/ visão nacional.
const MIN_RADIUS_M = 7000;
const MAX_RADIUS_M = 60000;

// v2: geocoding passou a ser estruturado (componentRestrictions por UF). Coords
// antigas (texto livre, podiam cair na UF errada) são descartadas ao trocar a versão.
const GEO_CACHE_KEY = "podio:geo:city:v2";

type LatLng = { lat: number; lng: number };
type GeoCache = Record<string, LatLng | null>;

const normalize = (s: string) =>
  s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/\s+/g, " ").trim();

const cacheKeyFor = (city: string, state?: string) =>
  `${normalize(city)}|${state ? normalize(state) : ""}`;

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

function geocodeCity(geocoder: any, city: string, state?: string): Promise<LatLng | null> {
  // Geocoding ESTRUTURADO: restringe por país (BR) e, quando houver, pela UF
  // (`administrativeArea`). Sem isso, cidades homônimas (ex.: "Bom Jesus" existe
  // em vários estados) resolvem pra UF errada e jogam um ponto fantasma no mapa.
  const componentRestrictions: any = { country: "BR" };
  if (state) componentRestrictions.administrativeArea = state;
  const request: any = { address: city, componentRestrictions, region: "BR" };
  return new Promise((resolve) => {
    geocoder.geocode(request, (results: any, gStatus: string) => {
      const loc = results?.[0]?.geometry?.location;
      if (gStatus === "OK" && loc) resolve({ lat: loc.lat(), lng: loc.lng() });
      else resolve(null);
    });
  });
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function PurchaseHeatmapImpl({ data }: { data: PurchaseLocation[] }) {
  const { status, google } = useGoogleMaps(true);
  const mapElRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const circlesRef = useRef<any[]>([]);
  const infoRef = useRef<any>(null);
  const [phase, setPhase] = useState<"idle" | "geocoding" | "done">("idle");
  const [resolved, setResolved] = useState(0);

  // Chave estável dos dados — evita re-rodar o efeito quando o array muda de
  // referência mas não de conteúdo.
  const dataKey = useMemo(
    () => data.map((d) => `${cacheKeyFor(d.city, d.state)}:${d.purchases}`).join(","),
    [data],
  );
  const totalToPlot = Math.min(data.length, MAX_GEOCODE);

  useEffect(() => {
    if (status !== "ready" || !google || !mapElRef.current) return;
    let active = true;

    // Mapa criado uma vez; reusado entre atualizações de dados.
    if (!mapRef.current) {
      mapRef.current = new google.maps.Map(mapElRef.current, {
        center: BRAZIL_CENTER,
        zoom: BRAZIL_ZOOM,
        // `maxZoom` é respeitado pelo `fitBounds` → cluster/1 cidade não estoura o
        // zoom sem precisar de clamp manual (que sofre race com o fitBounds).
        maxZoom: 13,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        clickableIcons: false,
        gestureHandling: "cooperative",
      });
    }
    if (!infoRef.current) infoRef.current = new google.maps.InfoWindow();

    // Limpa bolhas anteriores (mudança de período/filtro).
    for (const c of circlesRef.current) c.setMap(null);
    circlesRef.current = [];

    const maxPurchases = Math.max(...data.map((d) => d.purchases), 1);
    const radiusFor = (count: number) => {
      const t = Math.sqrt(count / maxPurchases); // 0..1
      return MIN_RADIUS_M + t * (MAX_RADIUS_M - MIN_RADIUS_M);
    };
    const opacityFor = (count: number) => {
      const t = Math.sqrt(count / maxPurchases);
      return 0.25 + t * 0.4; // 0.25..0.65 — sobreposição escurece (= mais quente)
    };

    const run = async () => {
      if (!data.length) {
        setPhase("done");
        return;
      }
      setPhase("geocoding");
      setResolved(0);

      const cache = readGeoCache();
      let cacheDirty = false;
      let count = 0;
      const bounds = new google.maps.LatLngBounds();
      const geo = new google.maps.Geocoder();

      for (const loc of data.slice(0, MAX_GEOCODE)) {
        if (!active) return;
        const key = cacheKeyFor(loc.city, loc.state);
        let coord = cache[key];
        if (coord === undefined) {
          coord = await geocodeCity(geo, loc.city, loc.state);
          cache[key] = coord;
          cacheDirty = true;
          await sleep(GEOCODE_THROTTLE_MS);
        }
        if (!active) return;
        // Diagnóstico (remover depois): cidade/UF → coord + nº de compras.
        // eslint-disable-next-line no-console
        console.log(
          `[PurchaseHeatmap] ${loc.city}/${loc.state ?? "?"} (${loc.purchases}) →`,
          coord,
        );
        if (coord) {
          const center = { lat: coord.lat, lng: coord.lng };
          const circle = new google.maps.Circle({
            map: mapRef.current,
            center,
            radius: radiusFor(loc.purchases),
            strokeWeight: 0,
            fillColor: "#EF4444",
            fillOpacity: opacityFor(loc.purchases),
            clickable: true,
          });
          const label = `${loc.city}${loc.state ? `/${loc.state}` : ""} — ${loc.purchases} ${
            loc.purchases === 1 ? "compra" : "compras"
          }`;
          circle.addListener("mouseover", () => {
            infoRef.current.setContent(
              `<div style="font-family:sans-serif;font-size:13px;color:#202020">${label}</div>`,
            );
            infoRef.current.setPosition(center);
            infoRef.current.open(mapRef.current);
          });
          circle.addListener("mouseout", () => infoRef.current.close());
          circlesRef.current.push(circle);
          bounds.extend(new google.maps.LatLng(center.lat, center.lng));
        }
        count += 1;
        setResolved(count);
      }

      if (cacheDirty) writeGeoCache(cache);
      if (!active) return;

      // Enquadra nas cidades resolvidas: quanto mais espalhadas, menos zoom
      // (comportamento natural do fitBounds). 1 cidade só → zoom fixo de cidade.
      //
      // IMPORTANTE: com as cidades já cacheadas (2ª visita+) o loop é síncrono e
      // o fitBounds rodaria ANTES do mapa medir o container → caía num zoom largo
      // (parecia "América do Sul inteira"). Por isso reaplicamos: agora, no
      // próximo frame (pós-layout) e no 1º `idle` do mapa. Chamar fitBounds N
      // vezes é idempotente.
      const single = bounds.getNorthEast().equals(bounds.getSouthWest());
      const fitToPoints = () => {
        if (!active || !mapRef.current || circlesRef.current.length === 0) return;
        // Força o mapa a reler o tamanho do container — se ele montou antes do
        // layout assentar (2ª visita, cache → tudo síncrono), o `fitBounds` cairia
        // num zoom largo (parecia "América do Sul"). O resize corrige a medição.
        google.maps.event.trigger(mapRef.current, "resize");
        if (single) {
          // Uma única cidade (ou todas no mesmo ponto): fitBounds daria zoom máx.
          mapRef.current.setCenter(bounds.getCenter());
          mapRef.current.setZoom(11);
        } else {
          mapRef.current.fitBounds(bounds, 56);
        }
      };
      if (circlesRef.current.length > 0) {
        // Enquadra no 1º `idle` do mapa (garante container medido) + retentativas
        // escalonadas até o layout assentar. `fitBounds` é idempotente.
        google.maps.event.addListenerOnce(mapRef.current, "idle", fitToPoints);
        for (const ms of [80, 300, 700, 1500]) setTimeout(fitToPoints, ms);
      }
      setPhase("done");
    };

    void run();

    return () => {
      active = false;
    };
  }, [status, google, dataKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Limpeza ao desmontar.
  useEffect(
    () => () => {
      for (const c of circlesRef.current) c.setMap(null);
      circlesRef.current = [];
      infoRef.current?.close();
    },
    [],
  );

  if (status === "no-key") {
    return (
      <p className="text-sm text-gray-11 font-family-dm-sans py-8 text-center">
        Mapa indisponível — chave do Google Maps não configurada.
      </p>
    );
  }
  if (status === "error") {
    return (
      <p className="text-sm text-gray-11 font-family-dm-sans py-8 text-center">
        Não foi possível carregar o mapa. Tente novamente mais tarde.
      </p>
    );
  }
  if (status === "ready" && data.length === 0) {
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
        className="h-[320px] md:h-[420px] w-full rounded-xl overflow-hidden bg-gray-3"
      />
      {(status !== "ready" || phase === "geocoding") && (
        <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-gray-1/60 pointer-events-none">
          <span className="text-sm font-medium text-gray-11 font-family-dm-sans">
            {status !== "ready"
              ? "Carregando mapa…"
              : `Localizando cidades… (${resolved}/${totalToPlot})`}
          </span>
        </div>
      )}
    </div>
  );
}
