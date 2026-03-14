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
import { useState, useRef, useCallback, useMemo, useEffect } from "react";

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

const MAX_LABELS_MOBILE = 6;

interface RevenueChartProps {
  data?: {
    labels: string[];
    revenue: number[];
  };
}

/** No mobile, reduz a quantidade de pontos para no máximo MAX_LABELS_MOBILE (evita gráfico achatado). */
function sampleForMobile<T>(arr: T[], isMobile: boolean, maxLabels: number): T[] {
  if (!isMobile || !arr?.length || arr.length <= maxLabels) return arr;
  const n = arr.length;
  const indices = Array.from({ length: maxLabels }, (_, i) =>
    i === maxLabels - 1 ? n - 1 : Math.round((i * (n - 1)) / (maxLabels - 1))
  );
  return indices.map((i) => arr[i]);
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
    revenue: number;
    tickets: number;
    x: number;
    y: number;
  } | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const chartRef = useRef<ChartJS<"line">>(null);
  const tooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTooltipDataRef = useRef<string | null>(null);

  useEffect(() => {
    const check = () => setIsMobile(typeof window !== "undefined" && window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Dados brutos
  const chartData = useMemo(() => {
    return data || {
      labels: ["Jan", "Fev", "Mar", "Abr"],
      revenue: [4000, 12000, 8000, 6000],
    };
  }, [data]);

  // No mobile com muitos pontos, amostrar para no máximo MAX_LABELS_MOBILE (gráfico legível)
  const displayData = useMemo(() => {
    if (!isMobile || !chartData.labels?.length || chartData.labels.length <= MAX_LABELS_MOBILE) {
      return chartData;
    }
    const labels = sampleForMobile(chartData.labels, true, MAX_LABELS_MOBILE);
    const revenue = sampleForMobile(chartData.revenue || [], true, MAX_LABELS_MOBILE);
    return { labels, revenue };
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

  // Criar mais pontos para suavizar a linha (usa displayData)
  const generateSmoothData = useCallback(() => {
    if (!displayData.revenue || displayData.revenue.length === 0) {
      return { points: [], labels: [], originalIndices: [] };
    }

    const points: number[] = [];
    const labels: string[] = [];
    const originalIndices: number[] = [];

    displayData.revenue.forEach((value, index) => {
      if (index === 0) {
        points.push(value);
        labels.push("");
        originalIndices.push(0);
      } else {
        const prevValue = displayData.revenue[index - 1];
        const steps = 20; // Reduzido de 40 para 20 para melhor performance
        for (let i = 1; i <= steps; i++) {
          const interpolated = prevValue + (value - prevValue) * (i / steps);
          points.push(interpolated);
          labels.push("");
          // Mapear para o índice original mais próximo
          originalIndices.push(i === steps ? index : index - 1);
        }
      }
    });

    return { points, labels, originalIndices };
  }, [displayData]);

  // Usar useMemo para evitar recálculo desnecessário
  const { points, labels, originalIndices } = useMemo(() => generateSmoothData(), [generateSmoothData]);

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
          const h = context.chart?.height ?? 300;
          const gradient = ctx.createLinearGradient(0, 0, 0, h);
          gradient.addColorStop(0, "rgba(48, 135, 55, 0.25)");
          gradient.addColorStop(0.5, "rgba(48, 135, 55, 0.1)");
          gradient.addColorStop(1, "rgba(48, 135, 55, 0)");
          return gradient;
        },
        fill: true,
        tension: 0.5, // Aumentado para linha mais suave
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 6,
        pointHoverBackgroundColor: "#308737",
        pointHoverBorderColor: "#fff",
        pointHoverBorderWidth: 2,
      },
    ],
  };

  // Handler do tooltip usando useCallback para evitar recriação
  const handleTooltip = useCallback((context: any) => {
    // Limpar timeout anterior se existir
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current);
      tooltipTimeoutRef.current = null;
    }

    // Verificar se o tooltip está realmente ativo (hover)
    // O tooltip só deve aparecer quando há interação ativa
    if (!context.tooltip ||
      context.tooltip.opacity === 0 ||
      !context.tooltip.dataPoints?.length ||
      context.tooltip.dataPoints.length === 0) {
      setTooltipData((prev) => {
        if (prev !== null) {
          lastTooltipDataRef.current = null;
          return null;
        }
        return prev;
      });
      return;
    }

    const tooltip = context.tooltip;
    const dataPoint = tooltip.dataPoints[0];

    // Verificar se o elemento realmente existe e está sendo hovered
    if (!dataPoint || !dataPoint.element) {
      setTooltipData((prev) => {
        if (prev !== null) {
          lastTooltipDataRef.current = null;
          return null;
        }
        return prev;
      });
      return;
    }

    const chart = chartRef.current;
    if (!chart) {
      setTooltipData((prev) => {
        if (prev !== null) {
          lastTooltipDataRef.current = null;
          return null;
        }
        return prev;
      });
      return;
    }

    const x = dataPoint.element.x;
    const y = dataPoint.element.y;

    // Encontrar o mês correspondente baseado no índice
    const index = dataPoint.dataIndex;
    const originalIndex = originalIndices[index] ?? Math.floor(index / 21);
    const monthLabel = displayData.labels[Math.min(originalIndex, displayData.labels.length - 1)] || displayData.labels[0] || "";
    const revenue = dataPoint.parsed.y;

    // Formatar data corretamente - manter formato mensal se já estiver no formato "Fev/2026"
    const formattedDate = monthLabel ? formatDateLabel(monthLabel) : "Data";

    // Criar uma chave única para este tooltip para evitar atualizações desnecessárias
    const tooltipKey = `${index}-${Math.round(x)}-${Math.round(y)}-${Math.round(revenue)}`;
    
    // Só atualizar se os dados realmente mudaram
    if (lastTooltipDataRef.current === tooltipKey) {
      return;
    }

    // Usar timeout para debounce e evitar atualizações muito frequentes
    tooltipTimeoutRef.current = setTimeout(() => {
      setTooltipData({
        date: formattedDate,
        revenue: revenue,
        tickets: Math.floor(revenue / 10), // Mock de ingressos
        x: x,
        y: y,
      });
      lastTooltipDataRef.current = tooltipKey;
    }, 0);
  }, [displayData, originalIndices]);

  // Limpar timeout ao desmontar
  useEffect(() => {
    return () => {
      if (tooltipTimeoutRef.current) {
        clearTimeout(tooltipTimeoutRef.current);
      }
    };
  }, []);

  // Usar useMemo para options para evitar recriação a cada render
  const options = useMemo(() => ({
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
        external: handleTooltip,
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
        max: yAxisScale.max,
        ticks: {
          stepSize: yAxisScale.stepSize,
        },
      },
    },
    onHover: (event: any, activeElements: any[]) => {
      if (activeElements.length === 0) {
        setTooltipData(null);
      }
    },
    events: ['mousemove', 'mouseout'] as ('mousemove' | 'mouseout')[],
  }), [yAxisScale, handleTooltip]);

  const handleMouseLeave = () => {
    setTooltipData(null);
  };

  return (
    <div className="relative h-[260px] md:h-[341px] w-full min-w-0" onMouseLeave={handleMouseLeave}>
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
              className="absolute left-0 right-0 h-px bg-gray-6 z-0"
              style={{
                bottom: `${percentage}%`,
                transform: 'translateY(50%)',
              }}
            />
          );
        })}

        {/* Vertical line indicator (when hovering) */}
        {tooltipData && (
          <div
            className="absolute top-0 bottom-4 md:bottom-4 w-px bg-gray-6 z-10"
            style={{ left: `${tooltipData.x}px` }}
          />
        )}

        {/* Hover point indicator */}
        {tooltipData && (
          <div
            className="absolute w-2.5 h-2.5 md:w-3 md:h-3 bg-primary-11 rounded-full border-2 border-white z-20"
            style={{
              left: `${tooltipData.x - 5}px`,
              top: `${tooltipData.y - 5}px`,
            }}
          />
        )}

        {/* X-axis labels - distribuídos uniformemente */}
        <div className="absolute -bottom-5 md:-bottom-[22px] left-0 right-0 flex justify-between px-0">
          {displayData.labels.map((label, index) => {
            const totalLabels = displayData.labels.length;
            const position = totalLabels > 1 
              ? (index / (totalLabels - 1)) * 100 
              : 50;
            
            // Verificar se é label mensal (formato "Fev/2026", "Set/2025", "set de 2025" ou "09/25") antes de formatar
            const isMonthlyLabel = 
              /^[a-záàâãéêíóôõúç]{3,4}\/\d{4}$/i.test(label.trim()) ||
              /^[a-záàâãéêíóôõúç]{3,4}\s+de\s+\d{4}$/i.test(label.trim()) ||
              /^\d{2}\/\d{2}$/.test(label.trim());
            const formattedLabel = isMonthlyLabel ? label.trim() : formatDateLabel(label);
            
            return (
              <span 
                key={`${label}-${index}`} 
                className="text-xs md:text-sm text-gray-11 font-family-dm-sans"
                style={{ 
                  position: 'absolute',
                  left: `${position}%`,
                  transform: 'translateX(-50%)',
                }}
              >
                {formattedLabel}
              </span>
            );
          })}
        </div>
      </div>

      {/* Tooltip - compacto no mobile */}
      {tooltipData && (
        <div
          className="absolute bg-gray-2 border border-gray-6 rounded p-2 md:p-[10px] shadow-lg max-w-[180px] md:max-w-none md:w-[230px] z-30 pointer-events-none"
          style={{
            left: `min(${tooltipData.x + 12}px, calc(100% - 12rem))`,
            top: `${Math.max(8, tooltipData.y - 72)}px`,
          }}
        >
          <p className="font-family-dm-sans font-normal text-xs md:text-sm leading-[1.3] text-gray-11 mb-2 md:mb-3 truncate">
            {tooltipData.date}
          </p>
          <div className="flex justify-between items-center gap-2 mb-1.5 md:mb-3 text-xs md:text-sm">
            <span className="font-family-dm-sans font-normal leading-[1.3] text-gray-12 shrink-0">Confirmadas:</span>
            <span className="font-family-dm-sans font-semibold leading-[1.3] text-gray-12 truncate">
              R$ {tooltipData.revenue.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex justify-between items-center gap-2 mb-1.5 md:mb-3 text-xs md:text-sm">
            <span className="font-family-dm-sans font-normal leading-[1.3] text-gray-12 shrink-0">Cancelados:</span>
            <span className="font-family-dm-sans font-semibold leading-[1.3] text-gray-12">{Math.floor(tooltipData.tickets * 0.1)}</span>
          </div>
          <div className="flex justify-between items-center gap-2 text-xs md:text-sm">
            <span className="font-family-dm-sans font-normal leading-[1.3] text-gray-12 shrink-0">Estornados:</span>
            <span className="font-family-dm-sans font-semibold leading-[1.3] text-gray-12">{Math.floor(tooltipData.tickets * 0.05)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
