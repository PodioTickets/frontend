/**
 * Cupom pendente capturado da URL via `?coupon=CODIGO` em qualquer rota.
 *
 * Persistido em `sessionStorage` (por aba, não vaza entre janelas, some ao fechar
 * a aba). Aplicado uma única vez ao avançar da tela de ingressos pra informações
 * (fallback: PaymentStep) quando a order não tem cupom ainda.
 *
 * Falhas silenciosas em todos os helpers: ambientes sem storage (SSR, modo
 * privado restrito) só não persistem — não quebram o fluxo.
 */
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

const PENDING_COUPON_KEY = "pp:pendingCoupon";
const COUPON_QUERY_PARAM = "coupon";

/** Comprimento máximo defensivo (códigos reais raramente passam de 30 chars). */
const MAX_COUPON_LENGTH = 30;

export function normalizeCouponCode(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const code = raw.trim().toUpperCase();
  if (!code || code.length > MAX_COUPON_LENGTH) return null;
  return code;
}

export function getPendingCoupon(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem(PENDING_COUPON_KEY);
  } catch {
    return null;
  }
}

export function setPendingCoupon(code: string): void {
  if (typeof window === "undefined") return;
  const normalized = normalizeCouponCode(code);
  if (!normalized) return;
  try {
    window.sessionStorage.setItem(PENDING_COUPON_KEY, normalized);
  } catch {
    /* sem storage disponível — ignora */
  }
}

export function clearPendingCoupon(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(PENDING_COUPON_KEY);
  } catch {
    /* sem storage disponível — ignora */
  }
}

/**
 * Snapshot reativo do cupom pendente para uso em componentes React.
 *
 * Prioriza a URL (`?coupon=`) por ser a fonte autoritativa e re-renderizar
 * automaticamente em mudanças. Fallback pro sessionStorage quando o
 * `CouponLinkCapture` ainda não propagou o param pra rota atual.
 */
export function usePendingCouponSnapshot(): string | null {
  const searchParams = useSearchParams();
  const urlCode = normalizeCouponCode(searchParams.get(COUPON_QUERY_PARAM));
  const [storedCode, setStoredCode] = useState<string | null>(null);

  useEffect(() => {
    setStoredCode(getPendingCoupon());
  }, [searchParams]);

  return urlCode ?? storedCode;
}
