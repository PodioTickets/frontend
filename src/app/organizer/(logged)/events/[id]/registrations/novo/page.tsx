"use client";

import { Fragment, Suspense, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/utils/cn";
import { Button } from "@/components/Button";
import { ArrowButton } from "@/components/ArrowButton";
import { Loading } from "@/components/Loading";
import { CheckoutProvider, useCheckout } from "@/contexts/CheckoutContext";
import { CheckoutTimerProvider, useCheckoutTimer } from "@/contexts/CheckoutTimerContext";
import { ModalitiesStep } from "@/components/Checkout/ModalitiesStep";
import { InformationStep } from "@/components/Checkout/InformationStep";
import { SubscriptionStep } from "@/components/Checkout/SubscriptionStep";
import { CheckoutTimer } from "@/components/Checkout/CheckoutTimer";
import { useCheckoutReservation } from "@/hooks/useCheckoutReservation";
import { useCheckoutProductStep } from "@/hooks/useCheckoutProductStep";
import { useCourtesyRegistration } from "@/hooks/useCourtesyRegistration";
import { buildParticipantsPatchPayload, buildProductsPatchPayload } from "@/lib/checkoutParticipants";
import { useEvent } from "@/hooks/useEvent";
import { useOrganizerPermissions } from "@/contexts/OrganizerPermissionsContext";
import { useOrganizerNavigate } from "@/hooks/useOrganizerNavigate";
import { OrderApiError } from "@/interfaces/order";
import { HidePricingProvider } from "@/contexts/HidePricingContext";
import { IgnoreAgeLimitProvider } from "@/contexts/IgnoreAgeLimitContext";

/**
 * Inscrição de CORTESIA do organizador — REUSA o fluxo/design do checkout:
 * monta os providers do checkout e renderiza os MESMOS componentes
 * (ModalitiesStep → InformationStep → SubscriptionStep), trocando a etapa de
 * pagamento por "finalizar cortesia" (pedido R$0). O `?eventId=` na URL alimenta
 * os providers exatamente como no checkout público.
 */

type Step = "tickets" | "info" | "products" | "done";

export default function NewCourtesyRegistrationPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-2 flex items-center justify-center"><Loading /></div>}>
      <CheckoutProvider>
        <CheckoutTimerProvider>
          <CourtesyFlow />
        </CheckoutTimerProvider>
      </CheckoutProvider>
    </Suspense>
  );
}

