"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { X } from "lucide-react";
import { Tooltip } from "@/components/Tooltip";
import { Button } from "@/components/Button";
import { BookIcon } from "@/components/Icons/BookIcon";
import { ArrowButton } from "../ArrowButton";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { cn } from "@/utils/cn";

const STEPS = [
  {
    title: "Passo 1 de 3",
    subtitle: "Busque o local",
    body: "Abra o Google Maps pelo navegador ou app e pesquise o endereço ou nome do local onde o evento será realizado.",
  },
  {
    title: "Passo 2 de 3",
    subtitle: "Abra o menu e compartilhe",
    body: "Clique no menu (☰) no canto superior esquerdo e selecione 'Compartilhar ou incorporar mapa'.",
  },
  {
    title: "Passo 3 de 3",
    subtitle: "Copie o link",
    body: "Na janela de compartilhamento, clique em 'COPIAR LINK' e cole no campo abaixo.",
  },
] as const;

function stepVisualFrameClass(variant: "tooltip" | "sheet") {
  return cn(
    "relative border border-gray-8 rounded-xl overflow-hidden shrink-0 bg-gray-1",
    variant === "sheet" ? "h-[208px] w-[221px]" : "w-[221px] h-[231px]",
  );
}

function StepDots({ activeIndex }: { activeIndex: number }) {
  return (
    <div className="flex items-center gap-1">
      {[0, 1, 2].map((i) =>
        i === activeIndex ? (
          <div
            key={i}
            className="h-3 w-8 rounded-[32px] bg-primary-11 shrink-0"
            aria-hidden
          />
        ) : (
          <div
            key={i}
            className="size-3 rounded-full bg-gray-5 shrink-0"
            aria-hidden
          />
        ),
      )}
    </div>
  );
}

