"use client";

import { useEffect, useRef, useState } from "react";

interface TopicRichContentProps {
  html: string;
  className?: string;
}

const injectedScriptSrcs = new Set<string>();

export function TopicRichContent({ html, className }: TopicRichContentProps) {
  // Start with the raw html so server and client render the same thing (no hydration mismatch).
  // The useEffect below replaces Quill code blocks with real HTML on the client.
  const [renderedHtml, setRenderedHtml] = useState(html);

  // Scripts pendentes que precisam ser injetados/processados *depois* que o React
  // commitar o novo `renderedHtml`. Ver explicação no segundo effect.
  const pendingScriptSrcsRef = useRef<string[]>([]);

  // Etapa 1 — processa o HTML cru: decodifica blocos de código do Quill,
  // extrai scripts externos e enfileira o re-render com o HTML "real".
  useEffect(() => {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const scriptSrcs: string[] = [];

    // Quill stores embed code as HTML-escaped text inside .ql-code-block elements.
    // Example: <div class="ql-code-block">&lt;blockquote ...&gt;</div>
    // We decode the text, parse it as HTML, and replace the code block container with real nodes.
    doc.querySelectorAll(".ql-code-block-container").forEach((container) => {
      const blocks = container.querySelectorAll(".ql-code-block");
      // .textContent decodes HTML entities automatically
      const decoded = Array.from(blocks)
        .map((b) => b.textContent ?? "")
        .join("\n")
        .trim();

      // Only treat it as an HTML embed if it looks like a tag
      if (!decoded.startsWith("<")) return;

      const embedDoc = new DOMParser().parseFromString(decoded, "text/html");

      // Extract external script srcs before injecting HTML
      embedDoc.querySelectorAll("script[src]").forEach((s) => {
        const src = s.getAttribute("src");
        if (src) scriptSrcs.push(src);
        s.remove();
      });

      // Replace the code block container with the actual embed HTML
      const wrapper = document.createElement("div");
      wrapper.innerHTML = embedDoc.body.innerHTML;
      container.replaceWith(...Array.from(wrapper.childNodes));
    });

    // Also handle any real <script src> tags that weren't inside code blocks
    doc.querySelectorAll("script[src]").forEach((s) => {
      const src = s.getAttribute("src");
      if (src) scriptSrcs.push(src);
      s.remove();
    });

    // Guarda os scripts para serem processados após o commit. Atribuir ao ref
    // sobrescreve qualquer pendência anterior (correto: o conteúdo mudou).
    pendingScriptSrcsRef.current = scriptSrcs;
    // Commit the processed HTML — blockquotes/iframes are now real DOM nodes
    setRenderedHtml(doc.body.innerHTML);
  }, [html]);

  // Etapa 2 — depende de `renderedHtml` para garantir que o React já commitou
  // o subtree antes de mexer com scripts de embed.
  //
  // BUG histórico (corrigido aqui): chamar `instgrm.Embeds.process()` no mesmo
  // tick do `setRenderedHtml` faz o Instagram criar o iframe no DOM antigo,
  // que é descartado quando o React commita o novo HTML — resultado: o usuário
  // vê apenas o blockquote placeholder ("post cortado ao meio"). Postergando
  // para um effect dependente de `renderedHtml`, o `process()` opera no DOM
  // já estabilizado e o iframe sobrevive.
  useEffect(() => {
    const scriptSrcs = pendingScriptSrcsRef.current;
    if (scriptSrcs.length === 0) return;

    scriptSrcs.forEach((src) => {
      // Strava embed não expõe API de reprocessamento (diferente do Instagram).
      // Cada carga do embed.js itera os `.strava-embed-placeholder` restantes
      // no DOM e os substitui por iframes — placeholders já processados foram
      // trocados por iframe e perderam a classe, então não duplicam. Por isso
      // re-injetamos sempre em navegação SPA.
      const isStravaScript = src.includes("strava-embeds.com");

      if (injectedScriptSrcs.has(src) && !isStravaScript) {
        // Script já presente no documento — pedir reprocessamento manual.
        const w = window as unknown as {
          instgrm?: { Embeds: { process: () => void } };
        };
        if (src.includes("instagram.com/embed") && w.instgrm) {
          w.instgrm.Embeds.process();
        }
        return;
      }

      const script = document.createElement("script");
      script.async = true;
      script.src = src.startsWith("//") ? `https:${src}` : src;
      script.onload = () => injectedScriptSrcs.add(src);
      document.head.appendChild(script);
    });

    pendingScriptSrcsRef.current = [];
  }, [renderedHtml]);

  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: renderedHtml }}
    />
  );
}
