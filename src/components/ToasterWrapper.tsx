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
  const inOrganizer = !!pathname?.startsWith("/organizer");
  // Telas que podem ter barra fixa no rodape mobile: checkout (resumo) e
  // organizador (barra de acoes do wizard/edicao). Medimos em ambas.
  const shouldTrackBar = isMobile && (inCheckout || inOrganizer);

  // Observa a barra fixa do rodape. Re-mede em mudancas de tamanho
  // (ResizeObserver) e quando ela aparece/some (MutationObserver no body).
  // Cobre tanto a do checkout quanto a do organizador. Desktop/outras rotas: zera.
  useEffect(() => {
    if (!shouldTrackBar) {
      setBarHeight(0);
      return;
    }
    let ro: ResizeObserver | null = null;
    const measure = () => {
      const el = document.querySelector<HTMLElement>(
        '[data-mobile-summary-bar="true"],[data-organizer-action-bar="true"]',
      );
      if (!el) {
        setBarHeight(0);
        return;
      }
      setBarHeight(el.getBoundingClientRect().height);
      if (ro) ro.disconnect();
      ro = new ResizeObserver(() => {
        setBarHeight(el.getBoundingClientRect().height);
      });
      ro.observe(el);
    };
    measure();
    // Barra monta/desmonta entre steps/paginas — observa o DOM.
    const mo = new MutationObserver(measure);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      if (ro) ro.disconnect();
      mo.disconnect();
    };
  }, [shouldTrackBar]);

  // Checkout: a barra aparece de forma confiavel -> levanta sempre (fallback 120
  // no 1o paint). Organizador: muitas telas NAO tem barra fixa, entao so levanta
  // quando ela existe de fato no DOM (barHeight medido > 0).
  const liftAboveFixedBar =
    isMobile && (inCheckout || (inOrganizer && barHeight > 0));

  // bottom = altura real da barra + folga 12px. Fallback 120px se ainda nao
  // mediu (primeiro paint do checkout).
  const liftBottom = barHeight > 0 ? barHeight + 12 : 120;

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
