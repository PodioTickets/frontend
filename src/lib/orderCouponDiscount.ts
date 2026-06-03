import type { OrderCoupon } from "@/interfaces/order";

/**
 * Resultado normalizado do preview de `/coupons/.../preview`. O endpoint
 * discrimina por `kind`: cupom tradicional (percentual/fixo) ou voucher
 * (sempre 100% sobre uma lista de ingressos).
 */
export type CouponPreviewResult =
  | {
      kind: "coupon";
      code: string;
      value: number;
      type: "PERCENTAGE" | "FIXED";
      couponType?: string;
      applyToProducts?: boolean;
      /**
       * Ingressos cobertos pelo cupom (espelha o ramo do voucher). Já
       * normalizado no boundary do `UserService`: `null` = todos ("all"/ausente);
       * `string[]` = subconjunto de ticketIds. Ausência = sem restrição.
       */
      appliesTo?: string[] | null;
      /** Valor mínimo do carrinho em CENTAVOS. `null`/ausente = sem condição. */
      minCartValue?: number | null;
      /** Quantidade mínima de ingressos no carrinho. `null`/ausente = sem condição. */
      minQuantity?: number | null;
    }
  | {
      kind: "voucher";
      code: string;
      /** IDs dos ingressos que o voucher zera (100% OFF). */
      appliesTo: string[];
    };

/** Label inline do voucher pra linhas de resumo (paralelo a `formatCouponLineLabel`). */
export function formatVoucherLineLabel(code: string | null | undefined): string {
  return code ? `Voucher ${code}` : "Voucher aplicado";
}

/**
 * Desconto de um voucher (100% OFF). Um voucher cobre APENAS UMA unidade de
 * ingresso: dentre os ingressos selecionados cujo `id` está em `appliesTo` (com
 * quantidade > 0), libera a unidade de MAIOR valor. Retorna o preço dessa única
 * unidade (REAIS) — 0 quando nada elegível foi selecionado.
 */
export function computeVoucherTicketsDiscount(
  appliesTo: string[] | null | undefined,
  selected: Array<{ id: string; price: number; quantity: number }>,
): number {
  if (!appliesTo?.length) return 0;
  const set = new Set(appliesTo);
  let maxUnit = 0;
  for (const t of selected) {
    if (set.has(t.id) && t.quantity > 0) {
      maxUnit = Math.max(maxUnit, Math.max(0, t.price));
    }
  }
  return maxUnit;
}

/**
 * Label inline do cupom aplicado pra uso em linhas de resumo (mesmo padrão do
 * `OrderSummary` desktop). Sem dois-pontos final — quem chama compõe.
 *
 * Exemplos:
 * - `Cupom PODIO500 (12% OFF)`
 * - `Cupom automático (10% OFF)`
 * - `Cupom PODIO500`
 */
export function formatCouponLineLabel(coupon: OrderCoupon): string {
  const isAutomatic =
    coupon.couponType === "QUANTITY" || coupon.couponType === "AGE";
  const base = isAutomatic
    ? "Cupom automático"
    : coupon.code
      ? `Cupom ${coupon.code}`
      : "Cupom aplicado";
  if (coupon.type === "PERCENTAGE" && coupon.value > 0) {
    return `${base} (${coupon.value}% OFF)`;
  }
  return base;
}

/**
 * Cálculo client-side do desconto efetivo de um cupom sobre tickets e produtos.
 *
 * O backend é a fonte da verdade do desconto final no `pricing.couponDiscount` —
 * essa função existe pra exibir a quebra (tickets vs produtos) e simular o total
 * em telas anteriores ao pagamento onde o `patchProducts` ainda não rodou.
 *
 * Regras (espelham o backend):
 * - `type: "PERCENTAGE"`: aplica `value%` sobre a base. Base = tickets (sempre) +
 *   produtos quando `applyToProducts` é true.
 * - `type: "FIXED"`: subtrai `value` da base, sem partir em dois; prioriza
 *   tickets e só "transborda" pra produtos quando o subtotal de tickets é menor
 *   que o valor fixo E `applyToProducts` é true.
 *
 * UNIDADES: `ticketsSubtotal`/`productsSubtotal` em REAIS. O `coupon.value`
 * segue a convenção do backend: PERCENTAGE = pontos percentuais (ex.: 10 = 10%);
 * FIXED = CENTAVOS (ex.: 5000 = R$ 50,00) — convertido pra reais internamente,
 * igual aos demais call sites (ageCoupon, TicketCategoryCard, PaymentStep).
 */
