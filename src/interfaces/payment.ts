import type React from "react";

/** Método de pagamento selecionável no checkout. */
export type PaymentMethod = "credit" | "debit" | "pix" | "boleto";

/** Opção de método de pagamento exibida no seletor do checkout. */
export interface PaymentOption {
  id: PaymentMethod;
  name: string;
  description: string;
  badge?: string;
  icons?: React.ReactNode;
}

/** Erros de validação dos campos de cartão (crédito/débito). */
export type CardErrors = {
  cardName?: string;
  cardNumber?: string;
  cardExpiry?: string;
  cardCVV?: string;
};
