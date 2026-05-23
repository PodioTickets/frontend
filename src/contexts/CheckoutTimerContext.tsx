"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { useCheckoutReservation } from "@/hooks/useCheckoutReservation";
import { OrderApiError, type OrderResponse } from "@/interfaces/order";
import { CheckoutExpiredModal } from "@/components/Checkout/CheckoutExpiredModal";

/**
 * Estado autoritativo do timer de reserva do checkout.
 *
 * Regras (ver docs/checkout-reservation-flow.md):
 * - `expiresAt` vem do servidor. Cliente nunca calcula, só exibe.
 * - `serverOffsetMs` corrige drift do relógio local: `now + offset ≈ serverTime`.
 * - Persiste `{orderId, fallbackUrl}` em localStorage pra sobreviver a reload.
 *   NÃO persiste `expiresAt` — sempre re-busca via GET /orders/{id} no mount.
 * - Zero polling periódico. Re-sincroniza só em eventos: mount, advance, visibilitychange.
 * - Ao expirar: confirma via GET, expulsa pro `fallbackUrl` com toast.
 */

interface TimerState {
  orderId: string;
  eventId: string;
  expiresAt: string; // ISO
  serverOffsetMs: number;
  fallbackUrl: string;
}

interface CheckoutTimerContextValue {
  orderId: string | null;
  expiresAt: string | null;
  remainingMs: number;
  isActive: boolean;
  /**
   * Snapshot autoritativo da última `OrderResponse` recebida do backend.
   * Permite que steps intermediários (ingressos, informações, produtos) leiam
   * `coupon`, `voucher`, `pricing` sem refazer GET /orders/{id}.
   */
  currentOrder: OrderResponse | null;
  /** Inicia ou substitui o timer. Chamado após POST /reserve. */
  startTimer: (order: OrderResponse, fallbackUrl: string) => void;
  /** Atualiza a partir de qualquer resposta do backend (estende PIX, etc). */
  syncFromOrder: (order: OrderResponse) => void;
  /** Limpa tudo (pagamento concluído). */
  clearTimer: () => void;
  /** Força re-sincronização via GET /orders/{id}. */
  refreshFromServer: () => Promise<OrderResponse | null>;
  /** Suprime o refresh automático de visibilidade (ex.: modal de erro de pagamento aberto). */
  pauseVisibilityRefresh: () => void;
  /** Retoma o refresh automático de visibilidade. */
  resumeVisibilityRefresh: () => void;
}

const CheckoutTimerContext = createContext<
  CheckoutTimerContextValue | undefined
>(undefined);

const STORAGE_PREFIX = "checkout_order_";

interface StoredEntry {
  orderId: string;
  fallbackUrl: string;
  expiresAt: string; // ISO — persisted to prevent server-side timer extension on GET
}

function storageKey(eventId: string): string {
  return `${STORAGE_PREFIX}${eventId}`;
}

function loadStored(eventId: string): StoredEntry | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(storageKey(eventId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredEntry;
    if (!parsed.orderId) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveStored(eventId: string, entry: StoredEntry) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(storageKey(eventId), JSON.stringify(entry));
  } catch {
    /* storage cheio / indisponível — ignorado */
  }
}

function clearStored(eventId: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(storageKey(eventId));
  } catch {
    /* ignora */
  }
}

export function computeOffsetMs(serverTimeIso: string | undefined): number {
  if (!serverTimeIso) return 0;
  const serverMs = new Date(serverTimeIso).getTime();
  if (isNaN(serverMs)) return 0;
  return serverMs - Date.now();
}

export function computeRemainingMs(
  expiresAt: string,
  serverOffsetMs: number,
): number {
  const expiresMs = new Date(expiresAt).getTime();
  if (isNaN(expiresMs)) return 0;
  const offset = isNaN(serverOffsetMs) ? 0 : serverOffsetMs;
  const nowAdjusted = Date.now() + offset;
  return Math.max(0, expiresMs - nowAdjusted);
}

