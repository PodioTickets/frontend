"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "../Button";
import { Loading } from "../Loading";
import { organizerService } from "@/services";

// Montar/desmontar via render condicional no pai (mount = aberto) — sem prop
// `isOpen` nem effect de seed síncrono.

interface QuoteOrder {
  orderId: string;
  netAmount: number; // centavos
  daysUntilRelease: number;
}

interface AnticipationQuote {
  anticipatableTotal: number; // centavos
  monthlyRate: number; // fração (ex.: 0.02)
  orders: QuoteOrder[]; // JÁ ordenados oldest-first pelo backend
}

interface AnticipationModalProps {
  eventId: string;
  onClose: () => void;
  /** Chamado após a antecipação ser solicitada com sucesso (ex.: recarregar o drawer). */
  onSuccess?: () => void;
}

const formatBRL = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/**
 * Prévia LOCAL do custo — mesma fórmula do backend (autoritativo no POST):
 * consome os pedidos MAIS ANTIGOS primeiro (a lista já vem oldest-first),
 * custo_i = round(consumido_i × taxaMensal × dias_i / 30).
 */
function previewCost(orders: QuoteOrder[], amountCents: number, monthlyRate: number): number {
  let remaining = amountCents;
  let cost = 0;
  for (const o of orders) {
    if (remaining <= 0) break;
    const consumed = Math.min(remaining, o.netAmount);
    if (consumed <= 0) continue;
    cost += Math.round(consumed * monthlyRate * (o.daysUntilRelease / 30));
    remaining -= consumed;
  }
  return cost;
}

