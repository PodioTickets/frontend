/**
 * Tipos do fluxo de reserva de checkout.
 *
 * Contrato documentado em `docs/checkout-reservation-flow.md`.
 * Todos os valores monetários são inteiros em centavos.
 */

export type OrderStatus = "PENDING" | "PAID" | "CANCELLED";

export type OrderCancelledReason =
  | "EXPIRED"
  | "PAYMENT_REFUSED"
  | "PAYMENT_RECONCILIATION_FAILED"
  | "USER_CANCELLED";

export type OrderPaymentMethod = "CREDIT_CARD" | "DEBIT_CARD" | "PIX";

export type OrderPaymentStatus = "pending" | "approved" | "refused";

export interface OrderTicket {
  id?: string;
  ticketId: string;
  batchId: string;
  batchName?: string;
  quantity: number;
  unitPrice: number;
  unitDiscount?: number;
  totalDiscount?: number;
  finalUnitPrice?: number;
  finalTotalPrice?: number;
  couponApplied?: boolean;
}

export interface OrderCoupon {
  id: string;
  code: string | null;
  couponType: "DISCOUNT" | "QUANTITY" | "AGE";
  type: "PERCENTAGE" | "FIXED";
  value: number;
  /** Escopo do cupom — "all" significa todos os ingressos/lotes do evento. */
  appliesTo?: string;
  /** Quando true, o desconto incide também sobre o valor dos produtos. */
  applyToProducts?: boolean;
}

export interface OrderVoucher {
  id: string;
  code: string;
  name?: string;
  status: string;
}

export interface OrderPricing {
  subtotal: number;
  /** Subtotal só dos ingressos (antes de desconto). Opcional até o backend expor. */
  ticketsSubtotal?: number;
  /** Subtotal só dos produtos (antes de desconto). Opcional até o backend expor. */
  productsSubtotal?: number;
  serviceFee: number;
  /** Desconto de QUALQUER cupom (manual/link DISCOUNT, AGE, QUANTITY). O tipo é
   *  lido em `coupon.couponType` para o rótulo. */
  couponDiscount?: number;
  voucherDiscount?: number;
  total: number;
  currency: "BRL";
}

export interface OrderPixInfo {
  qrCode: string;
  qrCodeBase64: string;
  pixCode: string;
  expiresAt: string;
}

export interface OrderPaymentInfo {
  method: OrderPaymentMethod;
  status: OrderPaymentStatus;
  transactionId?: string;
  installments?: number;
  installmentValue?: number;
  pix?: OrderPixInfo;
  redirectUrl?: string;
  paidAt?: string;
}

export interface OrderRegistration {
  id: string;
  qrCode?: string;
  participant?: {
    id: string;
    name: string;
    email: string;
  };
}

/**
 * Resposta padrão de qualquer endpoint que retorna estado do pedido.
 * `serverTime` é obrigatório — usado pra drift correction do timer.
 */
export interface OrderResponse {
  orderId: string;
  status: OrderStatus;
  eventId: string;
  reservedAt: string;
  expiresAt: string;
  serverTime: string;
  tickets: OrderTicket[];
  pricing: OrderPricing;
  coupon?: OrderCoupon | null;
  voucher?: OrderVoucher | null;
  payment?: OrderPaymentInfo;
  registrations?: OrderRegistration[];
  cancelledAt?: string;
  cancelledReason?: OrderCancelledReason;
  /** Cupom AUTOMÁTICO (AGE/QUANTITY) caiu por mudança de carrinho/participantes. */
  couponAutoRemoved?: boolean;
  /**
   * Cupom/voucher MANUAL submetido foi rejeitado (inválido/expirado/abaixo do
   * mínimo/CPF/esgotado). O backend devolve HTTP 200 com o pedido INALTERADO +
   * este campo — o front exibe `reason` (mapeado por `COUPON_ERROR_MESSAGES`).
   */
  couponRejected?: { code?: string; reason: string } | null;
}

// ---- Request bodies ----

export interface ReserveOrderRequest {
  eventId: string;
  tickets: Array<{
    ticketId: string;
    quantity: number;
  }>;
  /**
   * Reserva de CORTESIA (organizador "adicionar inscrito"): libera janela
   * encerrada + lote esgotado + teto do evento. O backend revalida a autorização
   * (admin/`edit_event`); só o fluxo de cortesia envia isto.
   */
  isCourtesy?: boolean;
}

