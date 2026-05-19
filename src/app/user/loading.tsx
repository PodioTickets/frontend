// Skeleton da área logada do usuário (/user, /user/tickets, etc.).
// Mostrado durante a navegação entre rotas internas — mata o "freeze" do RSC.
export default function UserLoading() {
  return (
    <div className="px-4 md:px-8 pt-4 md:pt-8 pb-10" aria-busy="true" aria-live="polite">
      {/* Page title */}
      <div className="mb-6 flex items-center gap-3">
        <div className="size-6 md:size-8 rounded bg-gray-4 animate-pulse" />
        <div className="h-7 md:h-8 w-48 rounded bg-gray-4 animate-pulse" />
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-gray-6 bg-gray-1 overflow-hidden flex flex-col"
          >
            <div className="h-[232px] md:h-auto md:aspect-square bg-gray-3 animate-pulse" />
            <div className="p-4 flex flex-col gap-2">
              <div className="h-4 w-3/4 rounded bg-gray-3 animate-pulse" />
              <div className="h-3 w-1/2 rounded bg-gray-2 animate-pulse" />
              <div className="h-3 w-1/3 rounded bg-gray-2 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
