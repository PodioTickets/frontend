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
// IMPORTANTE: o SDK BP MPI identifica os campos pela CLASSE (ex.:
// `<input class="bpmpi_accesstoken">`), NÃO pelo ID. Criar com ID faz o SDK
// não enxergar o valor e o /v2/3ds/init retorna 401.

function setBpmpiField(className: string, value: string): void {
  let el = document.querySelector<HTMLInputElement>(
    `input.${CSS.escape(className)}`,
  );
  if (!el) {
    el = document.createElement("input");
    el.type = "hidden";
    el.name = className;
    el.className = className;
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

// ─── Helper: extrai payload do callback do SDK ────────────────────────────────
// A doc Cielo passa o objeto direto (e.Cavv), mas algumas versões do SDK podem
// envolver em CustomEvent (e.detail.Cavv). Aceitar os dois evita bug silencioso
// (TypeError dentro do callback é engolido pelo SDK → Promise nunca resolve).

function pickDetail<T extends object>(e: T | { detail: T }): T {
  if (e && typeof e === "object" && "detail" in e && (e as { detail: unknown }).detail) {
    return (e as { detail: T }).detail;
  }
  return e as T;
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

      // 2. Preencher hidden fields lidos pelo SDK (identificados por CLASS).
      const { month, year } = parseExpiry(params.card.expiry);

      // bpmpi_auth = "true" → executa autenticação 3DS de fato (obrigatório para débito).
      // "false" coloca o SDK em modo data-only e a autenticação nunca acontece.
      setBpmpiField("bpmpi_auth", "true");
      setBpmpiField("bpmpi_auth_notifyonly", "false");
      setBpmpiField("bpmpi_auth_suppresschallenge", "false");
      setBpmpiField("bpmpi_accesstoken", accessToken);
      setBpmpiField("bpmpi_ordernumber", params.orderId);
      // ISO 4217 numérico — BRL = 986. SDK não aceita o código alfa "BRL".
      setBpmpiField("bpmpi_currency", "986");
      setBpmpiField("bpmpi_totalamount", String(params.totalAmountCents));
      setBpmpiField("bpmpi_installments", "1");
      // Doc Cielo exige lowercase: "credit" ou "debit".
      setBpmpiField("bpmpi_paymentmethod", "debit");
      setBpmpiField("bpmpi_cardnumber", params.card.number.replace(/\D/g, ""));
      setBpmpiField("bpmpi_cardexpirationmonth", month);
      setBpmpiField("bpmpi_cardexpirationyear", year);
      setBpmpiField("bpmpi_cardalias", params.card.name.trim());

      // 3. Configurar callbacks e iniciar autenticação
      return new Promise<ThreeDSAuthResult>((resolve, reject) => {
        // Timeout de segurança: o challenge do banco pode demorar (usuário
        // recebe SMS/abre app) — 5min cobre o pior caso. Se nenhum callback
        // disparar nesse tempo, rejeita (evita loading infinito).
        let settled = false;
        // Race interna do SDK BP MPI: o Cardinal Commerce script é carregado
        // sob demanda na 1ª chamada e o SDK tenta usar antes de terminar.
        // Retry automático se o erro for "Cardinal is not defined" — na 2ª
        // tentativa o Cardinal já está em memória.
        let cardinalRetried = false;
        const finish = (cb: () => void) => {
          if (settled) return;
          settled = true;
          clearTimeout(timeoutId);
          cb();
        };
        const timeoutId = setTimeout(() => {
          finish(() =>
            reject(
              new ThreeDSError(
                "SDK_ERROR",
                "Tempo esgotado aguardando resposta do 3DS. Tente novamente.",
              ),
            ),
          );
        }, 5 * 60_000);

        // BP MPI exige que bpmpi_config seja uma FUNÇÃO que retorna a config.
        // O SDK invoca bpmpi_config() internamente — passar objeto literal
        // dispara "bpmpi_config is not a function".
        window.bpmpi_config = () => ({
          Environment: IS_PROD ? "PRD" : "SDB",
          Debug: !IS_PROD,

          // onReady só dispara automaticamente se bpmpi_config existir antes do
          // DOMContentLoaded. Como o SDK é carregado sob demanda (página já
          // pronta), não dependemos dele — chamamos bpmpi_authenticate() direto
          // após loadSDK() resolver. Mantido como no-op pra evitar warnings.
          onReady: () => {},

          onSuccess: (e) => {
            const d = pickDetail(e as never);
            if (!IS_PROD) console.warn("[3DS] onSuccess raw", d);
            if (!IS_PROD) console.warn("[3DS] settled antes do finish?", settled);
            finish(() => {
              if (!IS_PROD) console.warn("[3DS] cb finish executando — vai resolver");
              resolve({
                cavv: d.Cavv,
                eci: d.Eci,
                xid: d.Xid || undefined,
                referenceId: d.ReferenceId || undefined,
                version: d.Version || undefined,
              });
              if (!IS_PROD) console.warn("[3DS] resolve chamado");
            });
            if (!IS_PROD) console.warn("[3DS] depois do finish (settled =", settled, ")");
          },

          // Banco recusou a autenticação
          onFailure: (e) => {
            const d = pickDetail(e as never);
            if (!IS_PROD) console.warn("[3DS] onFailure raw", d);
            finish(() =>
              reject(
                new ThreeDSError(
                  "FAILURE",
                  d.ReturnMessage || "Autenticação recusada pelo banco",
                  d.ReturnCode,
                ),
              ),
            );
          },

          // Cartão não cadastrado no 3DS: passa Eci sem Cavv, backend decide
          onUnenrolled: (e) => {
            const d = pickDetail(e as never);
            if (!IS_PROD) console.warn("[3DS] onUnenrolled raw", d);
            finish(() => resolve({ cavv: "", eci: d.Eci }));
          },

          onDisabled: () =>
            finish(() =>
              reject(
                new ThreeDSError(
                  "DISABLED",
                  "Autenticação 3DS desabilitada para este estabelecimento",
                ),
              ),
            ),

          onError: (e) => {
            const d = pickDetail(e as never);
            // Em dev, loga TODO evento de erro (mesmo após settled) — o SDK
            // pode disparar onError várias vezes (ex.: race do Cardinal +
            // 401 real do /v2/3ds/init) e o primeiro nem sempre é a raiz.
            if (!IS_PROD) console.warn("[3DS] onError raw", d);

            // Retry transparente da race do Cardinal: na 1ª chamada o script
            // do Cardinal Commerce ainda está carregando quando o SDK tenta
            // usá-lo. 1s é o suficiente pra 99% dos casos.
            const msg = String(d.ReturnMessage || "");
            if (!cardinalRetried && /Cardinal is not defined/i.test(msg)) {
              cardinalRetried = true;
              if (!IS_PROD) console.warn("[3DS] Race do Cardinal — retry em 1s");
              setTimeout(() => {
                if (settled) return;
                if (typeof window.bpmpi_authenticate === "function") {
                  window.bpmpi_authenticate();
                }
              }, 1000);
              return;
            }

            finish(() =>
              reject(
                new ThreeDSError(
                  "SDK_ERROR",
                  d.ReturnMessage || "Erro no processo de autenticação 3DS",
                  d.ReturnCode,
                ),
              ),
            );
          },

          onUnsupportedBrand: () =>
            finish(() =>
              reject(
                new ThreeDSError(
                  "UNSUPPORTED_BRAND",
                  "Bandeira do cartão não suportada para autenticação 3DS",
                ),
              ),
            ),
        });

        // Tenta chamar bpmpi_authenticate. Se ReferenceError "Cardinal is not
        // defined" (race interna do SDK na 1ª chamada), retry após 1s.
        const tryAuthenticate = (): void => {
          if (typeof window.bpmpi_authenticate !== "function") {
            finish(() =>
              reject(
                new ThreeDSError(
                  "SDK_ERROR",
                  "SDK 3DS carregado mas bpmpi_authenticate indisponível.",
                ),
              ),
            );
            return;
          }
          try {
            window.bpmpi_authenticate();
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            if (!cardinalRetried && /Cardinal is not defined/i.test(msg)) {
              cardinalRetried = true;
              if (!IS_PROD) console.warn("[3DS] Race do Cardinal — retry em 1s");
              setTimeout(() => {
                if (settled) return;
                tryAuthenticate();
              }, 1000);
              return;
            }
            throw err;
          }
        };

        loadSDK()
          .then(tryAuthenticate)
          .catch((err: unknown) => {
            finish(() =>
              reject(
                err instanceof ThreeDSError
                  ? err
                  : new ThreeDSError(
                      "SDK_ERROR",
                      err instanceof Error ? err.message : "Erro ao carregar SDK 3DS",
                    ),
              ),
            );
          });
      });
    },
    [],
  );

  return { authenticate };
}
