"use client";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  TooltipItem,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { useState, useRef, useCallback, useEffect } from "react";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface RevenueChartProps {
  data?: {
    labels: string[];
    revenue: number[];
  };
}

export function RevenueChart({ data }: RevenueChartProps) {
  const [tooltipData, setTooltipData] = useState<{
    date: string;
    revenue: number;
    tickets: number;
    x: number;
    y: number;
  } | null>(null);
  const chartRef = useRef<ChartJS<"line">>(null);

  // Mock data - substituir com dados reais
  const chartData = data || {
    labels: ["Jan", "Fev", "Mar", "Abr"],
    revenue: [4000, 12000, 8000, 6000],
  };

  // Criar mais pontos para suavizar a linha
  const generateSmoothData = useCallback(() => {
    const points: number[] = [];
    const labels: string[] = [];
    
    chartData.revenue.forEach((value, index) => {
      if (index === 0) {
        points.push(value);
        labels.push("");
      } else {
        const prevValue = chartData.revenue[index - 1];
        const steps = 40;
        for (let i = 1; i <= steps; i++) {
          const interpolated = prevValue + (value - prevValue) * (i / steps);
          points.push(interpolated);
          labels.push("");
        }
      }
    });
    
    return { points, labels };
  }, [chartData]);

  const { points, labels } = generateSmoothData();

  // Dados para a linha principal (faturamento)
  const lineData = {
    labels: labels,
    datasets: [
      {
        label: "Faturamento",
        data: points,
        borderColor: "#308737", // primary-11
        backgroundColor: (context: any) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 400);
          gradient.addColorStop(0, "rgba(48, 135, 55, 0.3)");
          gradient.addColorStop(1, "rgba(48, 135, 55, 0.05)");
          return gradient;
        },
        fill: true,
        tension: 0.4,
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 6,
        pointHoverBackgroundColor: "#308737",
        pointHoverBorderColor: "#fff",
        pointHoverBorderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: "index" as const,
      intersect: false,
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        enabled: false,
        external: (context: any) => {
          // Verificar se o tooltip está realmente ativo (hover)
          // O tooltip só deve aparecer quando há interação ativa
          if (!context.tooltip || 
              context.tooltip.opacity === 0 || 
              !context.tooltip.dataPoints?.length ||
              context.tooltip.dataPoints.length === 0) {
            setTooltipData(null);
            return;
          }

          const tooltip = context.tooltip;
          const dataPoint = tooltip.dataPoints[0];
          
          // Verificar se o elemento realmente existe e está sendo hovered
          if (!dataPoint || !dataPoint.element) {
            setTooltipData(null);
            return;
          }

          const chart = chartRef.current;
          if (!chart) {
            setTooltipData(null);
            return;
          }

          const canvas = chart.canvas;
          const x = dataPoint.element.x;
          const y = dataPoint.element.y;

          // Encontrar o mês correspondente baseado no índice
          const index = dataPoint.dataIndex;
          const monthIndex = Math.floor(index / 41); // 40 steps + 1 ponto inicial
          const monthLabel = chartData.labels[Math.min(monthIndex, chartData.labels.length - 1)] || chartData.labels[0];
          const revenue = dataPoint.parsed.y;

          setTooltipData({
            date: `24 de ${monthLabel.toLowerCase()}`,
            revenue: revenue,
            tickets: Math.floor(revenue / 10), // Mock de ingressos
            x: x,
            y: y,
          });
        },
      },
    },
    scales: {
      x: {
        display: false,
        grid: {
          display: false,
        },
      },
      y: {
        display: false,
        grid: {
          display: false,
        },
        min: 0,
        max: 15000,
        ticks: {
          stepSize: 5000,
        },
      },
    },
    onHover: (event: any, activeElements: any[]) => {
      if (activeElements.length === 0) {
        setTooltipData(null);
      }
    },
    events: ['mousemove', 'mouseout'] as ('mousemove' | 'mouseout')[],
  };

  const handleMouseLeave = () => {
    setTooltipData(null);
  };

  return (
    <div className="relative h-[341px] w-full" onMouseLeave={handleMouseLeave}>
      {/* Y-axis labels */}
      <div className="absolute left-0 top-0 bottom-[32px] flex flex-col justify-between pr-3 pt-3 pb-6 z-10">
        <span className="text-[14px] text-gray-11 font-family-dm-sans">R$15K</span>
        <span className="text-[14px] text-gray-11 font-family-dm-sans">R$10K</span>
        <span className="text-[14px] text-gray-11 font-family-dm-sans">R$5K</span>
        <span className="text-[14px] text-gray-11 font-family-dm-sans">0</span>
      </div>

      {/* Chart container */}
      <div className="ml-[59px] mr-0 h-[285px] relative">
        {/* Main line chart */}
        <div className="absolute inset-0">
          <Line ref={chartRef} data={lineData} options={options} />
        </div>

        {/* Grid line at middle */}
        <div className="absolute top-1/2 left-0 right-0 h-px bg-gray-6 -translate-y-1/2 z-0" />

        {/* Vertical line indicator (when hovering) */}
        {tooltipData && (
          <div
            className="absolute top-0 bottom-[16px] w-px bg-gray-6 z-10"
            style={{ left: `${tooltipData.x}px` }}
          />
        )}

        {/* Hover point indicator */}
        {tooltipData && (
          <div
            className="absolute w-3 h-3 bg-primary-11 rounded-full border-2 border-white z-20"
            style={{
              left: `${tooltipData.x - 6}px`,
              top: `${tooltipData.y - 6}px`,
            }}
          />
        )}

        {/* X-axis labels */}
        <div className="absolute -bottom-[22px] left-0 right-0 flex justify-between px-6">
          {chartData.labels.map((label) => (
            <span key={label} className="text-[14px] text-gray-11 font-family-dm-sans">
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* Tooltip */}
      {tooltipData && (
        <div
          className="absolute bg-gray-2 border border-gray-6 rounded p-[10px] shadow-lg w-[230px] z-30 pointer-events-none"
          style={{
            left: typeof window !== "undefined" 
              ? `${Math.min(tooltipData.x + 20, window.innerWidth - 250)}px`
              : `${tooltipData.x + 20}px`,
            top: `${tooltipData.y - 100}px`,
          }}
        >
          <p className="font-family-dm-sans font-normal text-[14px] leading-[1.3] text-gray-11 mb-3">
            {tooltipData.date}
          </p>
          <div className="flex justify-between items-center mb-3">
            <span className="font-family-dm-sans font-normal text-[14px] leading-[1.3] text-gray-12">
              Confirmadas:
            </span>
            <span className="font-family-dm-sans font-semibold text-[14px] leading-[1.3] text-gray-12">
              R$ {tooltipData.revenue.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex justify-between items-center mb-3">
            <span className="font-family-dm-sans font-normal text-[14px] leading-[1.3] text-gray-12">
              Cancelados:
            </span>
            <span className="font-family-dm-sans font-semibold text-[14px] leading-[1.3] text-gray-12">
              {Math.floor(tooltipData.tickets * 0.1)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="font-family-dm-sans font-normal text-[14px] leading-[1.3] text-gray-12">
              Estornados:
            </span>
            <span className="font-family-dm-sans font-semibold text-[14px] leading-[1.3] text-gray-12">
              {Math.floor(tooltipData.tickets * 0.05)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
