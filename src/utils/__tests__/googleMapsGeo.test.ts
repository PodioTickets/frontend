import { describe, it, expect } from "vitest";
import {
  parseCoordinate,
  isValidLatitude,
  isValidLongitude,
  hasValidCoordinates,
  roundCoordinate,
  buildGoogleMapsLinkFromCoordinates,
  formatCoordinatesLabel,
} from "@/utils/googleMapsGeo";
import { googleMapsLinkToEmbedUrl } from "@/utils/googleMapsEmbed";

describe("parseCoordinate", () => {
  it("aceita número finito e string numérica", () => {
    expect(parseCoordinate(-23.5)).toBe(-23.5);
    expect(parseCoordinate("-46.6333")).toBe(-46.6333);
    expect(parseCoordinate(" 10 ")).toBe(10);
  });

  it("tolera vírgula decimal", () => {
    expect(parseCoordinate("-23,55")).toBe(-23.55);
  });

  it("rejeita vazio / não-número / infinito / NaN", () => {
    expect(parseCoordinate("")).toBeNull();
    expect(parseCoordinate("abc")).toBeNull();
    expect(parseCoordinate(null)).toBeNull();
    expect(parseCoordinate(undefined)).toBeNull();
    expect(parseCoordinate(Infinity)).toBeNull();
    expect(parseCoordinate(NaN)).toBeNull();
  });
});

describe("validação de faixa", () => {
  it("latitude só em [-90, 90]", () => {
    expect(isValidLatitude(-90)).toBe(true);
    expect(isValidLatitude(90)).toBe(true);
    expect(isValidLatitude(0)).toBe(true);
    expect(isValidLatitude(90.1)).toBe(false);
    expect(isValidLatitude(-91)).toBe(false);
    expect(isValidLatitude("")).toBe(false);
  });

  it("longitude só em [-180, 180]", () => {
    expect(isValidLongitude(-180)).toBe(true);
    expect(isValidLongitude(180)).toBe(true);
    expect(isValidLongitude(180.1)).toBe(false);
    expect(isValidLongitude(-181)).toBe(false);
  });

  it("hasValidCoordinates exige os dois válidos", () => {
    expect(hasValidCoordinates(-23.5, -46.6)).toBe(true);
    expect(hasValidCoordinates(-23.5, "")).toBe(false);
    expect(hasValidCoordinates("", -46.6)).toBe(false);
    expect(hasValidCoordinates(200, -46.6)).toBe(false);
  });
});

describe("roundCoordinate", () => {
  it("limita a 7 casas decimais", () => {
    expect(roundCoordinate(-23.123456789)).toBe(-23.1234568);
    expect(roundCoordinate(10)).toBe(10);
  });
});

describe("buildGoogleMapsLinkFromCoordinates", () => {
  it("gera URL canônica com query=lat,lng", () => {
    const link = buildGoogleMapsLinkFromCoordinates(-23.5613, -46.6565);
    expect(link).toBe(
      "https://www.google.com/maps/search/?api=1&query=-23.5613%2C-46.6565",
    );
  });

  it("retorna string vazia para coordenadas inválidas", () => {
    expect(buildGoogleMapsLinkFromCoordinates("", "")).toBe("");
    expect(buildGoogleMapsLinkFromCoordinates(200, 10)).toBe("");
    expect(buildGoogleMapsLinkFromCoordinates(10, 999)).toBe("");
  });

  it("é compatível com o embed existente (googleMapsLinkToEmbedUrl lê o query)", () => {
    const link = buildGoogleMapsLinkFromCoordinates(-23.5613, -46.6565);
    const embed = googleMapsLinkToEmbedUrl(link);
    expect(embed).toContain("output=embed");
    // O param query preservado é a coordenada exata do pino.
    expect(embed).toContain(encodeURIComponent("-23.5613,-46.6565"));
  });
});

describe("formatCoordinatesLabel", () => {
  it("formata com 5 casas", () => {
    expect(formatCoordinatesLabel(-23.5613, -46.6565)).toBe("-23.56130, -46.65650");
  });

  it("string vazia quando faltam coordenadas", () => {
    expect(formatCoordinatesLabel("", 10)).toBe("");
  });
});