export interface CouponDiscountBreakdown {
  /** Desconto incidente sobre o subtotal dos ingressos. */
  ticketDiscount: number;
  /** Desconto incidente sobre o subtotal dos produtos. */
  productDiscount: number;
  /** Soma de `ticketDiscount + productDiscount`. */
  totalDiscount: number;
  /** True quando o cupom incide também sobre produtos. */
  appliesToProducts: boolean;
}

export function computeCouponDiscount(
  coupon: OrderCoupon | null | undefined,
  ticketsSubtotal: number,
  productsSubtotal: number,
): CouponDiscountBreakdown {
  const appliesToProducts = !!coupon?.applyToProducts;
  const empty: CouponDiscountBreakdown = {
    ticketDiscount: 0,
    productDiscount: 0,
    totalDiscount: 0,
    appliesToProducts,
  };

  if (!coupon) return empty;
  const value = Number(coupon.value) || 0;
  if (value <= 0) return empty;

  const safeTickets = Math.max(0, ticketsSubtotal);
  const safeProducts = Math.max(0, productsSubtotal);

  if (coupon.type === "PERCENTAGE") {
    const pct = value / 100;
    const ticketDiscount = round2(safeTickets * pct);
    const productDiscount = appliesToProducts ? round2(safeProducts * pct) : 0;
    return {
      ticketDiscount,
      productDiscount,
      totalDiscount: round2(ticketDiscount + productDiscount),
      appliesToProducts,
    };
  }

  // FIXED — `value` vem em CENTAVOS (convenção do backend); converte pra reais
  // antes de comparar com os subtotais (que estão em reais). Consome tickets
  // primeiro, transborda pra produtos só se o cupom permitir. Clamp na base.
  const fixedReais = value / 100;
  const ticketDiscount = Math.min(fixedReais, safeTickets);
  const remaining = fixedReais - ticketDiscount;
  const productDiscount = appliesToProducts ? Math.min(remaining, safeProducts) : 0;
  return {
    ticketDiscount: round2(ticketDiscount),
    productDiscount: round2(productDiscount),
    totalDiscount: round2(ticketDiscount + productDiscount),
    appliesToProducts,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Converte o shape do preview de cupom (`/coupons/.../preview`, usado em
 * `/checkout/ingressos` antes da reserva) para `OrderCoupon`, reaproveitando
 * `computeCouponDiscount` / `computeTicketPricingWithCoupon`. `null` quando não
 * há preview. Mantém a mesma convenção de unidade do backend (`value` cru).
 */
export function couponPreviewToOrderCoupon(
  preview:
    | {
        code?: string;
        value: number;
        type: "PERCENTAGE" | "FIXED";
        couponType?: string;
        applyToProducts?: boolean;
      }
    | null
    | undefined,
  fallbackCode?: string | null,
): OrderCoupon | null {
  if (!preview) return null;
  return {
    id: "preview",
    code: preview.code ?? fallbackCode ?? null,
    couponType: (preview.couponType as OrderCoupon["couponType"]) || "DISCOUNT",
    type: preview.type,
    value: preview.value,
    applyToProducts: preview.applyToProducts,
  };
}

/**
 * Condições de aplicação de um cupom de LINK no checkout (preview):
 *  - `minCartValue` (CENTAVOS): carrinho abaixo do mínimo → não atende;
 *  - `minQuantity`: menos ingressos que o mínimo → não atende.
 * Ausência de cada campo = sem aquela condição. `cartSubtotal` em REAIS;
 * `cartQuantity` = total de ingressos selecionados. Backend é a verdade final.
 */
export function couponConditionsMet(
  coupon:
    | { minCartValue?: number | null; minQuantity?: number | null }
    | null
    | undefined,
  cartSubtotal: number,
  cartQuantity: number,
): boolean {
  if (!coupon) return false;
  if (coupon.minCartValue != null && cartSubtotal < coupon.minCartValue / 100) {
    return false;
  }
  if (coupon.minQuantity != null && cartQuantity < coupon.minQuantity) {
    return false;
  }
  return true;
}

/**
 * Desconto (em REAIS) de um cupom de LINK (`?cupom=`) sobre os ingressos
 * selecionados, respeitando as MESMAS regras do cupom de idade
 * (`computeAgeCouponTicketDiscount`) + `minQuantity`:
 *  - `appliesTo`: `null` → todos os ingressos; lista → só os ticketIds cobertos;
 *  - `minCartValue`/`minQuantity`: condições não atendidas → 0 (desconto não
 *    entra; o resumo segue cheio e a linha de cupom não aparece — "aplicar em
 *    silêncio").
 *
 * Unidades: PERCENTAGE `value` = % (1–100); FIXED `value`/`minCartValue` em
 * CENTAVOS (convenção do backend). `selected.price`/`cartSubtotal` em REAIS. Sem
 * produtos nesta etapa — a base é só ingressos. Fonte da verdade do desconto
 * final é o backend no pagamento; aqui é só feedback visual pré-reserva.
 */
export function computeLinkCouponTicketDiscount(
  coupon:
    | {
        type: "PERCENTAGE" | "FIXED";
        value: number;
        appliesTo?: string[] | null;
        minCartValue?: number | null;
        minQuantity?: number | null;
      }
    | null
    | undefined,
  selected: Array<{ id: string; price: number; quantity: number }>,
  cartSubtotal: number,
  cartQuantity: number,
): number {
  if (!coupon || coupon.value <= 0) return 0;
  if (!couponConditionsMet(coupon, cartSubtotal, cartQuantity)) return 0;
  // `null`/vazio → sem restrição de modalidade (todos os ingressos).
  const allowedSet =
    coupon.appliesTo && coupon.appliesTo.length ? new Set(coupon.appliesTo) : null;
  const eligibleSubtotal = selected.reduce((sum, t) => {
    if (allowedSet && !allowedSet.has(t.id)) return sum;
    return sum + Math.max(0, t.price) * Math.max(0, t.quantity);
  }, 0);
  if (eligibleSubtotal <= 0) return 0;
  if (coupon.type === "PERCENTAGE") {
    return round2(eligibleSubtotal * (coupon.value / 100));
  }
  // FIXED em centavos → reais, clampado ao subtotal elegível.
  return round2(Math.min(coupon.value / 100, eligibleSubtotal));
}

export interface TicketPricingWithCoupon {
  /** Desconto efetivo do cupom sobre os ingressos (0 quando não aplicável). */
  couponDiscount: number;
  /** Subtotal de ingressos já descontado pelo cupom (clamp em 0). */
  subtotalAfterCoupon: number;
  /** Taxa de serviço incidente sobre o subtotal JÁ DESCONTADO. */
  serviceFee: number;
  /** Total final = subtotal descontado + taxa. */
  total: number;
  /** True quando há cupom DISCOUNT manual a exibir (auto QUANTITY/AGE → false). */
  showCouponDiscount: boolean;
}

/**
 * Pricing client-side de ingressos com cupom, espelhando a regra do backend e
 * do `SubscriptionStep` (`/produtos`): a **taxa de serviço incide sobre o
 * subtotal JÁ DESCONTADO** pelo cupom. Sem produtos nesta etapa — a base é só
 * ingressos.
 *
 * Escopo: só cupom DISCOUNT manual. Cupons automáticos (QUANTITY/AGE) são
 * ignorados aqui (desconto deles só é revelado no pagamento), então a taxa
 * recai sobre o subtotal cheio — comportamento idêntico ao atual.
 *
 * `feePercent` em pontos percentuais (ex.: `10` = 10%). Valores em REAIS.
 * Sem arredondamento intermediário (igual ao `SubscriptionStep`): o display
 * arredonda via `Intl.NumberFormat`.
 */
export function computeTicketPricingWithCoupon(
  coupon: OrderCoupon | null | undefined,
  ticketsSubtotal: number,
  feePercent: number,
): TicketPricingWithCoupon {
  const isAuto =
    coupon?.couponType === "QUANTITY" || coupon?.couponType === "AGE";
  const showCouponDiscount = !!coupon && !isAuto;
  const couponDiscount = showCouponDiscount
    ? computeCouponDiscount(coupon, ticketsSubtotal, 0).totalDiscount
    : 0;
  return computeTicketPricingWithDiscount(couponDiscount, ticketsSubtotal, feePercent);
}

/**
 * Mesma regra de `computeTicketPricingWithCoupon`, mas a partir de um desconto
 * de ingressos JÁ calculado (em REAIS). Usado pelo voucher (100% OFF sobre os
 * ingressos cobertos), onde o desconto é por-ticket e não cabe no modelo
 * percentual/fixo do `OrderCoupon`. A taxa de serviço incide sobre o subtotal
 * já descontado, idêntico ao fluxo de cupom.
 */
export function computeTicketPricingWithDiscount(
  ticketDiscount: number,
  ticketsSubtotal: number,
  feePercent: number,
): TicketPricingWithCoupon {
  const couponDiscount = Math.max(0, ticketDiscount);
  const subtotalAfterCoupon = Math.max(0, ticketsSubtotal - couponDiscount);
  const serviceFee = subtotalAfterCoupon * ((feePercent || 0) / 100);
  return {
    couponDiscount,
    subtotalAfterCoupon,
    serviceFee,
    total: subtotalAfterCoupon + serviceFee,
    showCouponDiscount: couponDiscount > 0,
  };
}
