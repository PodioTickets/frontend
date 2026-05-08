"use client";

import { useCallback } from "react";
import { apiClient } from "@/services";

// ─── URLs do SDK ──────────────────────────────────────────────────────────────

const IS_PROD = process.env.NODE_ENV === "production";

const SDK_URL =
  process.env.NEXT_PUBLIC_BRASPAG_3DS_URL ??
  (IS_PROD
    ? "https://mpi.braspag.com.br/Scripts/BP.Mpi.3ds20.min.js"
    : "https://mpisandbox.braspag.com.br/Scripts/BP.Mpi.3ds20.min.js");

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333";

// ─── Estado do SDK (módulo-level para não recarregar entre renders) ───────────

let sdkReady = false;
let sdkLoading: Promise<void> | null = null;

function loadSDK(): Promise<void> {
  if (sdkReady) return Promise.resolve();
  if (sdkLoading) return sdkLoading;

  sdkLoading = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${SDK_URL}"]`,
    );
    if (existing) {
      sdkReady = true;
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = SDK_URL;
    script.async = true;
    script.onload = () => {
      sdkReady = true;
      sdkLoading = null;
      resolve();
    };
    script.onerror = () => {
      sdkLoading = null;
      reject(
        new ThreeDSError(
          "SDK_ERROR",
          "Falha ao carregar o SDK 3DS. Verifique sua conexão.",
        ),
      );
    };
    document.head.appendChild(script);
  });

  return sdkLoading;
}

// ─── Helper: setar / criar hidden input que o SDK lê ─────────────────────────

function setField(id: string, value: string): void {
  let el = document.getElementById(id) as HTMLInputElement | null;
  if (!el) {
    el = document.createElement("input");
    el.type = "hidden";
    el.id = id;
    document.body.appendChild(el);
  }
  el.value = value;
}

// ─── Helper: parsear "MM/YY" ou "MM / YY" ────────────────────────────────────

function parseExpiry(expiry: string): { month: string; year: string } {
  const clean = expiry.replace(/\s/g, "");
  const [mm = "", yr = ""] = clean.split("/");
  return {
    month: mm.padStart(2, "0"),
    year: yr.length === 2 ? `20${yr}` : yr,
  };
}

// ─── Tipos públicos ────────────────────────────────────────────────────────────

export interface ThreeDSAuthResult {
  cavv: string;
  eci: string;
  xid?: string;
  referenceId?: string;
  version?: string;
}

export type ThreeDSErrorCode =
  | "FAILURE"
  | "DISABLED"
  | "UNSUPPORTED_BRAND"
  | "SDK_ERROR"
  | "TOKEN_ERROR";

export class ThreeDSError extends Error {
  constructor(
    public readonly code: ThreeDSErrorCode,
    message: string,
    public readonly returnCode?: string,
  ) {
    super(message);
    this.name = "ThreeDSError";
  }
}

interface AuthParams {
  orderId: string;
  /** Total em centavos (ex: R$ 149,90 → 14990) */
  totalAmountCents: number;
  card: {
    number: string; // com ou sem espaços
    name: string;
    expiry: string; // "MM/YY"
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useThreeDS() {
  const authenticate = useCallback(
    async (params: AuthParams): Promise<ThreeDSAuthResult> => {
      const token = apiClient.getAccessToken();
      if (!token) throw new ThreeDSError("TOKEN_ERROR", "Não autenticado");

      // 1. Obter AccessToken 3DS do backend
      const tokenRes = await fetch(
        `${API_BASE_URL}/api/v1/orders/${params.orderId}/3ds-token`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!tokenRes.ok) {
        throw new ThreeDSError(
          "TOKEN_ERROR",
          "Erro ao obter token de autenticação 3DS. Tente novamente.",
        );
      }
      const { accessToken } = (await tokenRes.json()) as {
        accessToken: string;
      };

      // 2. Preencher hidden fields lidos pelo SDK
      const { month, year } = parseExpiry(params.card.expiry);

      setField("bpmpi_auth", "false");
      setField("bpmpi_auth_notifyonly", "false");
      setField("bpmpi_auth_suppresschallenge", "false");
      setField("bpmpi_accesstoken", accessToken);
      setField("bpmpi_ordernumber", params.orderId);
      setField("bpmpi_currency", "BRL");
      setField("bpmpi_totalamount", String(params.totalAmountCents));
      setField("bpmpi_installments", "1");
      setField("bpmpi_paymentmethod", "Debit");
      setField("bpmpi_cardnumber", params.card.number.replace(/\D/g, ""));
      setField("bpmpi_cardexpirationmonth", month);
      setField("bpmpi_cardexpirationyear", year);
      setField("bpmpi_cardalias", params.card.name.trim());

      // 3. Configurar callbacks e iniciar autenticação
      const wasReady = sdkReady;

      return new Promise<ThreeDSAuthResult>((resolve, reject) => {
        window.bpmpi_config = {
          Environment: IS_PROD ? "PRD" : "SDB",
          Debug: !IS_PROD,

          // Disparado na 1ª carga do script
          onReady: () => {
            if (typeof window.bpmpi_authenticate === "function") {
              window.bpmpi_authenticate();
            }
          },

          onSuccess: (e) => {
            resolve({
              cavv: e.detail.Cavv,
              eci: e.detail.Eci,
              xid: e.detail.Xid || undefined,
              referenceId: e.detail.ReferenceId || undefined,
              version: e.detail.Version || undefined,
            });
          },

          // Banco recusou a autenticação
          onFailure: (e) => {
            reject(
              new ThreeDSError(
                "FAILURE",
                e.detail.ReturnMessage || "Autenticação recusada pelo banco",
                e.detail.ReturnCode,
              ),
            );
          },

          // Cartão não cadastrado no 3DS: passa Eci sem Cavv, backend decide
          onUnenrolled: (e) => {
            resolve({ cavv: "", eci: e.detail.Eci });
          },

          onDisabled: () => {
            reject(
              new ThreeDSError(
                "DISABLED",
                "Autenticação 3DS desabilitada para este estabelecimento",
              ),
            );
          },

          onError: (e) => {
            reject(
              new ThreeDSError(
                "SDK_ERROR",
                e.detail.ReturnMessage || "Erro no processo de autenticação 3DS",
                e.detail.ReturnCode,
              ),
            );
          },

          onUnsupportedBrand: () => {
            reject(
              new ThreeDSError(
                "UNSUPPORTED_BRAND",
                "Bandeira do cartão não suportada para autenticação 3DS",
              ),
            );
          },
        };

        loadSDK()
          .then(() => {
            // SDK já estava carregado: onReady não dispara de novo → chamar direto
            if (wasReady && typeof window.bpmpi_authenticate === "function") {
              window.bpmpi_authenticate();
            }
          })
          .catch((err: unknown) => {
            reject(
              err instanceof ThreeDSError
                ? err
                : new ThreeDSError(
                    "SDK_ERROR",
                    err instanceof Error ? err.message : "Erro ao carregar SDK 3DS",
                  ),
            );
          });
      });
    },
    [],
  );

  return { authenticate };
}
