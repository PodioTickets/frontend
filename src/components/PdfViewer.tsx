"use client";

import { useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";

/**
 * Visualizador de PDF baseado em pdf.js (react-pdf). Renderiza em <canvas>, então
 * funciona igual no desktop e no mobile (iOS/Safari NÃO renderiza PDF em <iframe>).
 * Sem text/annotation layer → leve e sem CSS extra; é só leitura.
 *
 * Worker self-hospedado em /public (mesma origem) — o CSP do app (src/proxy.ts)
 * só libera script-src/worker-src de 'self', então não dá pra puxar de CDN
 * (unpkg etc. são bloqueados). O arquivo é copiado de
 * node_modules/pdfjs-dist/build/pdf.worker.min.mjs e PRECISA bater com a versão
 * do pdfjs que o react-pdf usa (hoje 5.4.296). Se subir o react-pdf, recopiar:
 *   cp node_modules/.pnpm/pdfjs-dist@<ver>/node_modules/pdfjs-dist/build/pdf.worker.min.mjs public/pdf.worker.min.mjs
 * senão dá "API version does not match Worker version".
 */

// pdf.js 5 usa `Promise.withResolvers`, que só existe no Safari 17.4+. Sem este
// polyfill o PDF não abre em iPhones com iOS < 17.4 (o requisito é funcionar no
// mobile). Guarda antes de carregar o worker.
if (
  typeof Promise !== "undefined" &&
  typeof (Promise as { withResolvers?: unknown }).withResolvers !== "function"
) {
  (Promise as unknown as { withResolvers: <T>() => unknown }).withResolvers =
    function <T>() {
      let resolve!: (value: T | PromiseLike<T>) => void;
      let reject!: (reason?: unknown) => void;
      const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
      });
      return { promise, resolve, reject };
    };
}

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

interface PdfViewerProps {
  /** URL do PDF (ex.: "/termos-comprador.pdf" servido de /public). */
  file: string;
  /** Largura máxima de cada página no desktop (px). Default 900. */
  maxWidth?: number;
}

export function PdfViewer({ file, maxWidth = 900 }: PdfViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [numPages, setNumPages] = useState(0);
  const [width, setWidth] = useState(0);

  // Largura responsiva: a página acompanha o container (mobile = tela cheia,
  // desktop = capada em maxWidth).
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setWidth(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const pageWidth = width ? Math.min(width, maxWidth) : undefined;

  return (
    <div ref={containerRef} className="flex w-full flex-col items-center gap-4">
      <Document
        file={file}
        onLoadSuccess={({ numPages }) => setNumPages(numPages)}
        loading={
          <p className="py-10 font-family-dm-sans text-sm text-gray-11">
            Carregando termos…
          </p>
        }
        error={
          <p className="py-10 font-family-dm-sans text-sm text-red-9">
            Não foi possível carregar o PDF. Tente novamente.
          </p>
        }
        className="flex w-full flex-col items-center gap-4"
      >
        {Array.from({ length: numPages }, (_, i) => (
          <Page
            key={i}
            pageNumber={i + 1}
            width={pageWidth}
            renderTextLayer={false}
            renderAnnotationLayer={false}
            className="overflow-hidden rounded-md bg-white shadow-md"
          />
        ))}
      </Document>
    </div>
  );
}
