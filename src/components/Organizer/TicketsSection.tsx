"use client";

import {
  useState,
  useEffect,
  useLayoutEffect,
  useCallback,
  useRef,
  useMemo,
  forwardRef,
  useImperativeHandle,
} from "react";
import { useOrganizerNavigate } from "@/hooks/useOrganizerNavigate";
import { useTicketCategories } from "@/hooks/useTicketCategories";
import {
  useTickets,
  formatRawTicket,
  optimisticUpdateTickets,
  type Ticket,
} from "@/hooks/useTickets";
import {
  useTicketsManagement,
  type TicketsManagementBundle,
} from "@/hooks/useTicketsManagement";
import { organizerService } from "@/services";
import type { ModalityGroup } from "@/services/organizer/OrganizerService";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/services/cache/QueryClient";
import { Button } from "@/components/Button";
import { Loading } from "@/components/Loading";
import { ArrowButton } from "@/components/ArrowButton";
import Image from "next/image";
import toast from "react-hot-toast";
import { Plus } from "lucide-react";
import { PencilIcon } from "@/components/Icons/PencilIcon";
import { TrashIcon } from "@/components/Icons/TrashIcon";
import { TicketCategoryCard } from "@/components/Ticket/TicketCategoryCard";
import {
  TicketCategoryFormDrawer,
  type TicketCategoryFormPayload,
} from "@/components/Ticket/TicketCategoryFormDrawer";
import {
  TicketTable,
  type TicketMoveCategoryOption,
} from "@/components/Ticket/TicketTable";
import { UncategorizedTicketsDropShell } from "@/components/Ticket/UncategorizedTicketsDropShell";
import {
  KitImagePositionDrawer,
  type KitImageLayoutMode,
  type KitImagePositionCategorySection,
} from "@/components/Ticket/KitImagePositionDrawer";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { SortableTicketCategoryItem } from "@/components/Ticket/SortableTicketCategoryItem";
import { MobileGeneralTicketsSection } from "@/components/Ticket/MobileGeneralTicketsSection";
import {
  categorySortableId,
  organizerTicketCategoriesCollisionDetection,
  parseCategorySortableId,
  persistTicketCategoryOrderApi,
  resolveCategoryReorderOverId,
} from "@/lib/ticketCategoryOrder";
import {
  applyDraftOrderToTickets,
  applyOrganizerTicketDragEnd,
  categoryIdForTicketScope,
  persistTicketOrderDrafts,
} from "@/lib/organizerTicketListDnD";

export interface TicketsSectionRef {
  /** Flush local draft state to the API. Used by the create flow before navigating. */
  flushAndPersistAll: () => Promise<void>;
  /** Reset local draft order state. Used by the edit flow on discard. */
  reset: () => void;
}

export interface KitImagePositionDrawerProps {
  open: boolean;
  onClose: () => void;
  initialKitSelection: {
    layout: KitImageLayoutMode;
    primaryByTicket: Record<string, string>;
    primaryByCategory: Record<string, string>;
  };
  onSave: (payload: {
    layout: KitImageLayoutMode;
    primaryImageUrlByTicketId: Record<string, string>;
    primaryImageUrlByCategoryId: Record<string, string>;
  }) => void;
  saveSuccessMessage?: string;
}

interface TicketsSectionProps {
  eventId: string | null | undefined;
  authChecked: boolean;
  /** "draft": order persisted only on flushAndPersistAll. "immediate": order API-persisted on each drag end. */
  persistMode: "draft" | "immediate";
  onBack: () => void;
  onCreateTicket: () => void;
  onEditTicket: (ticketId: string) => void;
  /** Render prop for the action buttons row. Receives current ticket count. */
  actionSlot: (ticketCount: number) => React.ReactNode;
  /** Slot rendered after categories list, before action row. Used for kit display options in edit. */
  extraContent?: React.ReactNode;
  /** When provided, renders KitImagePositionDrawer inside DndContext using internally-derived ticket/category data. */
  kitImagePositionDrawer?: KitImagePositionDrawerProps;
  /** CSS classes for the inner flex-col wrapper. */
  innerClassName?: string;
  /**
   * Bundle (já formatado) pré-carregado pelo Server Component. Hidrata o
   * cache do React Query no primeiro render, eliminando o waterfall
   * HTML → JS → fetch.
   */
  initialBundle?: TicketsManagementBundle;
}

function committedCategoryKeyForTicket(t: Ticket, categories: ModalityGroup[]): string {
  const scope = categoryIdForTicketScope(t, categories);
  return scope ?? "uncategorized";
}

function buildCommittedAssignmentsMap(
  tickets: Ticket[],
  categories: ModalityGroup[],
): Record<string, string> {
  const m: Record<string, string> = {};
  for (const t of tickets) {
    m[t.id] = committedCategoryKeyForTicket(t, categories);
  }
  return m;
}

