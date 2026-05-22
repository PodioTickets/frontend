/**
 * Skeleton da listagem `/user/tickets` (Meus ingressos).
 *
 * Espelha o header com ícone + título "Meus ingressos" e o grid de cards
 * (1 coluna mobile, 4 colunas desktop). Cada card tem proporções idênticas
 * ao `TicketCard` real pra evitar layout shift na transição.
 */
export default function UserTicketsLoading() {
  return (
    <div
      className="min-h-screen bg-[#F9F9F9]"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="mx-auto max-w-[1440px] pt-6 pb-16 px-5 md:pt-[52px] md:pb-[248px] md:px-20">
        <div className="flex flex-col gap-8">
          {/* Header: ícone + título */}
          <div className="flex items-center gap-2 md:gap-3">
            <div className="size-6 md:size-8 rounded bg-gray-4 animate-pulse" />
            <div className="h-5 md:h-7 w-44 md:w-56 rounded bg-gray-4 animate-pulse" />
          </div>

          {/* Grid de cards de ingresso */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="rounded-xl border border-gray-6 bg-gray-1 overflow-hidden flex flex-col"
              >
                {/* Banner — proporção quadrada igual ao TicketCard */}
                <div className="h-[232px] md:h-auto md:aspect-square bg-gray-3 animate-pulse" />
                {/* Body — título + categoria + data */}
                <div className="p-4 flex flex-col gap-2">
                  <div className="h-4 w-3/4 rounded bg-gray-3 animate-pulse" />
                  <div className="h-3 w-1/2 rounded bg-gray-2 animate-pulse" />
                  <div className="h-3 w-1/3 rounded bg-gray-2 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
