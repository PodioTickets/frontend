import { describe, it, expect } from "vitest";
import type { OrderResponse } from "@/interfaces/order";
import {
  isAutoCoupon,
  ticketUnitPriceForPrePaymentCents,
  orderTotalForPrePaymentCents,
} from "../orderAutoCouponDisplay";

/**
 * Caracterização da exibição de cupom pré-pagamento. Regra-chave (2026-09-30):
 * todo cupom é revelado — QUANTITY, AGE e DISCOUNT usam o total já descontado.
 */

type Coupon = NonNullable<OrderResponse["coupon"]>;
const cp = (couponType: Coupon["couponType"]) => ({ couponType }) as Coupon;
const pricing = (total: number, couponDiscount?: number) =>
  ({ total, ...(couponDiscount != null ? { couponDiscount } : {}) }) as OrderResponse["pricing"];

describe("isAutoCoupon", () => {
  it("true para QUANTITY e AGE; false para DISCOUNT/ausente", () => {
    expect(isAutoCoupon(cp("QUANTITY"))).toBe(true);
    expect(isAutoCoupon(cp("AGE"))).toBe(true);
    expect(isAutoCoupon(cp("DISCOUNT"))).toBe(false);
    expect(isAutoCoupon(null)).toBe(false);
    expect(isAutoCoupon(undefined)).toBe(false);
  });
});

describe("ticketUnitPriceForPrePaymentCents", () => {
  it("sempre retorna o unitPrice cheio (desconto vai em linha separada)", () => {
    expect(ticketUnitPriceForPrePaymentCents({ unitPrice: 5000 }, cp("DISCOUNT"))).toBe(5000);
  });
  it("cai em finalUnitPrice quando não há unitPrice", () => {
    expect(ticketUnitPriceForPrePaymentCents({ finalUnitPrice: 4200 }, null)).toBe(4200);
  });
  it("0 quando nenhum preço presente", () => {
    expect(ticketUnitPriceForPrePaymentCents({}, null)).toBe(0);
  });
});

describe("orderTotalForPrePaymentCents", () => {
  it("null quando não há pricing", () => {
    expect(orderTotalForPrePaymentCents(undefined, cp("DISCOUNT"))).toBeNull();
  });
  it("QUANTITY, AGE e DISCOUNT usam o total que já reflete o desconto", () => {
    expect(orderTotalForPrePaymentCents(pricing(9000, 1000), cp("QUANTITY"))).toBe(9000);
    expect(orderTotalForPrePaymentCents(pricing(9000, 1000), cp("AGE"))).toBe(9000);
    expect(orderTotalForPrePaymentCents(pricing(9000, 1000), cp("DISCOUNT"))).toBe(9000);
  });
  it("sem cupom usa o total cru", () => {
    expect(orderTotalForPrePaymentCents(pricing(9000), null)).toBe(9000);
  });
});