export function AnticipationModal({ eventId, onClose, onSuccess }: AnticipationModalProps) {
  const [loading, setLoading] = useState(true);
  const [quote, setQuote] = useState<AnticipationQuote | null>(null);
  const [rawAmount, setRawAmount] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Busca a cotação ao montar (mount = aberto). setState em callback async não é
  // o "setState síncrono em effect" que o lint proíbe.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await organizerService.getAnticipationQuote(eventId);
        if (cancelled) return;
        setQuote(data);
        setRawAmount(data.anticipatableTotal); // semeia com "antecipar tudo"
      } catch (e: unknown) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : "Erro ao carregar antecipação";
        toast.error(msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  // Fecha no Esc.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const maxAmountCents = quote?.anticipatableTotal ?? 0;
  const monthlyRate = quote?.monthlyRate ?? 0;
  const amountCents = Math.min(Math.max(0, rawAmount), maxAmountCents);
  const setAmountCents = (v: number) =>
    setRawAmount(Math.min(Math.max(0, v), maxAmountCents));

  const feeCents = useMemo(
    () => (quote ? previewCost(quote.orders, amountCents, monthlyRate) : 0),
    [quote, amountCents, monthlyRate],
  );
  const receiveCents = Math.max(0, amountCents - feeCents);
  const pct = maxAmountCents > 0 ? (amountCents / maxAmountCents) * 100 : 0;
  // Taxa efetiva (blended) exibida como "média X%" — custo / valor solicitado.
  const effectiveRatePct = amountCents > 0 ? (feeCents / amountCents) * 100 : 0;

  // Input estilo "acumulador de centavos": só dígitos, os 2 últimos são centavos.
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, "");
    setAmountCents(parseInt(digits || "0", 10));
  };

  const handleConfirm = async () => {
    if (amountCents <= 0 || submitting) return;
    setSubmitting(true);
    try {
      await organizerService.requestAnticipation(eventId, amountCents);
      toast.success("Antecipação solicitada com sucesso.");
      onSuccess?.();
      onClose();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erro ao solicitar antecipação";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (typeof document === "undefined") return null;

  const noReceivables = !loading && maxAmountCents <= 0;

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50"
      style={{ pointerEvents: "auto" }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Antecipar recebíveis"
    >
      <div
        className="w-full max-w-[520px] bg-gray-1 rounded-xl border border-gray-6 shadow-2xl flex flex-col max-h-[calc(100vh-2rem)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-6">
          <h2 className="font-family-dm-sans font-semibold text-[20px] leading-[1.3] text-gray-12">
            Antecipar recebíveis
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="size-8 flex items-center justify-center rounded-lg hover:bg-gray-3 transition-colors cursor-pointer"
          >
            <X className="size-6 text-gray-11" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5 flex flex-col gap-4 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loading />
            </div>
          ) : noReceivables ? (
            <p className="font-family-dm-sans text-base text-gray-11 text-center py-6">
              Nenhum recebível disponível para antecipação no momento.
            </p>
          ) : (
            <>
              <p className="font-family-dm-sans font-medium text-base text-gray-12">
                Quanto você quer antecipar?
              </p>

              {/* Input + Antecipar tudo */}
              <div className="flex items-center justify-between gap-2 border border-gray-6 rounded-lg px-3 py-4 bg-gray-1">
                <input
                  type="text"
                  inputMode="numeric"
                  value={formatBRL(amountCents)}
                  onChange={handleInputChange}
                  className="flex-1 min-w-0 text-xl font-manrope font-extrabold tracking-[0.5px] text-gray-12 bg-transparent border-none outline-none"
                  aria-label="Valor a antecipar"
                />
                <button
                  type="button"
                  onClick={() => setAmountCents(maxAmountCents)}
                  className="text-sm font-family-dm-sans font-semibold text-blue-11 hover:text-blue-12 transition-colors shrink-0 cursor-pointer"
                >
                  Antecipar tudo
                </button>
              </div>

              {/* Slider */}
              <div className="flex flex-col gap-1">
                <div className="relative h-5 flex items-center">
                  <input
                    type="range"
                    min={0}
                    max={maxAmountCents}
                    step={1}
                    value={amountCents}
                    onChange={(e) => setAmountCents(Number(e.target.value))}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 m-0"
                    aria-label="Selecionar valor a antecipar"
                  />
                  <div className="h-2 w-full rounded-full bg-gray-4 overflow-hidden">
                    <div className="h-full bg-primary-11 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <div
                    className="absolute size-5 rounded-full bg-gray-1 border border-gray-6 shadow -translate-x-1/2 pointer-events-none flex items-center justify-center gap-[2px]"
                    style={{ left: `${pct}%` }}
                  >
                    <span className="w-px h-2 bg-gray-8" />
                    <span className="w-px h-2 bg-gray-8" />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-family-dm-sans text-sm text-gray-11">R$ 0</span>
                  <span className="font-family-dm-sans text-sm text-gray-11">
                    R$ {formatBRL(maxAmountCents)}
                  </span>
                </div>
              </div>

              {/* Resumo */}
              <div className="bg-gray-2 border border-gray-6 rounded-lg overflow-hidden">
                <div className="flex items-start justify-between px-4 py-3">
                  <span className="font-family-dm-sans text-sm text-gray-12">Valor solicitado</span>
                  <span className="font-inter font-semibold text-sm text-gray-12">
                    R$ {formatBRL(amountCents)}
                  </span>
                </div>
                <div className="flex items-start justify-between px-4 py-3 border-t border-gray-6">
                  <div className="flex flex-col">
                    <span className="font-family-dm-sans text-sm text-gray-12">
                      Taxa de antecipação
                    </span>
                    <span className="font-family-dm-sans text-xs text-gray-11">
                      média {effectiveRatePct.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%
                    </span>
                  </div>
                  <span className="font-inter font-semibold text-sm text-gray-12">
                    − R$ {formatBRL(feeCents)}
                  </span>
                </div>
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-6 bg-gray-3">
                  <span className="font-family-dm-sans font-medium text-sm text-gray-12">
                    Você recebe hoje
                  </span>
                  <span className="font-inter font-bold text-sm text-primary-11">
                    R$ {formatBRL(receiveCents)}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-6 flex gap-2.5 justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="h-[44px] px-8 border-[1.5px] border-gray-6 text-gray-12 font-bold text-base font-manrope hover:bg-gray-2"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="default"
            onClick={handleConfirm}
            disabled={loading || noReceivables || amountCents <= 0 || submitting}
            className="h-[44px] px-8 text-base font-bold font-manrope disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Aguarde..." : "Confirmar"}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
