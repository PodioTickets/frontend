/**
 * Conversões entre o HTML "renderizável" (com `<script>` e blockquotes/iframes
 * reais) e o formato de armazenamento do Quill, que envolve embeds em
 * `<div class="ql-code-block-container">` com o texto HTML-escapado.
 *
 * O backend espera o formato armazenado (idêntico ao que o `TopicRichContent`
 * decodifica em runtime). Dentro do editor Quill, no entanto, queremos exibir
 * o conteúdo já renderizado (iframe do Instagram, vídeo etc.), por isso a
 * decodificação acontece ao carregar e a re-encodificação ao salvar.
 */

const SOCIAL_BLOCKQUOTE_CLASSES = ["instagram-media", "twitter-tweet"];

const isEmbedElement = (el: Element): boolean => {
  const tag = el.tagName;
  if (tag === "SCRIPT") return true;
  if (tag === "BLOCKQUOTE") {
    return SOCIAL_BLOCKQUOTE_CLASSES.some((c) => el.classList.contains(c));
  }
  if (el.classList.contains("fb-post")) return true;
  return false;
};

/**
 * Detecta se um payload HTML (ex.: vindo de paste do usuário) contém embed
 * de rede social ou iframe — caso em que o editor deve processá-lo como
 * embed em vez de inserir como texto plano.
 *
 * Heurística por classes/atributos conhecidos + presença de `<script>`.
 * Conservadora: prefere falso-negativo (deixa Quill processar) a falso-positivo
 * (que travaria paste de texto comum).
 */
export function isEmbedHtml(html: string): boolean {
  if (!html) return false;
  // Blockquote de redes sociais (Instagram, Twitter/X) — classes específicas.
  if (
    /<blockquote[^>]*\bclass=["'][^"']*\b(?:instagram-media|twitter-tweet)\b/i.test(
      html,
    )
  ) {
    return true;
  }
  // Facebook embed div.
  if (/<div[^>]*\bclass=["'][^"']*\bfb-post\b/i.test(html)) return true;
  // Script tag (qualquer src) — usado por todos os embeds de redes sociais.
  if (/<script\b[^>]*\bsrc=/i.test(html)) return true;
  // iframe de provedores conhecidos de embed (YouTube, Vimeo, etc).
  if (
    /<iframe[^>]*\bsrc=["'][^"']*(?:youtube\.com|youtu\.be|vimeo\.com|player\.twitch\.tv|tiktok\.com)/i.test(
      html,
    )
  ) {
    return true;
  }
  return false;
}

const escapeHtml = (s: string): string =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/**
 * `ql-code-block-container` armazena o HTML cru com entidades escapadas.
 * Aqui decodificamos para os elementos reais e extraímos `<script src>` para
 * que o caller possa injetá-los no `<head>` (o Quill remove `<script>` ao
 * setar `innerHTML` por segurança).
 */
export function decodeStoredEmbedsToRenderable(html: string): {
  html: string;
  scriptSrcs: string[];
} {
  if (typeof DOMParser === "undefined") {
    return { html, scriptSrcs: [] };
  }

  const doc = new DOMParser().parseFromString(html, "text/html");
  const scriptSrcs: string[] = [];

  doc.querySelectorAll(".ql-code-block-container").forEach((container) => {
    const blocks = container.querySelectorAll(".ql-code-block");
    // textContent decodifica entidades HTML automaticamente
    const decoded = Array.from(blocks)
      .map((b) => b.textContent ?? "")
      .join("\n")
      .trim();
    if (!decoded.startsWith("<")) return;

    const embedDoc = new DOMParser().parseFromString(decoded, "text/html");

    embedDoc.querySelectorAll("script[src]").forEach((s) => {
      const src = s.getAttribute("src");
      if (src) scriptSrcs.push(src);
      s.remove();
    });

    const wrapper = document.createElement("div");
    wrapper.innerHTML = embedDoc.body.innerHTML;
    container.replaceWith(...Array.from(wrapper.childNodes));
  });

  // Scripts top-level (caso o conteúdo já viesse "renderizável")
  doc.querySelectorAll("script[src]").forEach((s) => {
    const src = s.getAttribute("src");
    if (src) scriptSrcs.push(src);
    s.remove();
  });

  return { html: doc.body.innerHTML, scriptSrcs };
}

/**
 * Encapsula `<script>` e blockquotes de redes sociais em `ql-code-block-container`,
 * mantendo o restante do HTML intacto. `scriptSrcs` adiciona scripts ausentes
 * do HTML (por exemplo, scripts removidos pelo Quill ao setar `innerHTML`).
 */
export function encodeRenderableToStoredEmbeds(
  html: string,
  scriptSrcs: string[] = [],
): string {
  if (typeof DOMParser === "undefined") return html;

  let withScripts = html;
  scriptSrcs.forEach((src) => {
    // Só anexa se o script com esse src ainda não estiver no HTML
    if (!withScripts.includes(`src="${src}"`) && !withScripts.includes(`src='${src}'`)) {
      withScripts += `<script async src="${src}"></script>`;
    }
  });

  const doc = new DOMParser().parseFromString(withScripts, "text/html");

  const wrap = (snippet: string) =>
    `<div class="ql-code-block-container" spellcheck="false"><div class="ql-code-block">${escapeHtml(
      snippet,
    )}</div></div>`;

  const parts: string[] = [];
  for (const node of Array.from(doc.body.childNodes)) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      if (isEmbedElement(el)) {
        parts.push(wrap(el.outerHTML));
      } else {
        parts.push(el.outerHTML);
      }
    } else if (node.nodeType === Node.TEXT_NODE) {
      const t = node.textContent ?? "";
      if (t.trim()) parts.push(`<p>${t}</p>`);
    }
  }
  return parts.join("");
}

/**
 * Reconstrói o HTML "completo" para exibição no textarea de modo código:
 * inclui `<script>` para que o usuário veja tudo o que o backend armazenará.
 */
export function buildSourceViewHtml(
  renderableHtml: string,
  scriptSrcs: string[],
): string {
  if (scriptSrcs.length === 0) return renderableHtml;
  const seen = new Set<string>();
  const scripts = scriptSrcs
    .filter((src) => {
      if (seen.has(src)) return false;
      seen.add(src);
      return true;
    })
    .map((src) => `<script async src="${src}"></script>`)
    .join("\n");
  return `${renderableHtml}\n${scripts}`;
}
