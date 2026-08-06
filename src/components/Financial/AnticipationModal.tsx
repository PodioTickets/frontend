"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "../Button";
import { Loading } from "../Loading";
import { organizerService } from "@/services";
import {
  computeAnticipation,
  type AnticipationQuote,
} from "@/utils/anticipation";
import { AnticipationLockedModal } from "./AnticipationLockedModal";

// Montar/desmontar via render condicional no pai (mount = aberto) — sem prop
// `isOpen` nem effect de seed síncrono.

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

export function AnticipationModal({ eventId, onClose, onSuccess }: AnticipationModalProps) {
  const [loading, setLoading] = useState(true);
  const [quote, setQuote] = useState<AnticipationQuote | null>(null);
  const [rawAmount, setRawAmount] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  // Gate "Antecipe suas vendas" — evento sem antecipação habilitada (análise pendente).
  const [showLocked, setShowLocked] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // O modal é um portal em document.body, ABERTO por cima de um vaul Drawer (Radix
  // Dialog com focus-trap). O Radix escuta focusin/focusout no `document` (fase
  // bubble) e, ao ver o foco "fora" do drawer, o reivindica de volta → o foco pula
  // do input e não dá pra digitar. Havia DOIS vazamentos e o hack antigo (parar a
  // propagação só no container do modal) cobria apenas o primeiro — daí ser
  // INTERMITENTE (dependia de onde o foco estava antes do clique):
  //   (a) focusin cujo alvo está DENTRO do modal (o foco entrou no input);
  //   (b) focusout de um elemento DO DRAWER cujo relatedTarget é o input do modal
  //       (o foco saindo do drawer PARA o modal) — esse evento NÃO passa pelo
  //       container do modal, então nunca era barrado e o Radix reivindicava.
  // Barramos os dois na fase de CAPTURA do `document` (roda ANTES do listener
  // bubble do Radix) com stopImmediatePropagation, só quando o foco envolve o
  // modal. Não afeta a digitação (eventos input/change são independentes do foco)
  // nem o trap do drawer quando o modal não está envolvido.
  useEffect(() => {
    const node = contentRef.current;
    if (!node) return;

    const isInModal = (n: EventTarget | null) =>
      n instanceof Node && node.contains(n);

    const guardFocus = (e: FocusEvent) => {
      // focusin: alvo entrou no modal | focusout: relatedTarget = quem recebe o foco.
      const focusEntersModal =
        e.type === "focusin" ? isInModal(e.target) : isInModal(e.relatedTarget);
      if (focusEntersModal) e.stopImmediatePropagation();
    };

    // Clique no modal não deve ser tratado como interação externa do drawer.
    const stopPointer = (e: Event) => e.stopPropagation();

    document.addEventListener("focusin", guardFocus, true);
    document.addEventListener("focusout", guardFocus, true);
    node.addEventListener("pointerdown", stopPointer);
    node.addEventListener("mousedown", stopPointer);
    return () => {
      document.removeEventListener("focusin", guardFocus, true);
      document.removeEventListener("focusout", guardFocus, true);
      node.removeEventListener("pointerdown", stopPointer);
      node.removeEventListener("mousedown", stopPointer);
    };
  }, []);

  // Busca a cotação ao montar (mount = aberto). setState em callback async não é
  // o "setState síncrono em effect" que o lint proíbe.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await organizerService.getAnticipationQuote(eventId);
        if (cancelled) return;
        setQuote(data);
        // Inicia ZERADO: o resumo/valor recomendado só aparecem após o organizador
        // digitar um valor (ou usar "Antecipar tudo"). Sem seed de "antecipar tudo".
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

  const availableTotal = quote?.availableTotal ?? 0; // bruto (Valor disponível)
  const maxReceivable = quote?.maxReceivable ?? 0; // líquido máximo (teto do input)
  const monthlyRate = quote?.monthlyRate ?? 0;
  const units = useMemo(() => quote?.units ?? [], [quote]);

  // `amountCents` = quanto o organizador quer RECEBER hoje (líquido), 0..maxReceivable.
  const amountCents = Math.min(Math.max(0, rawAmount), maxReceivable);
  const setAmountCents = (v: number) =>
    setRawAmount(Math.min(Math.max(0, v), maxReceivable));

  // Prévia AO VIVO com o MESMO motor do backend (recomendado/taxa conforme digita).
  const result = useMemo(
    () => computeAnticipation(units, amountCents, monthlyRate),
    [units, amountCents, monthlyRate],
  );

  const consumedGross = result.consumedGross; // "Valor total"
  const feeCents = result.effectiveFee; // "Taxa de antecipação"
  const receiveCents = result.receive; // "Você recebe hoje"
  const recommendedNet = result.recommendedNet; // valor recomendado (fronteira)
  const effectiveRatePct = result.effectiveRatePct;

  // Só revela o "Valor recomendado" e o resumo depois que há um valor informado
  // (digitado ou via "Antecipar tudo"). Antes disso o modal fica "limpo".
  const hasAmount = amountCents > 0;

  // Input estilo "acumulador de centavos": só dígitos, os 2 últimos são centavos.
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, "");
    setAmountCents(parseInt(digits || "0", 10));
  };

  const handleConfirm = async () => {
    if (amountCents <= 0 || submitting) return;
    // Sem permissão (evento ainda não passou pela análise de antecipação): abre o
    // gate em vez de chamar o endpoint (que rejeitaria). A verdade autoritativa
    // continua no backend (requestAnticipation).
    if (quote?.enabled === false) {
      setShowLocked(true);
      return;
    }
    setSubmitting(true);
    try {
      // Envia o líquido desejado; o backend recalcula de forma autoritativa.
      await organizerService.requestAnticipation(eventId, amountCents);
      toast.success("Antecipação solicitada com sucesso.");
      onSuccess?.();
      onClose();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erro ao solicitar antecipação";
      // Defensivo: se o backend recusar por não-habilitada, mostra o gate.
      if (/não está habilitada|not enabled/i.test(msg)) {
        setShowLocked(true);
      } else {
        toast.error(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (typeof document === "undefined") return null;

  // Sem recebíveis para antecipar (teto líquido zero). O bloqueio por FALTA de
  // permissão (`enabled === false`) NÃO some o formulário — o organizador vê os
  // valores e o gate "Antecipe suas vendas" só aparece ao clicar em "Confirmar".
  const noReceivables = !loading && maxReceivable <= 0;

  return (
   <>
    {createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50"
      style={{ pointerEvents: "auto" }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Antecipar recebíveis"
    >
      <div
        ref={contentRef}
        className="w-full max-w-[640px] bg-gray-1 rounded-xl border border-gray-6 shadow-2xl flex flex-col max-h-[calc(100vh-2rem)]"
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
              <p className="font-family-dm-sans font-semibold text-base text-gray-12">
                Quanto você quer antecipar?
              </p>

              {/* Input + Antecipar tudo */}
              <div className="flex items-center justify-between gap-3 border border-gray-6 rounded-lg px-4 py-3 bg-gray-1">
                <div className="flex items-baseline gap-1 min-w-0 flex-1">
                  <span className="font-manrope font-semibold text-sm text-gray-11 shrink-0">
                    R$
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formatBRL(amountCents)}
                    onChange={handleInputChange}
                    className="flex-1 min-w-0 text-[28px] font-manrope font-extrabold tracking-[0.5px] text-gray-12 bg-transparent border-none outline-none"
                    aria-label="Valor a antecipar"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setAmountCents(maxReceivable)}
                  className="text-sm font-family-dm-sans font-semibold text-blue-11 hover:text-blue-12 transition-colors shrink-0 cursor-pointer"
                >
                  Antecipar tudo
                </button>
              </div>

              {/* Valor disponível (sempre) + Valor recomendado (botão; só após digitar).
                  Clicar no recomendado seta o input para a fronteira ideal. */}
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <span className="font-family-dm-sans text-sm text-gray-11">
                  Valor disponível: R$ {formatBRL(availableTotal)}
                </span>
                {hasAmount && recommendedNet > 0 && amountCents !== recommendedNet && (
                  <button
                    type="button"
                    onClick={() => setAmountCents(recommendedNet)}
                    className="bg-primary-11 text-gray-1 font-family-dm-sans text-sm rounded-lg px-4 py-2 shrink-0 hover:bg-primary-10 transition-colors cursor-pointer"
                  >
                    Valor recomendado:{" "}
                    <span className="font-bold">R$ {formatBRL(recommendedNet)}</span>
                  </button>
                )}
              </div>

              {/* Resumo — só aparece depois que há um valor informado. */}
              {hasAmount && (
                <div className="bg-gray-3 rounded-lg p-4 px-5 flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-family-dm-sans text-gray-12">Valor total:</span>
                    <span className="font-family-dm-sans text-gray-12">
                      R$ {formatBRL(consumedGross)}
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-col">
                      <span className="font-family-dm-sans text-gray-12">
                        Taxa de antecipação:
                      </span>
                      <span className="font-family-dm-sans text-xs text-gray-11">
                        {effectiveRatePct.toLocaleString("pt-BR", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                        % sobre o valor total
                      </span>
                    </div>
                    <span className="font-family-dm-sans text-gray-12 shrink-0">
                      − R$ {formatBRL(feeCents)}
                    </span>
                  </div>
                  <div className="h-px w-full bg-gray-6" />
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-family-dm-sans text-gray-11">
                      Você recebe hoje:
                    </span>
                    <span className="font-family-dm-sans font-bold text-primary-11">
                      R$ {formatBRL(receiveCents)}
                    </span>
                  </div>
                </div>
              )}
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
    )}

    {/* Gate "Antecipe suas vendas" — evento sem antecipação habilitada. Abre ao
        clicar "Confirmar" sem permissão (portal próprio z-80). */}
    {showLocked && (
      <AnticipationLockedModal onClose={() => setShowLocked(false)} />
    )}
   </>
  );
}
