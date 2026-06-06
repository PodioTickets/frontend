import { describe, expect, it } from "vitest";
import {
  googleMapsLinkToEmbedUrl,
  isShortGoogleMapsLink,
  safeGoogleMapsExternalLink,
} from "../googleMapsEmbed";

describe("googleMapsLinkToEmbedUrl", () => {
  it("converte o formato recomendado (search/?api=1&query=)", () => {
    expect(
      googleMapsLinkToEmbedUrl(
        "https://www.google.com/maps/search/?api=1&query=Av.+Paulista+2084+S%C3%A3o+Paulo+SP",
      ),
    ).toBe(
      // URLSearchParams decodifica `+` como espaço (semântica de query string)
      `https://www.google.com/maps?q=${encodeURIComponent("Av. Paulista 2084 São Paulo SP")}&output=embed`,
    );
  });

  it("aceita link sem protocolo (como o placeholder do form)", () => {
    expect(
      googleMapsLinkToEmbedUrl("www.google.com/maps/search/?api=1&query=Praia+de+Copacabana"),
    ).toContain("output=embed");
  });

  it("converte ?q= direto", () => {
    expect(googleMapsLinkToEmbedUrl("https://maps.google.com/maps?q=Pra%C3%A7a+da+S%C3%A9")).toBe(
      `https://www.google.com/maps?q=${encodeURIComponent("Praça da Sé")}&output=embed`,
    );
  });

  it("usa coordenadas de /maps/place/<nome>/@lat,lng", () => {
    expect(
      googleMapsLinkToEmbedUrl(
        "https://www.google.com/maps/place/Parque+Ibirapuera/@-23.5874162,-46.6576336,17z",
      ),
    ).toBe(
      `https://www.google.com/maps?q=${encodeURIComponent("-23.5874162,-46.6576336")}&output=embed`,
    );
  });

  it("prioriza a coordenada do PIN (!3d/!4d) sobre a da câmera (@)", () => {
    expect(
      googleMapsLinkToEmbedUrl(
        "https://www.google.com/maps/place/Parque+Ibirapuera/@-23.58,-46.65,17z/data=!3m1!4b1!4m6!3m5!1s0x0:0x0!8m2!3d-23.5874162!4d-46.6576336!16s",
      ),
    ).toBe(
      `https://www.google.com/maps?q=${encodeURIComponent("-23.5874162,-46.6576336")}&output=embed`,
    );
  });

  it("usa o segmento de path quando não há coordenada", () => {
    expect(
      googleMapsLinkToEmbedUrl("https://www.google.com/maps/place/Parque+Ibirapuera"),
    ).toBe(`https://www.google.com/maps?q=${encodeURIComponent("Parque Ibirapuera")}&output=embed`);
  });

  it("aceita TLD regional (google.com.br)", () => {
    expect(
      googleMapsLinkToEmbedUrl("https://www.google.com.br/maps?q=Centro"),
    ).toContain("output=embed");
  });

  it("retorna null pra link curto (não conversível client-side)", () => {
    expect(googleMapsLinkToEmbedUrl("https://maps.app.goo.gl/AbCd1234")).toBeNull();
  });

  it("rejeita host que não é Google (segurança do iframe)", () => {
    expect(googleMapsLinkToEmbedUrl("https://evil.com/maps?q=x")).toBeNull();
    expect(googleMapsLinkToEmbedUrl("https://notgoogle.com/maps?q=x")).toBeNull();
    expect(
      googleMapsLinkToEmbedUrl("https://google.com.evil.com/maps?q=x"),
    ).toBeNull();
  });

  it("rejeita protocolo não-http(s)", () => {
    expect(googleMapsLinkToEmbedUrl("javascript:alert(1)")).toBeNull();
  });

  it("trata vazio/null/undefined", () => {
    expect(googleMapsLinkToEmbedUrl("")).toBeNull();
    expect(googleMapsLinkToEmbedUrl("   ")).toBeNull();
    expect(googleMapsLinkToEmbedUrl(null)).toBeNull();
    expect(googleMapsLinkToEmbedUrl(undefined)).toBeNull();
  });
});

describe("safeGoogleMapsExternalLink", () => {
  it("devolve o link do organizador normalizado", () => {
    expect(
      safeGoogleMapsExternalLink("www.google.com/maps/search/?api=1&query=X"),
    ).toBe("https://www.google.com/maps/search/?api=1&query=X");
  });

  it("aceita link curto goo.gl (redirect resolve no browser)", () => {
    expect(safeGoogleMapsExternalLink("https://maps.app.goo.gl/AbCd1234")).toBe(
      "https://maps.app.goo.gl/AbCd1234",
    );
  });

  it("rejeita host não-Google", () => {
    expect(safeGoogleMapsExternalLink("https://evil.com/maps")).toBeNull();
  });
});

describe("isShortGoogleMapsLink", () => {
  it("detecta maps.app.goo.gl e goo.gl (com ou sem protocolo)", () => {
    expect(isShortGoogleMapsLink("https://maps.app.goo.gl/AbCd1234")).toBe(true);
    expect(isShortGoogleMapsLink("maps.app.goo.gl/AbCd1234")).toBe(true);
    expect(isShortGoogleMapsLink("https://goo.gl/maps/AbCd1234")).toBe(true);
  });

  it("não considera links longos nem hosts estranhos", () => {
    expect(isShortGoogleMapsLink("https://www.google.com/maps?q=Centro")).toBe(false);
    expect(isShortGoogleMapsLink("https://evil.goo.gl.evil.com/x")).toBe(false);
    expect(isShortGoogleMapsLink(null)).toBe(false);
    expect(isShortGoogleMapsLink("")).toBe(false);
  });
});
