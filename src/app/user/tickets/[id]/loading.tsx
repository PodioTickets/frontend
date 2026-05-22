/**
 * Skeleton do detalhe `/user/tickets/[id]`.
 *
 * Espelha a estrutura real:
 * - Header mobile (back + título centralizado) / desktop (back + h1 + descrição).
 * - Card-resumo do evento (banner + info em 1-2 linhas conforme breakpoint).
 * - Lista de cards de participante com QR placeholder + área de dados.
 *
 * Proporções alinhadas ao componente real (`EventInfoCard`,
 * `RegistrationQRCode 120px`) pra evitar layout shift na hidratação.
 */
export default function UserTicketDetailLoading() {
  return (
    <div
      className="min-h-screen bg-gray-2"
      aria-busy="true"
      aria-live="polite"
    >
      {/* Mobile header */}
      <div className="md:hidden bg-gray-2 border-b border-gray-6 px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="size-8 rounded bg-gray-4 animate-pulse" />
          <div className="h-4 w-40 rounded bg-gray-4 animate-pulse" />
          <div className="size-8" aria-hidden />
        </div>
      </div>

      <div className="mx-auto max-w-[700px] px-4 pt-6 pb-20 md:pt-13">
        {/* Desktop header */}
        <div className="mb-6 hidden md:flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-full bg-gray-4 animate-pulse" />
            <div className="h-6 w-56 rounded bg-gray-4 animate-pulse" />
          </div>
          <div className="h-4 w-3/4 rounded bg-gray-3 animate-pulse" />
        </div>

        {/* Mobile description */}
        <div className="md:hidden mb-6">
          <div className="h-3 w-3/4 rounded bg-gray-3 animate-pulse" />
        </div>

        {/* Card-resumo do evento (banner + info) */}
        <div className="mb-6 rounded-xl border border-gray-6 bg-gray-1 overflow-hidden">
          <div className="h-[120px] md:h-[140px] bg-gray-3 animate-pulse" />
          <div className="p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col gap-2 min-w-0 flex-1">
              <div className="h-5 w-3/4 rounded bg-gray-4 animate-pulse" />
              <div className="h-3 w-1/2 rounded bg-gray-3 animate-pulse" />
            </div>
            <div className="flex gap-3">
              <div className="h-4 w-20 rounded bg-gray-3 animate-pulse" />
              <div className="h-4 w-20 rounded bg-gray-3 animate-pulse" />
            </div>
          </div>
        </div>

        {/* Cards de participante (2 placeholders) */}
        <div className="flex flex-col gap-5">
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="bg-gray-1 border border-gray-6 rounded-xl overflow-hidden"
            >
              {/* Header: QR + título */}
              <div className="flex flex-col gap-5 items-start px-4 py-6 border-b border-gray-6 md:flex-row md:items-center md:justify-between">
                <div className="flex gap-3 items-start w-full md:flex-col md:gap-5 md:items-start md:w-auto">
                  {/* QR placeholder mobile */}
                  <div className="size-[120px] shrink-0 rounded bg-gray-3 animate-pulse md:hidden" />
                  <div className="flex flex-col items-start gap-2 py-3 md:gap-2 md:py-0 flex-1 min-w-0 w-full">
                    <div className="h-4 w-32 rounded bg-gray-3 animate-pulse" />
                    <div className="h-3 w-28 rounded bg-gray-2 animate-pulse" />
                    <div className="h-6 w-full md:w-72 rounded bg-gray-4 animate-pulse" />
                  </div>
                </div>
                {/* QR placeholder desktop */}
                <div className="hidden md:block size-[120px] shrink-0 rounded bg-gray-3 animate-pulse" />
              </div>

              {/* Participant profile card */}
              <div className="px-4 py-4 border-b border-gray-6 flex items-center justify-between gap-3">
                <div className="border border-gray-6 rounded-xl p-3 flex items-center gap-2 min-w-0 flex-1">
                  <div className="size-10 rounded-full bg-gray-4 animate-pulse shrink-0" />
                  <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                    <div className="h-3.5 w-40 rounded bg-gray-3 animate-pulse" />
                    <div className="h-3 w-32 rounded bg-gray-2 animate-pulse" />
                  </div>
                </div>
                <div className="size-8 rounded bg-gray-3 animate-pulse shrink-0" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
