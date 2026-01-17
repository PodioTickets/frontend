"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { organizerService, userService } from "@/services";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import {
  ArrowLeft,
  Plus,
  Edit,
  Trash2,
  Users,
  DollarSign,
  X,
  Save,
  Package,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

export default function EventModalitiesPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [authChecked, setAuthChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<any>(null);
  const [modalities, setModalities] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [showModalityModal, setShowModalityModal] = useState(false);
  const [editingModality, setEditingModality] = useState<any>(null);
  const [modalityForm, setModalityForm] = useState({
    templateId: "",
    name: "",
    description: "",
    price: "",
    maxParticipants: "",
    isActive: true,
    order: 0,
  });

  useEffect(() => {
    // Aguarda a verificação de autenticação terminar
    if (authLoading) return;

    const hasToken = userService.isAuthenticated();
    if (!hasToken && !isAuthenticated) {
      router.push("/");
      return;
    }

    if (!authChecked) {
      setAuthChecked(true);
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!authChecked || authLoading || !eventId) return;
    loadData();
  }, [authChecked, eventId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [eventData, modalitiesData, templatesData] = await Promise.all([
        organizerService.getEventById(eventId),
        organizerService.getModalities(eventId),
        organizerService.getModalityTemplates().catch(() => []), // Fallback se não houver templates
      ]);

      setEvent(eventData);
      setModalities(modalitiesData.sort((a, b) => a.order - b.order));
      setTemplates(templatesData);
    } catch (error: any) {
      console.error("Error loading data:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateModality = async () => {
    try {
      if (!modalityForm.name.trim()) {
        toast.error("Nome da modalidade é obrigatório");
        return;
      }

      if (!modalityForm.price || parseFloat(modalityForm.price) <= 0) {
        toast.error("Preço deve ser maior que zero");
        return;
      }

      const data = {
        templateId: modalityForm.templateId || undefined,
        name: modalityForm.name,
        description: modalityForm.description || undefined,
        price: parseFloat(modalityForm.price),
        maxParticipants: modalityForm.maxParticipants
          ? parseInt(modalityForm.maxParticipants)
          : undefined,
        isActive: modalityForm.isActive,
        order: modalityForm.order,
      };

      if (editingModality) {
        await organizerService.updateModality(
          eventId,
          editingModality.id,
          data
        );
        toast.success("Modalidade atualizada com sucesso!");
      } else {
        await organizerService.createModality(eventId, data);
        toast.success("Modalidade criada com sucesso!");
      }

      setShowModalityModal(false);
      setEditingModality(null);
      setModalityForm({
        templateId: "",
        name: "",
        description: "",
        price: "",
        maxParticipants: "",
        isActive: true,
        order: 0,
      });
      loadData();
    } catch (error: any) {
      console.error("Error saving modality:", error);
      toast.error(error.response?.data?.message || "Erro ao salvar modalidade");
    }
  };

  const handleDeleteModality = async (modalityId: string) => {
    if (!confirm("Tem certeza que deseja excluir esta modalidade?")) {
      return;
    }

    try {
      await organizerService.deleteModality(eventId, modalityId);
      toast.success("Modalidade excluída com sucesso!");
      loadData();
    } catch (error: any) {
      console.error("Error deleting modality:", error);
      toast.error("Erro ao excluir modalidade");
    }
  };

  const handleEditModality = (modality: any) => {
    setEditingModality(modality);
    setModalityForm({
      templateId: modality.templateId,
      name: modality.name,
      description: modality.description || "",
      price: modality.price.toString(),
      maxParticipants: modality.maxParticipants
        ? modality.maxParticipants.toString()
        : "",
      isActive: modality.isActive,
      order: modality.order || 0,
    });
    setShowModalityModal(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-2 flex items-center justify-center">
        <div className="text-gray-11">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-2 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link
          href={`/organizer/events/${eventId}/edit`}
          className="inline-flex items-center text-gray-11 hover:text-gray-12 mb-6"
        >
          <ArrowLeft className="size-4 mr-2" />
          Voltar para Edição
        </Link>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-12 mb-2">
                Modalidades - {event?.name}
              </h1>
              <p className="text-gray-11">
                Gerencie grupos e modalidades do seu evento
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  setEditingModality(null);
                  setModalityForm({
                    templateId: "",
                    name: "",
                    description: "",
                    price: "",
                    maxParticipants: "",
                    isActive: true,
                    order: 0,
                  });
                  setShowModalityModal(true);
                }}
              >
                Nova Modalidade
              </Button>
            </div>
          </div>
        </div>

        {/* Groups and Modalities */}
        {modalities.length === 0 ? (
          <div className="bg-gray-1 rounded-lg p-12 border border-gray-6 text-center">
            <Package className="size-12 text-gray-11 mx-auto mb-4" />
            <p className="text-gray-11 mb-4">Comece criando uma modalidade</p>
            <Button
              onClick={() => {
                setEditingModality(null);
                setModalityForm({
                  templateId: "",
                  name: "",
                  description: "",
                  price: "",
                  maxParticipants: "",
                  isActive: true,
                  order: 0,
                });
                setShowModalityModal(true);
              }}
            >
              Adicionar Modalidade
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {modalities.length === 0 ? (
              <p className="text-sm text-gray-11 text-center py-4">
                Nenhuma modalidade criada ainda
              </p>
            ) : (
              modalities &&
              modalities.map((modality) => (
                <div
                  key={modality.id}
                  className="flex items-center justify-between p-4 bg-gray-2 rounded-lg border border-gray-6"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-gray-12">
                        {modality.name}
                      </h4>
                      {!modality.isActive && (
                        <span className="px-2 py-0.5 rounded text-xs bg-gray-10/20 text-gray-11">
                          Inativa
                        </span>
                      )}
                    </div>
                    {modality.description && (
                      <p className="text-sm text-gray-11 mb-2">
                        {modality.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-gray-11">
                      <div className="flex items-center gap-1">
                        <DollarSign className="size-4" />
                        R$ {modality.price.toFixed(2)}
                      </div>
                      {modality.maxParticipants && (
                        <div className="flex items-center gap-1">
                          <Users className="size-4" />
                          {modality.currentParticipants || 0} /{" "}
                          {modality.maxParticipants} participantes
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditModality(modality)}
                    >
                      <Edit className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteModality(modality.id)}
                      className="text-red-10 hover:text-red-11"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Modality Modal */}
        {showModalityModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-1 rounded-lg border border-gray-6 p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-12">
                  {editingModality ? "Editar Modalidade" : "Nova Modalidade"}
                </h2>
                <button
                  onClick={() => {
                    setShowModalityModal(false);
                    setEditingModality(null);
                    setModalityForm({
                      templateId: "",
                      name: "",
                      description: "",
                      price: "",
                      maxParticipants: "",
                      isActive: true,
                      order: 0,
                    });
                  }}
                  className="text-gray-11 hover:text-gray-12"
                >
                  <X className="size-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-12 mb-2">
                    Template de Modalidade {templates.length > 0 && "(Opcional)"}
                  </label>
                  {loading ? (
                    <div className="w-full rounded-lg border border-gray-6 bg-gray-3 px-3 py-2 text-sm text-gray-11">
                      Carregando templates...
                    </div>
                  ) : templates.length > 0 ? (
                    <select
                      value={modalityForm.templateId}
                      onChange={(e) => {
                        const selectedTemplate = templates.find(
                          (t) => t.id === e.target.value
                        );
                        setModalityForm({
                          ...modalityForm,
                          templateId: e.target.value,
                          name: selectedTemplate
                            ? selectedTemplate.label
                            : modalityForm.name,
                        });
                      }}
                      className="w-full rounded-lg border border-gray-6 bg-transparent px-3 py-2 text-sm text-gray-12 focus:outline-none focus:ring-2 focus:ring-primary-11/50 focus:border-primary-11"
                    >
                      <option value="">Selecione um template (opcional)</option>
                      {templates
                        .filter((t) => t.isActive)
                        .map((template) => (
                          <option key={template.id} value={template.id}>
                            {template.label}
                          </option>
                        ))}
                    </select>
                  ) : (
                    <div className="w-full rounded-lg border border-gray-6 bg-gray-3 px-3 py-2 text-sm text-gray-11">
                      Nenhum template disponível
                    </div>
                  )}
                  {modalityForm.templateId && (
                    <p className="mt-1 text-xs text-gray-10">
                      Template selecionado: {templates.find(t => t.id === modalityForm.templateId)?.label}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-12 mb-2">
                    Nome *
                  </label>
                  <Input
                    value={modalityForm.name}
                    onChange={(e) =>
                      setModalityForm({
                        ...modalityForm,
                        name: e.target.value,
                      })
                    }
                    placeholder="Ex: Corrida 5K"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-12 mb-2">
                    Descrição
                  </label>
                  <textarea
                    value={modalityForm.description}
                    onChange={(e) =>
                      setModalityForm({
                        ...modalityForm,
                        description: e.target.value,
                      })
                    }
                    placeholder="Descrição da modalidade..."
                    rows={3}
                    className="w-full rounded-lg border border-gray-6 bg-transparent px-3 py-2 text-sm text-gray-12 placeholder:text-gray-11 focus:outline-none focus:ring-2 focus:ring-primary-11/50 focus:border-primary-11"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-12 mb-2">
                      Preço (R$) *
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={modalityForm.price}
                      onChange={(e) =>
                        setModalityForm({
                          ...modalityForm,
                          price: e.target.value,
                        })
                      }
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-12 mb-2">
                      Máx. Participantes
                    </label>
                    <Input
                      type="number"
                      min="1"
                      value={modalityForm.maxParticipants}
                      onChange={(e) =>
                        setModalityForm({
                          ...modalityForm,
                          maxParticipants: e.target.value,
                        })
                      }
                      placeholder="Ilimitado"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-12 mb-2">
                    Ordem
                  </label>
                  <Input
                    type="number"
                    value={modalityForm.order}
                    onChange={(e) =>
                      setModalityForm({
                        ...modalityForm,
                        order: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={modalityForm.isActive}
                    onChange={(e) =>
                      setModalityForm({
                        ...modalityForm,
                        isActive: e.target.checked,
                      })
                    }
                    className="rounded border-gray-6"
                  />
                  <label
                    htmlFor="isActive"
                    className="text-sm font-medium text-gray-12"
                  >
                    Modalidade ativa
                  </label>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button onClick={handleCreateModality} className="flex-1">
                    <Save className="size-4 mr-2" />
                    Salvar
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowModalityModal(false);
                      setEditingModality(null);
                      setModalityForm({
                        templateId: "",
                        name: "",
                        description: "",
                        price: "",
                        maxParticipants: "",
                        isActive: true,
                        order: 0,
                      });
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
