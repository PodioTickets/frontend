"use client";
import { useState, useCallback, useRef, useEffect, useMemo } from "react";

interface PriceRangeSliderProps {
  min?: number;
  max?: number;
  defaultValue?: [number, number];
  onChange?: (values: [number, number]) => void;
}

export function PriceRangeSlider({
  min = 0,
  max = 10000,
  defaultValue = [min, max],
  onChange,
}: PriceRangeSliderProps) {
  const formatNumberToCurrency = (value: number): string => {
    return new Intl.NumberFormat("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const [values, setValues] = useState<[number, number]>(defaultValue);
  const [minInput, setMinInput] = useState<string>(formatNumberToCurrency(defaultValue[0]));
  const [maxInput, setMaxInput] = useState<string>(formatNumberToCurrency(defaultValue[1]));
  const sliderRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef<"min" | "max" | null>(null);
  const isEditingMin = useRef(false);
  const isEditingMax = useRef(false);
  const wasDragging = useRef(false);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
    }).format(value);
  };

  const getPercentage = (value: number) => {
    return ((value - min) / (max - min)) * 100;
  };

  const handleMinChange = useCallback(
    (newMin: number) => {
      const clampedMin = Math.max(min, Math.min(newMin, values[1] - 0.01));
      const newValues: [number, number] = [clampedMin, values[1]];
      setValues(newValues);
      // Não atualiza o input aqui se estiver editando (será atualizado pelo useEffect)
      if (!isEditingMin.current) {
        setMinInput(formatNumberToCurrency(clampedMin));
      }
      onChange?.(newValues);
    },
    [min, values, onChange]
  );

  const handleMaxChange = useCallback(
    (newMax: number) => {
      const clampedMax = Math.min(max, Math.max(newMax, values[0] + 0.01));
      const newValues: [number, number] = [values[0], clampedMax];
      setValues(newValues);
      // Não atualiza o input aqui se estiver editando (será atualizado pelo useEffect)
      if (!isEditingMax.current) {
        setMaxInput(formatNumberToCurrency(clampedMax));
      }
      onChange?.(newValues);
    },
    [max, values, onChange]
  );

  const handleMouseDown = useCallback(
    (type: "min" | "max") => (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      isDragging.current = type;
      document.body.style.userSelect = "none";
    },
    []
  );

  const handleTouchStart = useCallback(
    (type: "min" | "max") => (e: React.TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      isDragging.current = type;
      document.body.style.userSelect = "none";
    },
    []
  );

  useEffect(() => {
    const handleMove = (clientX: number) => {
      if (!isDragging.current || !sliderRef.current) return;

      const rect = sliderRef.current.getBoundingClientRect();
      const percentage = Math.max(
        0,
        Math.min(100, ((clientX - rect.left) / rect.width) * 100)
      );
      const value = Math.round(min + (percentage / 100) * (max - min));

      if (isDragging.current === "min") {
        handleMinChange(value);
      } else if (isDragging.current === "max") {
        handleMaxChange(value);
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging.current) {
        e.preventDefault();
        handleMove(e.clientX);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isDragging.current && e.touches.length > 0) {
        e.preventDefault();
        handleMove(e.touches[0].clientX);
      }
    };

    const handleMouseUp = () => {
      if (isDragging.current) {
        wasDragging.current = true;
        isDragging.current = null;
        document.body.style.userSelect = "";
        // Reset flag after a short delay
        setTimeout(() => {
          wasDragging.current = false;
        }, 150);
      }
    };

    const handleTouchEnd = () => {
      if (isDragging.current) {
        wasDragging.current = true;
        isDragging.current = null;
        document.body.style.userSelect = "";
        // Reset flag after a short delay
        setTimeout(() => {
          wasDragging.current = false;
        }, 150);
      }
    };

    // Always add listeners, they check isDragging internally
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("touchmove", handleTouchMove, { passive: false });
    document.addEventListener("touchend", handleTouchEnd);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
      document.body.style.userSelect = "";
    };
  }, [min, max, handleMinChange, handleMaxChange]);

  const parseInputToNumber = (value: string): number => {
    if (!value || value.trim() === "") return 0;
    
    // Remove tudo exceto números, vírgula e ponto
    let cleaned = value.replace(/[^\d,.]/g, "");
    
    if (!cleaned) return 0;
    
    // Detecta se usa vírgula ou ponto como separador decimal
    const hasComma = cleaned.includes(",");
    const hasDot = cleaned.includes(".");
    
    if (hasComma && hasDot) {
      // Se tem ambos, vírgula é decimal (formato BR)
      cleaned = cleaned.replace(/\./g, "").replace(",", ".");
    } else if (hasComma) {
      // Só vírgula, substitui por ponto
      cleaned = cleaned.replace(",", ".");
    }
    // Se só tem ponto ou nenhum, mantém como está
    
    const numValue = parseFloat(cleaned);
    return isNaN(numValue) ? 0 : numValue;
  };

  // Formata valor para exibição em tempo real durante edição
  const formatWhileTyping = (value: string): string => {
    if (!value) return "";
    
    // Remove formatação existente para processar
    const numValue = parseInputToNumber(value);
    
    if (numValue === 0 && !value.match(/[0-9]/)) {
      return "";
    }
    
    // Formata em tempo real
    return formatNumberToCurrency(numValue);
  };

  const handleMinInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    isEditingMin.current = true;
    
    // Permite digitação livre (números, vírgula e ponto)
    setMinInput(inputValue);
    
    // Atualiza o valor numérico em tempo real (mantém centavos)
    const numValue = parseInputToNumber(inputValue);
    if (!isNaN(numValue) && numValue >= 0) {
      // Mantém centavos, não arredonda
      handleMinChange(numValue);
    }
  };

  const handleMaxInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    isEditingMax.current = true;
    
    // Permite digitação livre (números, vírgula e ponto)
    setMaxInput(inputValue);
    
    // Atualiza o valor numérico em tempo real (mantém centavos)
    const numValue = parseInputToNumber(inputValue);
    if (!isNaN(numValue) && numValue >= 0) {
      // Mantém centavos, não arredonda
      handleMaxChange(numValue);
    }
  };

  const handleMinFocus = () => {
    isEditingMin.current = true;
    // Mostrar valor formatado mas editável quando focar
    setMinInput(formatNumberToCurrency(values[0]));
  };

  const handleMaxFocus = () => {
    isEditingMax.current = true;
    // Mostrar valor formatado mas editável quando focar
    setMaxInput(formatNumberToCurrency(values[1]));
  };

  const handleMinBlur = () => {
    isEditingMin.current = false;
    // Formatar como moeda ao perder o foco
    setMinInput(formatNumberToCurrency(values[0]));
  };

  const handleMaxBlur = () => {
    isEditingMax.current = false;
    // Formatar como moeda ao perder o foco
    setMaxInput(formatNumberToCurrency(values[1]));
  };

  // Sync inputs when values change externally (from slider drag)
  useEffect(() => {
    if (!isEditingMin.current) {
      setMinInput(formatNumberToCurrency(values[0]));
    }
    if (!isEditingMax.current) {
      setMaxInput(formatNumberToCurrency(values[1]));
    }
  }, [values]);

  // Formatação em tempo real com debounce durante edição
  // Usa ref para evitar loop infinito
  const minInputTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const maxInputTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Só formata se estiver editando e o valor mudou
    if (!isEditingMin.current) return;
    
    if (minInputTimeoutRef.current) {
      clearTimeout(minInputTimeoutRef.current);
    }
    
    minInputTimeoutRef.current = setTimeout(() => {
      if (isEditingMin.current) {
        const numValue = parseInputToNumber(minInput);
        if (!isNaN(numValue) && numValue >= 0 && minInput && minInput.trim() !== "") {
          const formatted = formatNumberToCurrency(numValue);
          // Só atualiza se o valor formatado for diferente do atual
          if (formatted !== minInput) {
            setMinInput(formatted);
          }
        }
      }
    }, 1000); // Formata após 1s sem digitação

    return () => {
      if (minInputTimeoutRef.current) {
        clearTimeout(minInputTimeoutRef.current);
      }
    };
  }, [minInput]);

  useEffect(() => {
    // Só formata se estiver editando e o valor mudou
    if (!isEditingMax.current) return;
    
    if (maxInputTimeoutRef.current) {
      clearTimeout(maxInputTimeoutRef.current);
    }
    
    maxInputTimeoutRef.current = setTimeout(() => {
      if (isEditingMax.current) {
        const numValue = parseInputToNumber(maxInput);
        if (!isNaN(numValue) && numValue >= 0 && maxInput && maxInput.trim() !== "") {
          const formatted = formatNumberToCurrency(numValue);
          // Só atualiza se o valor formatado for diferente do atual
          if (formatted !== maxInput) {
            setMaxInput(formatted);
          }
        }
      }
    }, 1000); // Formata após 1s sem digitação

    return () => {
      if (maxInputTimeoutRef.current) {
        clearTimeout(maxInputTimeoutRef.current);
      }
    };
  }, [maxInput]);

  const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Don't handle if we just finished dragging
    if (wasDragging.current) {
      wasDragging.current = false;
      return;
    }

    // Don't handle if clicking on a thumb
    if ((e.target as HTMLElement).closest("[data-thumb]")) {
      return;
    }

    if (!sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    const percentage = Math.max(
      0,
      Math.min(100, ((e.clientX - rect.left) / rect.width) * 100)
    );
    const value = Math.round(min + (percentage / 100) * (max - min));

    const minDistance = Math.abs(value - values[0]);
    const maxDistance = Math.abs(value - values[1]);

    if (minDistance < maxDistance) {
      handleMinChange(value);
    } else {
      handleMaxChange(value);
    }
  };

  const minPercentage = getPercentage(values[0]);
  const maxPercentage = getPercentage(values[1]);

  return (
    <div className="px-6 py-5 w-full max-w-[570px]">
      <h1>Preços sem incluir impostos</h1>
      <div
        ref={sliderRef}
        className="relative h-10 cursor-pointer w-full py-2"
        onClick={handleTrackClick}
      >
        <div className="absolute top-1/2 left-0 w-full h-px bg-gray-4 rounded-full transform -translate-y-1/2" />

        <div
          className="absolute top-1/2 h-px bg-primary-12 rounded-full transform -translate-y-1/2"
          style={{
            left: `${minPercentage}%`,
            width: `${maxPercentage - minPercentage}%`,
          }}
        />

        <div
          data-thumb="min"
          className="absolute ml-[10px] w-6 h-6 bg-primary-12 rounded-full cursor-grab active:cursor-grabbing shadow-lg transform -translate-x-1/2 -translate-y-1/2 hover:scale-110 active:scale-95 transition-transform z-20 flex items-center justify-center select-none"
          style={{ left: `${minPercentage}%`, top: "50%" }}
          onMouseDown={handleMouseDown("min")}
          onTouchStart={handleTouchStart("min")}
        >
          <div className="w-2.5 h-2.5 bg-white rounded-full" />
        </div>

        <div
          data-thumb="max"
          className="absolute -ml-[10px] w-6 h-6 bg-primary-12 rounded-full cursor-grab active:cursor-grabbing shadow-lg transform -translate-x-1/2 -translate-y-1/2 hover:scale-110 active:scale-95 transition-transform z-20 flex items-center justify-center select-none"
          style={{ left: `${maxPercentage}%`, top: "50%" }}
          onMouseDown={handleMouseDown("max")}
          onTouchStart={handleTouchStart("max")}
        >
          <div className="w-2.5 h-2.5 bg-white rounded-full" />
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 mb-6 w-full">
        <div className="flex-1">
          <label className="text-xs text-gray-11 mb-2 block">Mínimo</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-11 pointer-events-none">
              R$
            </span>
            <input
              type="text"
              value={minInput}
              onChange={handleMinInputChange}
              onFocus={handleMinFocus}
              onBlur={handleMinBlur}
              className="w-full pl-10 pr-4 py-2 bg-transparent border border-gray-6 rounded-lg text-gray-12 focus:outline-none focus:ring-2 focus:ring-primary-12 focus:border-transparent"
              placeholder={formatNumberToCurrency(min)}
            />
          </div>
        </div>
        <div className="flex-1">
          <label className="text-xs text-gray-11 mb-2 block">Máximo</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-11 pointer-events-none">
              R$
            </span>
            <input
              type="text"
              value={maxInput}
              onChange={handleMaxInputChange}
              onFocus={handleMaxFocus}
              onBlur={handleMaxBlur}
              className="w-full pl-10 pr-4 py-2 bg-transparent border border-gray-6 rounded-lg text-gray-12 focus:outline-none focus:ring-2 focus:ring-primary-12 focus:border-transparent"
              placeholder={formatNumberToCurrency(max)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
