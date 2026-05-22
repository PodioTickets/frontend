/**
 * Skeleton compartilhado entre as `loading.tsx` das subpáginas do checkout
 * (ingressos / informações / produtos / pagamento) e usado também dentro das
 * pages client quando estão em estado `isLoading=true` antes do `event`
 * chegar — sem isso, o footer do RootLayout fica visível sob o conteúdo
 * curto do `<Loading />` spinner (flash de footer).
 *
 * `activeStep` controla qual pill da stepper bar fica destacada.
 * `variant` controla o body abaixo do header.
 */

interface CheckoutStepSkeletonProps {
  activeStep: 1 | 2 | 3 | 4;
  variant: "tickets" | "information" | "products" | "payment";
}

const STEP_LABELS = ["Ingressos", "Informações", "Produtos", "Pagamento"];

function CheckoutHeaderSkeleton({ activeStep }: { activeStep: number }) {
  return (
    <div className="w-full border-b border-gray-6 bg-gray-1">
      <div className="max-w-[1280px] mx-auto px-4 md:px-8 h-[52px] md:h-[64px] flex items-center justify-between gap-3">
        {/* Mobile: só step ativo + timer placeholder; Desktop: stepper completo */}
        <div className="md:hidden flex items-center gap-2">
          <div className="size-6 rounded-full bg-gray-4 animate-pulse" />
          <div className="h-4 w-24 rounded bg-gray-4 animate-pulse" />
        </div>
        <div className="hidden md:flex items-center gap-6">
          {STEP_LABELS.map((label, i) => {
            const idx = i + 1;
            const isActive = idx === activeStep;
            return (
              <div key={label} className="flex items-center gap-2">
                <div
                  className={`size-7 rounded-full ${isActive ? "bg-primary-11" : "bg-gray-4"} animate-pulse`}
                />
                <div className="h-3.5 w-20 rounded bg-gray-3 animate-pulse" />
              </div>
            );
          })}
        </div>
        <div className="h-6 w-20 rounded bg-gray-3 animate-pulse" />
      </div>
    </div>
  );
}

/** Cards verticais largos (ingressos / produtos com escolha de quantidade). */
function CardListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-3 md:gap-4 w-full">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-gray-6 bg-gray-1 p-4 flex items-center gap-3"
        >
          <div className="size-[60px] md:size-[80px] rounded-lg bg-gray-3 animate-pulse shrink-0" />
          <div className="flex flex-col gap-2 flex-1 min-w-0">
            <div className="h-4 w-3/4 rounded bg-gray-4 animate-pulse" />
            <div className="h-3 w-1/2 rounded bg-gray-3 animate-pulse" />
            <div className="h-3 w-1/3 rounded bg-gray-2 animate-pulse" />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="size-8 rounded-full bg-gray-3 animate-pulse" />
            <div className="size-6 rounded bg-gray-3 animate-pulse" />
            <div className="size-8 rounded-full bg-gray-3 animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Cards de participante (form de informações). */
