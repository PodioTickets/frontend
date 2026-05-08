"use client";

import { useEffect, useState } from "react";

interface TopicRichContentProps {
  html: string;
  className?: string;
}

const injectedScriptSrcs = new Set<string>();

export function TopicRichContent({ html, className }: TopicRichContentProps) {
  // Start with the raw html so server and client render the same thing (no hydration mismatch).
  // The useEffect below replaces Quill code blocks with real HTML on the client.
  const [renderedHtml, setRenderedHtml] = useState(html);

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

    // Commit the processed HTML — blockquotes/iframes are now real DOM nodes
    setRenderedHtml(doc.body.innerHTML);

    // Inject external scripts after state update queues (scripts load async so
    // by the time embed.js fetches and runs, React will have committed the new HTML)
    scriptSrcs.forEach((src) => {
      if (injectedScriptSrcs.has(src)) {
        // Script already in document — trigger reprocessing
        if (src.includes("instagram.com/embed") && (window as any).instgrm) {
          (window as any).instgrm.Embeds.process();
        }
        return;
      }

      const script = document.createElement("script");
      script.async = true;
      script.src = src.startsWith("//") ? `https:${src}` : src;
      script.onload = () => injectedScriptSrcs.add(src);
      document.head.appendChild(script);
    });
  }, [html]);

  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: renderedHtml }}
    />
  );
}
