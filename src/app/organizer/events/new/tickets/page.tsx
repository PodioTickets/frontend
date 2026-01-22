"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { userService } from "@/services";
import { organizerService } from "@/services";
import { useCreateEvent } from "@/contexts/CreateEventContext";
import { Button } from "@/components/Button";
import { ArrowButton } from "@/components/ArrowButton";
import Image from "next/image";
import toast from "react-hot-toast";
import { Plus, Edit, Trash2, Pencil, Download } from "lucide-react";
import type { ModalityGroup, Modality } from "@/services/organizer/OrganizerService";
import { PencilIcon } from "@/components/Icons/PencilIcon";
import { TrashIcon } from "@/components/Icons/TrashIcon";

export default function IngressosPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { formData } = useCreateEvent();
  const [authChecked, setAuthChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [modalityGroups, setModalityGroups] = useState<ModalityGroup[]>([]);
  const [modalities, setModalities] = useState<Modality[]>([]);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingGroupName, setEditingGroupName] = useState("");
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");

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

  const handleCreateGroup = async () => {
    if (!formData.createdEventId || !newGroupName.trim()) {
      toast.error("Nome da categoria é obrigatório");
      return;
    }
    try {
      await organizerService.createModalityGroup(formData.createdEventId, {
        name: newGroupName.trim(),
        order: modalityGroups.length,
      });
      toast.success("Categoria criada com sucesso!");
      setNewGroupName("");
      setShowCreateGroupModal(false);
    } catch (error: any) {
      console.error("Error creating group:", error);
      toast.error(error.response?.data?.message || "Erro ao criar categoria");
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
    if (!formData.createdEventId) return;
    if (!confirm("Tem certeza que deseja excluir esta categoria?")) {
      return;
    }
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
  };

  const handleBack = () => {
    router.push("/organizer/events/new/preview");
  };

  if (!authChecked || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-11">Carregando...</div>
      </div>
    );
  }

  // Se não há grupos, mostra o card vazio conforme o design
  const hasNoGroups = modalityGroups.length === 0;

  return (
    <div className="bg-gray-2 flex-1 pb-[176px] px-5 md:px-[124px] pt-[52px]">
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
        <div className="flex items-center justify-between">
          <h2 className="text-gray-12 text-xl font-bold font-manrope leading-[1.1]">
            Lista de ingressos
          </h2>
          <Button
            onClick={() => router.push("/organizer/events/new/tickets/create")}
            variant="default"
            className="text-base font-bold font-manrope leading-[1.1]"
          >
            <Plus className="size-5" />
            Criar ingresso
          </Button>
        </div>

        {/* Empty Card - Conforme design do Figma */}
        {hasNoGroups && (
          <div className="flex flex-col gap-11 items-end">
            <div className="bg-gray-3 border border-gray-6 rounded-xl p-5 w-full flex flex-col gap-6">
              {/* Title and Actions */}
              <div className="flex items-center justify-between flex-wrap gap-4">
                {editingGroupId === "new" ? (
                  <input
                    type="text"
                    value={editingGroupName}
                    onChange={(e) => setEditingGroupName(e.target.value)}
                    onBlur={() => {
                      if (editingGroupName.trim()) {
                        handleCreateGroup();
                      } else {
                        setEditingGroupId(null);
                        setEditingGroupName("");
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        if (editingGroupName.trim()) {
                          handleCreateGroup();
                        }
                      } else if (e.key === "Escape") {
                        setEditingGroupId(null);
                        setEditingGroupName("");
                      }
                    }}
                    className="text-gray-12 text-2xl font-bold font-manrope leading-[1.1] bg-transparent border-b border-gray-6 focus:outline-none focus:border-primary-8 flex-1"
                    placeholder="Adicione um nome a está categoria..."
                    autoFocus
                  />
                ) : (
                  <h3 className="text-gray-12 text-2xl font-bold font-manrope leading-[1.1]">
                    Adicione um nome a está categoria...
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
                    onClick={() => {
                      if (confirm("Tem certeza que deseja excluir esta categoria?")) {
                      }
                    }}
                    className="bg-red-2 border-[1.5px] border-red-6 p-1 rounded-lg hover:bg-red-3 transition-colors size-9 flex items-center justify-center"
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

              return (
                <div key={group.id} className="flex flex-col gap-6">
                  <div className="flex items-center justify-between">
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
                        className="bg-gray-2 border-[1.5px] border-gray-6 p-3 rounded-lg hover:bg-gray-3 transition-colors size-9 flex items-center justify-center"
                      >
                        <Edit className="size-5 text-gray-11" />
                      </button>
                      <button
                        onClick={() => handleDeleteGroup(group.id)}
                        className="bg-red-2 border-[1.5px] border-red-6 p-3 rounded-lg hover:bg-red-3 transition-colors size-9 flex items-center justify-center"
                      >
                        <Trash2 className="size-5 text-red-12" />
                      </button>
                    </div>
                  </div>
                  <div className="bg-gray-3 border border-gray-6 rounded-xl p-5">
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
              );
            })}
          </div>
        )}

        {/* Create Group Modal */}
        {showCreateGroupModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-gray-2 border border-gray-6 rounded-xl p-6 max-w-md w-full mx-4">
              <h3 className="text-gray-12 text-xl font-bold font-manrope mb-4">
                Nova categoria
              </h3>
              <input
                type="text"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="Nome da categoria"
                className="w-full h-12 px-4 border border-gray-6 rounded-lg bg-gray-2 text-gray-12 mb-4"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleCreateGroup();
                  } else if (e.key === "Escape") {
                    setShowCreateGroupModal(false);
                    setNewGroupName("");
                  }
                }}
                autoFocus
              />
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCreateGroupModal(false);
                    setNewGroupName("");
                  }}
                >
                  Cancelar
                </Button>
                <Button onClick={handleCreateGroup}>Criar</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div >
  );
}
