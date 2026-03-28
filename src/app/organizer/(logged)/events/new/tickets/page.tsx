"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTicketCategories } from "@/hooks/useTicketCategories";
import { useTickets, type Ticket } from "@/hooks/useTickets";
import { userService } from "@/services";
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
import { TicketTable } from "@/components/Ticket/TicketTable";
import { DeleteTicketModal } from "@/components/Ticket/DeleteTicketModal";
import { organizerService } from "@/services";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core";

const ITEMS_PER_PAGE = 10;

export default function IngressosPage() {
  const router = useRouter();
  const { formData } = useCreateEvent();
  const queryClient = useQueryClient();
  const [authChecked, setAuthChecked] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingGroupName, setEditingGroupName] = useState("");
  const [showCreateGroupSection, setShowCreateGroupSection] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [currentPage, setCurrentPage] = useState<Record<string, number>>({});
  const [viewMode, setViewMode] = useState<Record<string, "table" | "cards">>({});
  const [ticketPendingDelete, setTicketPendingDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [duplicatingTicketId, setDuplicatingTicketId] = useState<string | null>(
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
      router.push("/");
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
      queryClient.invalidateQueries({
        queryKey: queryKeys.events.tickets(formData.createdEventId!),
      });
    };

    window.addEventListener("ticketCreated", handleTicketCreated);
    window.addEventListener("focus", handleTicketCreated);

    return () => {
      window.removeEventListener("ticketCreated", handleTicketCreated);
      window.removeEventListener("focus", handleTicketCreated);
    };
  }, [formData.createdEventId, queryClient]);

  // Handlers memoizados
  const handleCreateGroup = useCallback(async (nameOverride?: string) => {
    const nameToUse = nameOverride || newGroupName.trim();

    if (!nameToUse) {
      toast.error("Nome da categoria é obrigatório");
      return;
    }

    try {
      await createCategory(nameToUse);
      setNewGroupName("");
      setShowCreateGroupSection(false);
      setEditingGroupId(null);
    } catch (error) {
      // Error já foi tratado no hook
    }
  }, [newGroupName, createCategory]);

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

  const handleDeleteGroup = useCallback(async (groupId: string) => {
    try {
      await deleteCategory(groupId);
    } catch (error) {
      // Error já foi tratado no hook
    }
  }, [deleteCategory]);

  const handleDeleteTicket = useCallback(async (ticketId: string) => {
    await deleteTicket(ticketId);
  }, [deleteTicket]);

  const handleEditTicket = useCallback((ticketId: string) => {
    router.push(`/organizer/events/new/tickets/edit/${ticketId}`);
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

  const handlePageChange = useCallback((categoryId: string, page: number) => {
    setCurrentPage((prev) => ({ ...prev, [categoryId]: page }));
  }, []);

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

    // Se já está na mesma categoria, não faz nada
    if (ticket.groupId === categoryId) {
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
    }
  }, [formData.createdEventId, tickets, queryClient]);

  // DnD Kit sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
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
    const activeId = active.id as string;

    // Verificar se está arrastando um ticket
    if (!activeId.startsWith("ticket-")) {
      setActiveId(null);
      dragEndPositionRef.current = null;
      return;
    }

    const ticketId = activeId.replace("ticket-", "");
    const ticket = tickets.find((t) => t.id === ticketId);

    if (!ticket) {
      setActiveId(null);
      dragEndPositionRef.current = null;
      return;
    }

    // Se não soltou sobre nada, desvincular da categoria
    if (!over) {
      // Se o ticket estava em uma categoria, desvincular (definir categoryId como null)
      if (ticket.groupId && ticket.groupId !== "uncategorized") {
        handleDropTicket(ticketId, null);
      }
      setActiveId(null);
      dragEndPositionRef.current = null;
      return;
    }

    const overId = over.id?.toString() || "";

    // Sempre verificar a posição real do mouse quando solta
    const dragEndPosition = dragEndPositionRef.current;

    // Se temos a posição do mouse, verificar se está dentro de alguma categoria
    let droppedInsideCategory = false;
    let targetCategoryId: string | null = null;

    if (dragEndPosition) {
      // Usar cache de elementos para evitar querySelectorAll repetido
      // Limpar cache se necessário (quando categorias mudarem)
      const allCategoryElements = document.querySelectorAll('[data-category-id]');

      for (const categoryElement of allCategoryElements) {
        const categoryId = categoryElement.getAttribute('data-category-id');
        if (!categoryId) continue;

        // Usar cache se disponível, senão calcular e cachear
        let rect = categoryElementsCacheRef.current.get(categoryId);
        if (!rect) {
          rect = categoryElement.getBoundingClientRect();
          categoryElementsCacheRef.current.set(categoryId, rect);
        } else {
          // Verificar se o elemento ainda está na mesma posição (evitar cache stale)
          const currentRect = categoryElement.getBoundingClientRect();
          if (rect.left !== currentRect.left || rect.top !== currentRect.top ||
            rect.width !== currentRect.width || rect.height !== currentRect.height) {
            rect = currentRect;
            categoryElementsCacheRef.current.set(categoryId, rect);
          }
        }

        const isInside =
          dragEndPosition.x >= rect.left &&
          dragEndPosition.x <= rect.right &&
          dragEndPosition.y >= rect.top &&
          dragEndPosition.y <= rect.bottom;

        if (isInside) {
          droppedInsideCategory = true;
          targetCategoryId = categoryId;
          break;
        }
      }
    } else if (over && overId.startsWith("category-")) {
      // Se não temos a posição do mouse, usar o over como fallback
      const overData = over.data.current;
      if (overData && overData.type === "category" && overData.categoryId) {
        droppedInsideCategory = true;
        targetCategoryId = overData.categoryId;
      }
    }

    // Se soltou dentro de uma categoria válida
    if (droppedInsideCategory && targetCategoryId) {
      // Se soltou na mesma categoria onde já está, não faz nada
      if (ticket.groupId === targetCategoryId) {
        setActiveId(null);
        dragEndPositionRef.current = null;
        return;
      }

      // Verificar se a categoria existe (não é "uncategorized" ou uma categoria inválida)
      if (targetCategoryId && targetCategoryId !== "uncategorized") {
        handleDropTicket(ticketId, targetCategoryId);
      } else if (targetCategoryId === "uncategorized") {
        // Se soltou na seção "uncategorized", remover da categoria atual
        if (ticket.groupId && ticket.groupId !== "uncategorized") {
          handleDropTicket(ticketId, null);
        }
      }
    } else {
      // Soltou fora de qualquer categoria - desvincular
      if (ticket.groupId && ticket.groupId !== "uncategorized") {
        handleDropTicket(ticketId, null);
      }
    }

    setActiveId(null);
    dragEndPositionRef.current = null;
  }, [tickets, handleDropTicket]);

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
    return map;
  }, [tickets]);

  // Memoizar tickets sem categoria
  const uncategorizedTickets = useMemo(() => {
    return tickets.filter(
      (t) => !t.groupId || t.groupId === "uncategorized" || !categories.find((c) => c.id === t.groupId)
    );
  }, [tickets, categories]);

  // Memoizar lista principal de tickets
  const hasNoCategories = !Array.isArray(categories) || categories.length === 0;
  const allTickets = useMemo(() => {
    return hasNoCategories ? tickets : uncategorizedTickets;
  }, [hasNoCategories, tickets, uncategorizedTickets]);

  // Helper function memoizada
  const getPaginatedTickets = useCallback((categoryId: string) => {
    const categoryTickets = ticketsByCategory[categoryId] || [];
    const page = currentPage[categoryId] || 1;
    const start = (page - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    return {
      tickets: categoryTickets.slice(start, end),
      totalPages: Math.ceil(categoryTickets.length / ITEMS_PER_PAGE),
      currentPage: page,
    };
  }, [ticketsByCategory, currentPage]);

  const handleBack = useCallback(() => {
    router.push("/organizer/events/new/preview");
  }, [router]);

  if (!authChecked || loading) {
    return <Loading />;
  }

  return (
    <>
      <DeleteTicketModal
        open={!!ticketPendingDelete}
        onClose={() => setTicketPendingDelete(null)}
        ticketName={ticketPendingDelete?.name}
        onConfirm={async () => {
          const target = ticketPendingDelete;
          if (target) {
            await handleDeleteTicket(target.id);
          }
        }}
      />
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="flex-1 px-5 md:px-[124px] pt-[52px]">
        <div className="max-w-[1192px] mx-auto flex flex-col gap-9">
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
              Ingressos geral
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
                onClick={() => router.push("/organizer/events/new/tickets/create")}
                variant="default"
                className="text-base font-bold font-manrope leading-[1.1]"
              >
                <Plus className="size-5" />
                Criar ingresso
              </Button>
            </div>
          </div>

          {allTickets.length > 0 && (
            <div className="rounded-xl">
              <div className="overflow-x-auto">
                <TicketTable
                  tickets={allTickets.slice(
                    ((currentPage.all || 1) - 1) * ITEMS_PER_PAGE,
                    ((currentPage.all || 1) - 1) * ITEMS_PER_PAGE + ITEMS_PER_PAGE
                  )}
                  currentPage={currentPage.all || 1}
                  totalPages={Math.ceil(allTickets.length / ITEMS_PER_PAGE)}
                  onPageChange={(page) => setCurrentPage({ ...currentPage, all: page })}
                  onEdit={handleEditTicket}
                  onDuplicate={handleDuplicateTicket}
                  duplicatingTicketId={duplicatingTicketId}
                  onRequestDeleteTicket={(id: string) => {
                    const t = allTickets.find((x) => x.id === id);
                    setTicketPendingDelete({
                      id,
                      name: t?.name?.trim() || "Ingresso",
                    });
                  }}
                  productsMap={productsMap}
                />
              </div>
            </div>
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
                    onClick={() => {
                      setEditingGroupId("new");
                      setNewGroupName("");
                    }}
                    className="bg-gray-2 border-[1.5px] border-gray-6 p-1 rounded-lg hover:bg-gray-3 transition-colors size-9 flex items-center justify-center cursor-pointer"
                  >
                    <PencilIcon className="size-5 text-gray-11" />
                  </button>
                  <button
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
                      onClick={() => {
                        setEditingGroupId("new");
                        setEditingGroupName("");
                      }}
                      className="bg-gray-2 border-[1.5px] border-gray-6 p-1 rounded-lg hover:bg-gray-3 transition-colors size-9 flex items-center justify-center"
                    >
                      <PencilIcon className="size-5 text-gray-11" />
                    </button>
                    <button
                      disabled
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
            <div className="flex flex-col gap-6">
              {categories.map((category) => {
                const { tickets: paginatedTickets, totalPages, currentPage: page } =
                  getPaginatedTickets(category.id);

                return (
                  <TicketCategoryCard
                    key={category.id}
                    category={category}
                    tickets={paginatedTickets}
                    currentPage={page}
                    totalPages={totalPages}
                    onEdit={handleUpdateGroupName}
                    onEditDescription={handleUpdateGroupDescription}
                    onDelete={handleDeleteGroup}
                    onEditTicket={handleEditTicket}
                    onDeleteTicket={handleDeleteTicket}
                    onPageChange={handlePageChange}
                    onDuplicateTicket={handleDuplicateTicket}
                    duplicatingTicketId={duplicatingTicketId}
                    productsMap={productsMap}
                    onDropTicket={handleDropTicket}
                  />
                );
              })}
            </div>
          )}

          <div className="flex justify-end">
            <Button
              onClick={() => router.push("/organizer/events/new/topics")}
              variant="default"
              className="text-[20px] font-bold px-10"
            >
              Confirmar ingressos
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
        ) : null}
      </DragOverlay>
      </DndContext>
    </>
  );
}
