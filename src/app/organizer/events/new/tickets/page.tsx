"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { userService } from "@/services";
import { organizerService } from "@/services";
import { useCreateEvent } from "@/contexts/CreateEventContext";
import { Button } from "@/components/Button";
import { ArrowButton } from "@/components/ArrowButton";
import Image from "next/image";
import toast from "react-hot-toast";
import { Plus, Edit, Trash2, Pencil, ChevronLeft, ChevronRight, Minus } from "lucide-react";
import type { ModalityGroup, Modality } from "@/services/organizer/OrganizerService";
import { PencilIcon } from "@/components/Icons/PencilIcon";
import { TrashIcon } from "@/components/Icons/TrashIcon";
import { DistanceIcon } from "@/components/Icons/DistanceIcon";
import { CalendarIcon } from "@/components/Icons/CalendarIcon";
import { ClockIcon } from "@/components/Icons/ClockIcon";

// Interface para tickets (frontend only)
interface Ticket {
  id: string;
  name: string;
  groupId: string;
  modality: string;
  distance: string;
  distanceUnit: string;
  price: string;
  ageLimit?: {
    min?: number;
    max?: number;
  };
  gender?: string;
  products: string[];
  batches: Array<{
    id: string;
    quantity: string;
    price: string;
  }>;
  createdAt: string;
}

const ITEMS_PER_PAGE = 10;

// Mock tickets para desenvolvimento/teste
const mockTickets: Ticket[] = [
  {
    id: "mock_ticket_1",
    name: "3K Corrida Paulistana Prata",
    groupId: "uncategorized",
    modality: "Corrida de rua",
    distance: "3",
    distanceUnit: "KM",
    price: "R$ 100,00",
    ageLimit: undefined,
    gender: undefined,
    products: ["produto1", "produto2", "produto3", "produto4", "produto5", "produto6", "produto7"],
    batches: [
      { id: "1", quantity: "500", price: "R$ 100,00" }
    ],
    createdAt: new Date().toISOString(),
  },
  {
    id: "mock_ticket_2",
    name: "5K Corrida Paulistana Ouro",
    groupId: "uncategorized",
    modality: "Corrida de rua",
    distance: "5",
    distanceUnit: "KM",
    price: "R$ 150,00",
    ageLimit: { min: 18, max: 65 },
    gender: "all",
    products: ["produto1", "produto2", "produto3"],
    batches: [
      { id: "1", quantity: "300", price: "R$ 150,00" }
    ],
    createdAt: new Date().toISOString(),
  },
  {
    id: "mock_ticket_3",
    name: "10K Corrida Paulistana",
    groupId: "uncategorized",
    modality: "Corrida de rua",
    distance: "10",
    distanceUnit: "KM",
    price: "R$ 200,00",
    ageLimit: undefined,
    gender: undefined,
    products: ["produto1", "produto2"],
    batches: [
      { id: "1", quantity: "200", price: "R$ 200,00" }
    ],
    createdAt: new Date().toISOString(),
  },
  {
    id: "mock_ticket_4",
    name: "3K - Caminhada",
    groupId: "uncategorized",
    modality: "Caminhada",
    distance: "3",
    distanceUnit: "KM",
    price: "R$ 50,00",
    ageLimit: { min: 9, max: 11 },
    gender: undefined,
    products: ["produto1", "produto2", "produto3", "produto4"],
    batches: [
      { id: "1", quantity: "100", price: "R$ 50,00" }
    ],
    createdAt: new Date().toISOString(),
  },
];

