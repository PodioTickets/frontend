"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
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
import Image from "next/image";
import toast from "react-hot-toast";
import { Plus } from "lucide-react";
import { PencilIcon } from "@/components/Icons/PencilIcon";
import { TrashIcon } from "@/components/Icons/TrashIcon";
import { TicketCategoryCard } from "@/components/Ticket/TicketCategoryCard";
import { TicketTable } from "@/components/Ticket/TicketTable";
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

export default function EditTicketsPage() {
  const router = useRouter();
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
  /** Ordem dos ingressos alterada por drag; persistida só em «Salvar alterações». */
  const [ticketOrderDraft, setTicketOrderDraft] = useState<Record<string, string[]>>(
    {},
  );
  /** Nomes de categoria editados na tela; persistidos só em «Salvar alterações». */
  const [categoryNameDraft, setCategoryNameDraft] = useState<Record<string, string>>(
    {},
  );

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
  } = useTickets(eventId, authChecked);

  const loading = categoriesLoading || ticketsLoading;

  // Verificar autenticação
  useEffect(() => {
    const hasToken = userService.isAuthenticated();
    if (!hasToken) {
      router.push("/");
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
      queryClient.invalidateQueries({
        queryKey: queryKeys.events.tickets(eventId),
      });
    };

    window.addEventListener("ticketCreated", handleTicketCreated);
    window.addEventListener("focus", handleTicketCreated);

    return () => {
      window.removeEventListener("ticketCreated", handleTicketCreated);
      window.removeEventListener("focus", handleTicketCreated);
    };
  }, [eventId, queryClient]);

  // Handlers
  const handleCreateGroup = useCallback(
    async (nameOverride?: string) => {
      const nameToUse = nameOverride || newGroupName.trim();

      if (!nameToUse) {
        toast.error("Nome da categoria é obrigatório");
        return;
      }

      try {
        await createCategory(nameToUse);
        setNewGroupName("");
        setEditingGroupName("");
        setShowCreateGroupSection(false);
        setEditingGroupId(null);
      } catch (error) {
        // Error já foi tratado no hook
      }
    },
    [newGroupName, createCategory]
  );

  const handleUpdateGroupName = useCallback(
    (groupId: string, name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      setCategoryNameDraft((prev) => {
        const cat = categories.find((c) => c.id === groupId);
        if (cat && cat.name === trimmed) {
          const { [groupId]: _, ...rest } = prev;
          return rest;
        }
        return { ...prev, [groupId]: trimmed };
      });
      setEditingGroupId(null);
      setEditingGroupName("");
    },
    [categories],
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
    [deleteCategory]
  );

  const handleEditTicket = useCallback(
    (ticketId: string) => {
      router.push(`/organizer/events/${eventId}/edit/tickets/${ticketId}`);
    },
    [router, eventId]
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

        toast.success("Ingresso duplicado com sucesso!");
      } catch (error: any) {
        console.error("Error duplicating ticket:", error);
        toast.error(error.response?.data?.message || "Erro ao duplicar ingresso");
      } finally {
        setDuplicatingTicketId(null);
      }
    },
    [eventId, queryClient],
  );

  const handleDropTicket = useCallback(
    async (ticketId: string, categoryId: string | null) => {
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

      const previousTickets = queryClient.getQueryData<Ticket[]>(queryKeys.events.tickets(eventId));

      if (previousTickets) {
        const optimisticTickets = previousTickets.map((t) =>
          t.id === ticketId ? { ...t, groupId: categoryId || "uncategorized" } : t
        );
        queryClient.setQueryData(queryKeys.events.tickets(eventId), optimisticTickets);
      }

      try {
        await organizerService.updateTicket(eventId, ticketId, {
          categoryId: categoryId || null,
        });

        queryClient.invalidateQueries({
          queryKey: queryKeys.events.tickets(eventId),
        });

        if (categoryId) {
          toast.success("Ingresso movido para a categoria com sucesso!");
        } else {
          toast.success("Ingresso desvinculado da categoria com sucesso!");
        }
      } catch (error: any) {
        if (previousTickets) {
          queryClient.setQueryData(queryKeys.events.tickets(eventId), previousTickets);
        }
        console.error("Error moving ticket:", error);
        toast.error(error.response?.data?.message || "Erro ao mover ingresso");
      }
    },
    [eventId, tickets, queryClient, categories]
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
          return arrayMove(prev, oldIndex, newIndex);
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
          });
        } finally {
          setActiveId(null);
          dragEndPositionRef.current = null;
        }
      })();
    },
    [tickets, handleDropTicket, categories, eventId, queryClient]
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

  /** Nova categoria em edição sem nome — bloqueia "Salvar alterações". */
  const hasIncompleteNewCategoryDraft = useMemo(() => {
    if (showCreateGroupSection && editingGroupId === "new") {
      return !newGroupName.trim();
    }
    if (hasNoCategories && allTickets.length === 0 && editingGroupId === "new") {
      return !editingGroupName.trim();
    }
    return false;
  }, [
    showCreateGroupSection,
    editingGroupId,
    newGroupName,
    editingGroupName,
    hasNoCategories,
    allTickets.length,
  ]);

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

  const handleDraftShowKitImagesChange = useCallback((value: boolean) => {
    setDraftKitSelection((prev) => ({
      ...defaultEventKitSelectionDisplay(),
      ...prev,
      showKitImagesOnSelection: value,
    }));
  }, []);

  const handleSaveChangesNavigate = useCallback(async () => {
    if (hasIncompleteNewCategoryDraft) {
      toast.error(
        "Informe o nome da nova categoria ou cancele a criação antes de salvar as alterações."
      );
      return;
    }
    if (!eventId) {
      toast.error("Evento não encontrado.");
      return;
    }
    if (orderedCategories.length === 0) {
      toast.error(
        "Adicione pelo menos uma categoria de ingressos antes de salvar as alterações.",
      );
      return;
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
        { clientPage: `events/${eventId}/tickets` }
      );
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
      await reloadEvent();
      toast.success("Alterações salvas com sucesso!");
    } catch (e) {
      console.error(e);
      toast.error("Não foi possível salvar as alterações desta página.");
    } finally {
      setSavingNavigate(false);
    }
  }, [
    hasIncompleteNewCategoryDraft,
    eventId,
    orderedCategories,
    queryClient,
    draftKitSelection,
    reloadEvent,
    tickets,
    categories,
    ticketOrderDraft,
    categoryNameDraft,
    updateCategory,
  ]);

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
      sections: orderedCategoriesDisplay.map((cat) => ({
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
    orderedCategoriesDisplay,
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

  const handleBack = useCallback(() => {
    router.push(`/organizer/events/${eventId}/edit/banner`);
  }, [router, eventId]);

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
        <div className="pb-20">
        <div className="w-full flex flex-col gap-9">
          {/* Title Section */}
          <div className="flex flex-col gap-4">
            <div className="flex gap-3 items-center">
              <button
                onClick={handleBack}
                className="border border-gray-6 rounded-[52px] cursor-pointer size-9 flex items-center justify-center hover:bg-gray-3 transition-colors rotate-180"
              >
                <ArrowButton isOpen={false} />
              </button>
              <h1 className="text-gray-12 text-[28px] font-bold font-manrope leading-[1.1]">
                Ingressos
              </h1>
            </div>
            <p className="text-gray-11 text-base font-family-dm-sans leading-[1.3]">
              Crie categorias e ingressos com lotes, valores e regras, incluindo o kit que será definido dentro do ingresso para o participante escolher na inscrição.
            </p>
          </div>

          {/* Header with Actions */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <h2 className="text-gray-12 text-xl font-bold font-manrope leading-[1.1]">
              Ingressos avulsos
            </h2>
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  setShowCreateGroupSection(true);
                  setEditingGroupId("new");
                  setNewGroupName("");
                }}
                variant="outline"
                className="border-gray-6 text-gray-12 text-base font-bold font-manrope"
              >
                <Plus className="size-5" />
                Criar categoria
              </Button>
              <Button
                onClick={() => router.push(`/organizer/events/${eventId}/edit/tickets/create`)}
                variant="default"
                className="text-base font-bold font-manrope leading-[1.1]"
              >
                <Plus className="size-5" />
                Criar ingresso
              </Button>
            </div>
          </div>

          {allTickets.length > 0 && (
            <UncategorizedTicketsDropShell>
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
                />
              </div>
            </UncategorizedTicketsDropShell>
          )}

          {/* Create Category Section */}
          {showCreateGroupSection && (
            <div className="flex flex-col gap-6 bg-gray-3 border border-gray-6 rounded-xl p-5">
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
            <SortableContext
              items={orderedCategories.map((c) => categorySortableId(c.id))}
              strategy={verticalListSortingStrategy}
            >
              <div className="flex flex-col gap-6">
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
                      onDelete={handleDeleteGroup}
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
                      />
                    </SortableTicketCategoryItem>
                  );
                })}
              </div>
            </SortableContext>
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

          <div className="flex justify-end">
            <Button
              onClick={() => void handleSaveChangesNavigate()}
              variant="default"
              disabled={savingNavigate}
              className="text-[20px] font-bold px-10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {savingNavigate ? "Salvando..." : "Salvar alterações"}
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

      <KitImagePositionDrawer
        isOpen={kitImagePositionDrawerOpen}
        onClose={() => setKitImagePositionDrawerOpen(false)}
        sections={kitImagePositionDrawerData.sections}
        uncategorized={kitImagePositionDrawerData.uncategorized}
        initialKitSelection={drawerInitialKitSelection}
        onSave={handleKitDrawerSave}
        saveSuccessMessage="Posição das imagens atualizada. Clique em Salvar alterações para persistir."
      />
    </>
  );
}
