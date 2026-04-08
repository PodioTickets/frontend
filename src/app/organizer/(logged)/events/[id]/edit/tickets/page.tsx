"use client";

import {
  useState,
  useEffect,
  useLayoutEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { useRouter, useParams } from "next/navigation";
import { useOrganizerNavigate } from "@/hooks/useOrganizerNavigate";
import { useTicketCategories } from "@/hooks/useTicketCategories";
import { useTickets, type Ticket } from "@/hooks/useTickets";
import { userService, organizerService } from "@/services";
import type { ModalityGroup } from "@/services/organizer/OrganizerService";
import { useEditEvent } from "@/contexts/EditEventContext";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/services/cache/QueryClient";
import { Button } from "@/components/Button";
import { Loading } from "@/components/Loading";
import { ArrowButton } from "@/components/ArrowButton";
import { UnsavedChangesModal } from "@/components/UnsavedChangesModal";
import { useUnsavedLeaveGuard } from "@/hooks/useUnsavedLeaveGuard";
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
import { TicketAdvancedKitDisplayOptions } from "@/components/Ticket/TicketAdvancedKitDisplayOptions";
import {
  KitImagePositionDrawer,
  type KitImageLayoutMode,
  type KitImagePositionCategorySection,
} from "@/components/Ticket/KitImagePositionDrawer";
import {
  defaultEventKitSelectionDisplay,
  drawerModeToApiLayout,
  layoutToDrawerMode,
  parseEventKitSelectionDisplay,
  type EventKitSelectionDisplay,
} from "@/lib/eventKitSelectionDisplay";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
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

function committedCategoryKeyForTicket(
  t: Ticket,
  categories: ModalityGroup[],
): string {
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

export default function EditTicketsPage() {
  const router = useRouter();
  const orgNav = useOrganizerNavigate();
  const params = useParams();
  const eventId = params.id as string;
  const { event, reloadEvent } = useEditEvent();
  const queryClient = useQueryClient();
  const [authChecked, setAuthChecked] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingGroupName, setEditingGroupName] = useState("");
  const [showCreateGroupSection, setShowCreateGroupSection] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [viewMode, setViewMode] = useState<Record<string, "table" | "cards">>({});
  const [duplicatingTicketId, setDuplicatingTicketId] = useState<string | null>(
    null,
  );
  const [kitImagePositionDrawerOpen, setKitImagePositionDrawerOpen] =
    useState(false);
  const [categoryOrderIds, setCategoryOrderIds] = useState<string[]>([]);
  const [savingNavigate, setSavingNavigate] = useState(false);
  /** Ordem local após drag; em edição o patch é persistido na API logo após o drop. */
  const [ticketOrderDraft, setTicketOrderDraft] = useState<Record<string, string[]>>(
    {},
  );
  const [categoryFormDrawerOpen, setCategoryFormDrawerOpen] = useState(false);
  const [categoryFormMode, setCategoryFormMode] = useState<"create" | "edit">("create");
  const [categoryFormCategoryId, setCategoryFormCategoryId] = useState<string | null>(
    null,
  );

  const committedAssignmentRef = useRef<Record<string, string>>({});
  const [committedAssignmentsVersion, setCommittedAssignmentsVersion] = useState(0);
  /** true enquanto a query de tickets está carregando; ao voltar a false, alinha baseline uma vez. */
  const prevTicketsLoadingRef = useRef(true);

  // Hooks para gerenciar dados
  const {
    categories,
    loading: categoriesLoading,
    createCategory,
    updateCategory,
    deleteCategory,
  } = useTicketCategories(eventId, authChecked);

  const {
    tickets,
    loading: ticketsLoading,
    loadTickets,
    deleteTicket,
  } = useTickets(eventId, authChecked);

  const loading = categoriesLoading || ticketsLoading;

  // Verificar autenticação
  useEffect(() => {
    const hasToken = userService.isAuthenticated();
    if (!hasToken) {
      orgNav.push("/organizer/login");
      return;
    }
    const timer = setTimeout(() => {
      setAuthChecked(true);
    }, 300);
    return () => clearTimeout(timer);
  }, [router]);

  // Inicializar viewMode quando categorias mudarem
  useEffect(() => {
    if (Array.isArray(categories) && categories.length > 0) {
      setViewMode((prev) => {
        const initialViewMode: Record<string, "table" | "cards"> = {};
        categories.forEach((category) => {
          if (!prev[category.id]) {
            initialViewMode[category.id] = "table";
          }
        });
        if (Object.keys(initialViewMode).length > 0) {
          return { ...prev, ...initialViewMode };
        }
        return prev;
      });
      categoryElementsCacheRef.current.clear();
    }
  }, [categories]);

  useEffect(() => {
    const ids = [...categories]
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map((c) => c.id);
    setCategoryOrderIds((prev) => {
      if (ids.length === 0) return prev.length === 0 ? prev : [];
      if (prev.length === 0) return ids;
      const prevSet = new Set(prev);
      const idsSet = new Set(ids);
      const sameLength = prev.length === ids.length;
      const sameMembers =
        sameLength &&
        ids.every((id) => prevSet.has(id)) &&
        prev.every((id) => idsSet.has(id));
      if (!sameMembers) return ids;
      return prev;
    });
  }, [categories]);

  const orderedCategories = useMemo(() => {
    if (!categoryOrderIds.length || categoryOrderIds.length !== categories.length) {
      return [...categories].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    }
    const m = new Map(categories.map((c) => [c.id, c]));
    return categoryOrderIds
      .map((id) => m.get(id))
      .filter(Boolean) as ModalityGroup[];
  }, [categories, categoryOrderIds]);

  // Buscar produtos
  const { data: productsData } = useQuery({
    queryKey: queryKeys.events.products(eventId || ""),
    queryFn: async () => {
      if (!eventId) return { products: [] };
      return organizerService.getProducts(eventId);
    },
    enabled: authChecked && !!eventId,
    staleTime: 5 * 60 * 1000,
  });

  const productsMap = useMemo(() => {
    if (!productsData?.products) return {};
    const map: Record<string, { id: string; name: string; image: string | null }> = {};
    productsData.products.forEach((product: any) => {
      map[product.id] = {
        id: product.id,
        name: product.name,
        image: product.image || null,
      };
    });
    return map;
  }, [productsData]);

  // Listener para quando um ticket é criado
  useEffect(() => {
    if (!eventId) return;

    const handleTicketCreated = () => {
      const qk = queryKeys.events.tickets(eventId);
      void queryClient.invalidateQueries({ queryKey: qk });
      void queryClient.refetchQueries({ queryKey: qk });
    };

    window.addEventListener("ticketCreated", handleTicketCreated);
    window.addEventListener("focus", handleTicketCreated);

    return () => {
      window.removeEventListener("ticketCreated", handleTicketCreated);
      window.removeEventListener("focus", handleTicketCreated);
    };
  }, [eventId, queryClient]);

  useEffect(() => {
    prevTicketsLoadingRef.current = true;
  }, [eventId]);

  useLayoutEffect(() => {
    if (!authChecked || !eventId) return;
    if (ticketsLoading) {
      prevTicketsLoadingRef.current = true;
      return;
    }
    if (prevTicketsLoadingRef.current) {
      prevTicketsLoadingRef.current = false;
      committedAssignmentRef.current = buildCommittedAssignmentsMap(tickets, categories);
      setCommittedAssignmentsVersion((v) => v + 1);
    }
  }, [authChecked, ticketsLoading, eventId, tickets, categories]);

  // Handlers
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
          descriptionOverride?.trim()
            ? { description: descriptionOverride.trim() }
            : undefined,
        );
        setNewGroupName("");
        setEditingGroupName("");
        setShowCreateGroupSection(false);
        setEditingGroupId(null);
      } catch (e) {
        throw e;
      }
    },
    [newGroupName, createCategory]
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
        // Erro tratado no hook
      }
    },
    [categories, updateCategory],
  );

  const handleUpdateGroupDescription = useCallback(
    async (groupId: string, description: string) => {
      try {
        await updateCategory(groupId, { description });
      } catch (error) {
        // Error já foi tratado no hook
      }
    },
    [updateCategory]
  );

  const categoryFormInitial = useMemo(() => {
    if (!categoryFormDrawerOpen) return { name: "", description: "" };
    if (categoryFormMode === "create") return { name: "", description: "" };
    const c = categories.find((x) => x.id === categoryFormCategoryId);
    return {
      name: c?.name ?? "",
      description: c?.description ?? "",
    };
  }, [
    categoryFormDrawerOpen,
    categoryFormMode,
    categoryFormCategoryId,
    categories,
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
    },
    [categoryFormMode, categoryFormCategoryId, handleCreateGroup, updateCategory],
  );

  const handleDeleteGroup = useCallback(
    async (groupId: string) => {
      try {
        await deleteCategory(groupId);
      } catch (error) {
        // Error já foi tratado no hook
      }
    },
    [deleteCategory],
  );

  const handleDuplicateTicket = useCallback(
    async (ticketId: string) => {
      if (!eventId) {
        toast.error("Evento não encontrado");
        return;
      }

      setDuplicatingTicketId(ticketId);
      try {
        await organizerService.duplicateTicket(eventId, ticketId);

        await queryClient.invalidateQueries({
          queryKey: queryKeys.events.tickets(eventId),
        });

        await queryClient.refetchQueries({
          queryKey: queryKeys.events.tickets(eventId),
        });

        window.dispatchEvent(new CustomEvent("ticketCreated"));

        const dupTickets =
          queryClient.getQueryData<Ticket[]>(queryKeys.events.tickets(eventId)) ?? [];
        const dupCats =
          queryClient.getQueryData<ModalityGroup[]>(
            queryKeys.events.ticketCategories(eventId),
          ) ?? categories;
        committedAssignmentRef.current = buildCommittedAssignmentsMap(
          dupTickets,
          dupCats,
        );
        setCommittedAssignmentsVersion((v) => v + 1);

        toast.success("Ingresso duplicado com sucesso!");
      } catch (error: any) {
        console.error("Error duplicating ticket:", error);
        toast.error(error.response?.data?.message || "Erro ao duplicar ingresso");
      } finally {
        setDuplicatingTicketId(null);
      }
    },
    [eventId, queryClient, categories],
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

      if (categoryIdForTicketScope(ticket, categories) === (categoryId ?? null)) {
        return;
      }

      const qk = queryKeys.events.tickets(eventId);
      const snapshot = queryClient.getQueryData<Ticket[]>(qk);
      const nextGroupId =
        categoryId === null || categoryId === "uncategorized"
          ? "uncategorized"
          : categoryId;

      queryClient.setQueryData<Ticket[]>(qk, (prev) => {
        if (!prev) return prev;
        return prev.map((t) =>
          t.id === ticketId ? { ...t, groupId: nextGroupId } : t,
        );
      });

      try {
        await organizerService.updateTicket(eventId, ticketId, {
          categoryId:
            categoryId === null || categoryId === "uncategorized"
              ? null
              : categoryId,
        });
        const list = queryClient.getQueryData<Ticket[]>(qk) ?? [];
        const updated = list.find((x) => x.id === ticketId) ?? {
          ...ticket,
          groupId: nextGroupId,
        };
        committedAssignmentRef.current = {
          ...committedAssignmentRef.current,
          [ticketId]: committedCategoryKeyForTicket(updated, categories),
        };
        setCommittedAssignmentsVersion((v) => v + 1);
        toast.success(
          categoryId
            ? "Ingresso movido para a categoria."
            : "Ingresso movido para avulsos.",
        );
      } catch (error: unknown) {
        queryClient.setQueryData(qk, snapshot);
        const msg =
          error &&
          typeof error === "object" &&
          "response" in error &&
          (error as { response?: { data?: { message?: string } } }).response?.data
            ?.message;
        toast.error(
          typeof msg === "string" ? msg : "Não foi possível mover o ingresso.",
        );
        throw error;
      }
    },
    [eventId, tickets, queryClient, categories],
  );

  // DnD Kit sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const [activeId, setActiveId] = useState<string | null>(null);
  const dragEndPositionRef = useRef<{ x: number; y: number } | null>(null);
  const categoryElementsCacheRef = useRef<Map<string, DOMRect>>(new Map());

  useEffect(() => {
    if (!activeId) return;

    const handleMouseUp = (e: MouseEvent) => {
      dragEndPositionRef.current = { x: e.clientX, y: e.clientY };
    };

    const handlePointerUp = (e: PointerEvent) => {
      dragEndPositionRef.current = { x: e.clientX, y: e.clientY };
    };

    document.addEventListener("mouseup", handleMouseUp, { capture: true });
    document.addEventListener("pointerup", handlePointerUp, { capture: true });
    return () => {
      document.removeEventListener("mouseup", handleMouseUp, { capture: true });
      document.removeEventListener("pointerup", handlePointerUp, { capture: true });
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
          if (oldIndex < 0 || newIndex < 0) return prev;
          const next = arrayMove(prev, oldIndex, newIndex);
          const m = new Map(categories.map((c) => [c.id, c]));
          const ordered = next
            .map((id) => m.get(id))
            .filter(Boolean) as ModalityGroup[];
          void persistTicketCategoryOrderApi(eventId, ordered)
            .then(() => {
              toast.success("Ordem das categorias atualizada.");
              return queryClient.invalidateQueries({
                queryKey: queryKeys.events.ticketCategories(eventId),
              });
            })
            .catch((e) => {
              console.error(e);
              toast.error("Não foi possível salvar a ordem das categorias.");
              void queryClient.invalidateQueries({
                queryKey: queryKeys.events.ticketCategories(eventId),
              });
            });
          return next;
        });
        return;
      }

      if (!activeIdValue.startsWith("ticket-")) {
        setActiveId(null);
        dragEndPositionRef.current = null;
        return;
      }

      const dragEndPosition = dragEndPositionRef.current;
      void (async () => {
        try {
          const { orderPatch, ticketCategoryChanged } =
            await applyOrganizerTicketDragEnd({
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
          if (Object.keys(orderPatch).length > 0) {
            const ticketList =
              queryClient.getQueryData<Ticket[]>(queryKeys.events.tickets(eventId)) ??
              tickets;
            const cats =
              queryClient.getQueryData<ModalityGroup[]>(
                queryKeys.events.ticketCategories(eventId),
              ) ?? categories;
            await persistTicketOrderDrafts(eventId, ticketList, cats, orderPatch);
            setTicketOrderDraft({});
            await queryClient.invalidateQueries({
              queryKey: queryKeys.events.tickets(eventId),
            });
            await queryClient.refetchQueries({
              queryKey: queryKeys.events.tickets(eventId),
            });
            const freshTickets =
              queryClient.getQueryData<Ticket[]>(queryKeys.events.tickets(eventId)) ??
              [];
            const freshCats =
              queryClient.getQueryData<ModalityGroup[]>(
                queryKeys.events.ticketCategories(eventId),
              ) ?? cats;
            committedAssignmentRef.current = buildCommittedAssignmentsMap(
              freshTickets,
              freshCats,
            );
            setCommittedAssignmentsVersion((v) => v + 1);
            if (!ticketCategoryChanged) {
              toast.success("Ordem dos ingressos atualizada.");
            }
          }
        } catch (e) {
          console.error(e);
          toast.error("Não foi possível salvar a ordem dos ingressos.");
        } finally {
          setActiveId(null);
          dragEndPositionRef.current = null;
        }
      })();
    },
    [tickets, handleDropTicket, categories, eventId, queryClient, ticketOrderDraft],
  );

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
  }, []);

  const ticketsByCategory = useMemo(() => {
    const map: Record<string, Ticket[]> = {};
    tickets.forEach((ticket) => {
      const categoryId = ticket.groupId || "uncategorized";
      if (!map[categoryId]) {
        map[categoryId] = [];
      }
      map[categoryId].push(ticket);
    });
    for (const k of Object.keys(map)) {
      map[k].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    }
    return map;
  }, [tickets]);

  const uncategorizedTickets = useMemo(() => {
    const list = tickets.filter(
      (t) => !t.groupId || t.groupId === "uncategorized" || !categories.find((c) => c.id === t.groupId)
    );
    return list.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }, [tickets, categories]);

  const hasNoCategories = !Array.isArray(categories) || categories.length === 0;
  const allTickets = useMemo(() => {
    return hasNoCategories ? tickets : uncategorizedTickets;
  }, [hasNoCategories, tickets, uncategorizedTickets]);

  const ticketsByCategoryDisplay = useMemo(() => {
    const out: Record<string, Ticket[]> = {};
    for (const k of Object.keys(ticketsByCategory)) {
      out[k] = applyDraftOrderToTickets(
        ticketsByCategory[k],
        k,
        ticketOrderDraft,
      );
    }
    return out;
  }, [ticketsByCategory, ticketOrderDraft]);

  const uncategorizedTicketsDisplay = useMemo(
    () =>
      applyDraftOrderToTickets(
        uncategorizedTickets,
        "uncategorized",
        ticketOrderDraft,
      ),
    [uncategorizedTickets, ticketOrderDraft],
  );

  const allTicketsDisplay = useMemo(() => {
    return hasNoCategories
      ? applyDraftOrderToTickets(tickets, "uncategorized", ticketOrderDraft)
      : uncategorizedTicketsDisplay;
  }, [
    hasNoCategories,
    tickets,
    uncategorizedTicketsDisplay,
    ticketOrderDraft,
  ]);

  const ticketMoveCategoryOptions = useMemo((): TicketMoveCategoryOption[] => {
    const uncCount = uncategorizedTickets.length;
    const rows: TicketMoveCategoryOption[] = orderedCategories.map((c) => ({
      id: c.id,
      name: c.name,
      ticketCount: (ticketsByCategory[c.id] || []).length,
    }));
    rows.push({
      id: "uncategorized-bucket",
      name: "Sem categoria",
      ticketCount: uncCount,
      isUncategorizedBucket: true,
    });
    return rows;
  }, [orderedCategories, ticketsByCategory, uncategorizedTickets]);

  const handleDeleteTicket = useCallback(
    async (ticketId: string) => {
      await deleteTicket(ticketId);
    },
    [deleteTicket],
  );

  const kitSelectionDisplayKey = useMemo(
    () => JSON.stringify(event?.kitSelectionDisplay ?? null),
    [event?.kitSelectionDisplay]
  );

  const savedKitSelection = useMemo(
    () => parseEventKitSelectionDisplay(event?.kitSelectionDisplay),
    [kitSelectionDisplayKey]
  );

  const [draftKitSelection, setDraftKitSelection] =
    useState<EventKitSelectionDisplay>(() => ({
      ...defaultEventKitSelectionDisplay(),
    }));

  useEffect(() => {
    setDraftKitSelection({
      ...defaultEventKitSelectionDisplay(),
      ...savedKitSelection,
      primaryKitProductByTicketId: {
        ...savedKitSelection.primaryKitProductByTicketId,
      },
      primaryKitProductByCategoryId: {
        ...savedKitSelection.primaryKitProductByCategoryId,
      },
    });
  }, [savedKitSelection]);

  const kitSelectionDirty = useMemo(() => {
    const norm = (k: EventKitSelectionDisplay) => ({
      show: k.showKitImagesOnSelection,
      layout: k.kitImagesLayout,
      byTicket: k.primaryKitProductByTicketId,
      byCat: k.primaryKitProductByCategoryId,
    });
    return (
      JSON.stringify(norm(draftKitSelection)) !==
      JSON.stringify(norm(savedKitSelection))
    );
  }, [draftKitSelection, savedKitSelection]);

  /** Só opções de exibição do kit no checkout — o restante (DnD, categorias, mover ingresso) persiste na hora. */
  const hasPendingTicketsPageChanges = kitSelectionDirty;

  const discardLocalChanges = useCallback(async () => {
    if (!eventId) return;
    setTicketOrderDraft({});
    await queryClient.invalidateQueries({
      queryKey: queryKeys.events.tickets(eventId),
    });
    await queryClient.invalidateQueries({
      queryKey: queryKeys.events.ticketCategories(eventId),
    });
    await queryClient.refetchQueries({
      queryKey: queryKeys.events.tickets(eventId),
    });
    await queryClient.refetchQueries({
      queryKey: queryKeys.events.ticketCategories(eventId),
    });
    await reloadEvent();
    const freshTickets =
      queryClient.getQueryData<Ticket[]>(queryKeys.events.tickets(eventId)) ?? [];
    const freshCats =
      queryClient.getQueryData<ModalityGroup[]>(
        queryKeys.events.ticketCategories(eventId),
      ) ?? [];
    committedAssignmentRef.current = buildCommittedAssignmentsMap(
      freshTickets,
      freshCats,
    );
    setCommittedAssignmentsVersion((v) => v + 1);
    setCategoryOrderIds(
      [...freshCats]
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map((c) => c.id),
    );
    try {
      const ev = await organizerService.getEventById(eventId);
      const parsed = parseEventKitSelectionDisplay(ev.kitSelectionDisplay);
      setDraftKitSelection({
        ...defaultEventKitSelectionDisplay(),
        ...parsed,
        primaryKitProductByTicketId: { ...parsed.primaryKitProductByTicketId },
        primaryKitProductByCategoryId: { ...parsed.primaryKitProductByCategoryId },
      });
    } catch {
      setDraftKitSelection({
        ...defaultEventKitSelectionDisplay(),
        ...savedKitSelection,
        primaryKitProductByTicketId: {
          ...savedKitSelection.primaryKitProductByTicketId,
        },
        primaryKitProductByCategoryId: {
          ...savedKitSelection.primaryKitProductByCategoryId,
        },
      });
    }
    prevTicketsLoadingRef.current = false;
  }, [
    eventId,
    queryClient,
    reloadEvent,
    savedKitSelection,
  ]);

  const {
    leavePromptOpen,
    handleBack,
    confirmLeaveWithoutSaving,
    beginNavigationAfterSave,
    dismissLeavePrompt,
    requestNavigate,
  } = useUnsavedLeaveGuard(hasPendingTicketsPageChanges, {
    navigateTarget: `/organizer/events/${eventId}/edit/banner`,
    onDiscard: discardLocalChanges,
  });

  const handleDraftShowKitImagesChange = useCallback((value: boolean) => {
    setDraftKitSelection((prev) => ({
      ...defaultEventKitSelectionDisplay(),
      ...prev,
      showKitImagesOnSelection: value,
    }));
  }, []);

  const handleSaveChangesNavigate = useCallback(async (): Promise<boolean> => {
    if (!eventId) {
      toast.error("Evento não encontrado.");
      return false;
    }
    if (!kitSelectionDirty) {
      return true;
    }
    setSavingNavigate(true);
    try {
      const mergedKitDisplay = {
        ...defaultEventKitSelectionDisplay(),
        ...draftKitSelection,
        primaryKitProductByTicketId: {
          ...draftKitSelection.primaryKitProductByTicketId,
        },
        primaryKitProductByCategoryId: {
          ...draftKitSelection.primaryKitProductByCategoryId,
        },
      };
      await organizerService.updateEvent(
        eventId,
        { kitSelectionDisplay: mergedKitDisplay },
        { clientPage: `events/${eventId}/tickets` },
      );
      await reloadEvent();
      toast.success("Alterações salvas com sucesso!");
      return true;
    } catch (e) {
      console.error(e);
      toast.error("Não foi possível salvar as opções de exibição do kit.");
      return false;
    } finally {
      setSavingNavigate(false);
    }
  }, [eventId, kitSelectionDirty, draftKitSelection, reloadEvent]);

  const handleSaveAndLeave = useCallback(async () => {
    const ok = await handleSaveChangesNavigate();
    if (ok) {
      beginNavigationAfterSave();
    }
  }, [handleSaveChangesNavigate, beginNavigationAfterSave]);

  const handleEditTicket = useCallback(
    (ticketId: string) => {
      requestNavigate(`/organizer/events/${eventId}/edit/tickets/${ticketId}`);
    },
    [requestNavigate, eventId],
  );

  const kitImagePositionDrawerData = useMemo(() => {
    const ticketToRow = (t: Ticket) => ({
      id: t.id,
      name: t.name,
      images: (t.products || []).map((productId: string) => ({
        productId,
        url: productsMap[productId]?.image ?? null,
        name: productsMap[productId]?.name ?? null,
      })),
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
          ? {
              id: "uncategorized",
              name: "",
              tickets: uncategorizedTicketsDisplay.map(ticketToRow),
            }
          : null,
    };
  }, [
    hasNoCategories,
    orderedCategories,
    ticketsByCategoryDisplay,
    uncategorizedTicketsDisplay,
    productsMap,
  ]);

  const drawerInitialKitSelection = useMemo(
    () => ({
      layout: layoutToDrawerMode(draftKitSelection.kitImagesLayout),
      primaryByTicket: { ...draftKitSelection.primaryKitProductByTicketId },
      primaryByCategory: { ...draftKitSelection.primaryKitProductByCategoryId },
    }),
    [draftKitSelection]
  );

  const handleKitDrawerSave = useCallback(
    (payload: {
      layout: KitImageLayoutMode;
      primaryProductIdByTicketId: Record<string, string>;
      primaryProductIdByCategoryId: Record<string, string>;
    }) => {
      setDraftKitSelection((prev) => ({
        ...defaultEventKitSelectionDisplay(),
        ...prev,
        kitImagesLayout: drawerModeToApiLayout(payload.layout),
        primaryKitProductByTicketId: {
          ...payload.primaryProductIdByTicketId,
        },
        primaryKitProductByCategoryId: {
          ...payload.primaryProductIdByCategoryId,
        },
      }));
    },
    []
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
        <div className="bg-gray-2 pb-32 pt-0 md:bg-transparent md:px-0 md:pb-20 md:pt-0">
        <div className="flex w-full flex-col gap-5 md:gap-9">
          <div className="-mx-4 flex h-[52px] items-center border-b border-gray-6 bg-gray-2 px-4 md:hidden">
            <button
              type="button"
              onClick={handleBack}
              className="flex size-8 cursor-pointer items-center justify-center transition-colors rotate-180 hover:bg-gray-3"
              aria-label="Voltar"
            >
              <ArrowButton isOpen={false} />
            </button>
            <h1 className="ml-2 font-manrope text-base font-extrabold leading-[1.1] text-gray-12">
              Ingressos
            </h1>
          </div>

          <div className="flex flex-col gap-5 md:gap-4">
            <div className="hidden items-center gap-3 md:flex">
              <button
                type="button"
                onClick={handleBack}
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
              onClick={() =>
                requestNavigate(`/organizer/events/${eventId}/edit/tickets/create`)
              }
              variant="default"
              className="h-11 min-h-0 flex-1 gap-1 rounded-lg px-5 font-family-dm-sans text-sm font-bold"
            >
              <Plus className="size-5 shrink-0" />
              Criar ingresso
            </Button>
          </div>

          <div className="hidden items-center justify-between gap-4 md:flex md:flex-wrap">
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
                onClick={() =>
                  requestNavigate(`/organizer/events/${eventId}/edit/tickets/create`)
                }
                variant="default"
                className="font-manrope text-base font-bold leading-[1.1]"
              >
                <Plus className="size-5" />
                Criar ingresso
              </Button>
            </div>
          </div>

          {(hasNoCategories ? allTickets.length > 0 : true) && (
            <UncategorizedTicketsDropShell>
              <MobileGeneralTicketsSection ticketCount={allTickets.length}>
                <div className="overflow-x-auto">
                  <TicketTable
                    tickets={allTicketsDisplay}
                    currentPage={1}
                    totalPages={1}
                    onPageChange={() => {}}
                    onEdit={handleEditTicket}
                    onDuplicate={handleDuplicateTicket}
                    duplicatingTicketId={duplicatingTicketId}
                    productsMap={productsMap}
                    ticketScopeCategoryId={null}
                    moveCategoryOptions={ticketMoveCategoryOptions}
                    onMoveTicketToCategory={handleDropTicket}
                    onDeleteTicket={handleDeleteTicket}
                  />
                </div>
              </MobileGeneralTicketsSection>
            </UncategorizedTicketsDropShell>
          )}

          {/* Create Category Section — desktop; no mobile (drawer) */}
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
                        if (value) {
                          void handleCreateGroup(value);
                        } else {
                          toast.error("Nome da categoria é obrigatório");
                        }
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
                <div
                  className="flex gap-[10px] items-center"
                  data-category-draft-toolbar
                >
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

              {/* Empty Table */}
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
                    <tbody>{/* Empty state - no rows */}</tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Empty Card */}
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
                        if (value) {
                          void handleCreateGroup(value);
                        } else {
                          setEditingGroupId(null);
                          setEditingGroupName("");
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          if (editingGroupName.trim()) {
                            void handleCreateGroup(editingGroupName.trim());
                          }
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
                  <div
                    className="flex gap-[10px] items-center"
                    data-category-draft-toolbar
                  >
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

                {/* Empty State */}
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

          {/* Categories List */}
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
                {orderedCategories.map((category) => {
                  const categoryTickets =
                    ticketsByCategoryDisplay[category.id] || [];

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
                        onEditTicket={handleEditTicket}
                        onPageChange={() => {}}
                        onDuplicateTicket={handleDuplicateTicket}
                        duplicatingTicketId={duplicatingTicketId}
                        productsMap={productsMap}
                        onDropTicket={handleDropTicket}
                        moveCategoryOptions={ticketMoveCategoryOptions}
                        onMoveTicketToCategory={handleDropTicket}
                        onDeleteTicket={handleDeleteTicket}
                      />
                    </SortableTicketCategoryItem>
                  );
                })}
              </div>
              </SortableContext>
            </>
          )}

          <div className="w-full">
            <TicketAdvancedKitDisplayOptions
              showKitImagesOnSelection={draftKitSelection.showKitImagesOnSelection}
              onShowKitImagesOnSelectionChange={handleDraftShowKitImagesChange}
              kitImagesLayout={draftKitSelection.kitImagesLayout}
              onOpenKitImagePositionDrawer={() => {
                const hasKit = tickets.some(
                  (t) => (t.products?.length ?? 0) > 0
                );
                if (!hasKit) {
                  toast.error(
                    "Adicione produtos (kit) a um ingresso para editar as imagens."
                  );
                  return;
                }
                setKitImagePositionDrawerOpen(true);
              }}
            />
          </div>

          {kitSelectionDirty ? (
            <div className="flex justify-stretch md:justify-end">
              <Button
                type="button"
                onClick={() => void handleSaveChangesNavigate()}
                variant="default"
                disabled={savingNavigate}
                className="h-14 w-full rounded-lg font-manrope text-lg font-bold disabled:cursor-not-allowed disabled:opacity-50 md:h-12 md:w-auto md:px-10 md:text-[20px]"
              >
                {savingNavigate ? "Salvando..." : "Salvar alterações"}
              </Button>
            </div>
          ) : null}
        </div>
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
              {orderedCategories.find(
                (c) => categorySortableId(c.id) === activeId,
              )?.name || "Categoria"}
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

      <KitImagePositionDrawer
        isOpen={kitImagePositionDrawerOpen}
        onClose={() => setKitImagePositionDrawerOpen(false)}
        sections={kitImagePositionDrawerData.sections}
        uncategorized={kitImagePositionDrawerData.uncategorized}
        initialKitSelection={drawerInitialKitSelection}
        onSave={handleKitDrawerSave}
        saveSuccessMessage="Posição das imagens atualizada no rascunho. Use «Salvar alterações» abaixo para gravar no evento."
      />

      <UnsavedChangesModal
        open={leavePromptOpen}
        onClose={dismissLeavePrompt}
        title="Alterações não salvas"
        description="Você fez alterações nos ingressos ou nas categorias. Se sair agora, elas serão perdidas."
        onSaveAndLeave={handleSaveAndLeave}
        onLeaveWithoutSaving={confirmLeaveWithoutSaving}
      />
    </>
  );
}