export default function IngressosPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { formData } = useCreateEvent();
  const [authChecked, setAuthChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [modalityGroups, setModalityGroups] = useState<ModalityGroup[]>([]);
  const [modalities, setModalities] = useState<Modality[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingGroupName, setEditingGroupName] = useState("");
  const [showCreateGroupSection, setShowCreateGroupSection] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [currentPage, setCurrentPage] = useState<Record<string, number>>({});
  const [viewMode, setViewMode] = useState<Record<string, "table" | "cards">>({});

  // Função para carregar tickets do localStorage ou usar mock
  const loadTickets = useCallback(() => {
    // Se não há eventId, usar mocks diretamente
    if (!formData.createdEventId) {
      console.log("Sem eventId, usando mocks diretamente");
      setTickets(mockTickets);
      return;
    }

    const savedTickets = localStorage.getItem(`tickets_${formData.createdEventId}`);
    if (savedTickets) {
      try {
        const parsed = JSON.parse(savedTickets);
        // Se não há tickets salvos mas há dados no localStorage (array vazio), usar mocks
        if (Array.isArray(parsed) && parsed.length === 0) {
          console.log("Array vazio no localStorage, usando mocks");
          setTickets(mockTickets);
        } else {
          console.log("Tickets carregados do localStorage:", parsed);
          setTickets(parsed);
        }
      } catch (e) {
        console.error("Error loading tickets:", e);
        // Se houver erro ao carregar, usar mock
        console.log("Erro ao carregar, usando mocks");
        setTickets(mockTickets);
      }
    } else {
      console.log("Nenhum ticket encontrado no localStorage, usando mock");
      // Usar tickets mockados quando não há tickets salvos
      setTickets(mockTickets);
    }
  }, [formData.createdEventId]);

  // Carregar tickets do localStorage
  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  // Garantir que os mocks sejam carregados na inicialização se não houver tickets
  useEffect(() => {
    if (authChecked && !loading) {
      // Aguardar um pouco para garantir que loadTickets foi executado
      const timer = setTimeout(() => {
        if (tickets.length === 0) {
          const hasSavedTickets = formData.createdEventId
            ? localStorage.getItem(`tickets_${formData.createdEventId}`)
            : false;
          if (!hasSavedTickets) {
            console.log("Carregando tickets mockados na inicialização");
            setTickets(mockTickets);
          }
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [authChecked, loading, formData.createdEventId]);

  // Inicializar tickets mockados se não houver tickets após carregar
  useEffect(() => {
    // Se já carregou e autenticou, mas não há tickets, usar mocks
    if (authChecked && !loading && tickets.length === 0) {
      const hasSavedTickets = formData.createdEventId && localStorage.getItem(`tickets_${formData.createdEventId}`);
      if (!hasSavedTickets) {
        console.log("Inicializando tickets mockados");
        setTickets(mockTickets);
      }
    }
  }, [authChecked, loading, tickets.length, formData.createdEventId]);

  // Salvar tickets no localStorage quando mudarem
  useEffect(() => {
    if (tickets.length > 0 || localStorage.getItem(`tickets_${formData.createdEventId}`)) {
      localStorage.setItem(`tickets_${formData.createdEventId}`, JSON.stringify(tickets));
    }
  }, [tickets, formData.createdEventId]);

  // Verificar autenticação e carregar grupos
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

  // Carregar grupos de modalidades
  useEffect(() => {
    const loadGroups = async () => {
      if (!authChecked || !formData.createdEventId) return;
      setLoading(true);
      try {
        const groups = await organizerService.getModalityGroups(formData.createdEventId).catch(() => []);
        setModalityGroups(groups);
      } catch (error: any) {
        console.error("Error loading groups:", error);
      } finally {
        setLoading(false);
      }
    };
    loadGroups();
  }, [authChecked, formData.createdEventId]);

  // Inicializar viewMode quando grupos ou tickets mudarem
  useEffect(() => {
    if (modalityGroups.length > 0) {
      const initialViewMode: Record<string, "table" | "cards"> = {};
      modalityGroups.forEach(group => {
        const groupTickets = tickets.filter(t => t.groupId === group.id);
        initialViewMode[group.id] = groupTickets.length > 0 ? "cards" : "table";
      });
      setViewMode(prev => ({ ...prev, ...initialViewMode }));
    }
  }, [modalityGroups, tickets]);

  const handleCreateGroup = async (nameOverride?: string) => {
    const nameToUse = nameOverride || newGroupName.trim();

    if (!nameToUse) {
      toast.error("Nome da categoria é obrigatório");
      return;
    }

    if (!formData.createdEventId) {
      // Se não há eventId, criar localmente primeiro
      const tempId = `temp_${Date.now()}`;
      const newGroup: ModalityGroup = {
        id: tempId,
        name: nameToUse,
        order: modalityGroups.length,
        eventId: "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setModalityGroups([...modalityGroups, newGroup]);
      setViewMode({ ...viewMode, [tempId]: "table" });
      setCurrentPage({ ...currentPage, [tempId]: 1 });
      setNewGroupName("");
      setShowCreateGroupSection(false);
      setEditingGroupId(null);
      toast.success("Categoria criada com sucesso!");
      return;
    }

    try {
      const newGroup = await organizerService.createModalityGroup(formData.createdEventId, {
        name: nameToUse,
        order: modalityGroups.length,
      });
      setModalityGroups([...modalityGroups, newGroup]);
      setViewMode({ ...viewMode, [newGroup.id]: "table" });
      setCurrentPage({ ...currentPage, [newGroup.id]: 1 });
      toast.success("Categoria criada com sucesso!");
      setNewGroupName("");
      setShowCreateGroupSection(false);
      setEditingGroupId(null);
    } catch (error: any) {
      console.error("Error creating group:", error);
      toast.error(error.response?.data?.message || "Erro ao criar categoria");
    }
  };

  const handleCreateGroupInline = () => {
    if (!newGroupName.trim()) {
      toast.error("Nome da categoria é obrigatório");
      return;
    }
    // Criar grupo localmente primeiro (frontend only)
    const tempId = `temp_${Date.now()}`;
    const newGroup: ModalityGroup = {
      id: tempId,
      name: newGroupName.trim(),
      order: modalityGroups.length,
      eventId: formData.createdEventId || "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setModalityGroups([...modalityGroups, newGroup]);
    setViewMode({ ...viewMode, [tempId]: "table" });
    setCurrentPage({ ...currentPage, [tempId]: 1 });
    setNewGroupName("");
    setEditingGroupId(null);

    // Tentar criar no backend também
    if (formData.createdEventId) {
      organizerService.createModalityGroup(formData.createdEventId, {
        name: newGroupName.trim(),
        order: modalityGroups.length,
      }).then((createdGroup) => {
        setModalityGroups(prev => prev.map(g => g.id === tempId ? createdGroup : g));
      }).catch(() => {
        // Se falhar, mantém o grupo local
      });
    }
  };

  const handleUpdateGroupName = async (groupId: string) => {
    if (!formData.createdEventId || !editingGroupName.trim()) {
      return;
    }
    try {
      await organizerService.updateModalityGroup(
        formData.createdEventId,
        groupId,
        { name: editingGroupName.trim() }
      );
      toast.success("Categoria atualizada com sucesso!");
      setEditingGroupId(null);
      setEditingGroupName("");
    } catch (error: any) {
      console.error("Error updating group:", error);
      toast.error(error.response?.data?.message || "Erro ao atualizar categoria");
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!confirm("Tem certeza que deseja excluir esta categoria?")) {
      return;
    }

    // Remover tickets associados
    setTickets(prev => prev.filter(t => t.groupId !== groupId));

    // Remover grupo
    setModalityGroups(prev => prev.filter(g => g.id !== groupId));

    // Tentar deletar no backend
    if (formData.createdEventId && !groupId.startsWith("temp_")) {
      try {
        await organizerService.deleteModalityGroup(
          formData.createdEventId,
          groupId
        );
        toast.success("Categoria excluída com sucesso!");
      } catch (error: any) {
        console.error("Error deleting group:", error);
        toast.error(error.response?.data?.message || "Erro ao excluir categoria");
      }
    } else {
      toast.success("Categoria excluída com sucesso!");
    }
  };

  const handleDeleteTicket = (ticketId: string) => {
    if (!confirm("Tem certeza que deseja excluir este ingresso?")) {
      return;
    }
    setTickets(prev => prev.filter(t => t.id !== ticketId));
    toast.success("Ingresso excluído com sucesso!");
  };

  const handleEditTicket = (ticketId: string) => {
    router.push(`/organizer/events/new/tickets/create?ticketId=${ticketId}`);
  };

  const getTicketsByGroup = (groupId: string) => {
    return tickets.filter(t => t.groupId === groupId);
  };

  const getPaginatedTickets = (groupId: string) => {
    const groupTickets = getTicketsByGroup(groupId);
    const page = currentPage[groupId] || 1;
    const start = (page - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    return {
      tickets: groupTickets.slice(start, end),
      totalPages: Math.ceil(groupTickets.length / ITEMS_PER_PAGE),
      currentPage: page,
    };
  };

  const formatAgeLimit = (ticket: Ticket) => {
    if (!ticket.ageLimit) return "Não";
    const { min, max } = ticket.ageLimit;
    if (min && max) return `${min}-${max}`;
    if (min) return `+${min}`;
    if (max) return `-${max}`;
    return "Não";
  };

  const formatPrice = (price: string) => {
    if (!price) return "R$ 0,00";
    return price.startsWith("R$") ? price : `R$ ${price}`;
  };

  const handleBack = () => {
    router.push("/organizer/events/new/preview");
  };

  // Listener para quando um ticket é criado na página de criação
  useEffect(() => {
    const handleStorageChange = () => {
      loadTickets();
      // Atualizar viewMode para grupos com tickets
      const savedTickets = localStorage.getItem(`tickets_${formData.createdEventId}`);
      if (savedTickets) {
        try {
          const parsed = JSON.parse(savedTickets);
          const updatedViewMode: Record<string, "table" | "cards"> = {};
          modalityGroups.forEach(group => {
            const groupTickets = parsed.filter((t: Ticket) => t.groupId === group.id);
            updatedViewMode[group.id] = groupTickets.length > 0 ? "cards" : "table";
          });
          setViewMode(prev => ({ ...prev, ...updatedViewMode }));
        } catch (e) {
          console.error("Error updating viewMode:", e);
        }
      }
    };

    // Evento customizado disparado quando um ticket é criado
    window.addEventListener("ticketCreated", handleStorageChange);
    window.addEventListener("storage", handleStorageChange);
    // Também verificar quando a página recebe foco (volta da criação)
    window.addEventListener("focus", handleStorageChange);

    // Recarregar quando o componente monta (volta da criação)
    loadTickets();

    return () => {
      window.removeEventListener("ticketCreated", handleStorageChange);
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("focus", handleStorageChange);
    };
  }, [formData.createdEventId, modalityGroups, loadTickets]);

  if (!authChecked || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-11">Carregando...</div>
      </div>
    );
  }

  const allTickets = tickets;
  const hasNoGroups = modalityGroups.length === 0;

  // Debug: verificar estado (remover depois)
  if (typeof window !== 'undefined') {
    console.log("🔍 Debug Tickets:", {
      ticketsCount: tickets.length,
      allTicketsCount: allTickets.length,
      hasNoGroups,
      modalityGroupsCount: modalityGroups.length,
      formDataCreatedEventId: formData.createdEventId
    });
  }

  return (
    <div className=" flex-1 pb-[176px] px-5 md:px-[124px] pt-[52px]">
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
          <p className="text-gray-11 text-base font-dm-sans leading-[1.3]">
            Crie categorias e ingressos com lotes, valores e regras. Depois,
            vincule um kit para o participante configurar durante a inscrição
          </p>
        </div>

        {/* Header with Actions */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <h2 className="text-gray-12 text-xl font-bold font-manrope leading-[1.1]">
            Lista de ingressos
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

        {/* Main Tickets Table - Show all tickets if no groups */}
        {allTickets.length > 0 && (
          <div className=" border border-gray-6 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-2 border-b border-gray-6">
                  <tr>
                    <th className="text-left py-4 px-5 text-gray-12 text-sm font-medium font-dm-sans">Nome do ingresso</th>
                    <th className="text-center py-4 px-5 text-gray-12 text-sm font-medium font-dm-sans">L. de idade</th>
                    <th className="text-center py-4 px-5 text-gray-12 text-sm font-medium font-dm-sans">Preço</th>
                    <th className="text-center py-4 px-5 text-gray-12 text-sm font-medium font-dm-sans">Modalidade/Distância</th>
                    <th className="text-center py-4 px-5 text-gray-12 text-sm font-medium font-dm-sans">Produtos relacionados</th>
                    <th className="text-center py-4 px-5 text-gray-12 text-sm font-medium font-dm-sans">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {allTickets.slice(((currentPage.all || 1) - 1) * ITEMS_PER_PAGE, ((currentPage.all || 1) - 1) * ITEMS_PER_PAGE + ITEMS_PER_PAGE).map((ticket) => (
                    <tr key={ticket.id} className="border-b border-gray-6 hover:bg-gray-2 transition-colors last:border-b-0">
                      <td className="py-2 px-5 text-gray-12 text-sm font-semibold font-dm-sans">{ticket.name}</td>
                      <td className="py-2 px-5 text-gray-12 text-sm text-center font-semibold font-dm-sans">{formatAgeLimit(ticket)}</td>
                      <td className="py-2 px-5 text-gray-12 text-sm text-center font-semibold font-dm-sans">{formatPrice(ticket.price)}</td>
                      <td className="py-2 px-5 text-gray-12 text-sm text-center font-semibold font-dm-sans flex flex-col">
                        <span>{ticket.modality}</span>
                        <span className="text-gray-11 text-sm font-dm-sans font-medium">
                          {ticket.distance}{ticket.distanceUnit}
                        </span>
                      </td>
                      <td className="py-2 px-5">
                        <div className="flex gap-1 items-center justify-center">
                          {ticket.products.slice(0, 3).map((product, idx) => (
                            <div key={idx} className="size-8 bg-primary-3 rounded border border-primary-6 flex items-center justify-center">
                              <span className="text-xs text-primary-12">P</span>
                            </div>
                          ))}
                          {ticket.products.length > 3 && (
                            <div className="size-8 bg-gray-3 rounded border border-gray-6 flex items-center justify-center">
                              <span className="text-xs text-gray-11">+{ticket.products.length - 3}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-5">
                        <div className="flex gap-2 items-center">
                          <button
                            onClick={() => handleEditTicket(ticket.id)}
                            className="size-8 bg-gray-2 border border-gray-6 rounded-lg flex items-center justify-center hover:bg-gray-3 transition-colors"
                          >
                            <Pencil className="size-5 text-gray-11" />
                          </button>
                          <button
                            className="size-8 bg-blue-2 border border-blue-6 rounded-lg flex items-center justify-center hover:bg-blue-3 transition-colors"
                          >
                            <Plus className="size-5 text-blue-12" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            {Math.ceil(allTickets.length / ITEMS_PER_PAGE) > 1 && (
              <div className="flex items-center justify-center gap-2 py-4 px-5 border-t border-gray-6">
                <button
                  onClick={() => setCurrentPage({ ...currentPage, all: (currentPage.all || 1) - 1 })}
                  disabled={(currentPage.all || 1) === 1}
                  className="size-8 flex items-center justify-center border border-gray-6 rounded-lg hover:bg-gray-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="size-4" />
                </button>
                {Array.from({ length: Math.ceil(allTickets.length / ITEMS_PER_PAGE) }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage({ ...currentPage, all: page })}
                    className={`size-8 flex items-center justify-center border rounded-lg ${(currentPage.all || 1) === page
                      ? "bg-[#59E373] border-[#59E373] text-gray-12"
                      : "border-gray-6 hover:bg-gray-3"
                      }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage({ ...currentPage, all: (currentPage.all || 1) + 1 })}
                  disabled={(currentPage.all || 1) >= Math.ceil(allTickets.length / ITEMS_PER_PAGE)}
                  className="size-8 flex items-center justify-center border border-gray-6 rounded-lg hover:bg-gray-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {showCreateGroupSection && (
          <div className="flex flex-col gap-6 bg-gray-3 border border-gray-6 rounded-xl p-5">
            {/* Category Header */}
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
                  className="bg-gray-2 border-[1.5px] border-gray-6 p-1 rounded-lg hover:bg-gray-3 transition-colors size-9 flex items-center justify-center"
                >
                  <PencilIcon className="size-5 text-gray-11" />
                </button>
                <button
                  onClick={() => {
                    setShowCreateGroupSection(false);
                    setEditingGroupId(null);
                    setNewGroupName("");
                  }}
                  className="bg-red-2 border-[1.5px] border-red-6 p-1 rounded-lg hover:bg-red-3 transition-colors size-9 flex items-center justify-center"
                >
                  <TrashIcon className="size-5 text-red-12" />
                </button>
              </div>
            </div>

            {/* Empty Table */}
            <div className=" border border-gray-6 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-2 border-b border-gray-6">
                    <tr>
                      <th className="text-left py-4 px-5 text-gray-12 text-sm font-semibold font-dm-sans">Nome do ingresso</th>
                      <th className="text-left py-4 px-5 text-gray-12 text-sm font-semibold font-dm-sans">L. de idade</th>
                      <th className="text-left py-4 px-5 text-gray-12 text-sm font-semibold font-dm-sans">Preço</th>
                      <th className="text-left py-4 px-5 text-gray-12 text-sm font-semibold font-dm-sans">Modalidade/Distância</th>
                      <th className="text-left py-4 px-5 text-gray-12 text-sm font-semibold font-dm-sans">Produtos relacionados</th>
                      <th className="text-left py-4 px-5 text-gray-12 text-sm font-semibold font-dm-sans">Ações</th>
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
        {hasNoGroups && allTickets.length === 0 && (
          <div className="flex flex-col gap-11 items-end">
            <div className=" border border-gray-6 rounded-xl p-5 w-full flex flex-col gap-6">
              {/* Title and Actions */}
              <div className="flex items-center justify-between flex-wrap gap-4">
                {editingGroupId === "new" ? (
                  <input
                    type="text"
                    value={editingGroupName}
                    onChange={(e) => setEditingGroupName(e.target.value)}
                    onBlur={() => {
                      if (editingGroupName.trim()) {
                        handleCreateGroupInline();
                      } else {
                        setEditingGroupId(null);
                        setEditingGroupName("");
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        if (editingGroupName.trim()) {
                          handleCreateGroupInline();
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
                    <TrashIcon className="size-5 text-red-12" />
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

            {/* Action Buttons */}
            <div className="flex gap-2 items-start">
              <Button variant="outline" className="border-gray-6 text-gray-12 text-[20px] font-bold px-10">
                Salvar rascunho
              </Button>
              <Button
                onClick={() => router.push("/organizer/events/new/topics")}
                variant="default"
                className="text-gray-12 text-[20px] font-bold px-10"
              >
                Confirmar ingressos
              </Button>
            </div>
          </div>
        )}

        {/* Groups List */}
        {!hasNoGroups && (
          <div className="flex flex-col gap-6">
            {modalityGroups.map((group) => {
              const isEditing = editingGroupId === group.id;
              const groupTickets = getTicketsByGroup(group.id);
              const { tickets: paginatedTickets, totalPages, currentPage: page } = getPaginatedTickets(group.id);
              const mode = viewMode[group.id] || (groupTickets.length > 0 ? "cards" : "table");

              return (
                <div key={group.id} className="flex flex-col gap-6 bg-gray-3 border border-gray-6 rounded-xl p-5">
                  {/* Group Header */}
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    {isEditing ? (
                      <input
                        type="text"
                        value={editingGroupName}
                        onChange={(e) => setEditingGroupName(e.target.value)}
                        onBlur={() => handleUpdateGroupName(group.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleUpdateGroupName(group.id);
                          } else if (e.key === "Escape") {
                            setEditingGroupId(null);
                            setEditingGroupName("");
                          }
                        }}
                        className="text-gray-12 text-2xl font-bold font-manrope leading-[1.1] bg-transparent border-b border-gray-6 focus:outline-none focus:border-primary-8"
                        autoFocus
                      />
                    ) : (
                      <h3 className="text-gray-12 text-2xl font-bold font-manrope leading-[1.1]">
                        {group.name}
                      </h3>
                    )}
                    <div className="flex gap-[10px] items-center">
                      <button
                        onClick={() => {
                          setEditingGroupId(group.id);
                          setEditingGroupName(group.name);
                        }}
                        className="bg-gray-2 border-[1.5px] border-gray-6 p-1 rounded-lg hover:bg-gray-3 transition-colors size-9 flex items-center justify-center"
                      >
                        <PencilIcon className="size-5 text-gray-11" />
                      </button>
                      <button
                        onClick={() => handleDeleteGroup(group.id)}
                        className="bg-red-2 border-[1.5px] border-red-6 p-1 rounded-lg hover:bg-red-3 transition-colors size-9 flex items-center justify-center"
                      >
                        <TrashIcon className="size-5 text-red-12" />
                      </button>
                    </div>
                  </div>

                  {/* Tickets Content */}
                  {groupTickets.length === 0 ? (
                    <div className=" border border-gray-6 rounded-xl p-5">
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
                  ) : mode === "table" ? (
                    <div className=" border border-gray-6 rounded-xl overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-2 border-b border-gray-6">
                            <tr>
                              <th className="text-left py-4 px-5 text-gray-12 text-sm font-semibold font-dm-sans">Nome do ingresso</th>
                              <th className="text-left py-4 px-5 text-gray-12 text-sm font-semibold font-dm-sans">L. de idade</th>
                              <th className="text-left py-4 px-5 text-gray-12 text-sm font-semibold font-dm-sans">Preço</th>
                              <th className="text-left py-4 px-5 text-gray-12 text-sm font-semibold font-dm-sans">Modalidade/Distância</th>
                              <th className="text-left py-4 px-5 text-gray-12 text-sm font-semibold font-dm-sans">Produtos relacionados</th>
                              <th className="text-left py-4 px-5 text-gray-12 text-sm font-semibold font-dm-sans">Ações</th>
                            </tr>
                          </thead>
                          <tbody>
                            {paginatedTickets.map((ticket) => (
                              <tr key={ticket.id} className="border-b border-gray-6 hover:bg-gray-2 transition-colors last:border-b-0">
                                <td className="py-4 px-5 text-gray-12 text-sm font-semibold font-dm-sans">{ticket.name}</td>
                                <td className="py-4 px-5 text-gray-11 text-sm font-semibold font-dm-sans">{formatAgeLimit(ticket)}</td>
                                <td className="py-4 px-5 text-gray-12 text-sm font-semibold font-dm-sans">{formatPrice(ticket.price)}</td>
                                <td className="py-4 px-5 text-gray-11 text-sm font-semibold font-dm-sans">
                                  {ticket.modality}{ticket.distance && ` ${ticket.distance}${ticket.distanceUnit}`}
                                </td>
                                <td className="py-4 px-5">
                                  <div className="flex gap-1 items-center">
                                    {ticket.products.slice(0, 3).map((product, idx) => (
                                      <div key={idx} className="size-8 bg-primary-3 rounded border border-primary-6 flex items-center justify-center">
                                        <span className="text-xs text-primary-12">P</span>
                                      </div>
                                    ))}
                                    {ticket.products.length > 3 && (
                                      <div className="size-8 bg-gray-3 rounded border border-gray-6 flex items-center justify-center">
                                        <span className="text-xs text-gray-11">+{ticket.products.length - 3}</span>
                                      </div>
                                    )}
                                  </div>
                                </td>
                                <td className="py-4 px-5">
                                  <div className="flex gap-2 items-center">
                                    <button
                                      onClick={() => handleEditTicket(ticket.id)}
                                      className="size-8 bg-gray-2 border border-gray-6 rounded-lg flex items-center justify-center hover:bg-gray-3 transition-colors"
                                    >
                                      <Pencil className="size-4 text-gray-11" />
                                    </button>
                                    <button
                                      onClick={() => router.push("/organizer/events/new/tickets/create")}
                                      className="size-8 bg-blue-2 border border-blue-6 rounded-full flex items-center justify-center hover:bg-blue-3 transition-colors"
                                    >
                                      <Plus className="size-4 text-blue-12" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {/* Pagination */}
                      {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-2 py-4 px-5 border-t border-gray-6">
                          <button
                            onClick={() => setCurrentPage({ ...currentPage, [group.id]: page - 1 })}
                            disabled={page === 1}
                            className="size-8 flex items-center justify-center border border-gray-6 rounded-lg hover:bg-gray-3 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <ChevronLeft className="size-4" />
                          </button>
                          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                            <button
                              key={p}
                              onClick={() => setCurrentPage({ ...currentPage, [group.id]: p })}
                              className={`size-8 flex items-center justify-center border rounded-lg ${page === p
                                ? "bg-[#59E373] border-[#59E373] text-gray-12"
                                : "border-gray-6 hover:bg-gray-3"
                                }`}
                            >
                              {p}
                            </button>
                          ))}
                          <button
                            onClick={() => setCurrentPage({ ...currentPage, [group.id]: page + 1 })}
                            disabled={page >= totalPages}
                            className="size-8 flex items-center justify-center border border-gray-6 rounded-lg hover:bg-gray-3 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <ChevronRight className="size-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className=" border border-gray-6 rounded-xl p-5">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {paginatedTickets.map((ticket, index) => (
                          <div key={ticket.id} className="bg-gray-2 border border-gray-6 rounded-xl p-5 flex flex-col gap-4">
                            <div className="flex items-start justify-between">
                              <h4 className="text-gray-12 text-lg font-bold font-manrope">{ticket.name}</h4>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleEditTicket(ticket.id)}
                                  className="size-8 bg-blue-2 border border-blue-6 rounded-lg flex items-center justify-center hover:bg-blue-3 transition-colors"
                                >
                                  <Pencil className="size-4 text-blue-12" />
                                </button>
                                <button
                                  onClick={() => handleDeleteTicket(ticket.id)}
                                  className="size-8 bg-red-2 border border-red-6 rounded-lg flex items-center justify-center hover:bg-red-3 transition-colors"
                                >
                                  <Trash2 className="size-4 text-red-12" />
                                </button>
                              </div>
                            </div>

                            <div className="flex gap-4 items-center text-sm text-gray-11 font-dm-sans">
                              {ticket.distance && (
                                <div className="flex gap-1 items-center">
                                  <DistanceIcon className="size-4" />
                                  <span>{ticket.distance}{ticket.distanceUnit}</span>
                                </div>
                              )}
                              <div className="flex gap-1 items-center">
                                <CalendarIcon className="size-4" />
                                <span>15/12/2025</span>
                              </div>
                              <div className="flex gap-1 items-center">
                                <ClockIcon className="size-4" />
                                <span>1:30 PM</span>
                              </div>
                            </div>

                            {ticket.ageLimit && (
                              <div className="bg-yellow-2 border border-yellow-6 rounded-full px-3 py-1 w-fit">
                                <span className="text-yellow-12 text-xs font-dm-sans">
                                  Limite de idade: de {ticket.ageLimit.min || 0} a {ticket.ageLimit.max || 0} anos
                                </span>
                              </div>
                            )}

                            <div className="text-gray-12 text-xl font-bold font-manrope">
                              {formatPrice(ticket.price)}
                            </div>

                            <div className="flex items-center gap-2">
                              <button className="size-8 border border-gray-6 rounded-lg flex items-center justify-center hover:bg-gray-3">
                                <Minus className="size-4 text-gray-11" />
                              </button>
                              <span className="text-gray-12 font-dm-sans">0</span>
                              <button className="size-8 border border-gray-6 rounded-lg flex items-center justify-center hover:bg-gray-3">
                                <Plus className="size-4 text-gray-11" />
                              </button>
                            </div>

                            {ticket.products.length > 0 && (
                              <div className="flex gap-1 items-center">
                                {ticket.products.slice(0, 3).map((product, idx) => (
                                  <div key={idx} className="size-8 bg-primary-3 rounded border border-primary-6 flex items-center justify-center">
                                    <span className="text-xs text-primary-12">P</span>
                                  </div>
                                ))}
                                {ticket.products.length > 3 && (
                                  <div className="size-8 bg-gray-3 rounded border border-gray-6 flex items-center justify-center">
                                    <span className="text-xs text-gray-11">+{ticket.products.length - 3}</span>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Rascunhos button - show only on first card if it has age limit */}
                            {index === 0 && ticket.ageLimit && (
                              <button className="w-fit px-4 py-2 bg-gray-3 border border-gray-6 rounded-lg text-gray-12 text-sm font-dm-sans hover:bg-gray-4 transition-colors">
                                Rascunhos
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                      {/* Pagination for cards */}
                      {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-2 pt-4 mt-4 border-t border-gray-6">
                          <button
                            onClick={() => setCurrentPage({ ...currentPage, [group.id]: page - 1 })}
                            disabled={page === 1}
                            className="size-8 flex items-center justify-center border border-gray-6 rounded-lg hover:bg-gray-3 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <ChevronLeft className="size-4" />
                          </button>
                          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                            <button
                              key={p}
                              onClick={() => setCurrentPage({ ...currentPage, [group.id]: p })}
                              className={`size-8 flex items-center justify-center border rounded-lg ${page === p
                                ? "bg-[#59E373] border-[#59E373] text-gray-12"
                                : "border-gray-6 hover:bg-gray-3"
                                }`}
                            >
                              {p}
                            </button>
                          ))}
                          <button
                            onClick={() => setCurrentPage({ ...currentPage, [group.id]: page + 1 })}
                            disabled={page >= totalPages}
                            className="size-8 flex items-center justify-center border border-gray-6 rounded-lg hover:bg-gray-3 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <ChevronRight className="size-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
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
  );
}