export const TicketsSection = forwardRef<TicketsSectionRef, TicketsSectionProps>(
  function TicketsSection(
    {
      eventId,
      authChecked,
      persistMode,
      onBack,
      onCreateTicket,
      onEditTicket,
      actionSlot,
      extraContent,
      kitImagePositionDrawer,
      innerClassName,
      initialBundle,
    },
    ref,
  ) {
    const queryClient = useQueryClient();

    const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
    const [editingGroupName, setEditingGroupName] = useState("");
    const [showCreateGroupSection, setShowCreateGroupSection] = useState(false);
    const [newGroupName, setNewGroupName] = useState("");
    const [viewMode, setViewMode] = useState<Record<string, "table" | "cards">>({});
    const [duplicatingTicketId, setDuplicatingTicketId] = useState<string | null>(null);
    const [categoryOrderIds, setCategoryOrderIds] = useState<string[]>([]);
    const [ticketOrderDraft, setTicketOrderDraft] = useState<Record<string, string[]>>({});
    const [categoryNameDraft, setCategoryNameDraft] = useState<Record<string, string>>({});
    const [categoryFormDrawerOpen, setCategoryFormDrawerOpen] = useState(false);
    const [categoryFormMode, setCategoryFormMode] = useState<"create" | "edit">("create");
    const [categoryFormCategoryId, setCategoryFormCategoryId] = useState<string | null>(null);

    // Immediate mode: track committed server state
    const committedAssignmentRef = useRef<Record<string, string>>({});
    const prevTicketsLoadingRef = useRef(true);

    // Fonte primária de dados: bundle agregado (1 GET para event+categories+
    // tickets). `useTicketCategories` e `useTickets` abaixo são usados APENAS
    // para mutations (`enabled: false` impede a query GET dedicada — assim
    // não temos request duplicada com o bundle).
    const {
      categories,
      tickets,
      loading: bundleLoading,
    } = useTicketsManagement(eventId ?? null, authChecked, { initialData: initialBundle });

    const {
      createCategory,
      updateCategory,
      deleteCategory,
    } = useTicketCategories(eventId ?? null, false);

    const {
      markPending: markTicketPending,
    } = useTickets(eventId ?? null, false);

    const categoriesLoading = bundleLoading;
    const ticketsLoading = bundleLoading;

    const loading = categoriesLoading || ticketsLoading;

    // Refs for flushAndPersistAll / reset imperativeHandle
    const orderedCategoriesRef = useRef<ModalityGroup[]>([]);
    const ticketOrderDraftRef = useRef<Record<string, string[]>>({});
    const categoryNameDraftRef = useRef<Record<string, string>>({});
    const categoriesRef = useRef<ModalityGroup[]>([]);
    const categoryElementsCacheRef = useRef<Map<string, DOMRect>>(new Map());

    // viewMode init
    useEffect(() => {
      if (!Array.isArray(categories) || categories.length === 0) return;
      setViewMode((prev) => {
        const next: Record<string, "table" | "cards"> = {};
        categories.forEach((c) => {
          if (!prev[c.id]) next[c.id] = "table";
        });
        return Object.keys(next).length > 0 ? { ...prev, ...next } : prev;
      });
      categoryElementsCacheRef.current.clear();
    }, [categories]);

    // categoryOrderIds sync
    useEffect(() => {
      const ids = [...categories]
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map((c) => c.id);
      setCategoryOrderIds((prev) => {
        if (ids.length === 0) return prev.length === 0 ? prev : [];
        if (prev.length === 0) return ids;
        const prevSet = new Set(prev);
        const idsSet = new Set(ids);
        const sameMembers =
          prev.length === ids.length &&
          ids.every((id) => prevSet.has(id)) &&
          prev.every((id) => idsSet.has(id));
        return sameMembers ? prev : ids;
      });
    }, [categories]);

    // Draft mode: invalidate on mount so stale Router Cache doesn't block fresh data
    useEffect(() => {
      if (persistMode !== "draft" || !authChecked || !eventId) return;
      void queryClient.invalidateQueries({
        queryKey: queryKeys.events.ticketsManagement(eventId),
      });
    }, [persistMode, authChecked, eventId, queryClient]);

    // Refresh quando outro ponto da app dispara `ticketCreated` (ex.: TicketForm
    // após save). Os outros gatilhos antigos (focus / visibilitychange / pageshow)
    // foram removidos: o react-query já cobre via `refetchOnWindowFocus: true`
    // no `useTicketsManagement`, com dedup interna nativa.
    useEffect(() => {
      if (!eventId) return;
      const refresh = () => {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.events.ticketsManagement(eventId),
        });
      };
      window.addEventListener("ticketCreated", refresh);
      return () => {
        window.removeEventListener("ticketCreated", refresh);
      };
    }, [eventId, queryClient]);

    // Immediate mode: reset baseline tracking when eventId changes
    useEffect(() => {
      if (persistMode !== "immediate") return;
      prevTicketsLoadingRef.current = true;
    }, [persistMode, eventId]);

    // Immediate mode: align committed assignments once initial load completes
    useLayoutEffect(() => {
      if (persistMode !== "immediate" || !authChecked || !eventId) return;
      if (ticketsLoading) {
        prevTicketsLoadingRef.current = true;
        return;
      }
      if (prevTicketsLoadingRef.current) {
        prevTicketsLoadingRef.current = false;
        committedAssignmentRef.current = buildCommittedAssignmentsMap(tickets, categories);
      }
    }, [persistMode, authChecked, ticketsLoading, eventId, tickets, categories]);

    const orderedCategories = useMemo(() => {
      if (!categoryOrderIds.length || categoryOrderIds.length !== categories.length) {
        return [...categories].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      }
      const m = new Map(categories.map((c) => [c.id, c]));
      return categoryOrderIds.map((id) => m.get(id)).filter(Boolean) as ModalityGroup[];
    }, [categories, categoryOrderIds]);

    const orderedCategoriesDisplay = useMemo(() => {
      if (persistMode !== "draft") return orderedCategories;
      return orderedCategories.map((c) => ({
        ...c,
        name: categoryNameDraft[c.id] ?? c.name,
      }));
    }, [orderedCategories, categoryNameDraft, persistMode]);

    // Keep refs in sync
    useEffect(() => {
      orderedCategoriesRef.current = orderedCategories;
    }, [orderedCategories]);
    useEffect(() => {
      ticketOrderDraftRef.current = ticketOrderDraft;
    }, [ticketOrderDraft]);
    useEffect(() => {
      categoryNameDraftRef.current = categoryNameDraft;
    }, [categoryNameDraft]);
    useEffect(() => {
      categoriesRef.current = categories;
    }, [categories]);

    const { data: productsData } = useQuery({
      queryKey: queryKeys.events.products(eventId ?? ""),
      queryFn: async () => {
        if (!eventId) return { products: [] };
        return organizerService.getProducts(eventId);
      },
      enabled: authChecked && !!eventId,
      staleTime: 5 * 60 * 1000,
    });

    const productsMap = useMemo(() => {
      if (!productsData?.products) return {};
      const map: Record<
        string,
        { id: string; name: string; image: string | null; images: string[] }
      > = {};
      productsData.products.forEach((product: any) => {
        map[product.id] = {
          id: product.id,
          name: product.name,
          image: product.image || null,
          images: Array.isArray(product.images) ? product.images.filter(Boolean) : [],
        };
      });
      return map;
    }, [productsData]);

    const handleCreateGroup = useCallback(
      async (nameOverride?: string, descriptionOverride?: string) => {
        const nameToUse = nameOverride || newGroupName.trim();
        if (!nameToUse) {
          toast.error("Nome da categoria é obrigatório");
          return;
        }
        try {
          await createCategory(
            nameToUse,
            descriptionOverride?.trim() ? { description: descriptionOverride.trim() } : undefined,
          );
          setNewGroupName("");
          setEditingGroupName("");
          setShowCreateGroupSection(false);
          setEditingGroupId(null);
        } catch (e) {
          throw e;
        }
      },
      [newGroupName, createCategory],
    );

    const handleUpdateGroupName = useCallback(
      async (groupId: string, name: string) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        const cat = categories.find((c) => c.id === groupId);
        if (cat?.name === trimmed) {
          setEditingGroupId(null);
          setEditingGroupName("");
          return;
        }
        try {
          await updateCategory(groupId, { name: trimmed });
          setEditingGroupId(null);
          setEditingGroupName("");
        } catch {
          // handled in hook
        }
      },
      [categories, updateCategory],
    );

    const handleUpdateGroupDescription = useCallback(
      async (groupId: string, description: string) => {
        try {
          await updateCategory(groupId, { description });
        } catch {
          // handled in hook
        }
      },
      [updateCategory],
    );

    const categoryFormInitial = useMemo(() => {
      if (!categoryFormDrawerOpen) return { name: "", description: "" };
      if (categoryFormMode === "create") return { name: "", description: "" };
      const c = categories.find((x) => x.id === categoryFormCategoryId);
      const name =
        categoryFormCategoryId != null
          ? (categoryNameDraft[categoryFormCategoryId] ?? c?.name ?? "")
          : "";
      return { name, description: c?.description ?? "" };
    }, [
      categoryFormDrawerOpen,
      categoryFormMode,
      categoryFormCategoryId,
      categories,
      categoryNameDraft,
    ]);

    const handleCategoryFormDrawerSubmit = useCallback(
      async ({ name, description }: TicketCategoryFormPayload) => {
        if (categoryFormMode === "create") {
          await handleCreateGroup(name, description);
          return;
        }
        if (!categoryFormCategoryId) return;
        await updateCategory(categoryFormCategoryId, {
          name: name.trim(),
          description: description.trim(),
        });
        if (persistMode === "draft") {
          setCategoryNameDraft((prev) => {
            const { [categoryFormCategoryId]: _, ...rest } = prev;
            return rest;
          });
        }
      },
      [categoryFormMode, categoryFormCategoryId, handleCreateGroup, updateCategory, persistMode],
    );

    const handleDeleteGroup = useCallback(
      async (groupId: string) => {
        try {
          await deleteCategory(groupId);
          if (persistMode === "draft") {
            setCategoryNameDraft((prev) => {
              const { [groupId]: _, ...rest } = prev;
              return rest;
            });
          }
        } catch {
          // handled in hook
        }
      },
      [deleteCategory, persistMode],
    );

    const handleDuplicateTicket = useCallback(
      async (ticketId: string) => {
        if (!eventId) {
          toast.error("Evento não encontrado");
          return;
        }
        setDuplicatingTicketId(ticketId);
        try {
          // API retorna o ticket recém-criado — usamos para optimistic update
          // no cache do React Query, evitando o round-trip de um refetch e
          // garantindo que a UI reflita a duplicação instantaneamente.
          const rawTicket = await organizerService.duplicateTicket(eventId, ticketId);
          const newTicket = formatRawTicket(rawTicket);
          // Fallback de sortOrder: se o backend não retornar, posiciona no fim
          // (será reconciliado pelo invalidate em background).
          if (newTicket.sortOrder === undefined) {
            newTicket.sortOrder = Number.MAX_SAFE_INTEGER;
          }

          // Otimista: insere em AMBOS os caches (key antiga + bundle) pra UI
          // refletir instantaneamente em todos os consumidores.
          optimisticUpdateTickets(queryClient, eventId, (prev) => {
            // Idempotência: evita duplicata caso um refetch concorrente já tenha inserido.
            if (prev.some((t) => t.id === newTicket.id)) return prev;
            return [...prev, newTicket];
          });

          // Protege contra refetch que volte antes do backend propagar: o merge
          // no useTickets mantém o ticket visível até o backend confirmar (ou
          // TTL expirar).
          markTicketPending(newTicket);

          if (persistMode === "immediate") {
            // Lê do estado já atualizado (otimista) — o bundle e a key antiga
            // foram preenchidas acima por optimisticUpdateTickets, então qualquer
            // uma serve.
            committedAssignmentRef.current = buildCommittedAssignmentsMap(
              tickets,
              categories,
            );
          }

          // NÃO invalidamos a query nem disparamos "ticketCreated" aqui:
          // o payload do POST contém o ticket completo (mesmo shape do queryFn),
          // então o cache já está consistente. Forçar refetch imediato corre o
          // risco de ler do backend antes da escrita propagar (eventual consistency)
          // e sobrescrever o registro recém-inserido. A reconciliação acontece
          // naturalmente no `refetchOnWindowFocus` nativo + no pending-writes
          // registry do useTickets.
          toast.success("Ingresso duplicado com sucesso!");
        } catch (error: any) {
          toast.error(error.response?.data?.message || "Erro ao duplicar ingresso");
        } finally {
          setDuplicatingTicketId(null);
        }
      },
      [eventId, queryClient, categories, persistMode, markTicketPending],
    );

    const handleDropTicket = useCallback(
      async (ticketId: string, categoryId: string | null): Promise<void> => {
        if (!eventId) {
          toast.error("Evento não encontrado");
          return;
        }
        const ticket = tickets.find((t) => t.id === ticketId);
        if (!ticket) {
          toast.error("Ingresso não encontrado");
          return;
        }
        if (categoryIdForTicketScope(ticket, categories) === (categoryId ?? null)) return;

        const snapshot = tickets;
        const nextGroupId =
          categoryId === null || categoryId === "uncategorized" ? "uncategorized" : categoryId;

        // Otimista: atualiza ambos os caches (key antiga + bundle).
        optimisticUpdateTickets(queryClient, eventId, (prev) =>
          prev.map((t) => (t.id === ticketId ? { ...t, groupId: nextGroupId } : t)),
        );

        // Protege a mudança de categoria contra refetch precoce (eventual
        // consistency do backend): durante a janela de proteção, o pending
        // sobrescreve a versão do servidor caso a réplica esteja defasada.
        markTicketPending({ ...ticket, groupId: nextGroupId }, "update");

        try {
          await organizerService.updateTicket(eventId, ticketId, {
            categoryId:
              categoryId === null || categoryId === "uncategorized" ? null : categoryId,
          });
          if (persistMode === "immediate") {
            const updated: Ticket = { ...ticket, groupId: nextGroupId };
            committedAssignmentRef.current = {
              ...committedAssignmentRef.current,
              [ticketId]: committedCategoryKeyForTicket(updated, categories),
            };
          }
          toast.success(categoryId ? "Ingresso movido para a categoria." : "Ingresso movido para avulsos.");
        } catch (error: unknown) {
          // Rollback: restaura snapshot em ambos os caches.
          optimisticUpdateTickets(queryClient, eventId, () => snapshot);
          const msg =
            error &&
            typeof error === "object" &&
            "response" in error &&
            (error as { response?: { data?: { message?: string } } }).response?.data?.message;
          toast.error(typeof msg === "string" ? msg : "Não foi possível mover o ingresso.");
          throw error;
        }
      },
      [eventId, tickets, queryClient, categories, persistMode, markTicketPending],
    );

    const sensors = useSensors(
      useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
      useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );

    const [activeId, setActiveId] = useState<string | null>(null);
    const dragEndPositionRef = useRef<{ x: number; y: number } | null>(null);

    useEffect(() => {
      if (!activeId) return;
      const onMouseUp = (e: MouseEvent) => {
        dragEndPositionRef.current = { x: e.clientX, y: e.clientY };
      };
      const onPointerUp = (e: PointerEvent) => {
        dragEndPositionRef.current = { x: e.clientX, y: e.clientY };
      };
      document.addEventListener("mouseup", onMouseUp, { capture: true });
      document.addEventListener("pointerup", onPointerUp, { capture: true });
      return () => {
        document.removeEventListener("mouseup", onMouseUp, { capture: true });
        document.removeEventListener("pointerup", onPointerUp, { capture: true });
      };
    }, [activeId]);

    const handleDragStart = useCallback((event: DragStartEvent) => {
      setActiveId(event.active.id as string);
      dragEndPositionRef.current = null;
    }, []);

    const handleDragEnd = useCallback(
      (event: DragEndEvent) => {
        const { active, over } = event;
        const activeIdValue = active.id as string;

        const sortDragId = parseCategorySortableId(activeIdValue);
        if (sortDragId) {
          setActiveId(null);
          dragEndPositionRef.current = null;
          if (!over) return;
          const overCatId = resolveCategoryReorderOverId(over, categories);
          if (!overCatId || sortDragId === overCatId) return;
          setCategoryOrderIds((prev) => {
            const oldIndex = prev.indexOf(sortDragId);
            const newIndex = prev.indexOf(overCatId);
            if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return prev;
            const next = arrayMove(prev, oldIndex, newIndex);
            if (persistMode === "immediate" && eventId) {
              const m = new Map(categories.map((c) => [c.id, c]));
              const ordered = next.map((id) => m.get(id)).filter(Boolean) as ModalityGroup[];
              const invalidateBundle = () =>
                queryClient.invalidateQueries({
                  queryKey: queryKeys.events.ticketsManagement(eventId),
                });
              void persistTicketCategoryOrderApi(eventId, ordered)
                .then(() => {
                  toast.success("Ordem das categorias atualizada.");
                  return invalidateBundle();
                })
                .catch((e) => {
                  console.error(e);
                  toast.error("Não foi possível salvar a ordem das categorias.");
                  void invalidateBundle();
                });
            } else {
              queueMicrotask(() => toast.success("Ordem das categorias atualizada."));
            }
            return next;
          });
          return;
        }

        if (!activeIdValue.startsWith("ticket-")) {
          setActiveId(null);
          dragEndPositionRef.current = null;
          return;
        }

        if (!eventId) {
          setActiveId(null);
          dragEndPositionRef.current = null;
          return;
        }

        const dragEndPosition = dragEndPositionRef.current;
        void (async () => {
          try {
            const { orderPatch, ticketCategoryChanged } = await applyOrganizerTicketDragEnd({
              event,
              tickets,
              categories,
              eventId,
              queryClient,
              handleDropTicket,
              dragEndPosition,
              categoryElementsCacheRef,
              setTicketOrderDraft,
              ticketOrderDraft,
            });

            if (Object.keys(orderPatch).length > 0 && persistMode === "immediate") {
              // O bundle é a fonte da verdade — leitura direta do cache pra
              // pegar o estado mais recente (já reflete optimistic updates).
              const bundle = queryClient.getQueryData<{
                tickets: Ticket[];
                categories: ModalityGroup[];
              }>(queryKeys.events.ticketsManagement(eventId));
              const ticketList = bundle?.tickets ?? tickets;
              const cats = bundle?.categories ?? categories;

              // Optimistic update do `sortOrder` no bundle ANTES de limpar o draft.
              // Sem isso, entre `setTicketOrderDraft({})` e o `refetchQueries`
              // completar, a UI re-renderiza usando o sortOrder velho do cache —
              // se a réplica do backend vier defasada, o usuário vê a ordem
              // antiga até dar refresh manual.
              optimisticUpdateTickets(queryClient, eventId, (prev) => {
                if (prev.length === 0) return prev;
                const newOrderByTicketId = new Map<string, number>();
                for (const [scopeKey, ids] of Object.entries(orderPatch)) {
                  ids.forEach((id, idx) => newOrderByTicketId.set(id, idx));
                  // scopeKey usado apenas pra clareza no diff — sortOrder é por escopo.
                  void scopeKey;
                }
                return prev.map((t) => {
                  const nextOrder = newOrderByTicketId.get(t.id);
                  if (nextOrder == null) return t;
                  return { ...t, sortOrder: nextOrder };
                });
              });

              await persistTicketOrderDrafts(eventId, ticketList, cats, orderPatch);
              setTicketOrderDraft({});
              await queryClient.refetchQueries({
                queryKey: queryKeys.events.ticketsManagement(eventId),
              });
              const refreshed = queryClient.getQueryData<{
                tickets: Ticket[];
                categories: ModalityGroup[];
              }>(queryKeys.events.ticketsManagement(eventId));
              const freshTickets = refreshed?.tickets ?? [];
              const freshCats = refreshed?.categories ?? cats;
              committedAssignmentRef.current = buildCommittedAssignmentsMap(
                freshTickets,
                freshCats,
              );
            }
            if (Object.keys(orderPatch).length > 0 && !ticketCategoryChanged) {
              toast.success("Ordem dos ingressos atualizada.");
            }
          } catch (e) {
            if (persistMode === "immediate") {
              console.error(e);
              toast.error("Não foi possível salvar a ordem dos ingressos.");
            }
          } finally {
            setActiveId(null);
            dragEndPositionRef.current = null;
          }
        })();
      },
      [tickets, handleDropTicket, categories, eventId, queryClient, ticketOrderDraft, persistMode],
    );

    const handleDragCancel = useCallback(() => {
      setActiveId(null);
    }, []);

    const ticketsByCategory = useMemo(() => {
      const map: Record<string, Ticket[]> = {};
      tickets.forEach((ticket) => {
        const categoryId = ticket.groupId || "uncategorized";
        if (!map[categoryId]) map[categoryId] = [];
        map[categoryId].push(ticket);
      });
      for (const k of Object.keys(map)) {
        map[k].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
      }
      return map;
    }, [tickets]);

    const uncategorizedTickets = useMemo(() => {
      return tickets
        .filter(
          (t) =>
            !t.groupId ||
            t.groupId === "uncategorized" ||
            !categories.find((c) => c.id === t.groupId),
        )
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    }, [tickets, categories]);

    const hasNoCategories = !Array.isArray(categories) || categories.length === 0;

    const allTickets = useMemo(
      () => (hasNoCategories ? tickets : uncategorizedTickets),
      [hasNoCategories, tickets, uncategorizedTickets],
    );

    const ticketsByCategoryDisplay = useMemo(() => {
      const out: Record<string, Ticket[]> = {};
      for (const k of Object.keys(ticketsByCategory)) {
        out[k] = applyDraftOrderToTickets(ticketsByCategory[k], k, ticketOrderDraft);
      }
      return out;
    }, [ticketsByCategory, ticketOrderDraft]);

    const uncategorizedTicketsDisplay = useMemo(
      () => applyDraftOrderToTickets(uncategorizedTickets, "uncategorized", ticketOrderDraft),
      [uncategorizedTickets, ticketOrderDraft],
    );

    const allTicketsDisplay = useMemo(
      () =>
        hasNoCategories
          ? applyDraftOrderToTickets(tickets, "uncategorized", ticketOrderDraft)
          : uncategorizedTicketsDisplay,
      [hasNoCategories, tickets, uncategorizedTicketsDisplay, ticketOrderDraft],
    );

    const ticketMoveCategoryOptions = useMemo((): TicketMoveCategoryOption[] => {
      const rows: TicketMoveCategoryOption[] = orderedCategories.map((c) => ({
        id: c.id,
        name: categoryNameDraft[c.id] ?? c.name,
        ticketCount: (ticketsByCategory[c.id] || []).length,
      }));
      rows.push({
        id: "uncategorized-bucket",
        name: "Sem categoria",
        ticketCount: uncategorizedTickets.length,
        isUncategorizedBucket: true,
      });
      return rows;
    }, [orderedCategories, categoryNameDraft, ticketsByCategory, uncategorizedTickets]);

    // KitImagePositionDrawer data — only computed when the drawer prop is provided
    const kitImagePositionDrawerData = useMemo(() => {
      if (!kitImagePositionDrawer) return null;
      const ticketToRow = (t: Ticket) => ({
        id: t.id,
        name: t.name,
        images: (t.products || []).map((productId: string) => {
          const p = productsMap[productId];
          return { productId, url: p?.image ?? null, images: p?.images ?? [], name: p?.name ?? null };
        }),
      });
      if (hasNoCategories) {
        return {
          sections: [] as KitImagePositionCategorySection[],
          uncategorized: {
            id: "uncategorized",
            name: "",
            tickets: uncategorizedTicketsDisplay.map(ticketToRow),
          },
        };
      }
      return {
        sections: orderedCategories.map((cat) => ({
          id: cat.id,
          name: cat.name,
          tickets: (ticketsByCategoryDisplay[cat.id] || []).map(ticketToRow),
        })),
        uncategorized:
          uncategorizedTicketsDisplay.length > 0
            ? { id: "uncategorized", name: "", tickets: uncategorizedTicketsDisplay.map(ticketToRow) }
            : null,
      };
    }, [
      kitImagePositionDrawer,
      hasNoCategories,
      orderedCategories,
      ticketsByCategoryDisplay,
      uncategorizedTicketsDisplay,
      productsMap,
    ]);

    useImperativeHandle(
      ref,
      () => ({
        async flushAndPersistAll() {
          if (!eventId) throw new Error("Evento não encontrado");
          const ordered = orderedCategoriesRef.current;
          if (ordered.length > 0) {
            if (Object.keys(categoryNameDraftRef.current).length > 0) {
              await Promise.all(
                Object.entries(categoryNameDraftRef.current).map(([id, name]) =>
                  updateCategory(id, { name }),
                ),
              );
              setCategoryNameDraft({});
            }
            await persistTicketCategoryOrderApi(eventId, ordered);
          }
          const bundle = queryClient.getQueryData<{ tickets: Ticket[] }>(
            queryKeys.events.ticketsManagement(eventId),
          );
          const ticketList = bundle?.tickets ?? tickets;
          await persistTicketOrderDrafts(
            eventId,
            ticketList,
            categoriesRef.current,
            ticketOrderDraftRef.current,
          );
          setTicketOrderDraft({});
          // Bundle único cobre tickets + categories.
          await queryClient.invalidateQueries({
            queryKey: queryKeys.events.ticketsManagement(eventId),
          });
        },
        reset() {
          setTicketOrderDraft({});
          const ids = [...categoriesRef.current]
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
            .map((c) => c.id);
          setCategoryOrderIds(ids);
        },
      }),
      [eventId, updateCategory, queryClient, tickets],
    );

    if (!authChecked || loading) {
      return <Loading />;
    }

    return (
      <>
        <DndContext
          sensors={sensors}
          collisionDetection={organizerTicketCategoriesCollisionDetection}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <div className={innerClassName ?? "flex w-full flex-col gap-5 md:gap-9"}>
            {/* Mobile header */}
            <div className="-mx-4 flex h-[52px] items-center border-b border-gray-6 bg-gray-2 px-4 md:hidden">
              <button
                type="button"
                onClick={onBack}
                className="flex size-8 cursor-pointer items-center justify-center rounded-full border border-gray-6 transition-colors rotate-180 hover:bg-gray-3"
                aria-label="Voltar"
              >
                <ArrowButton isOpen={false} />
              </button>
              <h1 className="ml-2 font-manrope text-base font-extrabold leading-[1.1] text-gray-12">
                Ingressos
              </h1>
            </div>

            {/* Desktop title + description */}
            <div className="flex flex-col gap-5 md:gap-4">
              <div className="hidden items-center gap-3 md:flex">
                <button
                  type="button"
                  onClick={onBack}
                  className="flex size-9 cursor-pointer items-center justify-center rounded-[52px] border border-gray-6 transition-colors rotate-180 hover:bg-gray-3"
                  aria-label="Voltar"
                >
                  <ArrowButton isOpen={false} />
                </button>
                <h1 className="font-manrope text-[28px] font-bold leading-[1.1] text-gray-12">
                  Ingressos
                </h1>
              </div>
              <p className="font-family-dm-sans text-base font-normal leading-[1.3] text-gray-11">
                Crie categorias e ingressos com lotes, valores e regras. Depois, vincule um kit para o
                participante configurar durante a inscrição
              </p>
            </div>

            {/* Mobile: create buttons */}
            <div className="flex gap-2 md:hidden">
              <Button
                type="button"
                onClick={() => {
                  setCategoryFormMode("create");
                  setCategoryFormCategoryId(null);
                  setCategoryFormDrawerOpen(true);
                }}
                variant="outline"
                className="h-11 min-h-0 flex-1 gap-1 rounded-lg border-gray-6 px-5 font-family-dm-sans text-sm font-bold text-gray-12"
              >
                <Plus className="size-5 shrink-0" />
                Criar categoria
              </Button>
              <Button
                type="button"
                onClick={onCreateTicket}
                variant="default"
                className="h-11 min-h-0 flex-1 gap-1 rounded-lg px-5 font-family-dm-sans text-sm font-bold"
              >
                <Plus className="size-5 shrink-0" />
                Criar ingresso
              </Button>
            </div>

            {/* Desktop: create buttons + "Ingressos avulsos" heading */}
            <div className="hidden items-end justify-between gap-4 md:flex md:flex-wrap">
              <h2 className="font-manrope text-xl font-bold leading-[1.1] text-gray-12">
                Ingressos avulsos
              </h2>
              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={() => {
                    setShowCreateGroupSection(true);
                    setEditingGroupId("new");
                    setNewGroupName("");
                  }}
                  variant="outline"
                  className="border-gray-6 font-manrope text-base font-bold text-gray-12"
                >
                  <Plus className="size-5" />
                  Criar categoria
                </Button>
                <Button
                  type="button"
                  onClick={onCreateTicket}
                  variant="default"
                  className="font-manrope text-base font-bold leading-[1.1]"
                >
                  <Plus className="size-5" />
                  Criar ingresso
                </Button>
              </div>
            </div>

            {/* Uncategorized tickets */}
            {(hasNoCategories ? allTickets.length > 0 : true) && (
              <UncategorizedTicketsDropShell>
                <MobileGeneralTicketsSection ticketCount={allTickets.length}>
                  <div className="overflow-x-auto">
                    <TicketTable
                      tickets={allTicketsDisplay}
                      currentPage={1}
                      totalPages={1}
                      onPageChange={() => {}}
                      onEdit={onEditTicket}
                      onDuplicate={handleDuplicateTicket}
                      duplicatingTicketId={duplicatingTicketId}
                      productsMap={productsMap}
                      ticketScopeCategoryId={null}
                      moveCategoryOptions={ticketMoveCategoryOptions}
                      onMoveTicketToCategory={handleDropTicket}
                    />
                  </div>
                </MobileGeneralTicketsSection>
              </UncategorizedTicketsDropShell>
            )}

            {/* Create category section — desktop only */}
            {showCreateGroupSection && (
              <div className="hidden gap-6 rounded-xl border border-gray-6 bg-gray-3 p-5 md:flex md:flex-col">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  {editingGroupId === "new" || !editingGroupId ? (
                    <input
                      type="text"
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      onBlur={(e) => {
                        const next =
                          e.relatedTarget instanceof HTMLElement
                            ? e.relatedTarget.closest("[data-category-draft-toolbar]")
                            : null;
                        if (next) return;
                        const value = newGroupName.trim();
                        if (value) void handleCreateGroup(value);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          const value = (e.target as HTMLInputElement).value.trim();
                          if (value) void handleCreateGroup(value);
                          else toast.error("Nome da categoria é obrigatório");
                        } else if (e.key === "Escape") {
                          setShowCreateGroupSection(false);
                          setEditingGroupId(null);
                          setNewGroupName("");
                          setEditingGroupName("");
                        }
                      }}
                      className="text-gray-12 text-2xl font-bold font-manrope bg-transparent focus:outline-none flex-1"
                      placeholder="Adicione um nome a esta categoria..."
                      autoFocus
                    />
                  ) : (
                    <h3 className="text-gray-12 text-2xl font-bold font-manrope">
                      Adicione um nome a esta categoria...
                    </h3>
                  )}
                  <div className="flex gap-[10px] items-center" data-category-draft-toolbar>
                    <button
                      type="button"
                      title="Editar"
                      onClick={() => {
                        setEditingGroupId("new");
                        setNewGroupName("");
                      }}
                      className="bg-gray-2 border-[1.5px] border-gray-6 p-1 rounded-lg hover:bg-gray-3 transition-colors size-9 flex items-center justify-center cursor-pointer"
                    >
                      <PencilIcon className="size-5 text-gray-11" />
                    </button>
                    <button
                      type="button"
                      title="Deletar"
                      onClick={() => {
                        setShowCreateGroupSection(false);
                        setEditingGroupId(null);
                        setNewGroupName("");
                      }}
                      className="bg-red-2 border-[1.5px] border-red-6 p-1 rounded-lg hover:bg-red-3 transition-colors size-9 flex items-center justify-center cursor-pointer"
                    >
                      <TrashIcon className="size-5 text-red-12" />
                    </button>
                  </div>
                </div>
                <div className="border border-gray-6 rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-2 border-b border-gray-6">
                        <tr>
                          <th className="text-left py-4 px-5 text-gray-12 text-sm font-semibold font-family-dm-sans">
                            Nome do ingresso
                          </th>
                          <th className="text-left py-4 px-5 text-gray-12 text-sm font-semibold font-family-dm-sans">
                            Preço
                          </th>
                          <th className="text-left py-4 px-5 text-gray-12 text-sm font-semibold font-family-dm-sans">
                            Modalidade/Distância
                          </th>
                          <th className="text-left py-4 px-5 text-gray-12 text-sm font-semibold font-family-dm-sans">
                            Produtos relacionados
                          </th>
                          <th className="text-left py-4 px-5 text-gray-12 text-sm font-semibold font-family-dm-sans">
                            Ações
                          </th>
                        </tr>
                      </thead>
                      <tbody />
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Empty state */}
            {hasNoCategories && allTickets.length === 0 && (
              <div className="flex flex-col gap-11 items-end">
                <div className="border border-gray-6 rounded-xl p-5 w-full flex flex-col gap-6">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    {editingGroupId === "new" ? (
                      <input
                        type="text"
                        value={editingGroupName}
                        onChange={(e) => setEditingGroupName(e.target.value)}
                        onBlur={(e) => {
                          const next =
                            e.relatedTarget instanceof HTMLElement
                              ? e.relatedTarget.closest("[data-category-draft-toolbar]")
                              : null;
                          if (next) return;
                          const value = editingGroupName.trim();
                          if (value) void handleCreateGroup(value);
                          else {
                            setEditingGroupId(null);
                            setEditingGroupName("");
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            if (editingGroupName.trim())
                              void handleCreateGroup(editingGroupName.trim());
                          } else if (e.key === "Escape") {
                            setEditingGroupId(null);
                            setEditingGroupName("");
                          }
                        }}
                        className="text-gray-12 text-2xl font-bold font-manrope leading-[1.1] bg-transparent border-b border-gray-6 focus:outline-none focus:border-primary-8 flex-1"
                        placeholder="Adicione um nome a esta categoria..."
                        autoFocus
                      />
                    ) : (
                      <h3 className="text-gray-12 text-2xl font-bold font-manrope leading-[1.1]">
                        Adicione um nome a esta categoria...
                      </h3>
                    )}
                    <div className="flex gap-[10px] items-center" data-category-draft-toolbar>
                      <button
                        type="button"
                        title="Editar"
                        onClick={() => {
                          setEditingGroupId("new");
                          setEditingGroupName("");
                        }}
                        className="bg-gray-2 border-[1.5px] border-gray-6 p-1 rounded-lg hover:bg-gray-3 transition-colors size-9 flex items-center justify-center"
                      >
                        <PencilIcon className="size-5 text-gray-11" />
                      </button>
                      <button
                        type="button"
                        disabled
                        title="Deletar categoria"
                        className="bg-red-2 border-[1.5px] border-red-6 p-1 rounded-lg hover:bg-red-3 transition-colors size-9 flex items-center justify-center opacity-50 cursor-not-allowed"
                      >
                        <PencilIcon className="size-5 text-red-12" />
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-col gap-8 items-center justify-center py-11 px-0">
                    <div className="relative h-[64px] w-[111px]">
                      <Image
                        src="/icons-3d/Icon3D-Busca-sem-resultado.webp"
                        alt="Empty"
                        fill
                        className="object-contain"
                      />
                    </div>
                    <p className="text-gray-12 text-xl font-semibold font-manrope leading-[1.1]">
                      Nenhum ingresso criado ainda....
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Categories list */}
            {!hasNoCategories && (
              <>
                <p className="font-manrope text-base font-extrabold leading-[1.1] text-gray-12 md:hidden">
                  Categorias
                </p>
                <SortableContext
                  items={orderedCategories.map((c) => categorySortableId(c.id))}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="flex flex-col gap-4 md:gap-6">
                    {orderedCategoriesDisplay.map((category) => {
                      const categoryTickets = ticketsByCategoryDisplay[category.id] || [];
                      return (
                        <SortableTicketCategoryItem
                          key={category.id}
                          categoryId={category.id}
                          category={category}
                          totalTicketsInCategory={categoryTickets.length}
                          onEdit={handleUpdateGroupName}
                          onEditDescription={handleUpdateGroupDescription}
                          onDelete={handleDeleteGroup}
                          onMobileEditCategory={(id) => {
                            setCategoryFormMode("edit");
                            setCategoryFormCategoryId(id);
                            setCategoryFormDrawerOpen(true);
                          }}
                        >
                          <TicketCategoryCard
                            category={category}
                            className="rounded-none border-0 shadow-none"
                            hideCategoryTitleRow
                            tickets={categoryTickets}
                            totalTicketsInCategory={categoryTickets.length}
                            currentPage={1}
                            totalPages={1}
                            onEdit={handleUpdateGroupName}
                            onEditDescription={handleUpdateGroupDescription}
                            onDelete={handleDeleteGroup}
                            onEditTicket={onEditTicket}
                            onPageChange={() => {}}
                            onDuplicateTicket={handleDuplicateTicket}
                            duplicatingTicketId={duplicatingTicketId}
                            productsMap={productsMap}
                            onDropTicket={handleDropTicket}
                            moveCategoryOptions={ticketMoveCategoryOptions}
                            onMoveTicketToCategory={handleDropTicket}
                          />
                        </SortableTicketCategoryItem>
                      );
                    })}
                  </div>
                </SortableContext>
              </>
            )}

            {extraContent}

            {actionSlot(tickets.length)}
          </div>

          <DragOverlay>
            {activeId && activeId.startsWith("ticket-") ? (
              <div className="bg-gray-1 border border-gray-6 rounded-lg p-4 opacity-90 shadow-lg">
                <p className="text-sm font-semibold text-gray-12">
                  {tickets.find((t) => `ticket-${t.id}` === activeId)?.name || "Ingresso"}
                </p>
              </div>
            ) : activeId && parseCategorySortableId(activeId) ? (
              <div className="max-w-md rounded-xl border border-gray-6 bg-gray-1 p-4 opacity-95 shadow-2xl">
                <p className="text-sm font-semibold text-gray-12">
                  {orderedCategoriesDisplay.find((c) => categorySortableId(c.id) === activeId)
                    ?.name || "Categoria"}
                </p>
                <p className="mt-1 text-xs text-gray-11">Alterar ordem</p>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>

        <TicketCategoryFormDrawer
          open={categoryFormDrawerOpen}
          onOpenChange={setCategoryFormDrawerOpen}
          mode={categoryFormMode}
          initialName={categoryFormInitial.name}
          initialDescription={categoryFormInitial.description}
          onSubmit={handleCategoryFormDrawerSubmit}
        />

        {kitImagePositionDrawer && kitImagePositionDrawerData && (
          <KitImagePositionDrawer
            isOpen={kitImagePositionDrawer.open}
            onClose={kitImagePositionDrawer.onClose}
            sections={kitImagePositionDrawerData.sections}
            uncategorized={kitImagePositionDrawerData.uncategorized}
            initialKitSelection={kitImagePositionDrawer.initialKitSelection}
            onSave={kitImagePositionDrawer.onSave}
            saveSuccessMessage={kitImagePositionDrawer.saveSuccessMessage}
          />
        )}
      </>
    );
  },
);