function StepVisual({
  stepIndex,
  variant,
}: {
  stepIndex: number;
  variant: "tooltip" | "sheet";
}) {
  const frame = stepVisualFrameClass(variant);
  const h = variant === "sheet" ? 208 : 231;
  const w = 221;
  /**
   * `fill` + lazy no painel dentro do Drawer costuma falhar: o conteúdo nasce fora da
   * viewport / com layout 0 e o browser não carrega até haver área visível estável.
   * Dimensões fixas + priority garantem o <img> e o encaixe no quadro.
   */
  const imgClass =
    stepIndex === 2
      ? "h-full w-full object-cover object-left object-top"
      : "h-full w-full object-cover";

  if (stepIndex === 0) {
    return (
      <div className="flex w-full justify-center md:justify-start">
        <div className={frame}>
          <Image
            src="/images/google-maps-tutorial/step1-maps-screenshot.png"
            alt=""
            width={w}
            height={h}
            className={imgClass}
            sizes={`${w}px`}
            priority
            draggable={false}
          />
          <div className="pointer-events-none absolute right-2 top-2 z-10 flex size-8 items-center justify-center rounded-full border border-gray-8 bg-gray-1">
            <span className="font-manrope text-base font-semibold leading-[1.1] text-gray-12">
              1
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (stepIndex === 1) {
    return (
      <div className="flex w-full justify-center md:justify-start">
        <div className={frame}>
          <Image
            src="/images/google-maps-tutorial/step2-maps-screenshot.png"
            alt=""
            width={w}
            height={h}
            className={imgClass}
            sizes={`${w}px`}
            priority
            draggable={false}
          />
          <div className="pointer-events-none absolute right-[7px] top-[7px] z-10 flex size-8 items-center justify-center rounded-full border border-gray-8 bg-gray-1">
            <span className="font-manrope text-base font-semibold leading-[1.1] text-gray-12">
              2
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full justify-center md:justify-start">
      <div className={frame}>
        <Image
          src="/images/google-maps-tutorial/step3-share-screenshot.png"
          alt=""
          width={w}
          height={h}
          className={imgClass}
          sizes={`${w}px`}
          priority
          draggable={false}
        />
        <div className="pointer-events-none absolute right-[8px] top-[7px] z-10 flex size-8 items-center justify-center rounded-full border border-gray-8 bg-gray-1">
          <span className="font-manrope text-base font-semibold leading-[1.1] text-gray-12">
            3
          </span>
        </div>
      </div>
    </div>
  );
}

function HelpPanelFooter({
  variant,
  step,
  setStep,
  onFinish,
}: {
  variant: "tooltip" | "sheet";
  step: number;
  setStep: React.Dispatch<React.SetStateAction<number>>;
  onFinish: () => void;
}) {
  const isLast = step === STEPS.length - 1;

  return (
    <div
      className={cn(
        "flex w-full items-center justify-between gap-3",
        variant === "sheet" ? "pt-0" : "pt-0",
      )}
    >
      <StepDots activeIndex={step} />
      <div className="flex items-center gap-2 shrink-0">
        {step > 0 ? (
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            className={cn(
              "flex size-9 rotate-180 items-center justify-center rounded-[52px] border border-gray-6 text-gray-12 hover:bg-gray-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-8 focus-visible:ring-offset-2",
              variant === "sheet" ? "focus-visible:ring-offset-gray-1" : "focus-visible:ring-offset-gray-2",
            )}
            aria-label="Anterior"
          >
            <ArrowButton isOpen={false} className="size-3 shrink-0 stroke-[1.5]" />
          </button>
        ) : (
          <span
            className="size-9 shrink-0 invisible pointer-events-none"
            aria-hidden
          />
        )}
        {isLast ? (
          <Button
            type="button"
            variant="default"
            className={cn(
              "h-9 shrink-0 px-6 text-base font-bold font-manrope",
              variant === "sheet" && "h-9",
            )}
            onClick={onFinish}
          >
            Concluir
          </Button>
        ) : (
          <Button
            type="button"
            variant="default"
            className="h-9 shrink-0 px-6 text-base font-bold font-manrope"
            onClick={() => setStep((s) => s + 1)}
          >
            Próximo
          </Button>
        )}
      </div>
    </div>
  );
}

function TooltipHelpPanel({
  step,
  setStep,
  onFinish,
}: {
  step: number;
  setStep: React.Dispatch<React.SetStateAction<number>>;
  onFinish: () => void;
}) {
  const current = STEPS[step];

  return (
    <div
      id="google-maps-help-panel"
      className="bg-gray-2 flex flex-col gap-4 items-stretch p-4 rounded-tl-xl rounded-tr-xl rounded-br-xl shadow-[0px_2px_6px_0px_rgba(17,17,17,0.25)]"
      role="region"
      aria-labelledby="google-maps-help-title"
      aria-describedby="google-maps-help-desc"
    >
      <div className="flex flex-col gap-3 w-full min-w-0">
        <div className="flex flex-col gap-2 items-start text-left min-h-14">
          <p
            id="google-maps-help-title"
            className="font-manrope font-semibold text-base leading-[1.1] text-gray-12"
          >
            {current.title}
          </p>
          <p className="font-family-dm-sans font-normal text-sm leading-[1.3] text-gray-11">
            {current.subtitle}
          </p>
        </div>

        <StepVisual stepIndex={step} variant="tooltip" />

        <p
          id="google-maps-help-desc"
          className="font-family-dm-sans font-normal text-sm leading-[1.3] text-gray-12 w-full min-h-22"
        >
          {current.body}
        </p>
      </div>

      <HelpPanelFooter
        variant="tooltip"
        step={step}
        setStep={setStep}
        onFinish={onFinish}
      />
    </div>
  );
}

function SheetHelpPanel({
  step,
  setStep,
  onFinish,
}: {
  step: number;
  setStep: React.Dispatch<React.SetStateAction<number>>;
  onFinish: () => void;
}) {
  const current = STEPS[step];

  return (
    <>
      <div className="flex items-center justify-between border-b border-gray-6 px-4 py-2 shrink-0">
        <DrawerTitle className="font-family-dm-sans font-semibold text-base leading-[1.3] text-gray-12 m-0">
          {current.title}
        </DrawerTitle>
        <DrawerClose asChild>
          <button
            type="button"
            className="flex size-7 items-center justify-center rounded-lg text-gray-12 hover:bg-gray-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-8 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-1"
            aria-label="Fechar"
          >
            <X className="size-5 shrink-0" strokeWidth={1.75} />
          </button>
        </DrawerClose>
      </div>

      <div
        className="flex flex-col gap-4 px-4 pt-4 pb-10 bg-gray-1"
        role="region"
        aria-labelledby="google-maps-help-sheet-subtitle"
      >
        <p
          id="google-maps-help-sheet-subtitle"
          className="font-family-dm-sans font-normal text-sm leading-[1.3] text-gray-12"
        >
          {current.subtitle}
        </p>

        <StepVisual stepIndex={step} variant="sheet" />

        <p className="font-family-dm-sans font-normal text-sm leading-[1.3] text-gray-12">
          {current.body}
        </p>

        <HelpPanelFooter
          variant="sheet"
          step={step}
          setStep={setStep}
          onFinish={onFinish}
        />
      </div>
    </>
  );
}

const triggerButtonClass =
  "inline-flex items-center justify-center rounded-md text-gray-11 hover:text-gray-12 transition-colors p-0.5 -m-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-8 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-1";

export function GoogleMapsUrlHelpTooltip() {
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!tooltipOpen && !drawerOpen) {
      setStep(0);
    }
  }, [tooltipOpen, drawerOpen]);

  return (
    <span className="inline-flex shrink-0 items-center">
      <div className="hidden md:contents">
        <Tooltip
          open={tooltipOpen}
          onOpenChange={setTooltipOpen}
          trigger="hover"
          interactiveHover
          position="topRight"
          leaveDelayMs={250}
          contentClassName="w-[min(100vw-2rem,403px)] max-w-[403px] p-0 bg-transparent shadow-none rounded-none gap-0 items-stretch px-0 py-0"
          content={
            <TooltipHelpPanel
              step={step}
              setStep={setStep}
              onFinish={() => setTooltipOpen(false)}
            />
          }
        >
          <button
            type="button"
            className={triggerButtonClass}
            aria-label="Como obter a URL do Google Maps"
            aria-expanded={tooltipOpen}
            aria-controls={
              tooltipOpen ? "google-maps-help-panel" : undefined
            }
            aria-haspopup="true"
          >
            <BookIcon className="size-5 shrink-0" />
          </button>
        </Tooltip>
      </div>

      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen} direction="bottom">
        <DrawerTrigger asChild>
          <button
            type="button"
            className={cn(triggerButtonClass, "md:hidden")}
            aria-label="Como obter a URL do Google Maps"
            aria-expanded={drawerOpen}
            aria-haspopup="dialog"
          >
            <BookIcon className="size-5 shrink-0" />
          </button>
        </DrawerTrigger>
        <DrawerContent
          overlayClassName="bg-[rgba(32,32,32,0.9)] supports-backdrop-filter:backdrop-blur-none"
          className="bg-gray-1 border-0 border-t-0 rounded-t-xl p-0 max-h-[min(90dvh,812px)] gap-0 [&>div:first-child]:hidden"
        >
          <SheetHelpPanel
            step={step}
            setStep={setStep}
            onFinish={() => setDrawerOpen(false)}
          />
        </DrawerContent>
      </Drawer>
    </span>
  );
}
