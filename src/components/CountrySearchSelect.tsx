"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { Search } from "lucide-react";
import { ArrowButton } from "@/components/ArrowButton";
import { FlagIcon } from "@/components/Icons/FlagIcon";
import { cn } from "@/utils/cn";
import { useT, useLocale } from "@/i18n/client";
import { countryDisplayName, countryMatches, countryOptions } from "@/i18n/countryName";

export interface CountrySearchSelectProps {
  /** Nome do país em português (ex.: "Brasil"), igual ao modal de cadastro */
  value: string;
  onChange: (countryLabel: string) => void;
  className?: string;
  triggerClassName?: string;
  placeholder?: string;
  "aria-invalid"?: boolean;
  id?: string;
}

export function CountrySearchSelect({
  value,
  onChange,
  className,
  triggerClassName,
  placeholder,
  "aria-invalid": ariaInvalid,
  id,
}: CountrySearchSelectProps) {
  const [open, setOpen] = useState(false);
  const t = useT("ui");
  const { intl } = useLocale();
  const [search, setSearch] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  const options = useMemo(() => countryOptions(intl), [intl]);

  const filtered = useMemo(() => {
    if (!search.trim()) return options;
    return options.filter((opt) => countryMatches(opt, search));
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
        id={id}
        type="button"
        aria-invalid={ariaInvalid}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => {
          setOpen((v) => !v);
          if (!open) setSearch("");
        }}
        className={cn(
          "border border-gray-6 rounded-lg h-12 flex items-center justify-between px-3 w-full bg-gray-1 hover:border-gray-8 transition-colors cursor-pointer text-left",
          triggerClassName
        )}
      >
        <div className="flex gap-2 items-center flex-1 min-w-0"> 
          <span
            className={cn(
              "font-normal text-base leading-[1.3] font-family-dm-sans truncate",
              value ? "text-gray-12" : "text-gray-11"
            )}
          >
            {countryDisplayName(value, intl) || (placeholder ?? t("select"))}
          </span>
        </div>
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
                placeholder={t("searchCountry")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onMouseDown={(e) => e.stopPropagation()}
                className="w-full h-9 pl-8 pr-3 rounded-md border border-gray-6 bg-gray-2 text-sm font-family-dm-sans text-gray-12 placeholder:text-gray-10 focus:outline-none focus:ring-2 focus:ring-primary-8 focus:border-transparent"
              />
            </div>
          </div>
          <div
            className="max-h-[220px] overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] [touch-action:pan-y] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-gray-6 [&::-webkit-scrollbar-thumb]:rounded-full"
            role="listbox"
          >
            {filtered.length === 0 ? (
              <div className="px-3 py-4 text-sm text-gray-11 font-family-dm-sans text-center">
                {t("noCountryFound")}
              </div>
            ) : (
              filtered.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  role="option"
                  aria-selected={value === option.label}
                  onClick={() => {
                    onChange(option.label);
                    setOpen(false);
                  }}
                  className="w-full px-3 py-2.5 text-left text-sm font-family-dm-sans text-gray-12 hover:bg-gray-3 transition-colors"
                >
                  {option.display}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
