import { useState, useMemo, useEffect, useRef } from "react";
import { Search } from "lucide-react";
import { ArrowButton } from "../ArrowButton";
import { FlagIcon } from "../Icons/FlagIcon";
import { useT, useLocale } from "@/i18n/client";
import { countryDisplayName, countryMatches, countryOptions } from "@/i18n/countryName";

/**
 * Dropdown de nacionalidade pra o card de participante.
 * Mesma UX do dropdown usado no RegisterModal / /user/page.tsx — busca client-side
 * com normalização de acentos. Encapsulado aqui pra evitar duplicação dos handlers
 * de outside-click e estado em cada card.
 */
export function NationalitySelect({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (country: string) => void;
  disabled?: boolean;
}) {
  const t = useT("checkoutInfo");
  const { intl } = useLocale();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const options = useMemo(() => countryOptions(intl), [intl]);

  const filtered = useMemo(() => {
    if (!search.trim()) return options;
    return options.filter((opt) => countryMatches(opt, search));
  }, [options, search]);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      const el = ref.current;
      if (el && !el.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div className="w-full relative" ref={ref}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          setOpen((v) => !v);
          if (!open) setSearch("");
        }}
        className="border border-gray-6 rounded-lg h-12 flex items-center justify-between px-3 w-full hover:bg-gray-3 transition-colors cursor-pointer text-left disabled:opacity-50 disabled:cursor-not-allowed bg-gray-2"
      >
        <div className="flex gap-1 items-center flex-1 min-w-0">
          <FlagIcon className="w-5 h-5 text-gray-11 shrink-0" />
          <span
            className={`font-normal text-base leading-[1.3] font-family-dm-sans truncate ${value ? "text-gray-12" : "text-gray-11"}`}
          >
            {countryDisplayName(value, intl) || t("select")}
          </span>
        </div>
        <div className="flex-none -scale-y-100 shrink-0">
          <ArrowButton isOpen={open} />
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
          <div className="max-h-[220px] overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-gray-6 [&::-webkit-scrollbar-thumb]:rounded-full">
            {filtered.length === 0 ? (
              <div className="px-3 py-4 text-sm text-gray-11 font-family-dm-sans text-center">
                {t("noCountryFound")}
              </div>
            ) : (
              filtered.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => {
                    onChange(option.label);
                    setOpen(false);
                    setSearch("");
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
