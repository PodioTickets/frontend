"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useOrganizerAppSurface } from "@/contexts/OrganizerAppSurfaceContext";
import { useAdminAppSurface } from "@/contexts/AdminAppSurfaceContext";
import { AdBlockNoticeModal } from "@/components/AdBlockNotice";
import {
  detectAdBlock,
  dismissAdBlockNotice,
  isAdBlockNoticeDismissed,
  isParticipantPath,
} from "@/lib/adBlockDetection";

/**
 * Detector global de adblock do FLUXO DO PARTICIPANTE (montado em `Providers`,
 * mesmo padrão do `ProfileCompleteChecker`/`CouponLinkCapture`).
 *
 * Escopo: só as superfícies públicas. Painel de organizador/admin não depende
 * de pixel de conversão — o aviso lá seria puro atrito.
 *
 * Custo: uma única detecção por sessão, em `requestIdleCallback` (nunca
 * compete com hidratação/first paint) e abortada no unmount.
 */
export function AdBlockChecker() {
  const pathname = usePathname();
  const isOrganizerSurface = useOrganizerAppSurface();
  const isAdminSurface = useAdminAppSurface();
  const [open, setOpen] = useState(false);
  const checkedRef = useRef(false);

  const isParticipantSurface =
    !isOrganizerSurface && !isAdminSurface && isParticipantPath(pathname);

  useEffect(() => {
    if (!isParticipantSurface || checkedRef.current) return;
    // Dispensado nesta aba: não paga nem o custo da detecção.
    if (isAdBlockNoticeDismissed()) return;

    checkedRef.current = true;
    const controller = new AbortController();
    let finished = false;

    const run = () => {
      void detectAdBlock({ signal: controller.signal }).then((blocked) => {
        finished = true;
        if (!controller.signal.aborted && blocked) setOpen(true);
      });
    };

    // `requestIdleCallback` não existe no Safari < 16.4 → fallback por timer.
    const usesIdleCallback = typeof window.requestIdleCallback === "function";
    const scheduledId = usesIdleCallback
      ? window.requestIdleCallback(run, { timeout: 4000 })
      : window.setTimeout(run, 1500);

    return () => {
      controller.abort();
      // Cancela pelo MESMO agendador usado acima (os ids não são intercambiáveis).
      if (usesIdleCallback) {
        window.cancelIdleCallback(scheduledId);
      } else {
        window.clearTimeout(scheduledId);
      }
      // Abortado antes de concluir (StrictMode/navegação) → permite nova tentativa.
      if (!finished) checkedRef.current = false;
    };
  }, [isParticipantSurface]);

  const handleDismiss = useCallback(() => {
    setOpen(false);
    dismissAdBlockNotice();
  }, []);

  // Recarregar NÃO marca como dispensado: se o bloqueador continuar ativo,
  // a detecção roda de novo e o aviso volta.
  const handleReload = useCallback(() => {
    window.location.reload();
  }, []);

  if (!open) return null;

  return (
    <AdBlockNoticeModal
      open={open}
      onDismiss={handleDismiss}
      onReload={handleReload}
    />
  );
}
