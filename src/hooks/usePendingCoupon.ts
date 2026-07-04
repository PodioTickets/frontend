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

/* Param canônico do cupom no link: `?cupom=` (PT-BR). `?coupon=` (inglês) é
 * mantido como LEGADO na leitura pra não quebrar links já distribuídos — mas o
 * que re-anexamos/escrevemos é sempre `cupom`. */
const CUPOM_QUERY_PARAM = "cupom";
const COUPON_QUERY_PARAM_LEGACY = "coupon";
const VOUCHER_QUERY_PARAM = "voucher";

/** Nome do query param a usar ao (re)escrever na URL, por tipo de código. */
export function couponParamName(kind: CouponParamKind): string {
  return kind === "voucher" ? VOUCHER_QUERY_PARAM : CUPOM_QUERY_PARAM;
}

/** Tipo do código capturado pelo link. Decide a CHAVE no apply
 *  (`couponCode` vs `voucherCode`) e o NOME do param re-anexado em navegações
 *  internas — sem isso um `?voucher=` viraria `?coupon=` e seria aplicado como
 *  cupom. */
export type CouponParamKind = "coupon" | "voucher";

/** Lê o código E o tipo do param do link. Cupom (`?cupom=`, ou o legado
 *  `?coupon=`) tem precedência sobre `?voucher=` quando ambos estão presentes. */
export function readCouponParamEntry(
  searchParams: { get(name: string): string | null },
): { code: string; kind: CouponParamKind } | null {
  const cupom =
    searchParams.get(CUPOM_QUERY_PARAM) ??
    searchParams.get(COUPON_QUERY_PARAM_LEGACY);
  if (cupom) return { code: cupom, kind: "coupon" };
  const voucher = searchParams.get(VOUCHER_QUERY_PARAM);
  if (voucher) return { code: voucher, kind: "voucher" };
  return null;
}

/** Só o código (compat). Use `readCouponParamEntry` quando precisar do tipo. */
export function readCouponParam(
  searchParams: { get(name: string): string | null },
): string | null {
  return readCouponParamEntry(searchParams)?.code ?? null;
}

/** Comprimento máximo defensivo (códigos reais raramente passam de 30 chars). */
const MAX_COUPON_LENGTH = 30;

/* Buffer volátil — zera quando o JS da página é recarregado. Guarda código +
 * tipo (distinção cupom/voucher) + `ownerSlug`: o slug do evento de ORIGEM do
 * link. O cupom só vale no fluxo desse evento (página dele + checkout); ao ir
 * pra home/busca/outro evento o `CouponLinkCapture` descarta — cupom é
 * event-scoped (links são sempre `/events/[slug]?cupom=`). */
let pendingCouponMemory: {
  code: string;
  kind: CouponParamKind;
  ownerSlug: string | null;
} | null = null;

export function normalizeCouponCode(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const code = raw.trim().toUpperCase();
  if (!code || code.length > MAX_COUPON_LENGTH) return null;
  return code;
}

export function getPendingCoupon(): string | null {
  return pendingCouponMemory?.code ?? null;
}

/** Tipo do código pendente (`coupon` por padrão p/ compat). */
export function getPendingCouponKind(): CouponParamKind | null {
  return pendingCouponMemory?.kind ?? null;
}

/** Slug do evento de origem do cupom pendente (`null` se capturado fora de um
 *  evento). Usado pelo `CouponLinkCapture` pra descartar o cupom ao sair do
 *  fluxo desse evento. */
export function getPendingCouponOwnerSlug(): string | null {
  return pendingCouponMemory?.ownerSlug ?? null;
}

export function setPendingCoupon(
  code: string,
  kind: CouponParamKind = "coupon",
  ownerSlug: string | null = null,
): void {
  const normalized = normalizeCouponCode(code);
  if (!normalized) return;
  pendingCouponMemory = { code: normalized, kind, ownerSlug };
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
  const urlCode = normalizeCouponCode(readCouponParam(searchParams));
  const [memoryCode, setMemoryCode] = useState<string | null>(null);

  useEffect(() => {
    setMemoryCode(getPendingCoupon());
  }, [searchParams]);

  return urlCode ?? memoryCode;
}
