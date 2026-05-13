import type QuillType from "quill";

/**
 * Atributos que o `embed.js` do Strava lê do placeholder pra construir o iframe.
 * Listados explicitamente pra evitar copiar atributos inseguros.
 */
const STRAVA_DATA_ATTRS = [
  "data-embed-type",
  "data-embed-id",
  "data-style",
  "data-map-hash",
  "data-from-embed",
  "data-token",
] as const;

type StravaDataAttr = (typeof STRAVA_DATA_ATTRS)[number];

/** Codifica/decodifica os data-* num JSON guardado como `value` do blot. */
function encodeStravaValue(node: HTMLElement): string {
  const data: Record<string, string> = {};
  STRAVA_DATA_ATTRS.forEach((attr) => {
    const v = node.getAttribute(attr);
    if (v !== null) data[attr] = v;
  });
  return JSON.stringify(data);
}

function applyStravaDataAttrs(node: HTMLElement, value: unknown): void {
  if (typeof value !== "string") return;
  try {
    const data = JSON.parse(value) as Partial<Record<StravaDataAttr, string>>;
    STRAVA_DATA_ATTRS.forEach((attr) => {
      const v = data[attr];
      if (typeof v === "string") node.setAttribute(attr, v);
    });
  } catch {
    /* JSON inválido — ignora. */
  }
}

/**
 * Registra o BlockEmbed do Strava (`<div class="strava-embed-placeholder">`).
 *
 * Por quê: sem isso, ao Quill normalizar o DOM, todos os `data-*` da div são
 * strippados (Parchment só preserva atributos de blots conhecidos). Sem
 * `data-embed-id` e `data-token`, o `embed.js` do Strava não consegue
 * construir o iframe e o embed somem.
 *
 * Com o blot:
 * 1. `static value(node)` serializa os data-* num JSON
 * 2. `static create(value)` reaplica os data-* a partir do JSON
 * 3. Quill identifica via `tagName + className` durante optimize e preserva.
 *
 * Após o `embed.js` substituir a div por iframe, o iframe resultante fica
 * fora do escopo do blot — confiamos que o Quill mantém iframes desconhecidos
 * (no pior caso, envolve em `<p>`, mas o iframe não é strippado).
 *
 * O segundo registro adiciona um clipboard matcher para que, ao colar HTML
 * contendo o placeholder, o Quill já converta em delta `stravaPlaceholder`
 * (mais robusto que confiar só em DOM-matching pós-paste).
 */
export function registerTopicQuillStravaEmbed(Quill: typeof QuillType) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Parchment = Quill.import("parchment") as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const BlockEmbed = Quill.import("blots/block/embed") as any;

  class StravaEmbedPlaceholder extends BlockEmbed {
    static blotName = "stravaPlaceholder";
    static tagName = "DIV";
    static className = "strava-embed-placeholder";
    static scope = Parchment.Scope.BLOCK_BLOT;

    static create(value: unknown) {
      const node = super.create(value) as HTMLElement;
      node.classList.add("strava-embed-placeholder");
      applyStravaDataAttrs(node, value);
      return node;
    }

    static value(node: HTMLElement): string {
      return encodeStravaValue(node);
    }
  }

  Quill.register(StravaEmbedPlaceholder, true);
}

/**
 * Adiciona um clipboard matcher pro Strava — garante que paste HTML contendo
 * o placeholder vire um delta `stravaPlaceholder` (ao invés de cair pro
 * matcher genérico de `<div>` do Quill, que strippa tudo).
 *
 * Chamar depois do `new Quill(...)`, passando a instância.
 */
export function registerStravaClipboardMatcher(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  quill: any,
): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Delta = quill.constructor.import("delta") as any;
  quill.clipboard.addMatcher(
    "div.strava-embed-placeholder",
    (node: HTMLElement) => {
      const value = encodeStravaValue(node);
      return new Delta().insert({ stravaPlaceholder: value });
    },
  );
}
