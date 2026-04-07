"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useOrganizerNavigate } from "@/hooks/useOrganizerNavigate";
import { useTicketCategories } from "@/hooks/useTicketCategories";
import { useTickets, type Ticket } from "@/hooks/useTickets";
import { userService, organizerService } from "@/services";
import type { ModalityGroup } from "@/services/organizer/OrganizerService";
import { useCreateEvent } from "@/contexts/CreateEventContext";
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

export default function IngressosPage() {
  const router = useRouter();
  const orgNav = useOrganizerNavigate();
  const { formData } = useCreateEvent();
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
  const [categoryOrderIds, setCategoryOrderIds] = useState<string[]>([]);
  const [savingConfirm, setSavingConfirm] = useState(false);
  const [ticketOrderDraft, setTicketOrderDraft] = useState<Record<string, string[]>>(
    {},
  );
  /** Nomes de categoria editados na tela; persistidos só em «Confirmar ingressos». */
  const [categoryNameDraft, setCategoryNameDraft] = useState<Record<string, string>>(
    {},
  );
  const [categoryFormDrawerOpen, setCategoryFormDrawerOpen] = useState(false);
  const [categoryFormMode, setCategoryFormMode] = useState<"create" | "edit">("create");
  const [categoryFormCategoryId, setCategoryFormCategoryId] = useState<string | null>(
    null,
  );

  // Hooks para gerenciar dados
  const {
    categories,
    loading: categoriesLoading,
    createCategory,
    updateCategory,
    deleteCategory,
  } = useTicketCategories(formData.createdEventId, authChecked);

  const {
    tickets,
    loading: ticketsLoading,
    loadTickets,
    deleteTicket,
  } = useTickets(formData.createdEventId, authChecked);

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

  // Inicializar viewMode quando categorias mudarem - sempre usar tabela
  useEffect(() => {
    if (Array.isArray(categories) && categories.length > 0) {
      setViewMode((prev) => {
        const initialViewMode: Record<string, "table" | "cards"> = {};
        categories.forEach((category) => {
          // Only set if not already set to avoid unnecessary updates
          if (!prev[category.id]) {
            initialViewMode[category.id] = "table";
          }
        });
        // Only update if there are new categories to initialize
        if (Object.keys(initialViewMode).length > 0) {
          return { ...prev, ...initialViewMode };
        }
        return prev;
      });
      // Limpar cache de elementos quando categorias mudarem
      categoryElementsCacheRef.current.clear();
    }
  }, [categories]); // Removed tickets from dependencies as it's not needed for viewMode initialization

  useEffect(() => {
    const ids = categories.map((c) => c.id);
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

  const orderedCategoriesDisplay = useMemo(() => {
    return orderedCategories.map((c) => ({
      ...c,
      name: categoryNameDraft[c.id] ?? c.name,
    }));
  }, [orderedCategories, categoryNameDraft]);

  // Buscar produtos usando React Query para cache
  const { data: productsData } = useQuery({
    queryKey: queryKeys.events.products(formData.createdEventId || ""),
    queryFn: async () => {
      if (!formData.createdEventId) return { products: [] };
      return organizerService.getProducts(formData.createdEventId);
    },
    enabled: authChecked && !!formData.createdEventId,
    staleTime: 5 * 60 * 1000, // Cache por 5 minutos
  });

  // Memoizar productsMap para evitar recriação desnecessária
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

  // Listener para quando um ticket é criado - invalidar queries
  useEffect(() => {
    if (!formData.createdEventId) return;

    const handleTicketCreated = () => {
      const qk = queryKeys.events.tickets(formData.createdEventId!);
      void queryClient.invalidateQueries({ queryKey: qk });
      void queryClient.refetchQueries({ queryKey: qk });
    };

    window.addEventListener("ticketCreated", handleTicketCreated);
    window.addEventListener("focus", handleTicketCreated);

    return () => {
      window.removeEventListener("ticketCreated", handleTicketCreated);
      window.removeEventListener("focus", handleTicketCreated);
    };
  }, [formData.createdEventId, queryClient]);

  // Handlers memoizados
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
        setShowCreateGroupSection(false);
        setEditingGroupId(null);
      } catch (e) {
        throw e;
      }
    },
    [newGroupName, createCategory],
  );

  const handleUpdateGroupName = useCallback(async (groupId: string, name: string) => {
    try {
      await updateCategory(groupId, { name });
      setEditingGroupId(null);
      setEditingGroupName("");
    } catch (error) {
      // Error já foi tratado no hook
    }
  }, [updateCategory]);

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
    const name =
      categoryFormCategoryId != null
        ? (categoryNameDraft[categoryFormCategoryId] ?? c?.name ?? "")
        : "";
    return {
      name,
      description: c?.description ?? "",
    };
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
      setCategoryNameDraft((prev) => {
        const { [categoryFormCategoryId]: _, ...rest } = prev;
        return rest;
      });
    },
    [
      categoryFormMode,
      categoryFormCategoryId,
      handleCreateGroup,
      updateCategory,
    ],
  );

  const handleDeleteGroup = useCallback(
    async (groupId: string) => {
      try {
        await deleteCategory(groupId);
        setCategoryNameDraft((prev) => {
          const { [groupId]: _, ...rest } = prev;
          return rest;
        });
      } catch (error) {
        // Error já foi tratado no hook
      }
    },
    [deleteCategory],
  );

  const handleEditTicket = useCallback((ticketId: string) => {
    orgNav.push(`/organizer/events/new/tickets/edit/${ticketId}`);
  }, [router]);

  const handleDuplicateTicket = useCallback(async (ticketId: string) => {
    if (!formData.createdEventId) {
      toast.error("Evento não encontrado");
      return;
    }

    setDuplicatingTicketId(ticketId);
    try {
      await organizerService.duplicateTicket(formData.createdEventId, ticketId);

      await queryClient.invalidateQueries({
        queryKey: queryKeys.events.tickets(formData.createdEventId),
      });

      await queryClient.refetchQueries({
        queryKey: queryKeys.events.tickets(formData.createdEventId),
      });

      window.dispatchEvent(new CustomEvent("ticketCreated"));

      toast.success("Ingresso duplicado com sucesso!");
    } catch (error: any) {
      console.error("Error duplicating ticket:", error);
      toast.error(error.response?.data?.message || "Erro ao duplicar ingresso");
    } finally {
      setDuplicatingTicketId(null);
    }
  }, [formData.createdEventId, queryClient]);

  const handleDropTicket = useCallback(async (ticketId: string, categoryId: string | null) => {
    if (!formData.createdEventId) {
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

    // Atualização otimista - atualizar o cache imediatamente
    const previousTickets = queryClient.getQueryData<Ticket[]>(
      queryKeys.events.tickets(formData.createdEventId)
    );

    if (previousTickets) {
      const optimisticTickets = previousTickets.map((t) =>
        t.id === ticketId ? { ...t, groupId: categoryId || "uncategorized" } : t
      );
      queryClient.setQueryData(queryKeys.events.tickets(formData.createdEventId), optimisticTickets);
    }

    try {
      // Atualizar o ticket com a nova categoria (ou null para desvincular)
      await organizerService.updateTicket(formData.createdEventId, ticketId, {
        categoryId: categoryId || null,
      });

      // Invalidar para garantir sincronização (mas sem refetch imediato)
      queryClient.invalidateQueries({
        queryKey: queryKeys.events.tickets(formData.createdEventId),
      });

      if (categoryId) {
        toast.success("Ingresso movido para a categoria com sucesso!");
      } else {
        toast.success("Ingresso desvinculado da categoria com sucesso!");
      }
    } catch (error: any) {
      // Reverter atualização otimista em caso de erro
      if (previousTickets) {
        queryClient.setQueryData(queryKeys.events.tickets(formData.createdEventId), previousTickets);
      }
      console.error("Error moving ticket:", error);
      toast.error(error.response?.data?.message || "Erro ao mover ingresso");
      throw error;
    }
  }, [formData.createdEventId, tickets, queryClient, categories]);

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

  // Capturar posição do mouse quando soltar (usar capture phase para pegar antes do dnd-kit)
  useEffect(() => {
    if (!activeId) return;

    const handleMouseUp = (e: MouseEvent) => {
      dragEndPositionRef.current = { x: e.clientX, y: e.clientY };
    };

    const handlePointerUp = (e: PointerEvent) => {
      dragEndPositionRef.current = { x: e.clientX, y: e.clientY };
    };

    // Usar capture phase para garantir que capturamos antes do dnd-kit processar
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

  const handleDragEnd = useCallback((event: DragEndEvent) => {
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
        return arrayMove(prev, oldIndex, newIndex);
      });
      return;
    }

    if (!activeIdValue.startsWith("ticket-")) {
      setActiveId(null);
      dragEndPositionRef.current = null;
      return;
    }

    const eventId = formData.createdEventId;
    if (!eventId) {
      setActiveId(null);
      dragEndPositionRef.current = null;
      return;
    }

    const dragEndPosition = dragEndPositionRef.current;
    void (async () => {
      try {
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
      } finally {
        setActiveId(null);
        dragEndPositionRef.current = null;
      }
    })();
  }, [
    tickets,
    handleDropTicket,
    categories,
    formData.createdEventId,
    queryClient,
    ticketOrderDraft,
  ]);

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
  }, []);

  // Memoizar tickets por categoria para evitar recálculos
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

  // Memoizar tickets sem categoria
  const uncategorizedTickets = useMemo(() => {
    const list = tickets.filter(
      (t) => !t.groupId || t.groupId === "uncategorized" || !categories.find((c) => c.id === t.groupId)
    );
    return list.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }, [tickets, categories]);

  // Memoizar lista principal de tickets
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
      name: categoryNameDraft[c.id] ?? c.name,
      ticketCount: (ticketsByCategory[c.id] || []).length,
    }));
    rows.push({
      id: "uncategorized-bucket",
      name: "Sem categoria",
      ticketCount: uncCount,
      isUncategorizedBucket: true,
    });
    return rows;
  }, [orderedCategories, categoryNameDraft, ticketsByCategory, uncategorizedTickets]);

  const handleDeleteTicket = useCallback(
    async (ticketId: string) => {
      await deleteTicket(ticketId);
    },
    [deleteTicket],
  );

  const handleConfirmIngressos = useCallback(async () => {
    const eventId = formData.createdEventId;
    if (!eventId) {
      toast.error("Evento não encontrado.");
      return;
    }
    if (orderedCategories.length === 0) {
      orgNav.push("/organizer/events/new/topics");
      return;
    }
    setSavingConfirm(true);
    try {
      if (Object.keys(categoryNameDraft).length > 0) {
        await Promise.all(
          Object.entries(categoryNameDraft).map(([id, name]) =>
            updateCategory(id, { name }),
          ),
        );
        setCategoryNameDraft({});
      }
      await persistTicketCategoryOrderApi(eventId, orderedCategories);
      const ticketList =
        queryClient.getQueryData<Ticket[]>(queryKeys.events.tickets(eventId)) ??
        tickets;
      await persistTicketOrderDrafts(
        eventId,
        ticketList,
        categories,
        ticketOrderDraft,
      );
      setTicketOrderDraft({});
      await queryClient.invalidateQueries({
        queryKey: queryKeys.events.tickets(eventId),
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.events.ticketCategories(eventId),
      });
      orgNav.push("/organizer/events/new/topics");
    } catch (e) {
      console.error(e);
      toast.error("Não foi possível salvar a ordem das categorias.");
    } finally {
      setSavingConfirm(false);
    }
  }, [
    formData.createdEventId,
    orderedCategories,
    queryClient,
    router,
    tickets,
    categories,
    ticketOrderDraft,
    categoryNameDraft,
    updateCategory,
  ]);

  const handleBack = useCallback(() => {
    orgNav.push("/organizer/events/new/banner");
  }, [orgNav]);

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
        <div className="flex-1 bg-gray-2 px-4 pb-32 pt-0 md:bg-transparent md:px-5 md:pb-0 md:pt-[52px] lg:px-[124px]">
        <div className="mx-auto flex max-w-[1192px] flex-col gap-5 md:gap-9">
          <div className="-mx-4 flex h-[52px] items-center border-b border-gray-6 bg-gray-2 px-4 md:hidden">
            <button
              type="button"
              onClick={handleBack}
              className="flex size-8 cursor-pointer items-center justify-center rounded-full border border-gray-6 transition-colors rotate-180 hover:bg-gray-3"
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
              onClick={() => orgNav.push("/organizer/events/new/tickets/create")}
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
                onClick={() => orgNav.push("/organizer/events/new/tickets/create")}
                variant="default"
                className="font-manrope text-base font-bold leading-[1.1]"
              >
                <Plus className="size-5" />
                Criar ingresso
              </Button>
            </div>
          </div>

          {allTickets.length > 0 && (
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
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const value = (e.target as HTMLInputElement).value.trim();
                        if (value) {
                          handleCreateGroup(value);
                        } else {
                          toast.error("Nome da categoria é obrigatório");
                        }
                      } else if (e.key === "Escape") {
                        setShowCreateGroupSection(false);
                        setEditingGroupId(null);
                        setNewGroupName("");
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
                <div className="flex gap-[10px] items-center">
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
                        <th className="text-left py-4 px-5 text-gray-12 text-sm font-semibold font-family-dm-sans">Nome do ingresso</th>
                        <th className="text-left py-4 px-5 text-gray-12 text-sm font-semibold font-family-dm-sans">Preço</th>
                        <th className="text-left py-4 px-5 text-gray-12 text-sm font-semibold font-family-dm-sans">Modalidade/Distância</th>
                        <th className="text-left py-4 px-5 text-gray-12 text-sm font-semibold font-family-dm-sans">Produtos relacionados</th>
                        <th className="text-left py-4 px-5 text-gray-12 text-sm font-semibold font-family-dm-sans">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Empty state - no rows */}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Empty Card - Conforme design do Figma */}
          {hasNoCategories && allTickets.length === 0 && (
            <div className="flex flex-col gap-11 items-end">
              <div className="border border-gray-6 rounded-xl p-5 w-full flex flex-col gap-6">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  {editingGroupId === "new" ? (
                    <input
                      type="text"
                      value={editingGroupName}
                      onChange={(e) => setEditingGroupName(e.target.value)}
                      onBlur={() => {
                        if (editingGroupName.trim()) {
                          handleCreateGroup(editingGroupName.trim());
                        } else {
                          setEditingGroupId(null);
                          setEditingGroupName("");
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          if (editingGroupName.trim()) {
                            handleCreateGroup(editingGroupName.trim());
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
                  <div className="flex gap-[10px] items-center">
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
                {orderedCategoriesDisplay.map((category) => {
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

          <div className="flex justify-stretch md:justify-end">
            <Button
              type="button"
              onClick={() => void handleConfirmIngressos()}
              variant="default"
              disabled={savingConfirm}
              className="h-14 w-full rounded-lg font-manrope text-lg font-bold disabled:cursor-not-allowed disabled:opacity-50 md:h-auto md:w-auto md:px-10 md:text-[20px]"
            >
              {savingConfirm ? "Salvando..." : "Confirmar ingressos"}
            </Button>
          </div>
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
              {orderedCategoriesDisplay.find(
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
    </>
  );
}
