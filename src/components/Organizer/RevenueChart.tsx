"use client";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { useState, useRef, useCallback, useMemo, useEffect } from "react";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const MAX_LABELS_MOBILE = 6;
const MAX_LABELS_DESKTOP = 8;

/** Um ponto do tooltip: valores em reais e quantidade inteira. */
type RevenueChartTooltipBucket = {
  revenueReais: number;
  quantity: number;
};

interface RevenueChartProps {
  data?: {
    labels: string[];
    /** Valores do eixo Y em reais (como já enviado pelo dashboard). */
    revenue: number[];
    /** Série alinhada por índice com labels/revenue (dados do dia/período na API). */
    dailyData?: unknown[];
  };
}

function normalizeDailyPoint(raw: unknown): {
  confirmedRevenueReais: number;
  canceledRevenueReais: number;
  refundedRevenueReais: number;
  confirmedQty: number;
  canceledQty: number;
  refundedQty: number;
} | null {
  if (raw == null || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const num = (v: unknown) => {
    const n = typeof v === "number" ? v : Number(String(v ?? "").replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  };
  const centsToReais = (v: unknown) => num(v) / 100;

  return {
    confirmedRevenueReais: centsToReais(
      r.revenue ?? r.confirmedRevenue ?? r.confirmed_revenue ?? 0,
    ),
    canceledRevenueReais: centsToReais(
      r.canceledRevenue ?? r.canceled_revenue ?? r.cancelledRevenue ?? 0,
    ),
    refundedRevenueReais: centsToReais(
      r.refundedRevenue ?? r.refunded_revenue ?? r.refundRevenue ?? 0,
    ),
    confirmedQty: Math.max(0, Math.floor(num(r.confirmed ?? r.confirmed_count ?? 0))),
    canceledQty: Math.max(
      0,
      Math.floor(num(r.canceled ?? r.cancelled ?? r.canceled_count ?? r.cancelled_count ?? 0)),
    ),
    refundedQty: Math.max(0, Math.floor(num(r.refunded ?? r.refunded_count ?? 0))),
  };
}

// Função para converter formato de data "3 de fev." para "03/02" ou manter formato mensal
const formatDateLabel = (label: string): string => {
  if (!label) return label;

  const labelTrimmed = label.trim();

  // Se o label já está no formato mensal com ano completo (ex: "Fev/2026", "Set/2025", "jan de 2024", "set de 2025"), retornar como está
  // Padrão 1: 3-4 letras (mês) + "/" + 4 dígitos (ano) - ex: "Fev/2026"
  const monthlyPattern1 = /^[a-záàâãéêíóôõúç]{3,4}\/\d{4}$/i;
  if (monthlyPattern1.test(labelTrimmed)) {
    return labelTrimmed;
  }

  // Padrão 2: 3-4 letras (mês) + " de " + 4 dígitos (ano) - ex: "jan de 2024"
  const monthlyPattern2 = /^[a-záàâãéêíóôõúç]{3,4}\s+de\s+\d{4}$/i;
  if (monthlyPattern2.test(labelTrimmed)) {
    return labelTrimmed;
  }

  // Mapeamento de meses abreviados
  const monthMap: { [key: string]: string } = {
    'jan': '01',
    'fev': '02',
    'mar': '03',
    'abr': '04',
    'mai': '05',
    'jun': '06',
    'jul': '07',
    'ago': '08',
    'set': '09',
    'out': '10',
    'nov': '11',
    'dez': '12',
  };

  // Tentar parsear formato "3 de fev." ou "03 de fev." (formato diário)
  // Mas só se não for formato mensal (que tem ano de 4 dígitos)
  const match = label.toLowerCase().match(/(\d+)\s+de\s+(\w+)/);
  if (match && !label.match(/\d{4}/)) {
    const day = match[1].padStart(2, '0');
    const monthAbbr = match[2].substring(0, 3);
    const month = monthMap[monthAbbr] || '01';
    return `${day}/${month}`;
  }

  // Tentar parsear formato "03/02" ou "09/25" (DD/MM ou MM/AA - já está no formato correto)
  if (label.match(/^\d{2}\/\d{2}$/)) {
    return label;
  }

  // Tentar parsear formato ISO ou outros formatos de data
  const date = new Date(label);
  if (!isNaN(date.getTime())) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}`;
  }

  // Se não conseguir parsear, retornar o label original
  return label;
};

export function RevenueChart({ data }: RevenueChartProps) {
  const [tooltipData, setTooltipData] = useState<{
    date: string;
    confirmadas: RevenueChartTooltipBucket;
    cancelados: RevenueChartTooltipBucket;
    estornados: RevenueChartTooltipBucket;
    chartX: number;
    chartY: number;
  } | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const chartRef = useRef<ChartJS<"line">>(null);
  const lastTooltipKeyRef = useRef<string | null>(null);
  const mousePosRef = useRef({ x: 0, y: 0 });
  const tooltipDivRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const check = () => setIsMobile(typeof window !== "undefined" && window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Dados brutos
  const chartData = useMemo(() => {
    return (
      data || {
        labels: ["Jan", "Fev", "Mar", "Abr"],
        revenue: [4000, 12000, 8000, 6000],
        dailyData: undefined,
      }
    );
  }, [data]);

  // No mobile com muitos pontos, amostrar para no máximo MAX_LABELS_MOBILE (gráfico legível)
  const displayData = useMemo(() => {
    if (!isMobile || !chartData.labels?.length || chartData.labels.length <= MAX_LABELS_MOBILE) {
      return chartData;
    }
    const n = chartData.labels.length;
    const indices = Array.from({ length: MAX_LABELS_MOBILE }, (_, i) =>
      i === MAX_LABELS_MOBILE - 1 ? n - 1 : Math.round((i * (n - 1)) / (MAX_LABELS_MOBILE - 1)),
    );
    const labels = indices.map((i) => chartData.labels[i]);
    const revenue = indices.map((i) => chartData.revenue[i]);
    const dailyData =
      Array.isArray(chartData.dailyData) && chartData.dailyData.length > 0
        ? indices.map((i) => chartData.dailyData![i])
        : undefined;
    return { labels, revenue, dailyData };
  }, [chartData, isMobile]);

  // Calcular valores dinâmicos para o eixo Y (usa displayData para mobile com poucos pontos)
  const yAxisScale = useMemo(() => {
    const calculateYAxisScale = () => {
      if (!displayData.revenue || displayData.revenue.length === 0) {
        return {
          max: 15000,
          stepSize: 5000,
          ticks: [15000, 10000, 5000, 0],
        };
      }

      const maxValue = Math.max(...displayData.revenue);

      // Se o valor máximo for 0, usar valores padrão
      if (maxValue === 0) {
        return {
          max: 15000,
          stepSize: 5000,
          ticks: [15000, 10000, 5000, 0],
        };
      }

      // Arredondar para cima para uma escala bonita
      // Encontrar a ordem de grandeza
      const magnitude = Math.pow(10, Math.floor(Math.log10(maxValue)));
      const normalized = maxValue / magnitude;

      // Arredondar para cima para múltiplos de 1, 2, 5, 10
      let roundedMax: number;
      if (normalized <= 1) {
        roundedMax = magnitude;
      } else if (normalized <= 2) {
        roundedMax = 2 * magnitude;
      } else if (normalized <= 5) {
        roundedMax = 5 * magnitude;
      } else {
        roundedMax = 10 * magnitude;
      }

      // Adicionar 20% de margem no topo
      roundedMax = Math.ceil(roundedMax * 1.2);

      // Calcular stepSize (dividir em 3 ou 4 divisões)
      const stepSize = roundedMax / 3;

      // Arredondar stepSize para um valor "bonito"
      const stepMagnitude = Math.pow(10, Math.floor(Math.log10(stepSize)));
      const normalizedStep = stepSize / stepMagnitude;
      let roundedStep: number;
      if (normalizedStep <= 1) {
        roundedStep = stepMagnitude;
      } else if (normalizedStep <= 2) {
        roundedStep = 2 * stepMagnitude;
      } else if (normalizedStep <= 5) {
        roundedStep = 5 * stepMagnitude;
      } else {
        roundedStep = 10 * stepMagnitude;
      }

      // Ajustar roundedMax para ser múltiplo de roundedStep
      roundedMax = Math.ceil(roundedMax / roundedStep) * roundedStep;

      // Gerar ticks (4 valores: max, 2/3, 1/3, 0) para melhor distribuição
      const ticks = [
        roundedMax,
        Math.round((roundedMax * 2) / 3 / roundedStep) * roundedStep,
        Math.round((roundedMax / 3) / roundedStep) * roundedStep,
        0,
      ];

      return {
        max: roundedMax,
        stepSize: roundedStep,
        ticks: ticks.sort((a, b) => b - a), // Ordenar do maior para o menor
      };
    };
    return calculateYAxisScale();
  }, [displayData]);

  // Dados para a linha principal — tension nativo do Chart.js garante curva suave
  // sem precisar de interpolação manual (que causava 20 disparos de tooltip por ponto)
  const lineData = useMemo(() => ({
    labels: displayData.labels,
    datasets: [
      {
        label: "Faturamento",
        data: displayData.revenue,
        borderColor: "#308737",
        backgroundColor: (context: any) => {
          const ctx = context.chart.ctx;
          const h = context.chart?.height ?? 300;
          const gradient = ctx.createLinearGradient(0, 0, 0, h);
          gradient.addColorStop(0, "rgba(48, 135, 55, 0.25)");
          gradient.addColorStop(0.5, "rgba(48, 135, 55, 0.1)");
          gradient.addColorStop(1, "rgba(48, 135, 55, 0)");
          return gradient;
        },
        fill: true,
        tension: 0.4,
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 0,
        clip: false,
      },
    ],
  }), [displayData]);

  const handleTooltip = useCallback((context: any) => {
    if (
      !context.tooltip ||
      context.tooltip.opacity === 0 ||
      !context.tooltip.dataPoints?.length
    ) {
      if (lastTooltipKeyRef.current !== null) {
        lastTooltipKeyRef.current = null;
        setTooltipData(null);
      }
      return;
    }

    const dataPoint = context.tooltip.dataPoints[0];
    if (!dataPoint?.element || !chartRef.current) {
      if (lastTooltipKeyRef.current !== null) {
        lastTooltipKeyRef.current = null;
        setTooltipData(null);
      }
      return;
    }

    const { x, y } = dataPoint.element;
    const idxSafe = Math.min(
      Math.max(0, dataPoint.dataIndex),
      displayData.labels.length - 1,
    );

    // Chave por ponto original — não muda enquanto o mouse está no mesmo ponto
    const tooltipKey = String(idxSafe);
    if (lastTooltipKeyRef.current === tooltipKey) return;

    const monthLabel = displayData.labels[idxSafe] || "";
    const formattedDate = monthLabel ? formatDateLabel(monthLabel) : "Data";
    const rawDay = displayData.dailyData?.[idxSafe];
    const parsed = normalizeDailyPoint(rawDay);

    let confirmadas: RevenueChartTooltipBucket = { revenueReais: 0, quantity: 0 };
    let cancelados: RevenueChartTooltipBucket = { revenueReais: 0, quantity: 0 };
    let estornados: RevenueChartTooltipBucket = { revenueReais: 0, quantity: 0 };

    if (parsed) {
      confirmadas = { revenueReais: parsed.confirmedRevenueReais, quantity: parsed.confirmedQty };
      cancelados = { revenueReais: parsed.canceledRevenueReais, quantity: parsed.canceledQty };
      estornados = { revenueReais: parsed.refundedRevenueReais, quantity: parsed.refundedQty };
      if (confirmadas.revenueReais === 0 && typeof displayData.revenue[idxSafe] === "number") {
        confirmadas = { ...confirmadas, revenueReais: displayData.revenue[idxSafe] };
      }
    } else if (typeof displayData.revenue[idxSafe] === "number") {
      confirmadas = { revenueReais: displayData.revenue[idxSafe], quantity: 0 };
    }

    lastTooltipKeyRef.current = tooltipKey;
    setTooltipData({ date: formattedDate, confirmadas, cancelados, estornados, chartX: x, chartY: y });
  }, [displayData]);

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: { top: 4, bottom: 8, left: 0, right: 0 },
    },
    interaction: {
      mode: "index" as const,
      intersect: false,
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: false,
        external: handleTooltip,
      },
    },
    scales: {
      x: { display: false, grid: { display: false } },
      y: {
        display: false,
        grid: { display: false },
        min: 0,
        max: yAxisScale.max,
        ticks: { stepSize: yAxisScale.stepSize },
      },
    },
    events: ["mousemove", "mouseout"] as ("mousemove" | "mouseout")[],
  }), [yAxisScale, handleTooltip]);

  const handleMouseLeave = () => {
    setTooltipData(null);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    mousePosRef.current = { x: mx, y: my };
    if (tooltipDivRef.current) {
      const maxLeft = rect.width - 210;
      tooltipDivRef.current.style.left = `${Math.min(mx + 14, maxLeft)}px`;
      tooltipDivRef.current.style.top = `${Math.max(4, my - 130)}px`;
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative h-[260px] md:h-[341px] w-full min-w-0"
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
    >
      {/* Y-axis labels */}
      <div className="absolute left-0 top-0 bottom-6 md:bottom-8 flex flex-col justify-between pr-2 md:pr-3 pt-2 md:pt-3 pb-4 md:pb-6 z-10">
        {yAxisScale.ticks.map((tick, index) => {
          // Formatar o valor
          let formattedValue: string;
          if (tick >= 1000000) {
            formattedValue = `R$${(tick / 1000000).toFixed(1)}M`;
          } else if (tick >= 1000) {
            formattedValue = `R$${(tick / 1000).toFixed(0)}K`;
          } else {
            formattedValue = `R$${tick.toLocaleString("pt-BR")}`;
          }

          return (
            <span key={index} className="text-xs md:text-sm text-gray-11 font-family-dm-sans">
              {formattedValue}
            </span>
          );
        })}
      </div>

      {/* Chart container */}
      <div className="ml-9 md:ml-[59px] mr-0 h-[200px] md:h-[285px] relative min-w-0">
        {/* Main line chart */}
        <div className="absolute inset-0">
          <Line ref={chartRef} data={lineData} options={options} />
        </div>

        {/* Grid lines horizontais para melhor leitura */}
        {yAxisScale.ticks.slice(0, -1).map((tick, index) => {
          const percentage = (tick / yAxisScale.max) * 100;
          return (
            <div
              key={`grid-${index}`}
              className="absolute left-0 right-0 h-px bg-gray-6 z-0 pointer-events-none"
              style={{
                bottom: `${percentage}%`,
                transform: 'translateY(50%)',
              }}
            />
          );
        })}

        {/* Hover point indicator */}
        {tooltipData && (
          <div
            className="absolute w-2.5 h-2.5 md:w-3 md:h-3 bg-primary-11 rounded-full border-2 border-white z-20 pointer-events-none"
            style={{
              left: `${tooltipData.chartX - 5}px`,
              top: `${tooltipData.chartY - 5}px`,
            }}
          />
        )}

        {/* X-axis labels - distribuídos uniformemente */}
        <div className="absolute -bottom-5 md:-bottom- left-0 right-0 flex justify-between px-0">
          {(() => {
            const totalLabels = displayData.labels.length;
            const maxLabels = isMobile ? MAX_LABELS_MOBILE : MAX_LABELS_DESKTOP;
            const count = Math.min(maxLabels, totalLabels);
            const shownIndices = new Set(
              Array.from({ length: count }, (_, k) =>
                count === 1 ? 0 : Math.round((k * (totalLabels - 1)) / (count - 1))
              )
            );
            const shouldShow = (i: number) => shownIndices.has(i);

            return displayData.labels.map((label, index) => {
              if (!shouldShow(index)) return null;

              const position = totalLabels > 1 ? (index / (totalLabels - 1)) * 100 : 50;
              const isMonthlyLabel =
                /^[a-záàâãéêíóôõúç]{3,4}\/\d{4}$/i.test(label.trim()) ||
                /^[a-záàâãéêíóôõúç]{3,4}\s+de\s+\d{4}$/i.test(label.trim()) ||
                /^\d{2}\/\d{2}$/.test(label.trim());
              const formattedLabel = isMonthlyLabel ? label.trim() : formatDateLabel(label);

              const isFirst = index === 0;
              const isLast = index === totalLabels - 1;
              const translate = isFirst ? "0%" : isLast ? "-100%" : "-50%";

              return (
                <span
                  key={`${label}-${index}`}
                  className="text-xs md:text-sm text-gray-11 font-family-dm-sans"
                  style={{
                    position: "absolute",
                    left: `${position}%`,
                    transform: `translateX(${translate})`,
                  }}
                >
                  {formattedLabel}
                </span>
              );
            });
          })()}
        </div>
      </div>

      {/* Tooltip - compacto no mobile */}
      {tooltipData && (
        <div
          ref={tooltipDivRef}
          className="absolute bg-gray-2 border border-gray-6 rounded p-2 md:p-[10px] shadow-lg max-w-[min(260px,calc(100vw-2rem))] md:max-w-[280px] w-max min-w-0 z-30 pointer-events-none"
          style={{
            left: `${Math.min(mousePosRef.current.x + 14, (containerRef.current?.clientWidth ?? 600) - 210)}px`,
            top: `${Math.max(4, mousePosRef.current.y - 130)}px`,
          }}
        >
          <p className="font-family-dm-sans font-normal text-xs md:text-sm leading-[1.3] text-gray-11 mb-2 md:mb-3 truncate">
            {tooltipData.date}
          </p>
          {(
            [
              ["Confirmadas", tooltipData.confirmadas],
              ["Cancelados", tooltipData.cancelados],
              ["Estornados", tooltipData.estornados],
            ] as const
          ).map(([label, bucket]) => (
            <div
              key={label}
              className="mb-2 md:mb-3 last:mb-0 space-y-1 text-xs md:text-sm"
            >

              <div className="flex justify-between items-center gap-3 pl-0">
                <p className="font-family-dm-sans font-medium leading-[1.3] text-gray-12">
                  {label}
                </p>
                <span className="font-family-dm-sans font-base leading-[1.3] text-gray-12 text-right tabular-nums">
                  {bucket.quantity.toLocaleString("pt-BR")} Qt /
                  R${" "}
                  {bucket.revenueReais.toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