export interface PatchParticipantsRequest {
  participants: Array<{
    name: string;
    /**
     * Tipo do documento. CPF pra brasileiros, PASSPORT pra estrangeiros.
     * Backend usa em conjunto com `documentNumber` pra dedupe correto sem
     * destruir letras de passaporte (`participantDocumentNumberClean`).
     */
    documentType: "CPF" | "PASSPORT";
    /**
     * Documento internacionalizado. Brasileiros: dígitos limpos do CPF.
     * Estrangeiros: passaporte/RNE cru (preserva letras).
     */
    documentNumber: string;
    email: string;
    birthDate: string;
    phone: string;
    gender?: "MALE" | "FEMALE" | "OTHER" | "PREFER_NOT_TO_SAY";
    emergencyContactName?: string;
    emergencyPhone?: string;
    hasEmergencyContact?: boolean;
    questionAnswers?: Array<{
      questionId: string;
      answer: string | boolean | number;
    }>;
  }>;
}

export interface PatchProductsRequest {
  products: Array<{
    productId: string;
    variationId?: string;
    quantity: number;
    participantEmail: string;
    /** Slot (participante↔ingresso) — desambigua produto→inscrição com e-mail duplicado. */
    participantIndex?: number;
  }>;
}

export interface PatchCouponRequest {
  couponCode?: string;
  voucherCode?: string;
}

export interface PatchBillingAddressRequest {
  billingAddress: {
    country: string;
    postalCode: string;
    stateUf: string;
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
  };
}

export interface PayOrderCardRequest {
  method: "CREDIT_CARD";
  card: {
    name: string;
    number: string;
    expiry: string;
    cvv: string;
    installments: number;
  };
  couponCode?: string;
  voucherCode?: string;
}

export interface PayOrderDebitCardRequest {
  method: "DEBIT_CARD";
  card: {
    name: string;
    number: string;
    expiry: string;
    cvv: string;
  };
  threeDs: {
    cavv: string;
    eci: string;
    xid?: string;
    referenceId?: string;
    version?: string;
  };
  couponCode?: string;
  voucherCode?: string;
}

export interface PayOrderPixRequest {
  method: "PIX";
  couponCode?: string;
  voucherCode?: string;
}

export type PayOrderRequest = PayOrderCardRequest | PayOrderDebitCardRequest | PayOrderPixRequest;

export interface OrderPaymentStatusResponse {
  orderId: string;
  status: OrderStatus;
  payment: {
    method: OrderPaymentMethod;
    status: OrderPaymentStatus;
    paidAt?: string;
  };
}

/**
 * Resposta do polling ATIVO de PIX (`GET /payments/order/:id/pix-status`).
 * O backend reconsulta a Braspag em tempo real e, se pago, confirma+finaliza
 * o pedido (mesma fonte de verdade do webhook).
 */
export interface PixPollStatusResponse {
  /** PaymentStatus do backend (UPPERCASE): "PAID" | "PENDING" | "FAILED" | "REFUNDED". */
  status: string;
  /** true quando o pagamento está confirmado e o pedido foi finalizado. */
  paid: boolean;
}

// ---- Error codes que o backend pode retornar ----

export type OrderErrorCode =
  | "INVALID_PAYLOAD"
  | "UNAUTHORIZED"
  | "ORDER_NOT_FOUND"
  | "ORDER_NOT_PENDING"
  | "EVENT_NOT_FOUND"
  | "BATCH_NOT_FOUND"
  | "BATCH_SOLD_OUT"
  | "EVENT_SOLD_OUT"
  | "BATCH_NOT_ACTIVE"
  | "QUANTITY_EXCEEDED"
  | "TOO_MANY_PENDING_ORDERS"
  | "RATE_LIMIT_EXCEEDED"
  | "BILLING_ADDRESS_REQUIRED"
  | "PARTICIPANTS_REQUIRED"
  | "PAYMENT_REFUSED"
  | "IDEMPOTENCY_KEY_MISMATCH"
  | "COUPON_NOT_FOUND"
  | "COUPON_EXPIRED"
  | "COUPON_MIN_VALUE"
  | "VOUCHER_NOT_FOUND"
  | "VOUCHER_EXPIRED"
  | "VOUCHER_ALREADY_USED"
  | "DISCOUNT_CONFLICT"
  // Remoção de slot reservado (`DELETE /orders/:id/participants/:slot`)
  | "INVALID_SLOT"
  | "LAST_TICKET"
  // `POST /pay` quando há participante em branco
  | "INCOMPLETE_PARTICIPANTS"
  | "VALIDATION_ERROR";

export interface OrderErrorResponse {
  statusCode: number;
  code: OrderErrorCode;
  message: string;
  fields?: Array<{ path: string; message: string }>;
}

export class OrderApiError extends Error {
  statusCode: number;
  code: OrderErrorCode;
  fields?: Array<{ path: string; message: string }>;

  constructor(response: OrderErrorResponse) {
    super(response.message);
    this.name = "OrderApiError";
    this.statusCode = response.statusCode;
    this.code = response.code;
    this.fields = response.fields;
  }
}
