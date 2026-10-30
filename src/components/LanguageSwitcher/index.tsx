"use client";
import { Check, Globe } from "lucide-react";
import { Dropdown } from "../Dropdown";
import { ArrowButton } from "../ArrowButton";
import { LOCALES, LOCALE_LABELS } from "@/i18n/config";
import { useLocale, useSetLocale, useT } from "@/i18n/client";
import { cn } from "@/utils/cn";

/** Ocupa o lugar do ✓ nos idiomas não selecionados — mantém os nomes alinhados. */
const NoIcon = ({ className }: { className?: string }) => <span className={className} />;

/** Desktop: botão "🌐 PT" no header (mesma moldura do "Criar conta") com a lista de idiomas. */
export function LanguageSwitcher() {
  const { locale } = useLocale();
  const setLocale = useSetLocale();
  const t = useT("common");

  return (
    <Dropdown
      trigger={(isOpen) => (
        <button
          type="button"
          aria-label={t("language")}
          className="flex items-center gap-1.5 h-[44px] px-3 rounded-md border border-[#3A3A3A] text-[#EEEEEE] text-sm font-bold font-manrope hover:bg-[#3A3A3A]/10 transition-colors"
        >
          <Globe className="size-4" />
          {LOCALE_LABELS[locale].short}
          <ArrowButton isOpen={isOpen} className="ml-0.5" />
        </button>
      )}
      options={LOCALES.map((l) => ({
        id: l,
        label: LOCALE_LABELS[l].name,
        icon: l === locale ? Check : NoIcon,
        onClick: () => l !== locale && setLocale(l),
      }))}
      onSelect={(option) => option.onClick?.()}
      position="bottom"
      align="end"
      width="w-[180px]"
      className="right-0 mt-3"
    />
  );
}

/** Menu mobile: linha "Idioma" com seletor segmentado PT | EN | ES (um toque, sem submenu). */
export function LanguageSegmented({ className }: { className?: string }) {
  const { locale } = useLocale();
  const setLocale = useSetLocale();
  const t = useT("common");

  return (
    <div className={cn("flex items-center justify-between gap-2 h-[52px] px-4", className)}>
      <span className="flex items-center gap-2 text-base font-medium text-[#EEE]">
        <Globe className="size-5" />
        {t("language")}
      </span>
      <div role="radiogroup" aria-label={t("language")} className="flex rounded-lg border border-[#3A3A3A] p-0.5">
        {LOCALES.map((l) => (
          <button
            key={l}
            type="button"
            role="radio"
            aria-checked={l === locale}
            aria-label={LOCALE_LABELS[l].name}
            onClick={() => l !== locale && setLocale(l)}
            className={cn(
              "h-8 min-w-10 px-2 rounded-md text-sm font-bold font-manrope transition-colors",
              l === locale ? "bg-[#59E373] text-[#141414]" : "text-[#B4B4B4] hover:text-[#EEE]",
            )}
          >
            {LOCALE_LABELS[l].short}
          </button>
        ))}
      </div>
    </div>
  );
}
