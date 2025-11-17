"use client";
import React, { createContext, useContext, useState, useEffect } from "react";
import { translations } from "@/constants/translations";

export type Language = "en" | "pt" | "es";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined
);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>("pt");

  useEffect(() => {
    const savedLanguage = localStorage.getItem("language") as Language;
    if (savedLanguage && (savedLanguage === "en" || savedLanguage === "pt" || savedLanguage === "es")) {
      setLanguage(savedLanguage);
    }
  }, []);

  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem("language", lang);
  };

  const t = (key: string): string => {
    // Try nested object access first (for profile, etc.)
    const keys = key.split(".");
    let value: any = (translations as any)[language];
    for (const k of keys) {
      value = value?.[k];
    }

    // If nested access found a value, return it
    if (value && typeof value === "string") {
      return value;
    }

    // Try direct key access (for navigation, etc.)
    const directValue = ((translations as any)[language] as any)?.[key];
    if (directValue && typeof directValue === "string") {
      return directValue;
    }

    // Return key as fallback
    return key;
  };

  return (
    <LanguageContext.Provider
      value={{ language, setLanguage: handleSetLanguage, t }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
