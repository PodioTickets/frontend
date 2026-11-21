"use client";
import { Check, Globe } from "lucide-react";
import { Dropdown } from "../Dropdown";
import { LOCALES, LOCALE_LABELS, type Locale } from "@/i18n/config";
import { useLocale, useSetLocale, useT } from "@/i18n/client";
import { cn } from "@/utils/cn";

/** Ocupa o lugar do ✓ nos idiomas não selecionados — mantém os nomes alinhados. */
const NoIcon = ({ className }: { className?: string }) => <span className={className} />;

/** Desktop: botão só com o globo no header, com a lista de idiomas. */
export function LanguageSwitcher() {
  const { locale } = useLocale();
  const setLocale = useSetLocale();
  const t = useT("common");

  return (
    <Dropdown
      trigger={() => (
        <div className="flex items-center h-full">
          <button
            type="button"
            aria-label={t("language")}
            className="flex items-center justify-center size-10 rounded-full text-[#EEEEEE] hover:bg-[#3A3A3A]/30 transition-colors"
          >
            <Globe className="size-5" />
          </button>
        </div>
      )}
      options={LOCALES.map((l) => ({
        id: l,
        label: LOCALE_LABELS[l].name,
        icon: l === locale ? Check : NoIcon,
      }))}
      // onSelect e não onClick na opção: o Dropdown chama o onClick 2x (item + handleSelect),
      // e cada chamada é um router.refresh().
      onSelect={(o) => o.id !== locale && setLocale(o.id as Locale)}
      // Atributo próprio: com o padrão "dropdown" (o mesmo do perfil), o clicar-fora de um
      // tratava o botão do outro como seu e os dois menus ficavam abertos, um sobre o outro.
      dataAttribute="language"
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
