"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { Search } from "lucide-react";
import { ArrowButton } from "@/components/ArrowButton";
import { cn } from "@/utils/cn";

function normalizeForSearch(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

export interface SearchSelectOption {
  value: string;
  label: string;
}

export interface SearchSelectProps {
  /** Valor selecionado (option.value). */
  value: string;
  onChange: (option: SearchSelectOption) => void;
  options: SearchSelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  /** Texto quando a busca não encontra nada. */
  emptyText?: string;
  /** Mostra estado de carregando dentro do popover. */
  loading?: boolean;
  disabled?: boolean;
  "aria-invalid"?: boolean;
  triggerClassName?: string;
  className?: string;
}

/**
 * Select genérico com busca client-side (mesma UX do `CountrySearchSelect`).
 * Usado no checkout estrangeiro para estado/província e cidade. A busca é
 * acento/caixa-insensível. Fecha ao clicar fora.
 */
export function SearchSelect({
  value,
  onChange,
  options,
  placeholder = "Selecione",
  searchPlaceholder = "Pesquisar",
  emptyText = "Nenhum resultado",
  loading = false,
  disabled = false,
  "aria-invalid": ariaInvalid,
  triggerClassName,
  className,
}: SearchSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  const selectedLabel = useMemo(
    () => options.find((o) => o.value === value)?.label ?? "",
    [options, value],
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return options;
    const q = normalizeForSearch(search);
    return options.filter((opt) => normalizeForSearch(opt.label).includes(q));
  }, [options, search]);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div ref={rootRef} className={cn("relative w-full", className)}>
      <button
        type="button"
        disabled={disabled}
        aria-invalid={ariaInvalid}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => {
          if (disabled) return;
          setOpen((v) => !v);
          if (!open) setSearch("");
        }}
        className={cn(
          "border border-gray-6 rounded-lg h-12 flex items-center justify-between px-3 w-full bg-gray-1 hover:border-gray-8 transition-colors cursor-pointer text-left disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-gray-6",
          triggerClassName,
        )}
      >
        <span
          className={cn(
            "font-normal text-base leading-[1.3] font-family-dm-sans truncate",
            selectedLabel ? "text-gray-12" : "text-gray-11",
          )}
        >
          {selectedLabel || placeholder}
        </span>
        <div className="flex-none shrink-0">
          <ArrowButton isOpen={open} className="size-3 text-gray-12" />
        </div>
      </button>
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 z-60 bg-gray-1 border border-gray-6 rounded-lg shadow-lg overflow-hidden">
          <div className="p-2 border-b border-gray-6">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-11" />
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onMouseDown={(e) => e.stopPropagation()}
                className="w-full h-9 pl-8 pr-3 rounded-md border border-gray-6 bg-gray-2 text-sm font-family-dm-sans text-gray-12 placeholder:text-gray-10 focus:outline-none focus:ring-2 focus:ring-primary-8 focus:border-transparent"
                autoFocus
              />
            </div>
          </div>
          <div
            className="max-h-[220px] overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] [touch-action:pan-y] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-gray-6 [&::-webkit-scrollbar-thumb]:rounded-full"
            role="listbox"
          >
            {loading ? (
              <div className="px-3 py-4 text-sm text-gray-11 font-family-dm-sans text-center">
                Carregando...
              </div>
            ) : filtered.length === 0 ? (
              <div className="px-3 py-4 text-sm text-gray-11 font-family-dm-sans text-center">
                {emptyText}
              </div>
            ) : (
              filtered.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={value === option.value}
                  onClick={() => {
                    onChange(option);
                    setOpen(false);
                    setSearch("");
                  }}
                  className="w-full px-3 py-2.5 text-left text-sm font-family-dm-sans text-gray-12 hover:bg-gray-3 transition-colors"
                >
                  {option.label}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
