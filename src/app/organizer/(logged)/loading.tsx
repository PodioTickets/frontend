// Skeleton instantâneo durante navegação entre páginas organizer.
// Funciona como fallback global do segment — segments aninhados podem definir
// loading.tsx próprio (ex.: dashboard com chart) que prevalece sobre este.
export default function OrganizerLoading() {
  return (
    <div className="px-4 sm:px-6 lg:px-8 pt-4 md:pt-8 pb-10" aria-busy="true" aria-live="polite">
      {/* Header */}
      <div className="mb-6">
        <div className="h-7 w-56 rounded bg-gray-4 animate-pulse" />
        <div className="mt-2 h-4 w-80 max-w-full rounded bg-gray-3 animate-pulse" />
      </div>

      {/* Top action / filter row */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="h-10 flex-1 min-w-[240px] rounded bg-gray-3 animate-pulse" />
        <div className="h-10 w-full sm:w-[160px] rounded bg-gray-4 animate-pulse" />
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-gray-6 bg-gray-1 overflow-hidden"
          >
            <div className="h-32 bg-gray-3 animate-pulse" />
            <div className="p-4 space-y-3">
              <div className="h-4 w-3/4 rounded bg-gray-3 animate-pulse" />
              <div className="h-3 w-1/2 rounded bg-gray-2 animate-pulse" />
              <div className="flex justify-between pt-2">
                <div className="h-6 w-20 rounded bg-gray-3 animate-pulse" />
                <div className="h-6 w-16 rounded bg-gray-3 animate-pulse" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
