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
  FileText,
  X,
  Save,
  GripVertical,
  ArrowUp,
  ArrowDown,
  Bold,
  Italic,
  Underline,
  Link as LinkIcon,
  Image as ImageIcon,
  List,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

export default function EventTopicsPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [authChecked, setAuthChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [event, setEvent] = useState<any>(null);
  const [topics, setTopics] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingTopic, setEditingTopic] = useState<any>(null);
  const [topicForm, setTopicForm] = useState({
    title: "",
    content: "",
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
      const eventData = await organizerService.getEventById(eventId);
      setEvent(eventData);
      setTopics(
        (eventData?.topics || []).sort((a: any, b: any) => a.order - b.order)
      );
    } catch (error: any) {
      console.error("Error loading data:", error);
      toast.error("Erro ao carregar dados");
      router.push("/organizer/events");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTopic = async () => {
    try {
      if (!topicForm.title.trim()) {
        toast.error("Título é obrigatório");
        return;
      }

      if (!topicForm.content.trim()) {
        toast.error("Conteúdo é obrigatório");
        return;
      }

      setSaving(true);
      
      const newTopic = await organizerService.createTopic(eventId, {
        title: topicForm.title,
        content: topicForm.content,
        order: topics.length,
        isEnabled: true,
      });

      setTopics([...topics, newTopic].sort((a, b) => a.order - b.order));
      toast.success("Tópico criado com sucesso!");
      
      setShowModal(false);
      setEditingTopic(null);
      setTopicForm({ title: "", content: "", order: 0 });
      loadData();
    } catch (error: any) {
      console.error("Error saving topic:", error);
      toast.error(
        error.response?.data?.message || "Erro ao salvar tópico"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateTopic = async () => {
    try {
      if (!topicForm.title.trim()) {
        toast.error("Título é obrigatório");
        return;
      }

      if (!topicForm.content.trim()) {
        toast.error("Conteúdo é obrigatório");
        return;
      }

      setSaving(true);
      
      await organizerService.updateTopic(eventId, editingTopic.id, {
        title: topicForm.title,
        content: topicForm.content,
        order: topicForm.order,
      });

      toast.success("Tópico atualizado com sucesso!");
      setShowModal(false);
      setEditingTopic(null);
      setTopicForm({ title: "", content: "", order: 0 });
      loadData();
    } catch (error: any) {
      console.error("Error updating topic:", error);
      toast.error(
        error.response?.data?.message || "Erro ao atualizar tópico"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTopic = async (topicId: string) => {
    if (!confirm("Tem certeza que deseja excluir este tópico?")) {
      return;
    }

    try {
      await organizerService.deleteTopic(eventId, topicId);
      setTopics(topics.filter((topic) => topic.id !== topicId));
      toast.success("Tópico excluído com sucesso!");
      loadData();
    } catch (error: any) {
      console.error("Error deleting topic:", error);
      toast.error(
        error.response?.data?.message || "Erro ao excluir tópico"
      );
    }
  };

  const handleMoveTopic = async (
    topicId: string,
    direction: "up" | "down"
  ) => {
    const index = topics.findIndex((t) => t.id === topicId);
    if (index === -1) return;

    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= topics.length) return;

    const newTopics = [...topics];
    const [moved] = newTopics.splice(index, 1);
    newTopics.splice(newIndex, 0, moved);

    // Atualizar ordem de todos os tópicos afetados
    try {
      const updates = newTopics.map((topic, idx) =>
        organizerService.updateTopic(eventId, topic.id, { order: idx })
      );
      await Promise.all(updates);

      setTopics(newTopics.map((topic, idx) => ({ ...topic, order: idx })));
      toast.success("Ordem atualizada!");
    } catch (error: any) {
      console.error("Error updating topic order:", error);
      toast.error("Erro ao atualizar ordem");
      loadData(); // Recarregar para reverter mudanças
    }
  };

  const handleEditTopic = (topic: any) => {
    setEditingTopic(topic);
    setTopicForm({
      title: topic.title,
      content: topic.content,
      order: topic.order,
    });
    setShowModal(true);
  };

  // Funções do editor rich text
  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    const editor = document.getElementById("content-editor") as HTMLDivElement;
    if (editor) {
      setTopicForm((prev) => ({ ...prev, content: editor.innerHTML }));
    }
  };

  const insertImage = () => {
    const url = prompt("URL da imagem:");
    if (url) {
      execCommand("insertImage", url);
    }
  };

  const insertLink = () => {
    const url = prompt("URL do link:");
    if (url) {
      execCommand("createLink", url);
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
                Tópicos - {event?.name}
              </h1>
              <p className="text-gray-11">
                Gerencie os tópicos que aparecerão na página do evento
              </p>
            </div>
            <Button
              onClick={() => {
                setEditingTopic(null);
                setTopicForm({ title: "", content: "", order: topics.length });
                setShowModal(true);
              }}
            >
              <Plus className="size-4 mr-2" />
              Novo Tópico
            </Button>
          </div>
        </div>

        {/* Topics List */}
        {topics.length === 0 ? (
          <div className="bg-gray-1 rounded-lg p-12 border border-gray-6 text-center">
            <FileText className="size-12 text-gray-11 mx-auto mb-4" />
            <p className="text-gray-11 mb-4">Nenhum tópico criado ainda</p>
            <Button
              onClick={() => {
                setEditingTopic(null);
                setTopicForm({ title: "", content: "", order: 0 });
                setShowModal(true);
              }}
            >
              <Plus className="size-4 mr-2" />
              Criar Primeiro Tópico
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {topics.map((topic, index) => (
              <div
                key={topic.id}
                className="bg-gray-1 rounded-lg border border-gray-6 p-6"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <GripVertical className="size-5 text-gray-11 cursor-move" />
                      <h3 className="text-lg font-semibold text-gray-12">
                        {topic.title}
                      </h3>
                      <span className="px-2 py-0.5 rounded text-xs bg-gray-10/20 text-gray-11">
                        Ordem: {topic.order + 1}
                      </span>
                    </div>
                    <div
                      className="text-sm text-gray-11 prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: topic.content }}
                    />
                  </div>
                  <div className="flex flex-col gap-2 ml-4">
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleMoveTopic(topic.id, "up")}
                        disabled={index === 0}
                      >
                        <ArrowUp className="size-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleMoveTopic(topic.id, "down")}
                        disabled={index === topics.length - 1}
                      >
                        <ArrowDown className="size-4" />
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditTopic(topic)}
                      >
                        <Edit className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteTopic(topic.id)}
                        className="text-red-10 hover:text-red-11"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Topic Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-1 rounded-lg border border-gray-6 p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-12">
                  {editingTopic ? "Editar Tópico" : "Novo Tópico"}
                </h2>
                <button
                  onClick={() => {
                    setShowModal(false);
                    setEditingTopic(null);
                    setTopicForm({ title: "", content: "", order: 0 });
                  }}
                  className="text-gray-11 hover:text-gray-12"
                >
                  <X className="size-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-12 mb-2">
                    Título do Tópico *
                  </label>
                  <Input
                    value={topicForm.title}
                    onChange={(e) =>
                      setTopicForm({ ...topicForm, title: e.target.value })
                    }
                    placeholder="Ex: Premiação"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-12 mb-2">
                    Conteúdo *
                  </label>
                  
                  {/* Toolbar do Editor */}
                  <div className="flex flex-wrap gap-2 p-2 border border-gray-6 rounded-t-lg bg-gray-3">
                    <button
                      type="button"
                      onClick={() => execCommand("bold")}
                      className="p-2 hover:bg-gray-4 rounded"
                      title="Negrito"
                    >
                      <Bold className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => execCommand("italic")}
                      className="p-2 hover:bg-gray-4 rounded"
                      title="Itálico"
                    >
                      <Italic className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => execCommand("underline")}
                      className="p-2 hover:bg-gray-4 rounded"
                      title="Sublinhado"
                    >
                      <Underline className="size-4" />
                    </button>
                    <div className="w-px h-6 bg-gray-6 mx-1" />
                    <button
                      type="button"
                      onClick={insertLink}
                      className="p-2 hover:bg-gray-4 rounded"
                      title="Inserir Link"
                    >
                      <LinkIcon className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={insertImage}
                      className="p-2 hover:bg-gray-4 rounded"
                      title="Inserir Imagem"
                    >
                      <ImageIcon className="size-4" />
                    </button>
                    <div className="w-px h-6 bg-gray-6 mx-1" />
                    <button
                      type="button"
                      onClick={() => execCommand("insertUnorderedList")}
                      className="p-2 hover:bg-gray-4 rounded"
                      title="Lista"
                    >
                      <List className="size-4" />
                    </button>
                  </div>

                  {/* Editor */}
                  <div
                    id="content-editor"
                    contentEditable
                    onInput={(e) => {
                      const target = e.target as HTMLDivElement;
                      setTopicForm({ ...topicForm, content: target.innerHTML });
                    }}
                    dangerouslySetInnerHTML={{ __html: topicForm.content }}
                    className="min-h-[200px] p-4 border border-t-0 border-gray-6 rounded-b-lg bg-transparent text-gray-12 focus:outline-none focus:ring-2 focus:ring-primary-11/50"
                    style={{ whiteSpace: "pre-wrap" }}
                  />
                  
                  <p className="mt-1 text-xs text-gray-10">
                    Use a barra de ferramentas para formatar o texto, inserir links e imagens
                  </p>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={editingTopic ? handleUpdateTopic : handleCreateTopic}
                    disabled={saving}
                    className="flex-1"
                  >
                    <Save className="size-4 mr-2" />
                    {saving ? "Salvando..." : "Salvar"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowModal(false);
                      setEditingTopic(null);
                      setTopicForm({ title: "", content: "", order: 0 });
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

