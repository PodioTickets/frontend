"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { PurchaseLocation } from "@/services/organizer/OrganizerService.types";

/**
 * Mapa de CALOR de compras — Leaflet + leaflet.heat sobre tiles do OpenStreetMap
 * (aberto, sem chave). As coordenadas (lat/lng) vêm PRONTAS do BACKEND (cache
 * global de geocoding por bairro/cidade/UF) — o front NÃO geocodifica nada, só
 * plota → instantâneo. Locais ainda PENDENTES de geocoding no servidor vêm sem
 * lat/lng e aparecem numa carga seguinte.
 *
 * `leaflet.heat` é um plugin GLOBAL: registra `L.heatLayer` no `L` global
 * (bare `L` → `window.L`), não na instância ESM. Por isso setamos `window.L = L`
 * e importamos o plugin DINAMICAMENTE (imports estáticos são içados).
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

const BRAZIL_CENTER: [number, number] = [-14.235, -51.925];
const BRAZIL_ZOOM = 4;
const HEAT_MAX_ZOOM = 12;

export default function PurchaseHeatmapImpl({ data }: { data: PurchaseLocation[] }) {
  const mapElRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const heatRef = useRef<any>(null);
  const wheelHandlerRef = useRef<((e: WheelEvent) => void) | null>(null);

  // Só os locais que o backend já geocodificou (têm lat/lng).
  const located = useMemo(
    () => data.filter((d) => typeof d.lat === "number" && typeof d.lng === "number"),
    [data],
  );
  const dataKey = useMemo(
    () => located.map((d) => `${d.lat},${d.lng}:${d.purchases}`).join("|"),
    [located],
  );

  useEffect(() => {
    if (!mapElRef.current) return;
    let active = true;

    if (!mapRef.current) {
      mapRef.current = L.map(mapElRef.current, {
        center: BRAZIL_CENTER,
        zoom: BRAZIL_ZOOM,
        // Zoom por scroll nativo desligado: só habilitamos via Ctrl+scroll
        // (gesto cooperativo — ver `handleWheel` abaixo).
        scrollWheelZoom: false,
        // Controle padrão nasce no topo-esquerdo; recriamos no canto inferior direito.
        zoomControl: false,
        attributionControl: true,
      });
      L.control.zoom({ position: "bottomright" }).addTo(mapRef.current);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap",
        maxZoom: 19,
      }).addTo(mapRef.current);

      // Zoom cooperativo: rola a página normalmente, mas com Ctrl pressionado
      // (ou pinça de trackpad, que emite `ctrlKey`) faz zoom ancorado no cursor.
      const handleWheel = (e: WheelEvent) => {
        if (!e.ctrlKey || !mapRef.current) return;
        e.preventDefault();
        const delta = e.deltaY < 0 ? 1 : -1;
        mapRef.current.setZoomAround(
          mapRef.current.mouseEventToLatLng(e),
          mapRef.current.getZoom() + delta,
        );
      };
      // `passive: false` é obrigatório para o `preventDefault` valer no wheel.
      mapElRef.current.addEventListener("wheel", handleWheel, { passive: false });
      wheelHandlerRef.current = handleWheel;
    }
    // Container pode ter montado antes do layout → recalcula o tamanho.
    setTimeout(() => mapRef.current?.invalidateSize(), 60);

    const draw = async () => {
      if (located.length === 0) {
        if (heatRef.current) {
          mapRef.current.removeLayer(heatRef.current);
          heatRef.current = null;
        }
        return;
      }
      await ensureHeatPlugin();
      if (!active || !mapRef.current) return;

      const maxPurchases = Math.max(...located.map((d) => d.purchases), 1);
      const points = located.map((d) => [d.lat as number, d.lng as number, d.purchases]);

      if (heatRef.current) mapRef.current.removeLayer(heatRef.current);
      heatRef.current = (L as any)
        .heatLayer(points, {
          radius: 30,
          blur: 20,
          minOpacity: 0.45,
          maxZoom: HEAT_MAX_ZOOM,
          // `max` abaixo do pico (metade) = bairros de baixo volume ainda visíveis.
          max: Math.max(1, Math.ceil(maxPurchases / 2)),
        })
        .addTo(mapRef.current);

      const bounds = L.latLngBounds(points.map((p) => L.latLng(p[0], p[1])));
      mapRef.current.fitBounds(bounds.pad(0.2), { maxZoom: HEAT_MAX_ZOOM });
    };

    void draw();

    return () => {
      active = false;
    };
  }, [dataKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Destrói o mapa ao desmontar (evita "map container already initialized").
  useEffect(
    () => () => {
      if (wheelHandlerRef.current) {
        mapElRef.current?.removeEventListener("wheel", wheelHandlerRef.current);
        wheelHandlerRef.current = null;
      }
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

  // Há compras, mas nenhuma geocodificada ainda (fila do backend).
  const pending = located.length === 0;

  return (
    <div className="relative w-full">
      <div
        ref={mapElRef}
        className="h-[320px] md:h-[420px] w-full rounded-xl overflow-hidden bg-gray-3 z-0"
      />
      {pending && (
        <div className="absolute inset-0 z-[500] flex items-center justify-center rounded-xl bg-gray-1/70 px-6 text-center">
          <span className="text-sm font-medium text-gray-11 font-family-dm-sans">
            Localizando os bairros das compras… o mapa preenche automaticamente.
          </span>
        </div>
      )}
    </div>
  );
}
