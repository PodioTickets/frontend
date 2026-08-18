/**
 * Integração client-side com o Mercado Pago — usada SOMENTE no cartão de
 * DÉBITO (crédito e PIX seguem na Cielo via backend).
 *
 * O cartão é tokenizado AQUI no browser (MercadoPago.js V2): o PAN nunca chega
 * ao nosso backend no fluxo de débito — só o card token + payment_method_id.
 *
 * Habilitação: NEXT_PUBLIC_MP_PUBLIC_KEY. Ausente → PaymentStep cai no fluxo
 * legado (Braspag 3DS + Cielo), espelhando o fallback do backend (MP_ACCESS_TOKEN).
 */

declare global {
  interface Window {
    MercadoPago?: new (publicKey: string, options?: { locale?: string }) => MpInstance;
    /** Definido pelo script de device fingerprint do MP (security.js). */
    MP_DEVICE_SESSION_ID?: string;
  }
}

interface MpInstance {
  createCardToken(data: {
    cardNumber: string;
    cardholderName: string;
    cardExpirationMonth: string;
    cardExpirationYear: string;
    securityCode: string;
    identificationType?: string;
    identificationNumber?: string;
  }): Promise<{ id: string }>;
  getPaymentMethods(data: { bin: string }): Promise<{
    results: Array<{ id: string; payment_type_id: string }>;
  }>;
}

export const MP_PUBLIC_KEY = process.env.NEXT_PUBLIC_MP_PUBLIC_KEY ?? "";

/** Débito via MP habilitado? (sem a public key o débito segue o fluxo Cielo legado) */
export const isMpDebitEnabled = () => !!MP_PUBLIC_KEY;

let sdkPromise: Promise<MpInstance> | null = null;

/**
 * Carrega o SDK V2 (uma vez) e instancia o client. O script de device
 * fingerprint é injetado junto — o MP_DEVICE_SESSION_ID melhora a taxa de
 * aprovação e a análise antifraude.
 */
export function loadMercadoPago(): Promise<MpInstance> {
  if (!MP_PUBLIC_KEY) {
    return Promise.reject(new Error("NEXT_PUBLIC_MP_PUBLIC_KEY não configurada"));
  }
  if (sdkPromise) return sdkPromise;

  sdkPromise = new Promise<MpInstance>((resolve, reject) => {
    const init = () => {
      try {
        resolve(new window.MercadoPago!(MP_PUBLIC_KEY, { locale: "pt-BR" }));
      } catch (e) {
        sdkPromise = null;
        reject(e);
      }
    };

    if (window.MercadoPago) {
      init();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://sdk.mercadopago.com/js/v2";
    script.async = true;
    script.onload = init;
    script.onerror = () => {
      sdkPromise = null;
      reject(new Error("Falha ao carregar o SDK do Mercado Pago"));
    };
    document.head.appendChild(script);

    // Device fingerprint (fire-and-forget — o pagamento funciona sem, mas
    // aprova menos). `output` define window.MP_DEVICE_SESSION_ID.
    if (!document.querySelector('script[src*="mercadopago.com/v2/security.js"]')) {
      const device = document.createElement("script");
      device.src = "https://www.mercadopago.com/v2/security.js";
      device.setAttribute("view", "checkout");
      device.async = true;
      document.head.appendChild(device);
    }
  });
  return sdkPromise;
}

export class MpTokenizeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MpTokenizeError";
  }
}

/**
 * Descobre o payment_method_id de DÉBITO pelo BIN (6+ dígitos). Lança
 * MpTokenizeError se a bandeira não tiver método de débito no MP (ex.: o
 * usuário digitou um cartão só-crédito na aba débito).
 */
export async function getDebitPaymentMethodId(cardNumber: string): Promise<string> {
  const mp = await loadMercadoPago();
  const bin = cardNumber.replace(/\D/g, "").slice(0, 8);
  const { results } = await mp.getPaymentMethods({ bin });
  const debit = results?.find((m) => m.payment_type_id === "debit_card");
  if (!debit) {
    const hasCredit = results?.some((m) => m.payment_type_id === "credit_card");
    throw new MpTokenizeError(
      hasCredit
        ? "Este cartão não tem função débito. Use a opção de crédito ou outro cartão."
        : "Não reconhecemos a bandeira deste cartão para débito.",
    );
  }
  return debit.id;
}

/**
 * Tokeniza o cartão de débito. `expiry` no formato MM/AA ou MM/AAAA.
 * Retorna o token de uso único enviado ao backend no lugar do PAN.
 */
export async function createDebitCardToken(card: {
  number: string;
  name: string;
  expiry: string;
  cvv: string;
  cpf?: string;
}): Promise<string> {
  const mp = await loadMercadoPago();
  const [monthRaw, yearRaw] = card.expiry.replace(/\s/g, "").split("/");
  const month = (monthRaw ?? "").padStart(2, "0");
  const year = (yearRaw ?? "").length === 2 ? `20${yearRaw}` : (yearRaw ?? "");

  try {
    const token = await mp.createCardToken({
      cardNumber: card.number.replace(/\D/g, ""),
      cardholderName: card.name.toUpperCase().trim(),
      cardExpirationMonth: month,
      cardExpirationYear: year,
      securityCode: card.cvv,
      ...(card.cpf && {
        identificationType: "CPF",
        identificationNumber: card.cpf.replace(/\D/g, ""),
      }),
    });
    if (!token?.id) throw new MpTokenizeError("Não foi possível validar o cartão. Confira os dados.");
    return token.id;
  } catch (e) {
    if (e instanceof MpTokenizeError) throw e;
    throw new MpTokenizeError("Não foi possível validar o cartão. Confira os dados e tente novamente.");
  }
}

/** Device fingerprint do MP, se o security.js já tiver populado. */
export function getMpDeviceId(): string | undefined {
  return typeof window !== "undefined" ? window.MP_DEVICE_SESSION_ID : undefined;
}
