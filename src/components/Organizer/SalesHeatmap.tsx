"use client";

import { useMemo, useState, useRef } from "react";

interface HeatmapData {
  day: string;
  hour: number;
  sales: number;
}

interface SalesHeatmapProps {
  data?: HeatmapData[];
}

const days = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sab", "Dom"];
const hoursLabels = ["00:00", "03:00", "06:00", "09:00", "12:00", "15:00", "18:00", "21:00"];
// Generate all 24 hours for the grid (24 columns x 7 rows)
const allHours = Array.from({ length: 24 }, (_, i) => i);

// Função auxiliar para gerar dados mock
function generateMockData(): HeatmapData[] {
  const data: HeatmapData[] = [];
  days.forEach((day) => {
    allHours.forEach((hour) => {
      // Gerar vendas aleatórias com mais vendas em horários específicos
      let sales = 0;
      if (hour >= 9 && hour <= 18) {
        sales = Math.floor(Math.random() * 300);
      } else {
        sales = Math.floor(Math.random() * 50);
      }
      data.push({ day, hour, sales });
    });
  });
  return data;
}

export function SalesHeatmap({ data }: SalesHeatmapProps) {
  const [hoveredCell, setHoveredCell] = useState<{ day: string; hour: number; sales: number; x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Transformar dados para o formato esperado
  const heatmapData = useMemo(() => {
    const rawData = data || generateMockData();
    const maxSales = Math.max(...rawData.map((d) => d.sales), 1);
    
    // Organizar dados por dia e hora
    const dataMap = new Map<string, number>();
    rawData.forEach((d) => {
      const key = `${d.day}-${d.hour}`;
      dataMap.set(key, d.sales);
    });

    // Criar array de células para o heatmap (7 dias x 24 horas)
    const cells: Array<{ day: string; hour: number; sales: number; intensity: number }> = [];
    days.forEach((day) => {
      allHours.forEach((hour) => {
        const key = `${day}-${hour}`;
        const sales = dataMap.get(key) || 0;
        const intensity = maxSales > 0 ? sales / maxSales : 0;
        cells.push({ day, hour, sales, intensity });
      });
    });

    return { cells, maxSales };
  }, [data]);

  // Cores do heatmap conforme Figma
  const getCellColor = (intensity: number) => {
    if (intensity === 0) return "#e8e8e8"; // gray-4
    if (intensity <= 0.2) return "#caf1f6"; // blue-4
    if (intensity <= 0.4) return "#7dcedc"; // blue-7
    if (intensity <= 0.6) return "#0797b9"; // blue-10
    return "#0d3c48"; // blue-12
  };

  const getDayName = (day: string) => {
    const dayNames: { [key: string]: string } = {
      Seg: "Segunda-feira",
      Ter: "Terça-feira",
      Qua: "Quarta-feira",
      Qui: "Quinta-feira",
      Sex: "Sexta-feira",
      Sab: "Sábado",
      Dom: "Domingo",
    };
    return dayNames[day] || day;
  };

  const handleCellHover = (e: React.MouseEvent<HTMLDivElement>, day: string, hour: number, sales: number) => {
    if (!containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const cellRect = e.currentTarget.getBoundingClientRect();
    
    setHoveredCell({
      day,
      hour,
      sales,
      x: cellRect.left - containerRect.left + cellRect.width / 2,
      y: cellRect.top - containerRect.top,
    });
  };

  const handleCellLeave = () => {
    setHoveredCell(null);
  };

  return (
    <div ref={containerRef} className="relative w-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-5 pb-1">
        <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-11">
          Dias e horários com mais vendas
        </p>
        <div className="flex items-center gap-2">
          <span className="font-family-dm-sans font-normal text-[14px] leading-[1.3] text-gray-11">Menos</span>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: "#e8e8e8" }} />
            <div className="w-4 h-4 rounded" style={{ backgroundColor: "#caf1f6" }} />
            <div className="w-4 h-4 rounded" style={{ backgroundColor: "#7dcedc" }} />
            <div className="w-4 h-4 rounded" style={{ backgroundColor: "#0797b9" }} />
            <div className="w-4 h-4 rounded" style={{ backgroundColor: "#0d3c48" }} />
          </div>
          <span className="font-family-dm-sans font-normal text-[14px] leading-[1.3] text-gray-11">Mais</span>
        </div>
      </div>

      {/* Graph Container */}
      <div className="flex-1 p-4 relative">
        <div className="relative h-[395px]">
          {/* Time Labels (top) */}
          <div className="absolute top-0 left-[34px] right-0 flex justify-between px-6 pb-3">
            {hoursLabels.map((label) => (
              <span key={label} className="font-family-dm-sans font-normal text-[14px] leading-[1.3] text-gray-11">
                {label}
              </span>
            ))}
          </div>

          {/* Days Labels (left) */}
          <div className="absolute left-0 top-[32px] bottom-[16px] flex flex-col justify-between pr-3">
            {days.map((day) => (
              <span key={day} className="font-family-dm-sans font-normal text-[14px] leading-[1.3] text-gray-11">
                {day}
              </span>
            ))}
          </div>

          {/* Heatmap Grid - 24 columns x 7 rows */}
          <div className="absolute left-[50px] top-[22px] right-0 bottom-0">
            <div 
              className="grid gap-y-2 gap-x-1 h-[378px] w-full"
              style={{ 
                gridTemplateColumns: "repeat(24, 1fr)",
                gridTemplateRows: "repeat(7, 1fr)",
              }}
            >
              {days.map((day) =>
                allHours.map((hour) => {
                  const cell = heatmapData.cells.find((c) => c.day === day && c.hour === hour);
                  if (!cell) return null;
                  
                  const color = getCellColor(cell.intensity);
                  
                  return (
                    <div
                      key={`${day}-${hour}`}
                      className="rounded transition-opacity hover:opacity-80 cursor-pointer"
                      style={{
                        backgroundColor: color,
                      }}
                      onMouseEnter={(e) => handleCellHover(e, cell.day, cell.hour, cell.sales)}
                      onMouseLeave={handleCellLeave}
                    />
                  );
                })
              )}
            </div>
          </div>

          {/* Tooltip */}
          {hoveredCell && (
            <div
              className="absolute bg-gray-2 rounded p-2 z-30 pointer-events-none flex flex-col gap-3 items-center justify-center"
              style={{
                left: `${Math.max(16, Math.min(hoveredCell.x - 62, 580))}px`,
                top: `${hoveredCell.y + 55}px`,
                boxShadow: "0px 2px 6px 0px rgba(17, 17, 17, 0.25)",
              }}
            >
              <p className="font-family-dm-sans font-normal text-[14px] leading-[1.3] text-gray-12">
                {getDayName(hoveredCell.day)}
              </p>
              <div className="flex items-center gap-[5px]">
                <span className="font-family-dm-sans font-normal text-[14px] leading-[1.3] text-gray-12">Horário:</span>
                <span className="font-family-dm-sans font-semibold text-[14px] leading-[1.3] text-gray-12">
                  {String(hoveredCell.hour).padStart(2, "0")}:00
                </span>
              </div>
              <div className="flex items-center gap-[5px]">
                <span className="font-family-dm-sans font-normal text-[14px] leading-[1.3] text-gray-12">QT. Vendas:</span>
                <span className="font-family-dm-sans font-semibold text-[14px] leading-[1.3] text-gray-12">
                  {hoveredCell.sales}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
