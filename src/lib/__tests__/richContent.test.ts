import { describe, it, expect } from "vitest";

import {
  isAllowedEmbedIframeSrc,
  isAllowedEmbedScriptSrc,
  filterAllowedEmbedScriptSrcs,
  sanitizeRichHtml,
} from "../richContent";

describe("isAllowedEmbedIframeSrc", () => {
  it("permite provedores de embed confiáveis (inclui subdomínios)", () => {
    expect(isAllowedEmbedIframeSrc("https://www.youtube.com/embed/abc")).toBe(true);
    expect(isAllowedEmbedIframeSrc("https://player.vimeo.com/video/123")).toBe(true);
    expect(isAllowedEmbedIframeSrc("https://www.instagram.com/p/x/embed")).toBe(true);
    expect(isAllowedEmbedIframeSrc("//www.youtube.com/embed/abc")).toBe(true); // protocol-relative
  });

  it("bloqueia domínios fora da allowlist e tentativas de bypass por sufixo", () => {
    expect(isAllowedEmbedIframeSrc("https://evil.com/x")).toBe(false);
    expect(isAllowedEmbedIframeSrc("https://evil-youtube.com/x")).toBe(false);
    expect(isAllowedEmbedIframeSrc("https://youtube.com.evil.com/x")).toBe(false);
  });

  it("bloqueia esquemas perigosos", () => {
    expect(isAllowedEmbedIframeSrc("javascript:alert(1)")).toBe(false);
    expect(isAllowedEmbedIframeSrc("data:text/html,<script>alert(1)</script>")).toBe(false);
  });
});

describe("isAllowedEmbedScriptSrc", () => {
  it("é mais restritivo: só provedores que exigem script de ativação", () => {
    expect(isAllowedEmbedScriptSrc("https://www.instagram.com/embed.js")).toBe(true);
    expect(isAllowedEmbedScriptSrc("//strava-embeds.com/embed.js")).toBe(true);
    // YouTube tem iframe permitido, mas NÃO script.
    expect(isAllowedEmbedScriptSrc("https://www.youtube.com/iframe_api")).toBe(false);
    expect(isAllowedEmbedScriptSrc("https://evil.com/x.js")).toBe(false);
  });
});

describe("filterAllowedEmbedScriptSrcs", () => {
  it("mantém só os permitidos e reporta os bloqueados", () => {
    const blocked: string[] = [];
    const result = filterAllowedEmbedScriptSrcs(
      ["https://www.instagram.com/embed.js", "https://evil.com/x.js"],
      (src) => blocked.push(src),
    );
    expect(result).toEqual(["https://www.instagram.com/embed.js"]);
    expect(blocked).toEqual(["https://evil.com/x.js"]);
  });
});

describe("sanitizeRichHtml", () => {
  it("remove <script> inline e com src", () => {
    const out = sanitizeRichHtml('<p>oi</p><script>alert(1)</script>');
    expect(out).toContain("<p>oi</p>");
    expect(out.toLowerCase()).not.toContain("<script");
  });

  it("remove handlers on* (vetor de XSS via img onerror)", () => {
    const out = sanitizeRichHtml('<img src="x" onerror="alert(1)">');
    expect(out.toLowerCase()).not.toContain("onerror");
  });

  it("neutraliza href javascript:", () => {
    const out = sanitizeRichHtml('<a href="javascript:alert(1)">x</a>');
    expect(out.toLowerCase()).not.toContain("javascript:");
  });

  it("mantém iframe de provedor confiável", () => {
    const out = sanitizeRichHtml(
      '<iframe src="https://www.youtube.com/embed/abc" allowfullscreen></iframe>',
    );
    expect(out).toContain("youtube.com/embed/abc");
  });

  it("remove iframe de origem não confiável", () => {
    const out = sanitizeRichHtml('<iframe src="https://evil.com/x"></iframe>');
    expect(out).not.toContain("evil.com");
  });

  it("preserva formatação básica e links seguros", () => {
    const out = sanitizeRichHtml(
      '<p><strong>Bold</strong> <a href="https://ex.com">link</a></p>',
    );
    expect(out).toContain("<strong>Bold</strong>");
    expect(out).toContain('href="https://ex.com"');
  });

  it("trata nullish sem quebrar", () => {
    expect(sanitizeRichHtml(null)).toBe("");
    expect(sanitizeRichHtml(undefined)).toBe("");
    expect(sanitizeRichHtml("")).toBe("");
  });
});
