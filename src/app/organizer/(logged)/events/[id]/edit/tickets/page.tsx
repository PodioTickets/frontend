import { Suspense } from "react";
import {
  HydrationBoundary,
  QueryClient,
  dehydrate,
} from "@tanstack/react-query";
import { Loading } from "@/components/Loading";
import { queryKeys } from "@/services/cache/QueryClient";
import { fetchTicketsManagementBundle } from "@/lib/server/fetchTicketsManagementBundle";
import { fetchEventById } from "@/lib/server/fetchEventById";
import { TicketsEditClient } from "./TicketsEditClient";

/**
 * Async leaf que faz os fetches paralelos no servidor e hidrata o cache do
 * React Query antes do client montar. Isolado num subcomponente pra habilitar
 * **streaming** via `<Suspense>`: o layout (header + stepper de progresso)
 * é enviado imediatamente; este bloco entra via HTML stream quando os
 * fetches resolvem.
 */
async function TicketsManagementSection({ eventId }: { eventId: string }) {
  // QueryClient temporário por request — evita vazamento entre usuários no SSR.
  const queryClient = new QueryClient();

  // Fetches paralelos: bundle (event subset + categories + tickets) + evento
  // completo (que o EditEventContext consome via queryKeys.events.detail).
  // Ambos vão direto pro cache do QueryClient temporário, que é dehydratado
  // pra hidratação no client.
  const [initialBundle, eventFull] = await Promise.all([
    fetchTicketsManagementBundle(eventId),
    fetchEventById(eventId),
  ]);

  if (eventFull) {
    queryClient.setQueryData(queryKeys.events.detail(eventId), eventFull);
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <TicketsEditClient initialBundle={initialBundle} />
    </HydrationBoundary>
  );
}

/**
 * Server Component da página de gerenciamento de ingressos.
 *
 * Estratégia de performance:
 *
 * 1. **Fetch server-side em paralelo** — `fetchTicketsManagementBundle` e
 *    `fetchEventById` rodam juntos no servidor (intra-VPC do backend, latência
 *    mínima). Sem waterfall HTML → JS → fetch.
 *
 * 2. **Hidratação dupla**:
 *    - `initialBundle` vai pro `useTicketsManagement` via prop.
 *    - O evento completo vai pro `queryClient.setQueryData` e é hidratado via
 *      `<HydrationBoundary>` — `useEditEvent` (no layout) já encontra o cache
 *      preenchido e não dispara fetch.
 *
 * 3. **Streaming via `<Suspense>`** — o layout (header + stepper) renderiza
 *    instantaneamente; este bloco entra via HTML stream quando os fetches
 *    completam.
 *
 * 4. **Fallback gracioso** — se algum fetch falhar (sem token, 401, backend
 *    off), as chaves vêm nulas e o client faz fetch normal. Interceptor
 *    existente trata o erro (redirect/toast).
 */
export default async function EditTicketsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <Suspense fallback={<Loading />}>
      <TicketsManagementSection eventId={id} />
    </Suspense>
  );
}
