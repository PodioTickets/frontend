"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import type { PurchaseLocation } from "@/services/organizer/OrganizerService.types";

/**
 * Seção "Mapa de calor de compras" do dashboard.
 *
 * Duas camadas de lazy-load pra não pagar o custo do Google Maps em todo acesso:
 *  1. `next/dynamic` (ssr:false) — o código do mapa fica fora do bundle inicial.
 *  2. IntersectionObserver — o impl (e o SDK pago do Google) só monta quando a
 *     seção entra na viewport. Fiel à filosofia "sob demanda" do `useGoogleMaps`.
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
          Onde os compradores estão por cidade
        </p>
      </div>
      {visible ? <PurchaseHeatmapImpl data={data} /> : <MapSkeleton />}
    </div>
  );
}
