import { describe, it, expect } from "vitest";
import {
  parseCoordinate,
  isValidLatitude,
  isValidLongitude,
  hasValidCoordinates,
  roundCoordinate,
  buildGoogleMapsLinkFromCoordinates,
  formatCoordinatesLabel,
  parseGoogleAddressComponents,
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

describe("parseGoogleAddressComponents", () => {
  it("extrai cep/rua+número/bairro/cidade/UF do Geocoder clássico (long_name/short_name)", () => {
    const components = [
      { types: ["street_number"], long_name: "1578", short_name: "1578" },
      { types: ["route"], long_name: "Avenida Paulista", short_name: "Av. Paulista" },
      { types: ["sublocality_level_1", "sublocality"], long_name: "Bela Vista", short_name: "Bela Vista" },
      { types: ["locality"], long_name: "São Paulo", short_name: "São Paulo" },
      { types: ["administrative_area_level_1"], long_name: "São Paulo", short_name: "SP" },
      { types: ["postal_code"], long_name: "01310-100", short_name: "01310-100" },
    ];
    expect(parseGoogleAddressComponents(components)).toEqual({
      cep: "01310-100",
      street: "Avenida Paulista, 1578",
      neighborhood: "Bela Vista",
      city: "São Paulo",
      state: "SP", // short_name (UF)
    });
  });

  it("aceita o shape da Places API New (longText/shortText)", () => {
    const components = [
      { types: ["route"], longText: "Rua da Praia", shortText: "R. da Praia" },
      { types: ["administrative_area_level_1"], longText: "Rio Grande do Sul", shortText: "RS" },
      { types: ["administrative_area_level_2"], longText: "Porto Alegre", shortText: "Porto Alegre" },
    ];
    const r = parseGoogleAddressComponents(components);
    // Sem street_number → só o logradouro; cidade cai no nível 2 quando falta locality.
    expect(r.street).toBe("Rua da Praia");
    expect(r.city).toBe("Porto Alegre");
    expect(r.state).toBe("RS");
    expect(r.cep).toBe("");
    expect(r.neighborhood).toBe("");
  });

  it("entrada inválida/vazia → todos os campos vazios", () => {
    const empty = { cep: "", street: "", neighborhood: "", city: "", state: "" };
    expect(parseGoogleAddressComponents(undefined)).toEqual(empty);
    expect(parseGoogleAddressComponents(null)).toEqual(empty);
    expect(parseGoogleAddressComponents([])).toEqual(empty);
    expect(parseGoogleAddressComponents("nope")).toEqual(empty);
  });

  it("prefere locality sobre administrative_area_level_2 para cidade", () => {
    const components = [
      { types: ["locality"], long_name: "Campinas" },
      { types: ["administrative_area_level_2"], long_name: "Região de Campinas" },
    ];
    expect(parseGoogleAddressComponents(components).city).toBe("Campinas");
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
