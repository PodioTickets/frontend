// Skeleton específico do escopo de um evento no organizador (dashboard, edit,
// financial, registrations, etc.). Sobrescreve o loading.tsx de (logged) pra
// segments dentro de [id], onde geralmente há tabs + cards de métricas.
export default function OrganizerEventLoading() {
  return (
    <div className="px-4 md:px-6 lg:px-8 pt-4 md:pt-8 pb-10" aria-busy="true" aria-live="polite">
      {/* Event header */}
      <div className="mb-6 flex items-center gap-4">
        <div className="h-16 w-16 md:h-20 md:w-20 rounded-lg bg-gray-3 animate-pulse shrink-0" />
        <div className="flex-1 flex flex-col gap-2">
          <div className="h-7 w-2/3 rounded bg-gray-4 animate-pulse" />
          <div className="h-4 w-1/2 rounded bg-gray-3 animate-pulse" />
        </div>
      </div>

      {/* Tabs */}
      <div className="hidden md:flex gap-2 border-b border-gray-6 mb-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-9 w-28 rounded-t bg-gray-3 animate-pulse" />
        ))}
      </div>

      {/* Top metric cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-gray-6 bg-gray-1 p-4 flex flex-col gap-3 h-[133px]"
          >
            <div className="flex items-center justify-between">
              <div className="h-4 w-24 rounded bg-gray-3 animate-pulse" />
              <div className="size-7 rounded-xl bg-gray-3 animate-pulse" />
            </div>
            <div className="h-7 w-20 rounded bg-gray-4 animate-pulse" />
            <div className="h-3 w-32 rounded bg-gray-2 animate-pulse" />
          </div>
        ))}
      </div>

      {/* Wide content (chart / list) */}
      <div className="rounded-xl border border-gray-6 bg-gray-1 p-4 flex flex-col gap-3">
        <div className="h-5 w-48 rounded bg-gray-4 animate-pulse" />
        <div className="h-64 w-full rounded bg-gray-3 animate-pulse" />
      </div>
    </div>
  );
}
