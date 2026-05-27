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

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // No checkout mobile ha uma barra de resumo FIXA no rodape (MobileSummaryBar)
  // com tab "Ver detalhes" no topo. Toasts devem aparecer ACIMA dessa tab pra
  // nao ficarem escondidos. Posicao center pra ficar visivel no meio da tela
  // mobile (bottom-right cortava o toast com a barra).
  // Altura tab (~32px) + barra principal (~70px) + folga (~16px) ≈ 120px.
  const liftAboveFixedBar = isMobile && !!pathname?.startsWith("/checkout");

  return (
    <Toaster
      position={liftAboveFixedBar ? "bottom-center" : "bottom-right"}
      containerStyle={
        liftAboveFixedBar
          ? { bottom: "calc(120px + env(safe-area-inset-bottom, 0px))" }
          : undefined
      }
    />
  );
}
