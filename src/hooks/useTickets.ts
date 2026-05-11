import { useCallback } from "react";
import { useQuery, useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { organizerService } from "@/services";
import { queryKeys, invalidateQueries } from "@/services/cache/QueryClient";
import toast from "react-hot-toast";

export interface Ticket {
  id: string;
  name: string;
  isActive: boolean;
  groupId: string;
  /** Ordem de exibição dentro da categoria (ou entre avulsos). */
  sortOrder?: number;
  modality: string;
  distance: string;
  distanceUnit: string;
  price: string;
  ageLimit?: {
    min?: number;
    max?: number;
  };
  description?: string
  gender?: string;
  activeBatch?: { id: string; price: number; label?: string; status?: string };
  activeBatchStatus?: string;
  products: string[];
  productImages: Array<{ id: string; name: string; images: string[]; primaryImageIndex?: number }>;
  batches: Array<{
    id: string;
    quantity: string;
    price: string;
  }>;
  availableQuantity: number | null;
  isSoldOut: boolean;
  createdAt: string;
}

const EMPTY_TICKETS: Ticket[] = [];

/**
 * Normaliza o payload bruto de um ticket vindo da API para o shape interno `Ticket`.
 * Exportado para permitir optimistic updates (ex.: duplicação) reutilizando a mesma
 * transformação usada pelo `queryFn`, garantindo cache consistente.
 */
export function formatRawTicket(ticket: any): Ticket {
  return {
    id: ticket.id,
    name: ticket.name,
    isActive: ticket.isActive ?? true,
    groupId: ticket.categoryId || "uncategorized",
    sortOrder:
      typeof ticket.sortOrder === "number" ? ticket.sortOrder : undefined,
    modality: ticket.modality || "",
    distance: ticket.distance || "",
    distanceUnit: ticket.distanceUnit || "KM",
    price: (() => {
      const raw = ticket.activeBatch?.price ?? ticket.batches?.[0]?.price;
      return raw != null
        ? `R$ ${(Number(raw) / 100).toFixed(2).replace(".", ",")}`
        : "R$ 0,00";
    })(),
    description: ticket.description ?? undefined,
    ageLimit: ticket.ageLimit,
    gender: ticket.gender,
    activeBatch: ticket.activeBatch
      ? {
          id: ticket.activeBatch.id,
          price: ticket.activeBatch.price,
          label: ticket.activeBatchLabel,
          status: ticket.activeBatchStatus,
        }
      : undefined,
    activeBatchStatus: ticket.activeBatchStatus ?? undefined,
    products: ticket.productIds || [],
    productImages: (ticket.products || []).map((tp: any) => ({
      id: tp.productId,
      name: tp.product?.name ?? "Produto",
      images:
        Array.isArray(tp.product?.images) && tp.product.images.length > 0
          ? tp.product.images
          : tp.product?.image
            ? [tp.product.image]
            : [],
      primaryImageIndex:
        typeof tp.product?.primaryImageIndex === "number"
          ? tp.product.primaryImageIndex
          : undefined,
    })),
    batches: (ticket.batches || []).map((b: any) => ({
      id: b.id ?? b.batchId ?? "",
      quantity: String(b.quantity ?? ""),
      price: String(b.price ?? ""),
    })),
    availableQuantity: ticket.availableQuantity ?? null,
    isSoldOut: ticket.isSoldOut ?? false,
    createdAt: ticket.createdAt,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Pending writes registry
//
// Protege escritas otimistas (duplicate/edit) contra refetches que voltam antes
// do backend propagar a mudança (eventual consistency / réplica de leitura).
//
// Sem isso, o fluxo: 1) usuário duplica → setQueryData insere localmente → 2)
// troca de aba dispara focus/visibilitychange → 3) refetch lê do backend que
// ainda não tem o registro → 4) cache é sobrescrito sem o ticket → ticket some.
//
// Estado vive em escopo de módulo (não em ref do hook) para sobreviver a
// remontagens do componente. TTL evita que entradas órfãs (ex.: falha real
// no backend) fiquem para sempre — após o TTL, o ticket "fantasma" desaparece.
// ─────────────────────────────────────────────────────────────────────────────

const TICKET_PENDING_TTL_MS = 30_000;
/**
 * Para `update`: janela em que o pending **sobrescreve** a versão do servidor
 * (proteção contra leitura defasada de réplica). Após esse tempo, o servidor
 * reina mesmo que ainda esteja defasado — assumimos que algo maior deu errado.
 *
 * 15s cobre o fluxo: save (HTTP ~200ms) → redirect → RSC fetch (~300ms) →
 * eventual refetch client-side disparado por invalidate residual. Curto o
 * suficiente pra liberar o controle pro servidor caso de fato algo trave,
 * mas longo o suficiente pra UX consistente em redes médias.
 */
const TICKET_PENDING_UPDATE_OVERWRITE_MS = 15_000;

interface PendingEntry {
  ticket: Ticket;
  expiresAt: number;
  op: "create" | "update";
  /** Só usado quando `op === "update"`: timestamp limite para sobrescrever. */
  overwriteUntil: number;
}

const pendingWritesByEvent = new Map<string, Map<string, PendingEntry>>();

function getPendingMap(eventId: string): Map<string, PendingEntry> {
  let m = pendingWritesByEvent.get(eventId);
  if (!m) {
    m = new Map();
    pendingWritesByEvent.set(eventId, m);
  }
  return m;
}

/**
 * Registra uma escrita otimista de ticket para proteger a UI contra refetches
 * que voltem antes do backend propagar (eventual consistency).
 *
 * - `op: "create"` → enquanto o ID **não estiver** no servidor, o pending é
 *   exibido (preenche o gap). Quando aparecer no servidor, o pending é limpo
 *   e o servidor passa a reinar.
 * - `op: "update"` → enquanto o ID estiver no servidor mas dentro da janela
 *   de proteção (`TICKET_PENDING_UPDATE_OVERWRITE_MS`), o pending **sobrescreve**
 *   a versão do servidor (caso a réplica esteja defasada). Após essa janela, o
 *   servidor reina mesmo que pareça defasado.
 *
 * Standalone — pode ser chamada de qualquer lugar sem precisar instanciar o
 * hook `useTickets`. Útil em fluxos que fazem POST/PATCH direto pelo service
 * e depois invalidam a query (ex.: TicketForm).
 */
export function markTicketPendingWrite(
  eventId: string | null,
  ticket: Ticket,
  op: "create" | "update" = "create",
): void {
  if (!eventId) return;
  const now = Date.now();
  const m = getPendingMap(eventId);
  m.set(ticket.id, {
    ticket,
    op,
    expiresAt: now + TICKET_PENDING_TTL_MS,
    overwriteUntil: now + TICKET_PENDING_UPDATE_OVERWRITE_MS,
  });
}

/** Remove explicitamente um pending write (ex.: ticket foi deletado). */
export function clearTicketPendingWrite(
  eventId: string | null,
  ticketId: string,
): void {
  if (!eventId) return;
  const m = pendingWritesByEvent.get(eventId);
  m?.delete(ticketId);
}

/**
 * Aplica uma atualização otimista em AMBOS os caches de tickets:
 *
 * 1. `queryKeys.events.tickets(eventId)`              — usado por outras páginas
 *    (dashboard, modais, checkout). Estrutura: `Ticket[]` direto.
 * 2. `queryKeys.events.ticketsManagement(eventId)`   — bundle agregado da
 *    página de gerenciamento. Estrutura: `{event, categories, tickets}`.
 *
 * Sem isso, mutações otimistas em uma página só refletem na outra após o
 * refetch (perde o efeito de "instantâneo").
 */
export function optimisticUpdateTickets(
  queryClient: QueryClient,
  eventId: string | null,
  updater: (tickets: Ticket[]) => Ticket[],
): void {
  if (!eventId) return;

  // Cache antigo: Ticket[] direto.
  queryClient.setQueryData<Ticket[]>(
    queryKeys.events.tickets(eventId),
    (prev) => updater(prev ?? []),
  );

  // Cache do bundle: { event, categories, tickets } — tickets já formatados
  // (`useTicketsManagement` normaliza no `queryFn`/`initialData` e o `select`
  // apenas reconcila com pending writes). Por isso o updater opera direto
  // sobre `Ticket[]` formatado, sem precisar de cast.
  queryClient.setQueryData<{
    event: unknown;
    categories: unknown[];
    tickets: Ticket[];
  }>(queryKeys.events.ticketsManagement(eventId), (prev) => {
    if (!prev) return prev;
    return {
      ...prev,
      tickets: updater(prev.tickets),
    };
  });
}

/**
 * Reconcilia a lista vinda do servidor com escritas otimistas ainda pendentes.
 *
 * - Para `create`: se o ID já apareceu no servidor, a escrita foi confirmada
 *   → limpa o pending. Se não, exibe o pending (preenche o gap).
 * - Para `update`: se o ID está no servidor e ainda estamos na janela de
 *   proteção (`overwriteUntil`), o pending sobrescreve a versão do servidor.
 *   Fora da janela, o servidor reina.
 */
export function mergeTicketsWithPendingWrites(
  eventId: string | null,
  serverTickets: Ticket[],
): Ticket[] {
  if (!eventId) return serverTickets;
  const m = pendingWritesByEvent.get(eventId);
  if (!m || m.size === 0) return serverTickets;

  const now = Date.now();
  const serverById = new Map(serverTickets.map((t) => [t.id, t] as const));
  const result: Ticket[] = [];

  // 1. Reconciliar os tickets que vieram do servidor.
  for (const t of serverTickets) {
    const entry = m.get(t.id);
    if (!entry) {
      result.push(t);
      continue;
    }
    if (entry.expiresAt < now) {
      m.delete(t.id);
      result.push(t);
      continue;
    }
    if (entry.op === "create") {
      // Backend confirmou o create → limpa pending, usa servidor (fonte da verdade).
      m.delete(t.id);
      result.push(t);
      continue;
    }
    // op === "update"
    if (now < entry.overwriteUntil) {
      // Janela de proteção ativa — pending sobrescreve servidor.
      result.push(entry.ticket);
    } else {
      // Janela expirou — confia no servidor.
      m.delete(t.id);
      result.push(t);
    }
  }

  // 2. Pendentes que ainda não apareceram no servidor (create em andamento).
  for (const [id, entry] of Array.from(m.entries())) {
    if (serverById.has(id)) continue; // já tratado acima
    if (entry.expiresAt < now) {
      m.delete(id);
      continue;
    }
    result.push(entry.ticket);
  }

  return result;
}

export function useTickets(
  eventId: string | null,
  enabled: boolean = true,
  includeInactive: boolean = false,
  /**
   * Quando `true`, descarta o cache do react-query (gcTime: 0) e força
   * `refetchOnMount: 'always'`. Usado no checkout para garantir que pricing/
   * disponibilidade sempre venham frescos do servidor — nada exibido a partir
   * de payload antigo.
   */
  noCache: boolean = false,
) {
  const queryClient = useQueryClient();

  // Query para buscar tickets
  const {
    data,
    isLoading,
    error,
    refetch: loadTickets,
  } = useQuery<Ticket[], Error, Ticket[]>({
    queryKey: includeInactive
      ? [...queryKeys.events.tickets(eventId || ""), { includeInactive }]
      : queryKeys.events.tickets(eventId || ""),
    queryFn: async () => {
      if (!eventId) return [];
      const response = await organizerService.getTickets(eventId, {
        page: 1,
        limit: 500,
        ...(includeInactive && { includeInactive: true }),
      });
      return response.tickets.map(formatRawTicket);
    },
    // Funde escritas otimistas que ainda não vieram do servidor. Roda toda vez
    // que o `data` muda (refetch, setQueryData, etc.).
    select: (raw) => mergeTicketsWithPendingWrites(eventId, raw),
    enabled: enabled && !!eventId,
    /** Lista precisa refletir criação/edição ao voltar do formulário (defaults globais: refetchOnMount: false, staleTime longo). */
    staleTime: 0,
    refetchOnMount: noCache ? "always" : true,
    ...(noCache && { gcTime: 0 }),
  });

  const tickets = data ?? EMPTY_TICKETS;

  /**
   * Registra um ticket recém-duplicado/editado como "pending write". Enquanto
   * a entrada estiver no registry (TTL de 30s) e o backend ainda não tiver
   * propagado, o ticket aparecerá na lista mesmo após refetches.
   *
   * O caller continua responsável por chamar `setQueryData` para reflexão
   * imediata na UI — este registry só protege contra o refetch posterior.
   */
  const markPending = useCallback(
    (ticket: Ticket, op: "create" | "update" = "create") =>
      markTicketPendingWrite(eventId, ticket, op),
    [eventId],
  );

  // Mutation para deletar ticket (desvincula da categoria antes, se necessário)
  const deleteMutation = useMutation({
    mutationFn: async (ticketId: string) => {
      if (!eventId) throw new Error("Event ID is required");
      const list = queryClient.getQueryData<Ticket[]>(
        queryKeys.events.tickets(eventId),
      );
      const ticket = list?.find((t) => t.id === ticketId);
      if (ticket?.groupId && ticket.groupId !== "uncategorized") {
        try {
          await organizerService.updateTicket(eventId, ticketId, {
            categoryId: null,
          });
        } catch (e) {
          console.warn(
            "Could not unlink ticket from category before delete:",
            e,
          );
        }
      }
      return organizerService.deleteTicket(eventId, ticketId);
    },
    onSuccess: (_, ticketId) => {
      // Limpa qualquer pending write — foi deletado intencionalmente, não pode
      // reaparecer no merge.
      clearTicketPendingWrite(eventId, ticketId);
      // Optimistic remove em AMBAS as caches (tickets antiga + bundle da
      // página de gerenciamento). Sem isso, ao navegar pós-delete a lista
      // renderiza o ticket fantasma até `staleTime` expirar — em particular
      // problema quando o user delete pelo TicketForm e é redirecionado.
      optimisticUpdateTickets(queryClient, eventId, (prev) =>
        prev.filter((t) => t.id !== ticketId),
      );
      // Invalidate ainda dispara reconciliação em background pra outros
      // consumers (modais de cupom/voucher, dashboards, etc).
      invalidateQueries.events.tickets(eventId!);
      toast.success("Ingresso deletado com sucesso!");
    },
    onError: (error: any) => {
      console.error("Error deleting ticket:", error);
      toast.error(error.response?.data?.message || "Erro ao deletar ingresso");
    },
  });

  return {
    tickets,
    loading: isLoading,
    error,
    loadTickets,
    markPending,
    deleteTicket: (ticketId: string) => deleteMutation.mutateAsync(ticketId),
  };
}
