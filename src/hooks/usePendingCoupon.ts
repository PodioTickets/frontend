/**
 * Cupom pendente capturado da URL via `?coupon=CODIGO`.
 *
 * Convenção: a URL é a ÚNICA fonte de verdade duradoura.
 * - Tem cupom na URL → cupom ativo.
 * - Sem cupom na URL → sem cupom.
 * - Recarregar a página com URL "limpa" → some.
 * - Editar a URL manualmente removendo `?coupon=` → some.
 *
 * O `pendingCouponMemory` é apenas um buffer em memória JS (volátil) usado pelo
 * `CouponLinkCapture` pra re-anexar `?coupon=` em navegações internas
 * (router.push / <Link>) — quando o destino não inclui o param. Não persiste
 * entre reloads nem entre abas (sem sessionStorage / localStorage).
 */
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

const COUPON_QUERY_PARAM = "coupon";

/** Comprimento máximo defensivo (códigos reais raramente passam de 30 chars). */
const MAX_COUPON_LENGTH = 30;

/* Buffer volátil — zera quando o JS da página é recarregado. */
let pendingCouponMemory: string | null = null;

export function normalizeCouponCode(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const code = raw.trim().toUpperCase();
  if (!code || code.length > MAX_COUPON_LENGTH) return null;
  return code;
}

export function getPendingCoupon(): string | null {
  return pendingCouponMemory;
}

export function setPendingCoupon(code: string): void {
  const normalized = normalizeCouponCode(code);
  if (!normalized) return;
  pendingCouponMemory = normalized;
}

export function clearPendingCoupon(): void {
  pendingCouponMemory = null;
}

/**
 * Snapshot reativo do cupom pendente para uso em componentes React.
 *
 * Lê direto da URL (`?coupon=`) — fonte da verdade. O buffer em memória é
 * fallback durante o exato momento de navegação interna onde a URL nova
 * ainda não foi reescrita pelo `CouponLinkCapture`.
 */
export function usePendingCouponSnapshot(): string | null {
  const searchParams = useSearchParams();
  const urlCode = normalizeCouponCode(searchParams.get(COUPON_QUERY_PARAM));
  const [memoryCode, setMemoryCode] = useState<string | null>(null);

  useEffect(() => {
    setMemoryCode(getPendingCoupon());
  }, [searchParams]);

  return urlCode ?? memoryCode;
}
