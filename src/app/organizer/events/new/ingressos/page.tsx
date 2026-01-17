"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { userService } from "@/services";
import { organizerService } from "@/services";
import { useCreateEvent } from "@/contexts/CreateEventContext";
import { Button } from "@/components/Button";
import { ArrowButton } from "@/components/ArrowButton";
import { CalendarIcon } from "@/components/Icons/CalendarIcon";
import { DistanceIcon } from "@/components/Icons/DistanceIcon";
import { ClockIcon } from "@/components/Icons/ClockIcon";
import Image from "next/image";
import toast from "react-hot-toast";
import { Plus, Edit, Trash2, Pencil, Minus } from "lucide-react";
import type { ModalityGroup, Modality } from "@/services/organizer/OrganizerService";

export default function IngressosPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { formData } = useCreateEvent();
  const [authChecked, setAuthChecked] = useState(false);
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    if (authChecked && !isAuthenticated) {
      const hasToken = userService.isAuthenticated();
      if (!hasToken) {
        router.push("/");
      }
    }
  }, [authChecked, isAuthenticated, router]);

  // Verificar se tem evento criado
  useEffect(() => {
    if (authChecked && !formData.createdEventId) {
      router.push("/organizer/events/new/informacoes");
    }
  }, [authChecked, formData.createdEventId, router]);

  // Carregar dados
  useEffect(() => {
    if (authChecked && formData.createdEventId) {
      loadData();
    }
  }, [authChecked, formData.createdEventId]);

  const loadData = async () => {
    if (!formData.createdEventId) return;
    try {
      setLoading(true);
      const [groupsData, modalitiesData] = await Promise.all([
        organizerService.getModalityGroups(formData.createdEventId),
        organizerService.getModalities(formData.createdEventId),
      ]);
      setModalityGroups(groupsData.sort((a, b) => a.order - b.order));
      setModalities(modalitiesData.sort((a, b) => a.order - b.order));
    } catch (error: any) {
      console.error("Error loading data:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

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
      loadData();
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
      loadData();
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
      loadData();
    } catch (error: any) {
      console.error("Error deleting group:", error);
      toast.error(error.response?.data?.message || "Erro ao excluir categoria");
    }
  };

  const handleDeleteModality = async (modalityId: string) => {
    if (!formData.createdEventId) return;
    if (!confirm("Tem certeza que deseja excluir este ingresso?")) {
      return;
    }
    try {
      await organizerService.deleteModality(
        formData.createdEventId,
        modalityId
      );
      toast.success("Ingresso excluído com sucesso!");
      loadData();
    } catch (error: any) {
      console.error("Error deleting modality:", error);
      toast.error(error.response?.data?.message || "Erro ao excluir ingresso");
    }
  };

  const handleBack = () => {
    router.push("/organizer/events/new/previa");
  };

  const handleNext = () => {
    router.push("/organizer/events/new/evento");
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(price);
  };

  const getModalitiesByGroup = (groupId: string) => {
    // Por enquanto, retornamos todas as modalities
    // Quando o backend suportar groupId nas modalities, filtrar aqui
    return modalities;
  };

  if (!authChecked || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-11">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="bg-gray-2 flex-1 pb-[176px] px-5 md:px-[124px] pt-[52px]">
      <div className="max-w-[1192px] mx-auto flex flex-col gap-9">
        {/* Title Section */}
        <div className="flex flex-col gap-4">
          <div className="flex gap-3 items-center">
            <button
              onClick={handleBack}
              className="border border-gray-6 rounded-[52px] size-9 flex items-center justify-center hover:bg-gray-3 transition-colors rotate-180"
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
          <div className="flex gap-2 items-center">
            <Button
              variant="outline"
              onClick={() => setShowCreateGroupModal(true)}
              className="h-11 px-5 border-gray-6"
            >
              <Plus className="size-5" />
              Adicionar categoria
            </Button>
            <Button className="h-11 px-5">
              <Plus className="size-5" />
              Adicionar ingresso
            </Button>
          </div>
        </div>

        {/* Modality Groups */}
        <div className="flex flex-col gap-6">
          {/* Default Group: "Ingressos geral" */}
          <div className="flex flex-col gap-6">
            <h3 className="text-gray-12 text-2xl font-bold font-manrope leading-[1.1]">
              Ingressos geral
            </h3>
            <div className="flex flex-wrap gap-4">
              {modalities.length === 0 ? (
                <div className="bg-gray-3 border border-gray-6 rounded-xl p-5 flex flex-col gap-8 items-center justify-center min-h-[200px] w-full">
                  <div className="flex flex-col gap-5 items-center">
                    <Image
                      src="/icons-3d/Icon3D-Busca-sem-resultado.webp"
                      alt="Empty"
                      width={64}
                      height={64}
                    />
                    <p className="text-gray-12 text-xl font-semibold font-manrope leading-[1.1]">
                      Arraste um ingresso para este campo
                    </p>
                  </div>
                </div>
              ) : (
                modalities.map((modality) => (
                  <ModalityCard
                    key={modality.id}
                    modality={modality}
                    onDelete={() => handleDeleteModality(modality.id)}
                    formatDate={formatDate}
                    formatPrice={formatPrice}
                  />
                ))
              )}
            </div>
          </div>

          {/* Custom Groups */}
          {modalityGroups.map((group) => {
            const groupModalities = getModalitiesByGroup(group.id);
            const isEditing = editingGroupId === group.id;

            return (
              <div key={group.id} className="flex flex-col gap-6">
                <div className="flex items-center justify-between">
                  {isEditing ? (
                    <div className="flex gap-2 items-center">
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
                    </div>
                  ) : (
                    <div className="flex gap-2 items-center">
                      <h3 className="text-gray-12 text-2xl font-bold font-manrope leading-[1.1]">
                        {group.name}
                      </h3>
                      <button
                        onClick={() => {
                          setEditingGroupId(group.id);
                          setEditingGroupName(group.name);
                        }}
                        className="p-1 hover:bg-gray-3 rounded transition-colors"
                      >
                        <Pencil className="size-5 text-gray-11" />
                      </button>
                    </div>
                  )}
                  <button
                    onClick={() => handleDeleteGroup(group.id)}
                    className="bg-red-2 border-[1.5px] border-red-6 p-3 rounded-lg hover:bg-red-3 transition-colors"
                  >
                    <Trash2 className="size-5 text-red-12" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-4">
                  {groupModalities.length === 0 ? (
                    <div className="bg-gray-3 border border-gray-6 rounded-xl p-5 flex flex-col gap-8 items-center justify-center min-h-[200px] w-full">
                      <div className="flex flex-col gap-5 items-center">
                        <Image
                          src="/icons-3d/Icon3D-Busca-sem-resultado.webp"
                          alt="Empty"
                          width={64}
                          height={64}
                        />
                        <p className="text-gray-12 text-xl font-semibold font-manrope leading-[1.1]">
                          Arraste um ingresso para este campo
                        </p>
                      </div>
                    </div>
                  ) : (
                    groupModalities.map((modality) => (
                      <ModalityCard
                        key={modality.id}
                        modality={modality}
                        onDelete={() => handleDeleteModality(modality.id)}
                        formatDate={formatDate}
                        formatPrice={formatPrice}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}

          {/* Empty Group Placeholder */}
          {modalityGroups.length === 0 && modalities.length === 0 && (
            <div className="bg-gray-3 border border-gray-6 rounded-xl p-5 flex flex-col gap-8 items-center justify-center min-h-[200px]">
              <div className="flex flex-col gap-5 items-center">
                <Image
                  src="/icons-3d/Icon3D-Busca-sem-resultado.webp"
                  alt="Empty"
                  width={64}
                  height={64}
                />
                <p className="text-gray-12 text-xl font-semibold font-manrope leading-[1.1]">
                  Arraste um ingresso para este campo
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Next Button */}
        <div className="flex justify-center">
          <Button onClick={handleNext} className="h-[52px] px-11 text-xl font-bold font-manrope">
            Próxima etapa
          </Button>
        </div>
      </div>

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
  );
}

interface ModalityCardProps {
  modality: Modality;
  onDelete: () => void;
  formatDate: (date: string) => string;
  formatPrice: (price: number) => string;
}

function ModalityCard({
  modality,
  onDelete,
  formatDate,
  formatPrice,
}: ModalityCardProps) {
  const [quantity, setQuantity] = useState(0);

  return (
    <div className="bg-gray-2 border border-gray-6 rounded-xl p-5 flex flex-col gap-6 min-w-[519px] flex-1">
      {/* Top Section */}
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-5">
          <h4 className="text-gray-12 text-xl font-bold font-manrope leading-[1.1]">
            {modality.name}
          </h4>
          <div className="flex gap-8 items-start">
            {/* Distance - placeholder */}
            <div className="flex gap-2 items-center">
              <DistanceIcon className="size-6 text-gray-12" />
              <p className="text-gray-12 text-lg font-medium font-dm-sans">
                0.3 Km
              </p>
            </div>
            {/* Date - placeholder */}
            <div className="flex gap-2 items-center">
              <CalendarIcon className="size-6 text-gray-12" />
              <p className="text-gray-12 text-lg font-medium font-dm-sans">
                {formatDate(new Date().toISOString())}
              </p>
            </div>
            {/* Time - placeholder */}
            <div className="flex gap-2 items-center">
              <ClockIcon className="size-6 text-gray-12" />
              <p className="text-gray-12 text-lg font-medium font-dm-sans">
                1:30 PM
              </p>
            </div>
          </div>
        </div>
        {/* Age Limit Tag - placeholder */}
        <div className="bg-yellow-3 px-4 py-3 rounded-full w-fit">
          <p className="text-yellow-12 text-base font-medium font-dm-sans">
            Limite de idade: de 9 a 11 anos
          </p>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <p className="text-gray-12 text-xl font-bold font-manrope leading-[1.1]">
            {formatPrice(modality.price)}
          </p>
          {/* Custom Stepper */}
          <div className="bg-primary-3 flex items-center justify-center p-2 rounded-full w-[141px]">
            <button
              type="button"
              onClick={() => setQuantity(Math.max(0, quantity - 1))}
              disabled={quantity === 0}
              className={`bg-gray-12 rounded-full size-6 flex items-center justify-center p-1 ${
                quantity === 0 ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
              }`}
            >
              <Minus className="size-4 text-white" />
            </button>
            <span className="px-6 text-gray-12 text-lg font-semibold font-manrope">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => setQuantity(quantity + 1)}
              className="bg-gray-12 rounded-full size-6 flex items-center justify-center p-1 cursor-pointer"
            >
              <Plus className="size-4 text-white" />
            </button>
          </div>
        </div>

        {/* Kit Images - placeholder */}
        <div className="bg-gray-2 border border-gray-6 rounded-lg p-3 flex gap-2 items-center overflow-x-auto">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="relative rounded-xl size-[67px] shrink-0 border border-gray-6 overflow-hidden"
            >
              <Image
                src="/banners/card_placeholder.png"
                alt="Kit"
                fill
                className="object-cover"
              />
              {i === 6 && (
                <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
                  <Plus className="size-6 text-white" />
                  <span className="text-white text-lg font-extrabold ml-1">4</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <div className="bg-gray-5 px-4 py-3 rounded-full">
            <p className="text-gray-12 text-base font-normal font-dm-sans">
              Rascunhos
            </p>
          </div>
          <div className="flex gap-2 items-center">
            <button className="bg-gray-2 border-[1.5px] border-gray-6 p-3 rounded-lg hover:bg-gray-3 transition-colors">
              <Edit className="size-5 text-gray-11" />
            </button>
            <button
              onClick={onDelete}
              className="bg-red-2 border-[1.5px] border-red-6 p-3 rounded-lg hover:bg-red-3 transition-colors"
            >
              <Trash2 className="size-5 text-red-12" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
