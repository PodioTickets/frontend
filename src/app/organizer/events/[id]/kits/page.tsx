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
  Package,
  X,
  Save,
  ShoppingBag,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

export default function EventKitsPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [authChecked, setAuthChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<any>(null);
  const [kits, setKits] = useState<any[]>([]);
  const [showKitModal, setShowKitModal] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingKit, setEditingKit] = useState<any>(null);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [currentKitId, setCurrentKitId] = useState<string>("");
  const [kitForm, setKitForm] = useState({
    name: "",
    description: "",
    isActive: true,
  });
  const [itemForm, setItemForm] = useState({
    name: "",
    description: "",
    isActive: true,
    sizes: [{ size: "", stock: "" }],
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
      const [eventData, kitsData] = await Promise.all([
        organizerService.getEventById(eventId),
        organizerService.getKits(eventId),
      ]);

      setEvent(eventData);
      setKits(kitsData);
    } catch (error: any) {
      console.error("Error loading data:", error);
      toast.error("Erro ao carregar dados");
      router.push("/organizer/events");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateKit = async () => {
    try {
      if (!kitForm.name.trim()) {
        toast.error("Nome do kit é obrigatório");
        return;
      }

      const data = {
        ...kitForm,
        items: [],
      };

      if (editingKit) {
        await organizerService.updateKit(eventId, editingKit.id, data);
        toast.success("Kit atualizado com sucesso!");
      } else {
        await organizerService.createKit(eventId, data);
        toast.success("Kit criado com sucesso!");
      }

      setShowKitModal(false);
      setEditingKit(null);
      setKitForm({ name: "", description: "", isActive: true });
      loadData();
    } catch (error: any) {
      console.error("Error saving kit:", error);
      toast.error(error.response?.data?.message || "Erro ao salvar kit");
    }
  };

  const handleDeleteKit = async (kitId: string) => {
    if (!confirm("Tem certeza que deseja excluir este kit?")) {
      return;
    }

    try {
      await organizerService.deleteKit(eventId, kitId);
      toast.success("Kit excluído com sucesso!");
      loadData();
    } catch (error: any) {
      console.error("Error deleting kit:", error);
      toast.error("Erro ao excluir kit");
    }
  };

  const handleEditKit = (kit: any) => {
    setEditingKit(kit);
    setKitForm({
      name: kit.name,
      description: kit.description || "",
      isActive: kit.isActive,
    });
    setShowKitModal(true);
  };

  const handleAddSize = () => {
    setItemForm({
      ...itemForm,
      sizes: [...itemForm.sizes, { size: "", stock: "" }],
    });
  };

  const handleRemoveSize = (index: number) => {
    setItemForm({
      ...itemForm,
      sizes: itemForm.sizes.filter((_, i) => i !== index),
    });
  };

  const handleSizeChange = (index: number, field: "size" | "stock", value: string) => {
    const newSizes = [...itemForm.sizes];
    newSizes[index] = { ...newSizes[index], [field]: value };
    setItemForm({ ...itemForm, sizes: newSizes });
  };

  const handleCreateItem = async () => {
    try {
      if (!itemForm.name.trim()) {
        toast.error("Nome do item é obrigatório");
        return;
      }

      if (itemForm.sizes.length === 0) {
        toast.error("Adicione pelo menos um tamanho");
        return;
      }

      const sizes = itemForm.sizes
        .filter((s) => s.size.trim() && s.stock.trim())
        .map((s) => ({
          size: s.size.trim(),
          stock: parseInt(s.stock) || 0,
        }));

      if (sizes.length === 0) {
        toast.error("Preencha pelo menos um tamanho com estoque");
        return;
      }

      const kit = editingKit || kits.find((k) => k.id === currentKitId);
      if (!kit) {
        toast.error("Kit não encontrado");
        return;
      }

      const itemData = {
        name: itemForm.name,
        description: itemForm.description || undefined,
        sizes,
        isActive: itemForm.isActive,
      };

      if (editingItem) {
        await organizerService.updateKitItem(
          eventId,
          kit.id,
          editingItem.id,
          itemData
        );
        toast.success("Item atualizado com sucesso!");
      } else {
        await organizerService.createKitItem(eventId, kit.id, itemData);
        toast.success("Item adicionado com sucesso!");
      }

      setShowItemModal(false);
      setEditingItem(null);
      setCurrentKitId("");
      setItemForm({
        name: "",
        description: "",
        isActive: true,
        sizes: [{ size: "", stock: "" }],
      });
      loadData();
    } catch (error: any) {
      console.error("Error saving item:", error);
      toast.error(error.response?.data?.message || "Erro ao salvar item");
    }
  };

  const handleEditItem = (kit: any, item: any) => {
    setEditingItem(item);
    setCurrentKitId(kit.id);
    setItemForm({
      name: item.name,
      description: item.description || "",
      isActive: item.isActive,
      sizes: item.sizes.map((s: any) => ({
        size: s.size,
        stock: s.stock.toString(),
      })),
    });
    setShowItemModal(true);
  };

  const handleDeleteItem = async (kit: any, itemId: string) => {
    if (!confirm("Tem certeza que deseja excluir este item?")) {
      return;
    }

    try {
      await organizerService.deleteKitItem(eventId, kit.id, itemId);
      toast.success("Item excluído com sucesso!");
      loadData();
    } catch (error: any) {
      console.error("Error deleting item:", error);
      toast.error(
        error.response?.data?.message || "Erro ao excluir item"
      );
    }
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
                Kits - {event?.name}
              </h1>
              <p className="text-gray-11">
                Gerencie os kits e itens do seu evento
              </p>
            </div>
            <Button
              onClick={() => {
                setEditingKit(null);
                setKitForm({ name: "", description: "", isActive: true });
                setShowKitModal(true);
              }}
            >
              <Plus className="size-4 mr-2" />
              Novo Kit
            </Button>
          </div>
        </div>

        {/* Kits List */}
        {kits.length === 0 ? (
          <div className="bg-gray-1 rounded-lg p-12 border border-gray-6 text-center">
            <ShoppingBag className="size-12 text-gray-11 mx-auto mb-4" />
            <p className="text-gray-11 mb-4">Nenhum kit criado ainda</p>
            <Button
              onClick={() => {
                setEditingKit(null);
                setKitForm({ name: "", description: "", isActive: true });
                setShowKitModal(true);
              }}
            >
              <Plus className="size-4 mr-2" />
              Criar Primeiro Kit
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {kits.map((kit) => (
              <div
                key={kit.id}
                className="bg-gray-1 rounded-lg border border-gray-6 p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-semibold text-gray-12">
                        {kit.name}
                      </h3>
                      {!kit.isActive && (
                        <span className="px-2 py-0.5 rounded text-xs bg-gray-10/20 text-gray-11">
                          Inativo
                        </span>
                      )}
                    </div>
                    {kit.description && (
                      <p className="text-sm text-gray-11">{kit.description}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setCurrentKitId(kit.id);
                        setEditingItem(null);
                        setItemForm({
                          name: "",
                          description: "",
                          isActive: true,
                          sizes: [{ size: "", stock: "" }],
                        });
                        setShowItemModal(true);
                      }}
                    >
                      <Plus className="size-4 mr-2" />
                      Adicionar Item
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditKit(kit)}
                    >
                      <Edit className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteKit(kit.id)}
                      className="text-red-10 hover:text-red-11"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>

                {/* Items */}
                <div className="space-y-3">
                  {kit.items.length === 0 ? (
                    <p className="text-sm text-gray-11 text-center py-4">
                      Nenhum item neste kit
                    </p>
                  ) : (
                    kit.items.map((item: any) => (
                      <div
                        key={item.id}
                        className="flex items-start justify-between p-4 bg-gray-2 rounded-lg border border-gray-6"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-gray-12">
                              {item.name}
                            </h4>
                            {!item.isActive && (
                              <span className="px-2 py-0.5 rounded text-xs bg-gray-10/20 text-gray-11">
                                Inativo
                              </span>
                            )}
                          </div>
                          {item.description && (
                            <p className="text-sm text-gray-11 mb-2">
                              {item.description}
                            </p>
                          )}
                          <div className="flex flex-wrap gap-2 mt-2">
                            {item.sizes.map((size: any, idx: number) => (
                              <span
                                key={idx}
                                className="px-2 py-1 rounded text-xs bg-gray-10/20 text-gray-11"
                              >
                                {size.size}: {size.stock} unidades
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditItem(kit, item)}
                          >
                            <Edit className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteItem(kit, item.id)}
                            className="text-red-10 hover:text-red-11"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Kit Modal */}
        {showKitModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-1 rounded-lg border border-gray-6 p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-12">
                  {editingKit ? "Editar Kit" : "Novo Kit"}
                </h2>
                <button
                  onClick={() => {
                    setShowKitModal(false);
                    setEditingKit(null);
                    setKitForm({ name: "", description: "", isActive: true });
                  }}
                  className="text-gray-11 hover:text-gray-12"
                >
                  <X className="size-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-12 mb-2">
                    Nome *
                  </label>
                  <Input
                    value={kitForm.name}
                    onChange={(e) =>
                      setKitForm({ ...kitForm, name: e.target.value })
                    }
                    placeholder="Ex: Kit Atleta Completo"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-12 mb-2">
                    Descrição
                  </label>
                  <textarea
                    value={kitForm.description}
                    onChange={(e) =>
                      setKitForm({ ...kitForm, description: e.target.value })
                    }
                    placeholder="Descrição do kit..."
                    rows={3}
                    className="w-full rounded-lg border border-gray-6 bg-transparent px-3 py-2 text-sm text-gray-12 placeholder:text-gray-11 focus:outline-none focus:ring-2 focus:ring-primary-11/50 focus:border-primary-11"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="kitActive"
                    checked={kitForm.isActive}
                    onChange={(e) =>
                      setKitForm({ ...kitForm, isActive: e.target.checked })
                    }
                    className="rounded border-gray-6"
                  />
                  <label
                    htmlFor="kitActive"
                    className="text-sm font-medium text-gray-12"
                  >
                    Kit ativo
                  </label>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button onClick={handleCreateKit} className="flex-1">
                    <Save className="size-4 mr-2" />
                    Salvar
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowKitModal(false);
                      setEditingKit(null);
                      setKitForm({ name: "", description: "", isActive: true });
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Item Modal */}
        {showItemModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-1 rounded-lg border border-gray-6 p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-12">
                  {editingItem ? "Editar Item" : "Novo Item"}
                </h2>
                <button
                  onClick={() => {
                    setShowItemModal(false);
                    setEditingItem(null);
                    setCurrentKitId("");
                    setItemForm({
                      name: "",
                      description: "",
                      isActive: true,
                      sizes: [{ size: "", stock: "" }],
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
                    Nome *
                  </label>
                  <Input
                    value={itemForm.name}
                    onChange={(e) =>
                      setItemForm({ ...itemForm, name: e.target.value })
                    }
                    placeholder="Ex: Camiseta Oficial"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-12 mb-2">
                    Descrição
                  </label>
                  <textarea
                    value={itemForm.description}
                    onChange={(e) =>
                      setItemForm({ ...itemForm, description: e.target.value })
                    }
                    placeholder="Descrição do item..."
                    rows={3}
                    className="w-full rounded-lg border border-gray-6 bg-transparent px-3 py-2 text-sm text-gray-12 placeholder:text-gray-11 focus:outline-none focus:ring-2 focus:ring-primary-11/50 focus:border-primary-11"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-12">
                      Tamanhos e Estoque *
                    </label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddSize}
                    >
                      <Plus className="size-4 mr-1" />
                      Adicionar
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {itemForm.sizes.map((size, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          value={size.size}
                          onChange={(e) =>
                            handleSizeChange(index, "size", e.target.value)
                          }
                          placeholder="Tamanho (ex: P, M, G)"
                          className="flex-1"
                        />
                        <Input
                          type="number"
                          min="0"
                          value={size.stock}
                          onChange={(e) =>
                            handleSizeChange(index, "stock", e.target.value)
                          }
                          placeholder="Estoque"
                          className="w-24"
                        />
                        {itemForm.sizes.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveSize(index)}
                            className="text-red-10 hover:text-red-11"
                          >
                            <X className="size-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="itemActive"
                    checked={itemForm.isActive}
                    onChange={(e) =>
                      setItemForm({ ...itemForm, isActive: e.target.checked })
                    }
                    className="rounded border-gray-6"
                  />
                  <label
                    htmlFor="itemActive"
                    className="text-sm font-medium text-gray-12"
                  >
                    Item ativo
                  </label>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button onClick={handleCreateItem} className="flex-1">
                    <Save className="size-4 mr-2" />
                    Salvar
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowItemModal(false);
                      setEditingItem(null);
                      setCurrentKitId("");
                      setItemForm({
                        name: "",
                        description: "",
                        isActive: true,
                        sizes: [{ size: "", stock: "" }],
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

