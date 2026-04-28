"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Minus,
  Plus,
  X,
} from "lucide-react";
import { Tooltip } from "@/components/Tooltip";
import { Button } from "@/components/Button";
import { BookIcon } from "@/components/Icons/BookIcon";
import { cn } from "@/utils/cn";

const KIT_DESC =
  "Essencial para sua participação. Inclui a inscrição, a camiseta oficial, a sacochila, a necessaire e a medalha pós-prova — tudo leve, prático e com a identidade do evento.";

const HELP_COPY =
  "Defina a imagem principal. Ela será exibida em destaque, maior que as demais. As outras também ficam visíveis ao lado";

function QtyStepper() {
  return (
    <div className="flex h-7 items-center gap-0 overflow-hidden rounded-md border border-gray-6 bg-gray-1">
      <span className="flex size-7 items-center justify-center text-gray-11" aria-hidden>
        <Minus className="size-3.5" strokeWidth={2} />
      </span>
      <span className="min-w-[22px] text-center font-family-dm-sans text-xs font-semibold text-gray-12">
        0
      </span>
      <span className="flex size-7 items-center justify-center text-gray-12" aria-hidden>
        <Plus className="size-3.5" strokeWidth={2} />
      </span>
    </div>
  );
}

function PreviewNosIngressos() {
  return (
    <div className="rounded-xl border border-gray-6 bg-gray-1 p-3">
      <div className="mb-2 flex items-start justify-between gap-2">
        <p className="font-manrope text-sm font-bold leading-[1.1] text-gray-12">Kit inscrição</p>
        <div className="flex shrink-0 items-center gap-1">
          <p className="text-right font-family-dm-sans text-[11px] leading-[1.3] text-gray-11">
            A partir de: <span className="font-semibold text-gray-12">R$ 205,75</span>
          </p>
          <ChevronDown className="size-4 shrink-0 text-gray-11" strokeWidth={2} aria-hidden />
        </div>
      </div>
      <p className="mb-3 font-family-dm-sans text-[11px] leading-[1.35] text-gray-11">{KIT_DESC}</p>

      {[
        {
          title: "3K - Caminhada",
          price: "R$ 50,00",
          badge: "Limite de idade: de 9 a 11 anos",
        },
        { title: "5K - Ciclismo", price: "R$ 60,00", badge: null },
      ].map((row) => (
        <div
          key={row.title}
          className="mb-3 flex gap-2 border-t border-gray-6 pt-3 last:mb-0"
        >
          <div className="flex shrink-0 gap-1.5">
            <div className="size-14 shrink-0 rounded-md border border-gray-6 bg-gray-3" />
            <div className="flex flex-col items-center gap-0.5">
              <ChevronUp className="size-3 text-gray-9" strokeWidth={2} aria-hidden />
              <div className="flex flex-col gap-0.5">
                <div className="size-6 rounded border border-gray-6 bg-gray-3" />
                <div className="size-6 rounded border border-gray-6 bg-gray-3" />
                <div className="size-6 rounded border border-gray-6 bg-gray-3" />
              </div>
              <ChevronDown className="size-3 text-gray-9" strokeWidth={2} aria-hidden />
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-family-dm-sans text-xs font-semibold text-gray-12">{row.title}</p>
            <p className="mt-0.5 font-family-dm-sans text-[10px] text-gray-11">0.3 Km</p>
            {row.badge ? (
              <span className="mt-1 inline-block rounded-full bg-yellow-3 px-2 py-0.5 font-family-dm-sans text-[9px] font-medium leading-tight text-yellow-12">
                {row.badge}
              </span>
            ) : null}
            <div className="mt-2 flex items-center justify-between gap-2">
              <p className="font-manrope text-xs font-bold text-gray-12">{row.price}</p>
              <QtyStepper />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function PreviewNasCategorias() {
  return (
    <div className="rounded-xl border border-gray-6 bg-gray-1 p-3">
      <div className="mb-2 flex items-start justify-between gap-2">
        <p className="font-manrope text-sm font-bold leading-[1.1] text-gray-12">Kit - Ultimate</p>
        <div className="flex shrink-0 items-center gap-1">
          <p className="text-right font-family-dm-sans text-[11px] leading-[1.3] text-gray-11">
            A partir de: <span className="font-semibold text-gray-12">R$ 205,75</span>
          </p>
          <ChevronDown className="size-4 shrink-0 text-gray-11" strokeWidth={2} aria-hidden />
        </div>
      </div>
      <p className="mb-3 font-family-dm-sans text-[11px] leading-[1.35] text-gray-11">{KIT_DESC}</p>

      <div className="mb-3 flex items-center gap-1">
        <ChevronLeft className="size-4 shrink-0 text-gray-11" strokeWidth={2} aria-hidden />
        <div className="flex flex-1 items-center justify-center gap-1.5 overflow-hidden py-1">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={cn(
                "h-12 w-10 shrink-0 rounded-md border bg-gray-3",
                i === 2
                  ? "scale-110 border-2 border-primary-11 shadow-sm"
                  : "border-gray-6",
              )}
            />
          ))}
        </div>
        <ChevronRight className="size-4 shrink-0 text-gray-11" strokeWidth={2} aria-hidden />
      </div>

      {[
        { title: "3K - Caminhada", price: "R$ 50,00" },
        { title: "3K - Caminhada", price: "R$ 50,00" },
      ].map((row, idx) => (
        <div
          key={`${row.title}-${idx}`}
          className="mb-3 flex flex-col gap-2 border-t border-gray-6 pt-3 last:mb-0"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-family-dm-sans text-xs font-semibold text-gray-12">{row.title}</p>
              <p className="mt-0.5 font-family-dm-sans text-[10px] text-gray-11">0.3 Km</p>
              <span className="mt-1 inline-block rounded-full bg-yellow-3 px-2 py-0.5 font-family-dm-sans text-[9px] font-medium text-yellow-12">
                Limite de idade: de 9 a 11 anos
              </span>
            </div>
            <QtyStepper />
          </div>
          <p className="font-manrope text-xs font-bold text-gray-12">{row.price}</p>
        </div>
      ))}
    </div>
  );
}

function StepDots({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-2" aria-hidden>
      <span
        className={cn(
          "h-2 rounded-full transition-colors",
          step === 0 ? "w-8 bg-primary-11" : "size-2 bg-gray-6",
        )}
      />
      <span
        className={cn(
          "h-2 rounded-full transition-colors",
          step === 1 ? "w-8 bg-primary-11" : "size-2 bg-gray-6",
        )}
      />
    </div>
  );
}

function KitTooltipPanel({
  step,
  setStep,
  onFinish,
}: {
  step: number;
  setStep: React.Dispatch<React.SetStateAction<number>>;
  onFinish: () => void;
}) {
  const isLast = step === 1;
  const title = step === 0 ? "Nos ingressos" : "Nas categorias";

  return (
    <div className="flex w-[400px] flex-col gap-4 rounded-tl-xl rounded-tr-xl rounded-br-xl border border-gray-6 bg-gray-2 p-4 shadow-[0px_2px_6px_0px_rgba(17,17,17,0.25)]">
      <p className="font-manrope text-sm font-bold leading-[1.1] text-gray-12">{title}</p>

      {step === 0 ? <PreviewNosIngressos /> : <PreviewNasCategorias />}

      <p className="font-family-dm-sans text-xs font-normal leading-[1.3] text-gray-11">{HELP_COPY}</p>

      <div className="flex items-center justify-between gap-3">
        <StepDots step={step} />
        <div className="flex shrink-0 items-center gap-2">
          {step > 0 && (
            <button
              type="button"
              onClick={() => setStep(0)}
              className="flex size-9 items-center justify-center rounded-full border border-gray-6 bg-gray-1 text-gray-12 transition-colors hover:bg-gray-3"
              aria-label="Voltar"
            >
              <ChevronLeft className="size-4" strokeWidth={2} />
            </button>
          )}
          <Button
            type="button"
            variant="default"
            onClick={isLast ? onFinish : () => setStep(1)}
            className="h-9 px-5 font-manrope text-sm font-bold"
          >
            {isLast ? "Fechar" : "Próximo"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function KitImagesLayoutHelpModal() {
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!tooltipOpen && !modalOpen) setStep(0);
  }, [tooltipOpen, modalOpen]);

  useEffect(() => {
    if (!modalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setModalOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [modalOpen]);

  const triggerClass =
    "inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-gray-11 transition-colors hover:bg-gray-2 hover:text-gray-12";

  const title = step === 0 ? "Nos ingressos" : "Nas categorias";
  const isLast = step === 1;

  return (
    <span className="inline-flex shrink-0 items-center">
      {/* Desktop: Tooltip on hover */}
      <div className="hidden md:contents">
        <Tooltip
          open={tooltipOpen}
          onOpenChange={setTooltipOpen}
          trigger="hover"
          interactiveHover
          position="topRight"
          leaveDelayMs={250}
          usePortal
          contentClassName="p-0 bg-transparent shadow-none rounded-none gap-0 items-stretch w-auto"
          content={
            <KitTooltipPanel
              step={step}
              setStep={setStep}
              onFinish={() => setTooltipOpen(false)}
            />
          }
        >
          <button
            type="button"
            className={triggerClass}
            aria-label="Ajuda: como as imagens do kit aparecem nos ingressos e nas categorias"
            aria-expanded={tooltipOpen}
            aria-haspopup="true"
          >
            <BookIcon className="size-5" />
          </button>
        </Tooltip>
      </div>

      {/* Mobile: click opens centered modal */}
      <button
        type="button"
        className={cn(triggerClass, "md:hidden")}
        aria-label="Ajuda: como as imagens do kit aparecem nos ingressos e nas categorias"
        aria-expanded={modalOpen}
        aria-haspopup="dialog"
        onClick={() => setModalOpen(true)}
      >
        <BookIcon className="size-5" />
      </button>

      {mounted &&
        createPortal(
          <AnimatePresence>
            {modalOpen ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 p-4"
                role="dialog"
                aria-modal="true"
                aria-labelledby="kit-help-modal-title"
                onClick={() => setModalOpen(false)}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.96, y: 12 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: 12 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="flex max-h-[min(90vh,720px)] w-full max-w-[400px] flex-col overflow-hidden rounded-xl bg-gray-1 shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between border-b border-gray-6 px-4 py-4">
                    <h2
                      id="kit-help-modal-title"
                      className="font-manrope text-base font-extrabold leading-[1.1] text-gray-12"
                    >
                      {title}
                    </h2>
                    <button
                      type="button"
                      onClick={() => setModalOpen(false)}
                      className="flex size-9 items-center justify-center rounded-lg text-gray-11 transition-colors hover:bg-gray-2 hover:text-gray-12"
                      aria-label="Fechar"
                    >
                      <X className="size-5" strokeWidth={2} />
                    </button>
                  </div>

                  <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={step}
                        initial={{ opacity: 0, x: 8 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -8 }}
                        transition={{ duration: 0.15 }}
                      >
                        {step === 0 ? <PreviewNosIngressos /> : <PreviewNasCategorias />}
                      </motion.div>
                    </AnimatePresence>
                    <p className="mt-4 font-family-dm-sans text-base font-normal leading-[1.3] text-gray-12">
                      {HELP_COPY}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 border-t border-gray-6 px-4 py-4">
                    <StepDots step={step} />
                    <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
                      {step > 0 ? (
                        <button
                          type="button"
                          onClick={() => setStep(0)}
                          className="flex size-10 shrink-0 items-center justify-center rounded-full border border-gray-6 bg-gray-1 text-gray-12 transition-colors hover:bg-gray-2"
                          aria-label="Voltar"
                        >
                          <ChevronLeft className="size-5" strokeWidth={2} />
                        </button>
                      ) : null}
                      <Button
                        type="button"
                        variant="default"
                        onClick={isLast ? () => setModalOpen(false) : () => setStep(1)}
                        className="h-11 min-w-0 flex-1 font-manrope text-base font-bold text-gray-12"
                      >
                        {isLast ? "Fechar" : "Próximo"}
                      </Button>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            ) : null}
          </AnimatePresence>,
          document.body,
        )}
    </span>
  );
}
