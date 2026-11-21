import { describe, expect, it } from "vitest";
import { localeFromRequest } from "../detectLocale";

const CHROME = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130 Safari/537.36";

describe("localeFromRequest", () => {
  it("usa o país do IP antes do navegador", () => {
    expect(localeFromRequest("BR", "en-US,en;q=0.9", CHROME)).toBe("pt-BR");
    expect(localeFromRequest("AR", "pt-BR", CHROME)).toBe("es");
    expect(localeFromRequest("US", "pt-BR", CHROME)).toBe("en");
    expect(localeFromRequest("pt", null, CHROME)).toBe("pt-BR");
    expect(localeFromRequest("FR", null, CHROME)).toBe("en");
  });

  it("sem país (ou XX/T1 do Cloudflare) cai no Accept-Language", () => {
    expect(localeFromRequest(null, "es-MX,es;q=0.9", CHROME)).toBe("es");
    expect(localeFromRequest("XX", "pt-PT", CHROME)).toBe("pt-BR");
    expect(localeFromRequest("T1", "en-GB", CHROME)).toBe("en");
    expect(localeFromRequest("", "fr-FR,fr;q=0.9", CHROME)).toBe("en");
  });

  it("sem nenhum sinal → pt-BR", () => {
    expect(localeFromRequest(null, null, CHROME)).toBe("pt-BR");
    expect(localeFromRequest(undefined, "*", undefined)).toBe("pt-BR");
  });

  it("robôs ficam sempre em pt-BR (SEO: o idioma não está na URL)", () => {
    const googlebot = "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";
    expect(localeFromRequest("US", "en-US", googlebot)).toBe("pt-BR");
    expect(localeFromRequest("US", null, "WhatsApp/2.23.20.0")).toBe("pt-BR");
  });
});
