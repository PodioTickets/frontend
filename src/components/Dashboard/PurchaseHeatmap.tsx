"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import type { PurchaseLocation } from "@/services/organizer/OrganizerService.types";

/**
 * Seção "Mapa de calor de compras" do dashboard (Leaflet + leaflet.heat sobre
 * OpenStreetMap; geocoding por bairro via Nominatim — ver PurchaseHeatmapImpl).
 *
 * Duas camadas de lazy-load:
 *  1. `next/dynamic` (ssr:false) — o Leaflet (que precisa de `window`) e o código
 *     do mapa ficam fora do bundle inicial e do SSR.
 *  2. IntersectionObserver — o impl só monta quando a seção entra na viewport
 *     (não geocodifica nem baixa tiles até então).
 */

const PurchaseHeatmapImpl = dynamic(() => import("./PurchaseHeatmapImpl"), {
  ssr: false,
  loading: () => <MapSkeleton />,
});

function MapSkeleton() {
  return <div className="h-[320px] md:h-[420px] w-full rounded-xl bg-gray-3 animate-pulse" />;
}

export function PurchaseHeatmap({
  data,
  pending = 0,
}: {
  data: PurchaseLocation[];
  /** Bairros ainda sendo geocodificados no backend (mostra progresso; o mapa
   *  preenche em tempo real via WebSocket, sem recarregar). */
  pending?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  const located = data.filter(
    (d) => typeof d.lat === "number" && typeof d.lng === "number",
  ).length;

  useEffect(() => {
    const el = ref.current;
    if (!el || visible) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [visible]);

  return (
    <div
      ref={ref}
      className="bg-gray-2 border border-gray-6 rounded-xl p-4 md:p-5 flex flex-col gap-4 w-full"
    >
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-manrope font-bold text-lg md:text-xl text-gray-12 leading-[1.1]">
            Mapa de calor de compras
          </h3>
          {pending > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-3 px-2.5 py-0.5 text-xs font-medium text-yellow-12 font-family-dm-sans">
              <span className="size-1.5 rounded-full bg-yellow-9 animate-pulse" aria-hidden />
              Localizando bairros… {located} de {located + pending} no mapa
            </span>
          )}
        </div>
        <p className="font-family-dm-sans text-sm text-gray-11">
          Veja no mapa de onde estão vindo as compras do seu evento.
        </p>
      </div>
      {visible ? <PurchaseHeatmapImpl data={data} /> : <MapSkeleton />}
    </div>
  );
}
