"use client";

import { useEffect } from "react";
import { initPlatformMetaPixel, trackPlatformMetaPixel } from "@/lib/metaPixel";

/**
 * Inicializa o pixel GLOBAL da plataforma e dispara `PageView` ao acessar a
 * landing. Componente sem render — montado uma vez no topo da landing.
 *
 * Sem dedup: PageView deve contar a cada carregamento/acesso da página (mesma
 * semântica do snippet base `fbq('track','PageView')`).
 */
export function LandingPixel() {
  useEffect(() => {
    initPlatformMetaPixel();
    trackPlatformMetaPixel("PageView");
  }, []);

  return null;
}
