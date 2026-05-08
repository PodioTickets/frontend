// Skeleton instantâneo durante navegação entre páginas admin.
// O App Router exibe este componente no slot {children} do layout enquanto
// o page.tsx de destino é resolvido — feedback imediato em vez de tela travada.
export default function AdminLoading() {
  return (
    <div className="pb-10" aria-busy="true" aria-live="polite">
      {/* Header */}
      <div className="mb-6">
        <div className="h-7 w-56 rounded bg-gray-4 animate-pulse" />
        <div className="mt-2 h-4 w-80 max-w-full rounded bg-gray-3 animate-pulse" />
      </div>

      {/* Stat cards */}
      <div className="flex flex-wrap gap-4 mb-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="flex-1 min-w-[180px] h-[88px] rounded-xl border border-gray-6 bg-gray-1 p-4"
          >
            <div className="flex items-center gap-3">
              <div className="size-8 rounded bg-gray-4 animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-20 rounded bg-gray-3 animate-pulse" />
                <div className="h-5 w-12 rounded bg-gray-4 animate-pulse" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters bar */}
      <div className="rounded-xl border border-gray-6 bg-gray-1 p-3 md:p-4 mb-5">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="h-10 flex-1 min-w-[240px] rounded bg-gray-3 animate-pulse" />
          <div className="h-10 w-full sm:w-[220px] rounded bg-gray-3 animate-pulse" />
        </div>
      </div>

      {/* Table-ish rows */}
      <div className="rounded-xl border border-gray-6 bg-gray-1 overflow-hidden">
        <div className="border-b border-gray-6 bg-gray-4 h-11" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="border-b border-gray-6 last:border-b-0 px-4 py-4 flex items-center gap-4"
          >
            <div className="size-10 rounded-full bg-gray-3 animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-1/3 rounded bg-gray-3 animate-pulse" />
              <div className="h-3 w-1/4 rounded bg-gray-2 animate-pulse" />
            </div>
            <div className="hidden sm:block h-4 w-24 rounded bg-gray-3 animate-pulse" />
            <div className="hidden md:block h-4 w-20 rounded bg-gray-3 animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