function ParticipantListSkeleton({ rows = 2 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-3 md:gap-4 w-full">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-gray-6 bg-gray-1 p-4 flex flex-col gap-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-2">
              <div className="h-3 w-32 rounded bg-gray-3 animate-pulse" />
              <div className="h-5 w-48 rounded bg-gray-4 animate-pulse" />
            </div>
            <div className="hidden md:block h-6 w-24 rounded bg-gray-3 animate-pulse" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
            {Array.from({ length: 6 }).map((__, j) => (
              <div key={j} className="flex flex-col gap-2">
                <div className="h-3 w-20 rounded bg-gray-3 animate-pulse" />
                <div className="h-12 w-full rounded-lg border border-gray-6 bg-gray-2 animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Form de pagamento (cartão / Pix tabs + inputs + parcelas). */
function PaymentFormSkeleton() {
  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Tabs Cartão / PIX */}
      <div className="flex gap-2">
        <div className="h-11 flex-1 rounded-lg bg-gray-4 animate-pulse" />
        <div className="h-11 flex-1 rounded-lg bg-gray-2 border border-gray-6 animate-pulse" />
      </div>
      {/* Form inputs */}
      <div className="rounded-xl border border-gray-6 bg-gray-1 p-4 flex flex-col gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2">
            <div className="h-3 w-32 rounded bg-gray-3 animate-pulse" />
            <div className="h-12 w-full rounded-lg border border-gray-6 bg-gray-2 animate-pulse" />
          </div>
        ))}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-2">
            <div className="h-3 w-20 rounded bg-gray-3 animate-pulse" />
            <div className="h-12 w-full rounded-lg border border-gray-6 bg-gray-2 animate-pulse" />
          </div>
          <div className="flex flex-col gap-2">
            <div className="h-3 w-12 rounded bg-gray-3 animate-pulse" />
            <div className="h-12 w-full rounded-lg border border-gray-6 bg-gray-2 animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}

function OrderSummarySkeleton() {
  return (
    <div className="hidden md:block w-[320px] shrink-0">
      <div className="rounded-xl border border-gray-6 bg-gray-1 p-4 flex flex-col gap-3 sticky top-6">
        <div className="aspect-video w-full rounded-lg bg-gray-3 animate-pulse" />
        <div className="h-5 w-40 rounded bg-gray-4 animate-pulse" />
        <div className="h-3 w-1/2 rounded bg-gray-3 animate-pulse" />
        <div className="h-px w-full bg-gray-6 my-1" />
        <div className="flex justify-between">
          <div className="h-4 w-24 rounded bg-gray-3 animate-pulse" />
          <div className="h-4 w-20 rounded bg-gray-3 animate-pulse" />
        </div>
        <div className="flex justify-between">
          <div className="h-4 w-20 rounded bg-gray-3 animate-pulse" />
          <div className="h-4 w-16 rounded bg-gray-3 animate-pulse" />
        </div>
        <div className="h-px w-full bg-gray-6 my-1" />
        <div className="flex justify-between">
          <div className="h-5 w-16 rounded bg-gray-4 animate-pulse" />
          <div className="h-5 w-24 rounded bg-gray-4 animate-pulse" />
        </div>
      </div>
    </div>
  );
}

function MobileFooterSkeleton() {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-2 border-t border-gray-6 px-4 py-4 z-50 md:hidden">
      <div className="flex items-end justify-between gap-3">
        <div className="flex flex-col gap-2 flex-1">
          <div className="h-4 w-32 rounded bg-gray-3 animate-pulse" />
          <div className="h-3 w-24 rounded bg-gray-2 animate-pulse" />
          <div className="h-4 w-40 rounded bg-gray-3 animate-pulse" />
        </div>
        <div className="h-10 w-28 rounded bg-gray-3 animate-pulse shrink-0" />
      </div>
    </div>
  );
}

export function CheckoutStepSkeleton({
  activeStep,
  variant,
}: CheckoutStepSkeletonProps) {
  return (
    <div className="w-full" aria-busy="true" aria-live="polite">
      <CheckoutHeaderSkeleton activeStep={activeStep} />
      <div className="w-full max-w-[1280px] mx-auto flex flex-col md:flex-row items-start gap-6 md:gap-8 py-4 md:py-11 px-4 md:px-8 pb-32 md:pb-10">
        <div className="flex-1 min-w-0 w-full flex flex-col gap-4 md:gap-6">
          {/* Section title skeleton */}
          <div className="flex flex-col gap-2">
            <div className="h-6 md:h-7 w-48 rounded bg-gray-4 animate-pulse" />
            <div className="h-3 w-2/3 max-w-md rounded bg-gray-3 animate-pulse" />
          </div>

          {variant === "tickets" && <CardListSkeleton rows={3} />}
          {variant === "information" && <ParticipantListSkeleton rows={2} />}
          {variant === "products" && <CardListSkeleton rows={4} />}
          {variant === "payment" && <PaymentFormSkeleton />}
        </div>

        <OrderSummarySkeleton />
      </div>
      <MobileFooterSkeleton />
    </div>
  );
}
