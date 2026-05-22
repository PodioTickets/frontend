/**
 * Skeleton da página de perfil (`/user/page.tsx` — "Meu perfil").
 *
 * Espelha o card central com avatar + título + grid de inputs do form de
 * dados pessoais e a seção "Conta e segurança". Mostrado pelo Next.js App
 * Router enquanto a página é montada, eliminando o "freeze" percebido entre
 * clique e render quando se navega pra `/user`.
 *
 * Subpastas `/user/tickets` e `/user/tickets/[id]` têm seus próprios
 * `loading.tsx` — este aqui é específico do segmento raiz.
 */
export default function UserLoading() {
  return (
    <div
      className="min-h-screen bg-gray-2 md:pb-32"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="mx-auto flex max-w-[842px] flex-col items-center justify-center px-4 py-10 md:px-5 md:py-[52px]">
        <div className="w-full rounded-xl bg-gray-1 shadow-[0px_2px_6px_0px_rgba(17,17,17,0.25)]">
          {/* Header: título + avatar + botões */}
          <div className="flex flex-col gap-6 border-b border-gray-6 px-4 pb-8 pt-6">
            <div className="flex items-center justify-center md:justify-start">
              <div className="h-7 md:h-8 w-40 rounded bg-gray-4 animate-pulse" />
            </div>

            <div className="flex flex-col gap-6 items-center md:flex-row md:items-end md:gap-4">
              <div className="size-24 shrink-0 rounded-full bg-gray-4 animate-pulse" />
              <div className="flex flex-col gap-4 items-stretch w-full md:flex-1">
                <div className="flex flex-col gap-3 md:flex-row md:gap-4">
                  <div className="h-11 md:h-10 w-full md:w-44 rounded-lg bg-gray-4 animate-pulse" />
                  <div className="h-11 md:h-10 w-full md:w-44 rounded-lg bg-gray-3 animate-pulse" />
                </div>
                <div className="h-3 w-2/3 rounded bg-gray-3 animate-pulse" />
              </div>
            </div>
          </div>

          {/* Section: Dados pessoais */}
          <div className="flex flex-col gap-8 border-b border-gray-6 px-4 py-8">
            <div className="flex flex-col gap-3">
              <div className="h-6 w-40 rounded bg-gray-4 animate-pulse" />
              <div className="h-4 w-3/4 rounded bg-gray-3 animate-pulse" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex flex-col gap-2">
                  <div className="h-4 w-24 rounded bg-gray-3 animate-pulse" />
                  <div className="h-12 w-full rounded-lg border border-gray-6 bg-gray-2 animate-pulse" />
                </div>
              ))}
            </div>
            <div className="flex justify-stretch md:justify-end">
              <div className="h-11 md:h-12 w-full md:w-48 rounded-lg bg-gray-4 animate-pulse" />
            </div>
          </div>

          {/* Section: Conta e segurança */}
          <div className="flex flex-col gap-8 border-b border-gray-6 px-4 py-8">
            <div className="flex flex-col gap-3">
              <div className="h-6 w-44 rounded bg-gray-4 animate-pulse" />
              <div className="h-4 w-2/3 rounded bg-gray-3 animate-pulse" />
            </div>
            <div className="flex flex-col md:flex-row gap-4 md:gap-6">
              <div className="h-12 md:h-[52px] w-full rounded-lg border border-gray-6 bg-gray-2 animate-pulse" />
              <div className="h-12 md:h-[52px] w-full rounded-lg border border-gray-6 bg-gray-2 animate-pulse" />
            </div>
          </div>

          {/* Section: 2FA */}
          <div className="flex flex-col gap-6 px-4 py-8">
            <div className="h-6 w-32 rounded bg-gray-4 animate-pulse" />
            <div className="h-16 w-full rounded-lg border border-gray-6 bg-gray-2 animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}
