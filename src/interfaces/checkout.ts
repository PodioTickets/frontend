// Tipos TypeScript para integração de checkout conforme FRONTEND_CHECKOUT_INTEGRATION.md

export type PaymentMethod = 'PIX' | 'CREDIT_CARD';

export type PaymentStatus = 'pending' | 'approved' | 'failed';
export type RegistrationStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED';

// Request Types
export interface CheckoutTicket {
  ticketId: string;
  quantity: number;
  batchId?: string;
}

export interface CheckoutParticipant {
  name: string;
  cpf: string;
  email: string;
  birthDate: string;
  phone: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY';
  emergencyContactName?: string;
  emergencyPhone?: string;
  hasEmergencyContact?: boolean;
  questionAnswers?: Array<{
    questionId: string;
    answer: string | boolean | number;
  }>;
  products?: Array<{
    productId: string;
    variationId?: string;
    quantity: number;
  }>;
}

export interface CheckoutCard {
  name: string;
  number: string;
  expiry: string;
  cvv: string;
  installments: number;
}

export interface CheckoutPayment {
  card?: CheckoutCard;
}

/**
 * Endereço de cobrança confirmado na etapa de pagamento (POST /api/v1/checkout/process).
 * Ver `docs/checkout-billing-address-api.md` para o contrato esperado no backend.
 */
export interface CheckoutBillingAddressRequest {
  /** País em português, alinhado ao seletor do checkout (ex.: "Brasil"). */
  country: string;
  /**
   * CEP ou código postal.
   * Brasil: apenas 8 dígitos (sem hífen).
   * Exterior: texto livre normalizado (trim), como informado pelo usuário.
   */
  postalCode: string;
  /** Sigla da UF em maiúsculas (ex.: SP, RJ), conforme confirmado no formulário. */
  stateUf: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
}

export interface CheckoutRequest {
  eventId: string;
  paymentMethod: PaymentMethod;
  payment: CheckoutPayment;
  tickets: CheckoutTicket[];
  participants: CheckoutParticipant[];
  /** Obrigatório: endereço confirmado na UI antes de enviar o checkout. */
  billingAddress: CheckoutBillingAddressRequest;
  couponCode?: string;
  voucherCode?: string;
  serviceFee?: number; // Em centavos
}

// Response Types
export interface Registration {
  id: string;
  status: RegistrationStatus;
  qrCode?: string;
  participant?: {
    id: string;
    name: string;
    email: string;
    includedProducts?: Array<{
      productId: string;
      productName: string;
      basePrice: number;
      isIncludedInTicket: boolean;
    }>;
  };
}

export interface PixPayment {
  qrCode: string;
  qrCodeBase64: string;
  expirationDate: string;
}

export interface CreditCardPayment {
  installments: number;
  installmentValue: number;
}

export interface PaymentInfo {
  method: PaymentMethod;
  status: PaymentStatus;
  transactionId: string;
  pix?: PixPayment;
  creditCard?: CreditCardPayment;
}

// Response conforme PAYMENT_DOCUMENTATION.md
export interface CheckoutTicketResponse {
  id: string;
  name: string;
  description?: string;
  price: number;
  batch?: {
    id: string;
    price: number;
  };
  quantity: number;
}

export interface CheckoutParticipantDetail {
  id: string;
  name: string;
  email: string;
  cpf: string;
  phone: string;
  birthDate: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY' | null;
  questionAnswers?: Array<{
    questionId: string;
    question: string;
    answer: string;
    type: string;
  }>;
  products?: Array<{
    productId: string;
    variationId?: string;
    quantity: number;
  }>;
  includedProducts?: Array<{
    productId: string;
    productName: string;
    basePrice: number;
    isIncludedInTicket: boolean;
  }>;
}

export interface CheckoutProductItem {
  id: string;
  name: string;
  variationId: string | null;
  variationName: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface CheckoutProducts {
  items: CheckoutProductItem[];
  subtotal: number;
}

export interface CheckoutPricing {
  subtotal: number;
  serviceFee: number;
  couponDiscount: number;
  voucherDiscount: number;
  total: number;
}

export interface CheckoutResponse {
  success: boolean;
  orderNumber: string;
  eventName: string;
  date: string;
  paymentMethod: string;
  participants: number;
  tickets: CheckoutTicketResponse[];
  participantsDetails: CheckoutParticipantDetail[];
  products: CheckoutProducts;
  kitItems?: any[];
  modalities?: any[];
  questionAnswers?: Array<{
    questionId: string;
    question: string;
    type: string;
    answer: string;
  }>;
  pricing: CheckoutPricing;
  orderId: string;
  registrations: Registration[];
  payment: PaymentInfo;
}

export interface ErrorResponse {
  statusCode: number;
  message: string | string[];
  error?: string;
}
