"use client";
import { useLanguage, Language } from "@/contexts/LanguageContext";
import { Dropdown, DropdownOption } from "../Dropdown";
import { Globe } from "lucide-react";

interface LanguageToggleProps {
  className?: string;
}

const languages: Array<{ code: Language; label: string; flag: string }> = [
  { code: "pt", label: "Português", flag: "🇧🇷" },
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "es", label: "Español", flag: "🇪🇸" },
];

export function LanguageToggle({ className = "" }: LanguageToggleProps) {
  const { language, setLanguage } = useLanguage();

  const currentLanguage =
    languages.find((lang) => lang.code === language) || languages[0];

  const dropdownOptions: DropdownOption[] = languages.map((lang) => ({
    label: `${lang.flag} ${lang.label}`,
    onClick: () => setLanguage(lang.code),
  }));

  return (
    <div className={className}>
      <Dropdown
        options={dropdownOptions}
        dataAttribute="language"
        width="w-40"
        maxHeight="max-h-[200px]"
        className="top-16"
        trigger={(isOpen) => (
          <button
            className="relative w-12 h-[44px] flex items-center justify-center rounded-lg border border-[#3A3A3A] bg-transparent transition-all duration-200 cursor-pointer"
            title={`Idioma atual: ${currentLanguage.label}`}
          >
            <Globe className="w-5 h-5 text-gray-4" />
          </button>
        )}
      />
    </div>
  );
}
