"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import type { RevenueChartProps } from "./RevenueChartImpl";

// Chart.js + react-chartjs-2 ~200kb minified. Code-split para fora do bundle inicial
// das páginas de dashboard/financial: o gráfico só carrega no cliente após o primeiro paint.
// Skeleton mantém as mesmas dimensões do gráfico real para evitar layout shift.
const RevenueChartLazy = dynamic<RevenueChartProps>(
  () => import("./RevenueChartImpl").then((m) => m.RevenueChart),
  {
    ssr: false,
    loading: () => (
      <div
        className="relative h-[260px] md:h-[341px] w-full min-w-0 animate-pulse"
        aria-hidden="true"
      >
        <div className="absolute inset-0 ml-9 md:ml-[59px] mr-0 rounded bg-gray-3" />
      </div>
    ),
  }
) as ComponentType<RevenueChartProps>;

export const RevenueChart = RevenueChartLazy;
export type { RevenueChartProps };
