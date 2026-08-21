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

export function PurchaseHeatmap({ data }: { data: PurchaseLocation[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

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
        <h3 className="font-manrope font-bold text-lg md:text-xl text-gray-12 leading-[1.1]">
          Mapa de calor de compras
        </h3>
        <p className="font-family-dm-sans text-sm text-gray-11">
        Veja no mapa de onde estão vindo as compras do seu evento.
        </p>
      </div>
      {visible ? <PurchaseHeatmapImpl data={data} /> : <MapSkeleton />}
    </div>
  );
}
