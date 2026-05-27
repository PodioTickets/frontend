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

  // No checkout mobile há uma barra de resumo FIXA no rodapé (MobileSummaryBar),
  // que ficava por baixo dos toasts (em cima do botão "Continuar"). Levanta o
  // container dos toasts pra eles aparecerem um pouco acima da barra. Limitado
  // a /checkout no mobile pra não deslocar os toasts nas demais telas.
  const liftAboveFixedBar = isMobile && !!pathname?.startsWith("/checkout");

  return (
    <Toaster
      position="bottom-right"
      containerStyle={
        liftAboveFixedBar
          ? { bottom: "calc(150px + env(safe-area-inset-bottom, 0px))" }
          : undefined
      }
    />
  );
}
