// Skeleton da página pública do evento. Mostrado entre clicar em um link de
// evento e o RSC payload chegar — substitui o "freeze" por feedback visual.
export default function EventLoading() {
  return (
    <div className="min-h-screen bg-gray-2 pb-24" aria-busy="true" aria-live="polite">
      {/* Banner — formato padrão 1660×930 (mobile full-width; desktop aproxima) */}
      <div className="w-full aspect-1660/930 md:aspect-auto md:h-[400px] bg-gray-3 animate-pulse" />

      <div className="max-w-[1280px] mx-auto px-4 md:px-8 -mt-10 md:-mt-14 relative">
        {/* Hero card */}
        <div className="rounded-2xl bg-gray-1 border border-gray-6 p-6 md:p-8 shadow-[0_5px_10px_rgba(0,0,0,0.15)] mb-8">
          <div className="h-7 md:h-9 w-3/4 rounded bg-gray-4 animate-pulse" />
          <div className="mt-3 h-4 w-1/2 rounded bg-gray-3 animate-pulse" />
          <div className="mt-6 flex flex-col md:flex-row gap-3">
            <div className="h-12 flex-1 rounded bg-gray-3 animate-pulse" />
            <div className="h-12 md:w-48 rounded bg-gray-4 animate-pulse" />
          </div>
        </div>

        {/* Topics / content sections */}
        <div className="flex flex-col gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl bg-gray-1 border border-gray-6 p-5 flex flex-col gap-3"
            >
              <div className="h-5 w-1/3 rounded bg-gray-4 animate-pulse" />
              <div className="h-3 w-full rounded bg-gray-2 animate-pulse" />
              <div className="h-3 w-11/12 rounded bg-gray-2 animate-pulse" />
              <div className="h-3 w-3/4 rounded bg-gray-2 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