export function CheckoutTimerProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { getOrder } = useCheckoutReservation();

  const [state, setState] = useState<TimerState | null>(null);
  const [currentOrder, setCurrentOrder] = useState<OrderResponse | null>(null);
  const [remainingMs, setRemainingMs] = useState(0);
  const [expiredModalOpen, setExpiredModalOpen] = useState(false);
  const [expiredFallbackUrl, setExpiredFallbackUrl] = useState<string | null>(null);
  const stateRef = useRef<TimerState | null>(null);
  const hasExpiredRef = useRef(false);
  const suppressVisibilityRefreshRef = useRef(false);

  // Refs estáveis para funções usadas no tick — evita re-runs desnecessários.
  const getOrderRef = useRef(getOrder);
  const routerRef = useRef(router);
  useEffect(() => {
    getOrderRef.current = getOrder;
  }, [getOrder]);
  useEffect(() => {
    routerRef.current = router;
  }, [router]);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const applyOrder = useCallback(
    (order: OrderResponse, fallbackUrl: string) => {
      const next: TimerState = {
        orderId: order.orderId,
        eventId: order.eventId,
        expiresAt: order.expiresAt,
        serverOffsetMs: computeOffsetMs(order.serverTime),
        fallbackUrl,
      };
      setState(next);
      setCurrentOrder(order);
      stateRef.current = next;
      hasExpiredRef.current = false;
      saveStored(order.eventId, {
        orderId: order.orderId,
        fallbackUrl,
        expiresAt: next.expiresAt,
      });
      setRemainingMs(computeRemainingMs(next.expiresAt, next.serverOffsetMs));
    },
    [],
  );

  // handleExpired — chamado apenas pelo tick (timer chegou a 0 de verdade).
  // Mostra o modal "Tempo esgotado".
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const handleExpired = useCallback(async () => {
    if (hasExpiredRef.current) return;
    hasExpiredRef.current = true;
    const current = stateRef.current;
    if (!current) return;
    clearStored(current.eventId);
    setExpiredFallbackUrl(current.fallbackUrl);
    setState(null);
    setCurrentOrder(null);
    stateRef.current = null;
    setRemainingMs(0);
    setExpiredModalOpen(true);
  }, []); // [] intencional: usa routerRef para evitar deps instáveis

  // handleCancelledByServer — chamado pelo syncFromOrder quando o servidor
  // retorna CANCELLED. Redireciona silenciosamente sem abrir o modal,
  // pois o timer do cliente ainda pode estar marcando tempo (race condition).
  const handleCancelledByServer = useCallback((fallbackUrl: string) => {
    if (hasExpiredRef.current) return;
    hasExpiredRef.current = true;
    clearStored(stateRef.current?.eventId ?? "");
    setState(null);
    setCurrentOrder(null);
    stateRef.current = null;
    setRemainingMs(0);
    routerRef.current.push(fallbackUrl);
  }, []);

  const startTimer = useCallback(
    (order: OrderResponse, fallbackUrl: string) => {
      applyOrder(order, fallbackUrl);
    },
    [applyOrder],
  );

  const syncFromOrder = useCallback(
    (order: OrderResponse) => {
      const current = stateRef.current;
      const fallbackUrl =
        current?.fallbackUrl ?? `/events/${order.eventId}`;
      if (order.status !== "PENDING") {
        if (order.status === "CANCELLED") {
          handleCancelledByServer(fallbackUrl);
        } else {
          // PAID — limpa timer silenciosamente
          clearStored(order.eventId);
          setState(null);
          setCurrentOrder(null);
          stateRef.current = null;
          setRemainingMs(0);
        }
        return;
      }
      applyOrder(order, fallbackUrl);
    },
    [applyOrder, handleCancelledByServer],
  );

  const clearTimer = useCallback(() => {
    const current = stateRef.current;
    if (current) clearStored(current.eventId);
    setState(null);
    setCurrentOrder(null);
    stateRef.current = null;
    setRemainingMs(0);
    hasExpiredRef.current = false;
  }, []);

  const refreshFromServer = useCallback(async (): Promise<OrderResponse | null> => {
    const current = stateRef.current;
    if (!current) return null;
    try {
      const order = await getOrderRef.current(current.orderId);
      syncFromOrder(order);
      return order;
    } catch (err) {
      if (err instanceof OrderApiError && err.code === "ORDER_NOT_FOUND") {
        // Ordem não encontrada: redireciona silenciosamente sem modal
        handleCancelledByServer(current.fallbackUrl);
      }
      return null;
    }
  }, [syncFromOrder, handleCancelledByServer]);

  // Rehidratação: ao montar, lê o eventId da URL e verifica se há pedido salvo.
  // Roda apenas uma vez no mount para evitar requests duplicados em re-renders.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const eventId = new URLSearchParams(window.location.search).get("eventId");
    if (!eventId) return;
    const stored = loadStored(eventId);
    if (!stored) return;
    let cancelled = false;
    (async () => {
      try {
        const order = await getOrderRef.current(stored.orderId);
        if (cancelled) return;
        if (order.status === "PENDING") {
          // Se o servidor devolver um expiresAt maior que o armazenado,
          // mantemos o armazenado para evitar que o timer "aumente" no refresh
          // (backend pode renovar expiresAt a cada GET).
          const effectiveExpiresAt =
            stored.expiresAt &&
            new Date(order.expiresAt) > new Date(stored.expiresAt)
              ? stored.expiresAt
              : order.expiresAt;

          const remaining = computeRemainingMs(
            effectiveExpiresAt,
            computeOffsetMs(order.serverTime),
          );
          if (remaining > 0) {
            applyOrder({ ...order, expiresAt: effectiveExpiresAt }, stored.fallbackUrl);
          } else {
            clearStored(eventId);
          }
        } else {
          clearStored(eventId);
        }
      } catch (err) {
        if (cancelled) return;
        if (err instanceof OrderApiError && err.code === "ORDER_NOT_FOUND") {
          clearStored(eventId);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Tick do countdown — 1s enquanto houver state ativo.
   *
   * IMPORTANTE: deps = [state] apenas.
   * Não incluímos applyOrder/handleExpired/getOrder para evitar o loop:
   *   remaining<=0 → getOrder → applyOrder → setState → tick re-run → repeat
   *
   * No caso de drift (PENDING com tempo estendido pelo servidor), atualizamos
   * stateRef diretamente sem chamar setState, quebrando o ciclo.
   */
  useEffect(() => {
    if (!state) return;
    let expiryCheckActive = false;

    const tick = () => {
      const current = stateRef.current;
      if (!current) return;
      const remaining = computeRemainingMs(
        current.expiresAt,
        current.serverOffsetMs,
      );
      setRemainingMs(remaining);

      if (remaining <= 0 && !expiryCheckActive) {
        expiryCheckActive = true;
        void (async () => {
          try {
            const order = await getOrderRef.current(current.orderId);
            const serverRemaining = computeRemainingMs(
              order.expiresAt,
              computeOffsetMs(order.serverTime),
            );
            if (order.status === "PENDING" && serverRemaining > 0) {
              // Drift: servidor ainda não cancelou e tem tempo novo.
              // Atualiza stateRef diretamente — sem setState para não
              // reiniciar o tick effect e criar outro loop.
              const driftState: TimerState = {
                ...current,
                expiresAt: order.expiresAt,
                serverOffsetMs: computeOffsetMs(order.serverTime),
              };
              stateRef.current = driftState;
              setRemainingMs(serverRemaining);
              expiryCheckActive = false; // libera para próxima verificação
            } else {
              void handleExpired();
            }
          } catch {
            void handleExpired();
          }
        })();
      }
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]); // Apenas [state] — intencional para evitar loop

  const pauseVisibilityRefresh = useCallback(() => {
    suppressVisibilityRefreshRef.current = true;
  }, []);

  const resumeVisibilityRefresh = useCallback(() => {
    suppressVisibilityRefreshRef.current = false;
  }, []);

  // Re-sincroniza quando a aba volta ao foco.
  useEffect(() => {
    if (!state) return;
    const onVisibility = () => {
      if (document.visibilityState === "visible" && !suppressVisibilityRefreshRef.current) {
        void refreshFromServer();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [state, refreshFromServer]);

  const value = useMemo<CheckoutTimerContextValue>(
    () => ({
      orderId: state?.orderId ?? null,
      expiresAt: state?.expiresAt ?? null,
      remainingMs,
      isActive: state !== null && remainingMs > 0,
      currentOrder,
      startTimer,
      syncFromOrder,
      clearTimer,
      refreshFromServer,
      pauseVisibilityRefresh,
      resumeVisibilityRefresh,
    }),
    [
      state,
      remainingMs,
      currentOrder,
      startTimer,
      syncFromOrder,
      clearTimer,
      refreshFromServer,
      pauseVisibilityRefresh,
      resumeVisibilityRefresh,
    ],
  );

  const handleExpiredConfirm = useCallback(() => {
    setExpiredModalOpen(false);
    if (expiredFallbackUrl) {
      routerRef.current.push(expiredFallbackUrl);
    }
  }, [expiredFallbackUrl]);

  return (
    <CheckoutTimerContext.Provider value={value}>
      {children}
      <CheckoutExpiredModal
        open={expiredModalOpen}
        onConfirm={handleExpiredConfirm}
      />
    </CheckoutTimerContext.Provider>
  );
}

export function useCheckoutTimer(): CheckoutTimerContextValue {
  const ctx = useContext(CheckoutTimerContext);
  if (!ctx) {
    throw new Error(
      "useCheckoutTimer must be used within a CheckoutTimerProvider",
    );
  }
  return ctx;
}

/**
 * Provider no-op para fluxos de pré-visualização (organizer/admin editando
 * tickets). Mesma API do provider real, mas sem nenhum side-effect: não lê
 * localStorage, não chama `getOrder`, não monta interval/listeners. Permite
 * que componentes de checkout (ex.: `ModalitiesStep`) sejam renderizados na
 * prévia sem disparar fetch de ordem ou redirecionamento por timer expirado.
 */
export function CheckoutTimerPreviewProvider({ children }: { children: ReactNode }) {
  const value = useMemo<CheckoutTimerContextValue>(
    () => ({
      orderId: null,
      expiresAt: null,
      remainingMs: 0,
      isActive: false,
      currentOrder: null,
      startTimer: () => { },
      syncFromOrder: () => { },
      clearTimer: () => { },
      refreshFromServer: async () => null,
      pauseVisibilityRefresh: () => { },
      resumeVisibilityRefresh: () => { },
    }),
    [],
  );
  return (
    <CheckoutTimerContext.Provider value={value}>
      {children}
    </CheckoutTimerContext.Provider>
  );
}

export function formatRemaining(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const mm = Math.floor(totalSeconds / 60);
  const ss = totalSeconds % 60;
  return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}
