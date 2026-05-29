"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const Toaster = dynamic(
  () => import("react-hot-toast").then((mod) => mod.Toaster),
  {
    ssr: false,
  }
);

export function ToasterWrapper() {
  const pathname = usePathname();
  const [isMobile, setIsMobile] = useState(false);
  // Altura medida da MobileSummaryBar fixa no checkout mobile. Offset fixo nao
  // servia: a barra varia (cupom/taxa, "Ver detalhes" expande). Mede em runtime
  // e levanta os toasts pra ACIMA da tab "Ver detalhes".
  const [barHeight, setBarHeight] = useState(0);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const inCheckout = !!pathname?.startsWith("/checkout");

  // Detecta a barra fixa do rodape PELO DOM (nao pelo pathname): o organizador
  // roda sob URL curta via rewrite (/organizer/events -> /events), entao o
  // pathname nao contem "/organizer". Qualquer barra marcada com os data-attrs
  // abaixo levanta o toast — funciona em qualquer surface (checkout, organizador,
  // admin, modais). Mede em todo mobile.
  useEffect(() => {
    if (!isMobile) {
      setBarHeight(0);
      return;
    }
    const SELECTOR =
      '[data-mobile-summary-bar="true"],[data-organizer-action-bar="true"],[data-fixed-bottom-bar="true"]';
    let ro: ResizeObserver | null = null;
    const measure = () => {
      if (ro) {
        ro.disconnect();
        ro = null;
      }
      const els = Array.from(document.querySelectorAll<HTMLElement>(SELECTOR));
      if (!els.length) {
        setBarHeight(0);
        return;
      }
      const compute = () => {
        let h = 0;
        for (const el of els) {
          const r = el.getBoundingClientRect();
          // So conta barra realmente visivel encostada no rodape (height > 0 e
          // colada na base da viewport). Evita levantar por elemento solto.
          if (r.height > 0 && r.bottom >= window.innerHeight - 1) {
            h = Math.max(h, r.height);
          }
        }
        setBarHeight(h);
      };
      compute();
      ro = new ResizeObserver(compute);
      els.forEach((el) => ro!.observe(el));
    };
    measure();
    // Barra monta/desmonta entre steps/paginas/modais — observa o DOM.
    const mo = new MutationObserver(measure);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      if (ro) ro.disconnect();
      mo.disconnect();
    };
  }, [isMobile]);

  // Levanta o toast quando ha barra fixa no rodape (medida no DOM). Checkout
  // tambem levanta no 1o paint (fallback 120) antes de medir, pois a barra
  // sempre existe la.
  const hasBar = barHeight > 0;
  const liftAboveFixedBar = isMobile && (hasBar || inCheckout);
  const liftBottom = hasBar ? barHeight + 12 : 120;

  return (
    <Toaster
      position={liftAboveFixedBar ? "bottom-center" : "bottom-right"}
      containerStyle={
        liftAboveFixedBar
          ? { bottom: `calc(${liftBottom}px + env(safe-area-inset-bottom, 0px))` }
          : undefined
      }
    />
  );
}
