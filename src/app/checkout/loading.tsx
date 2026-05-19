// Skeleton instantâneo entre passos do checkout (ingressos → informações →
// produtos → pagamento → sucesso). Aparece logo após o clique, antes do RSC
// payload chegar do servidor — elimina o "freeze" percebido na navegação.
export default function CheckoutLoading() {
  return (
    <div className="px-4 md:px-6 pt-4 md:pt-8 pb-32 md:pb-10" aria-busy="true" aria-live="polite">
      {/* Title */}
      <div className="mb-6">
        <div className="h-7 w-64 max-w-full rounded bg-gray-4 animate-pulse" />
        <div className="mt-2 h-4 w-80 max-w-full rounded bg-gray-3 animate-pulse" />
      </div>

      {/* Two-column content (mobile colapsa) */}
      <div className="flex flex-col md:flex-row gap-6">
        {/* Form/list area */}
        <div className="flex-1 flex flex-col gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-gray-6 bg-gray-1 p-4 flex flex-col gap-3"
            >
              <div className="h-4 w-1/2 rounded bg-gray-3 animate-pulse" />
              <div className="h-3 w-2/3 rounded bg-gray-2 animate-pulse" />
              <div className="flex gap-3 pt-2">
                <div className="h-9 w-9 rounded-full bg-gray-3 animate-pulse" />
                <div className="h-9 flex-1 rounded bg-gray-2 animate-pulse" />
              </div>
            </div>
          ))}
        </div>

        {/* Order summary (desktop only) */}
        <div className="hidden md:block w-[320px] shrink-0">
          <div className="rounded-xl border border-gray-6 bg-gray-1 p-4 flex flex-col gap-3 sticky top-6">
            <div className="h-5 w-32 rounded bg-gray-4 animate-pulse" />
            <div className="h-3 w-full rounded bg-gray-2 animate-pulse" />
            <div className="h-3 w-3/4 rounded bg-gray-2 animate-pulse" />
            <div className="h-px w-full bg-gray-6 my-1" />
            <div className="flex justify-between">
              <div className="h-4 w-20 rounded bg-gray-3 animate-pulse" />
              <div className="h-4 w-24 rounded bg-gray-3 animate-pulse" />
            </div>
            <div className="h-10 w-full rounded bg-gray-3 animate-pulse mt-2" />
          </div>
        </div>
      </div>

      {/* Mobile fixed footer skeleton */}
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
    </div>
  );
}