function CourtesyFlow() {
  const params = useParams();
  const eventId = params.id as string;
  const orgNav = useOrganizerNavigate();
  const { hasPermission, loading: permissionsLoading } = useOrganizerPermissions();
  const { event, loading: eventLoading } = useEvent(eventId, !!eventId);

  const { raceQuantities, participants, bindOrder } = useCheckout();
  const { orderId, startTimer, syncFromOrder } = useCheckoutTimer();
  const { reserveOrder, patchParticipants, patchProducts } = useCheckoutReservation();
  const { hasSelectableProducts, autoSelectedProducts } = useCheckoutProductStep(eventId);
  const { finalizeCourtesy } = useCourtesyRegistration();

  const [step, setStep] = useState<Step>("tickets");
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);

  const registrationsHref = `/organizer/events/${eventId}/registrations`;

  useEffect(() => {
    if (permissionsLoading) return;
    if (!hasPermission("edit_event")) orgNav.replace(registrationsHref);
  }, [permissionsLoading, hasPermission, orgNav, registrationsHref]);

  // Ao trocar de etapa, volta ao topo — cada etapa deve começar visível no topo
  // (sem herdar o scroll da etapa anterior, que era mais longa). Scroll é da window,
  // igual aos passos do checkout (InformationStep/PaymentStep usam window.scrollTo).
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [step]);

  const finalize = async (): Promise<boolean> => {
    if (!orderId) return false;
    const res = await finalizeCourtesy(orderId);
    return !!res.orderId;
  };

  // Ingressos → reserva o pedido (organizador = comprador) e vai pra Informações.
  const handleTicketsNext = async () => {
    if (busyRef.current) return;
    const tickets = Object.entries(raceQuantities)
      .filter(([, q]) => q > 0)
      .map(([ticketId, quantity]) => ({ ticketId, quantity }));
    if (tickets.length === 0) {
      toast.error("Selecione pelo menos um ingresso para continuar.");
      return;
    }
    busyRef.current = true;
    setBusy(true);
    try {
      // Cortesia: libera janela encerrada + teto do evento (backend revalida a
      // permissão do organizador). Lote ESGOTADO e estoque de produto NÃO são
      // liberados — valida igual ao comprador.
      const order = await reserveOrder({ eventId, tickets, isCourtesy: true });
      bindOrder(order.orderId);
      startTimer(order, registrationsHref);
      setStep("info");
    } catch (err) {
      toast.error(err instanceof OrderApiError ? err.message || "Não foi possível reservar os ingressos." : "Não foi possível reservar os ingressos.");
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  // Informações → salva participantes; sem produtos selecionáveis, finaliza direto.
  const handleInfoNext = async () => {
    if (busyRef.current) return;
    if (!orderId) { toast.error("A reserva expirou. Volte para os ingressos."); setStep("tickets"); return; }
    const total = Object.values(raceQuantities).reduce((s, q) => s + (q > 0 ? q : 0), 0);
    const payload = buildParticipantsPatchPayload(participants.slice(0, total), total);
    busyRef.current = true;
    setBusy(true);
    try {
      syncFromOrder(await patchParticipants(orderId, payload));
      if (hasSelectableProducts === false) {
        syncFromOrder(await patchProducts(orderId, { products: autoSelectedProducts }));
        if (await finalize()) setStep("done");
      } else {
        setStep("products");
      }
    } catch (err) {
      handleStepError(err);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  // Produtos → salva variações e finaliza a cortesia.
  const handleProductsNext = async () => {
    if (busyRef.current) return;
    if (!orderId) { toast.error("A reserva expirou. Volte para os ingressos."); setStep("tickets"); return; }
    busyRef.current = true;
    setBusy(true);
    try {
      const { products } = buildProductsPatchPayload(participants);
      syncFromOrder(await patchProducts(orderId, { products }));
      if (await finalize()) setStep("done");
    } catch (err) {
      handleStepError(err);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  const handleStepError = (err: unknown) => {
    if (err instanceof OrderApiError) {
      if (err.code === "ORDER_NOT_PENDING" || err.code === "ORDER_NOT_FOUND") {
        toast.error("A reserva expirou. Volte para os ingressos.");
        setStep("tickets");
        return;
      }
      if (err.code === "VALIDATION_ERROR" && err.fields?.length) {
        toast.error(err.fields[0].message);
        return;
      }
      toast.error(err.message || "Não foi possível salvar. Tente novamente.");
    } else {
      toast.error("Não foi possível salvar. Tente novamente.");
    }
  };

  if (permissionsLoading || eventLoading) {
    return <div className="min-h-screen bg-gray-2 flex items-center justify-center"><Loading /></div>;
  }
  if (!event) {
    return <div className="min-h-screen bg-gray-2 flex items-center justify-center text-gray-11">Evento não encontrado.</div>;
  }

  // Nº de inscrições criadas = total de ingressos selecionados (1 inscrição/ingresso).
  // Usado na tela de conclusão para concordância singular/plural.
  const totalRegistrations = Object.values(raceQuantities).reduce((s, q) => s + (q > 0 ? q : 0), 0);
  const activeStepId = step === "tickets" ? 1 : step === "info" ? 2 : step === "products" ? 3 : 4;
  const stepLabel = step === "tickets" ? "Ingressos" : step === "info" ? "Informações" : step === "products" ? "Produtos" : "Conclusão";
  const back = () => {
    if (step === "products") setStep("info");
    else if (step === "info") setStep("tickets");
    else orgNav.push(registrationsHref);
  };

  return (
    <div className="min-h-screen bg-gray-2">
      <CourtesyStepper activeStep={activeStepId} currentLabel={stepLabel} onBack={back} showBack={step !== "done"} />

      {step === "done" ? (
        <div className="w-full max-w-[1280px] mx-auto px-4">
          <DoneStep count={totalRegistrations} onSee={() => orgNav.push(registrationsHref)} />
        </div>
      ) : (
        <HidePricingProvider>
          {/* Cortesia: além de esconder preços, IGNORA a restrição de idade
              (badge + validação) — o organizador inscreve manualmente e não deve
              ser barrado por faixa etária. */}
          <IgnoreAgeLimitProvider>
            <div className="w-full max-w-[1280px] mx-auto flex flex-col min-h-screen items-start justify-start gap-4 py-4 md:py-11 px-4">
              {step === "tickets" && (
                <ModalitiesStep event={event} onNext={handleTicketsNext} onBack={() => orgNav.push(registrationsHref)} isSubmitting={busy} />
              )}
              {step === "info" && (
                <InformationStep event={event} onNext={handleInfoNext} onBack={() => setStep("tickets")} isSubmitting={busy} />
              )}
              {step === "products" && (
                <SubscriptionStep event={event} onNext={handleProductsNext} onBack={() => setStep("info")} isSubmitting={busy} />
              )}
            </div>
          </IgnoreAgeLimitProvider>
        </HidePricingProvider>
      )}
    </div>
  );
}

/* ── Stepper (Figma: Ingressos → Informações → Produtos → Conclusão) ─────── */
function CourtesyStepper({ activeStep, currentLabel, onBack, showBack }: { activeStep: number; currentLabel: string; onBack: () => void; showBack: boolean }) {
  const options = [
    { id: 1, label: "Ingressos" }, { id: 2, label: "Informações" },
    { id: 3, label: "Produtos" }, { id: 4, label: "Conclusão" },
  ];
  return (
    <>
      <div className="md:hidden w-full bg-gray-1 border-b border-gray-6">
        <div className="flex items-center justify-center px-4 py-4 relative">
          {showBack && (
            <button onClick={onBack} aria-label="Voltar" className="absolute left-4 flex items-center justify-center">
              <ArrowLeft className="size-5 text-gray-12" />
            </button>
          )}
          <h1 className="text-base font-bold text-gray-12">{currentLabel}</h1>
          {/* Timer da reserva — só nas etapas com pedido ativo (Informações/Produtos),
              igual ao checkout do comprador. `tickets` ainda não reservou; `done` já consumiu. */}
          {activeStep > 1 && activeStep < 4 && (
            <div className="absolute right-4">
              <CheckoutTimer compact />
            </div>
          )}
        </div>
      </div>
      <div className="hidden md:flex w-full items-center justify-between max-w-7xl mx-auto gap-3 px-4 py-6 border-b border-gray-6">
        <div className="flex items-center gap-3">
          {options.map((option, index) => (
            <Fragment key={option.id}>
              {index > 0 && <ArrowButton isOpen={false} />}
              <div className={cn("flex items-center gap-2 rounded-4xl px-4 py-2 transition-all", activeStep >= option.id ? "text-primary-2 bg-primary-11" : "text-gray-11 bg-gray-5")}>
                <span className="font-medium">{option.label}</span>
              </div>
            </Fragment>
          ))}
        </div>
        {/* Timer da reserva (Informações/Produtos) — mesmo componente do checkout do comprador. */}
        {activeStep > 1 && activeStep < 4 && <CheckoutTimer className="ml-2" />}
      </div>
    </>
  );
}

/* ── Conclusão (Figma 6410:130364) ───────────────────────────────────────── */
function DoneStep({ count, onSee }: { count: number; onSee: () => void }) {
  // Concordância singular/plural conforme a quantidade de inscrições criadas.
  const isSingle = count === 1;
  return (
    <div className="w-full flex flex-col items-center text-center">
      <div className="flex flex-col items-center gap-2">
        {/* Badge verde (selo + check) com shine suave atrás */}
        <div className="relative flex items-center justify-center p-6">
          <div className="absolute inset-2 rounded-full bg-primary-5/50 blur-2xl" aria-hidden />
          {/* SVG: serve direto (otimizador de raster retornaria 400 sem
              `dangerouslyAllowSVG`, mantido OFF por segurança). */}
          <Image src="/images/success-badge.svg" alt="" width={87} height={84} className="relative" priority unoptimized />
        </div>
        <div className="flex flex-col items-center gap-4">
          <h2 className="text-[32px] font-extrabold font-manrope text-gray-12 leading-[1.1]">
            {isSingle ? "Inscrição criada!" : "Inscrições criadas!"}
          </h2>
          <p className="text-lg font-medium font-family-dm-sans text-gray-12 leading-[1.3]">
            {isSingle
              ? "O participante recebeu o ingresso por e-mail."
              : "Cada participante recebeu o próprio ingresso por e-mail."}
          </p>
        </div>
      </div>
      <div className="pt-8">
        <Button
          type="button"
          onClick={onSee}
          className="h-[52px] px-16 text-xl font-bold font-manrope rounded-lg"
        >
          Ver nas inscrições
        </Button>
      </div>
    </div>
  );
}
