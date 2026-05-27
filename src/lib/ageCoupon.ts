/**
 * Cupom automático de IDADE — elegibilidade + cálculo de desconto pra exibição
 * no `/checkout/ingressos` (antes da reserva).
 *
 * Origem: `GET /coupons/events/:eventId/age-eligibility` (OptionalJwtAuthGuard).
 * O backend avalia a idade NA DATA DO EVENTO (mesmo `computeAgeAt` do checkout),
 * então elegibilidade aqui e aplicação no pagamento nunca divergem.
 *
 * O endpoint devolve `age` (idade na data do evento — usada também pra decidir o
 * badge de limite de idade do ingresso) e `appliedCoupon` (o que será aplicado),
 * que ainda depende de DUAS condições no checkout: `appliesTo` (modalidade) e
 * `minCartValue` (valor mínimo do carrinho).
 */

/** Cupom de idade que será aplicado (shape do `appliedCoupon` do endpoint). */
export interface AgeAppliedCoupon {
  id: string;
  couponType: "AGE";
  type: "PERCENTAGE" | "FIXED";
  value: number;
  ageRule?: string | null;
  ageValue?: string | null;
  minAge?: number | null;
  maxAge?: number | null;
  /** Condição de modalidade: "all" (todos) ou JSON string com ticketIds. */
  appliesTo?: string | null;
  /** Condição de valor mínimo do carrinho, em CENTAVOS. null = sem condição. */
  minCartValue?: number | null;
  applyToProducts?: boolean;
  note?: string | null;
}

export interface AgeCouponEligibility {
  applicable: boolean;
  /** Idade na data do evento. null quando anônimo / sem dateOfBirth. */
  age: number | null;
  eventDate: string | null;
  appliedCoupon: AgeAppliedCoupon | null;
}

/** Label inline do cupom de idade pras linhas de resumo (paralelo ao cupom/voucher). */
export function formatAgeCouponLineLabel(coupon: AgeAppliedCoupon): string {
  if (coupon.type === "PERCENTAGE" && coupon.value > 0) {
    return `Cupom automático (${coupon.value}% OFF)`;
  }
  return "Cupom automático";
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** "all"/vazio → null (todos os ingressos); JSON array → lista de ticketIds. */
function parseAppliesToIds(appliesTo: string | null | undefined): string[] | null {
  if (!appliesTo || appliesTo === "all") return null;
  try {
    const parsed = JSON.parse(appliesTo);
    if (Array.isArray(parsed)) {
      return parsed.filter((x: unknown): x is string => typeof x === "string");
    }
  } catch {
    /* não-JSON — trata como sem restrição */
  }
  return null;
}

/**
 * Desconto (em REAIS) do cupom de idade sobre os ingressos selecionados,
 * respeitando as condições de aplicação final:
 *  - `appliesTo`: "all" → todos; lista → só os ticketIds cobertos;
 *  - `minCartValue` (centavos): carrinho abaixo do mínimo → 0.
 *
 * Unidades: PERCENTAGE `value` = % (1-100); FIXED `value` e `minCartValue` em
 * CENTAVOS (convenção monetária do backend). `selected.price`/`cartSubtotal` em
 * REAIS. A fonte de verdade do desconto final continua sendo o backend no
 * pagamento — aqui é só feedback visual pré-reserva.
 */
export function computeAgeCouponTicketDiscount(
  coupon: AgeAppliedCoupon | null | undefined,
  selected: Array<{ id: string; price: number; quantity: number }>,
  cartSubtotal: number,
): number {
  if (!coupon || coupon.value <= 0) return 0;
  if (coupon.minCartValue != null && cartSubtotal < coupon.minCartValue / 100) {
    return 0;
  }
  const allowed = parseAppliesToIds(coupon.appliesTo);
  const allowedSet = allowed ? new Set(allowed) : null;
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

/** True quando a idade está dentro do limite do ingresso (badge de aviso some). */
export function isAgeWithinTicketLimit(
  age: number,
  ageLimit?: { min?: number; max?: number } | null,
): boolean {
  if (!ageLimit) return true;
  if (ageLimit.min != null && age < ageLimit.min) return false;
  if (ageLimit.max != null && age > ageLimit.max) return false;
  return true;
}
