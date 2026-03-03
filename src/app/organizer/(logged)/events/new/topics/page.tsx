"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { userService, organizerService } from "@/services";
import { useCreateEvent } from "@/contexts/CreateEventContext";
import { Button } from "@/components/Button";
import { ArrowButton } from "@/components/ArrowButton";
import { PencilIcon } from "@/components/Icons/PencilIcon";
import { useTopicModal } from "@/stores/modalStore";
import { Plus, Download } from "lucide-react";
import toast from "react-hot-toast";
import { TrashIcon } from "@/components/Icons/TrashIcon";

export default function TopicosPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { formData } = useCreateEvent();
  const { openTopicModal, data: modalData, setOnModalSave } = useTopicModal();
  const [authChecked, setAuthChecked] = useState(false);
  const [topics, setTopics] = useState<Array<{ id: string; title: string; content: string }>>([]);
  const editingTopicRef = useRef<{ topicId?: string; isEditing: boolean } | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [content, setContent] = useState(
    `Join Pooky Knightsmith for another practical 7 Quick Wins session! This month's topic is When Saying No Triggers Meltdown (PDA)

Join us for another practical 7 Quick Wins session, where you'll leave with strategies you can use straight away to support the children and young people in your care.

What makes this session special? You get to choose the topic... At each webinar, we vote together on what to focus on next from the most pressing challenges you're facing in your daily work.

This interactive approach means we're always covering what you need most right now.

What to expect:
• 30 minutes of focused, practical content
• 7 evidence-based strategies you can implement immediately
• Time for questions and discussion
• Recording and resources shared with all registrants
• A supportive community of people doing similar work

Perfect for: Teachers, teaching assistants, SENCOs, middle and senior leaders and anyone supporting children with special or additional needs.

Topic announcement: All registrants will be emailed with the chosen topic following the live vote at the previous session. Can't make it to vote? Feel free to email your topic suggestions!

Come and be part of this collaborative approach to professional learning. Together, we can make a real difference to the children we support.`
  );

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

  // Carregar tópicos do evento
  useEffect(() => {
    const loadTopics = async () => {
      if (!authChecked || !formData.createdEventId) return;

      setLoading(true);
      try {
        const event = await organizerService.getEventById(formData.createdEventId);

        // Carregar description como conteúdo padrão
        if (event.description) {
          setContent(event.description);
        }

        // Carregar tópicos adicionais (excluindo o padrão)
        if (event.topics && event.topics.length > 0) {
          const additionalTopics = event.topics
            .filter(topic => !topic.isDefault)
            .sort((a, b) => (a.order || 0) - (b.order || 0))
            .map(topic => ({
              id: topic.id,
              title: topic.title,
              content: topic.content
            }));
          setTopics(additionalTopics);
        }
      } catch (error: any) {
        console.error("Error loading topics:", error);
        toast.error("Erro ao carregar tópicos");
      } finally {
        setLoading(false);
      }
    };

    loadTopics();
  }, [authChecked, formData.createdEventId]);

  const handleBack = () => {
    router.push("/organizer/events/new/tickets");
  };

  const handleSave = async () => {
    if (!formData.createdEventId) {
      toast.error("Evento não encontrado. Por favor, crie o evento primeiro.");
      return;
    }

    setSaving(true);
    try {
      // Garantir que o conteúdo padrão está salvo
      if (content) {
        await organizerService.updateEvent(formData.createdEventId, {
          description: content
        });
      }
      toast.success("Tópicos salvos com sucesso!");
      router.push("/organizer/events/new/questionnaire");
    } catch (error: any) {
      console.error("Error saving topics:", error);
      const errorMessage = error.response?.data?.message || error.message || "Erro ao salvar tópicos";
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleOpenModal = (topic?: { id?: string; title: string; content: string }) => {
    setOnModalSave(handleSaveTopic);
    if (topic) {
      editingTopicRef.current = { topicId: topic.id, isEditing: true };
      openTopicModal({
        title: topic.title,
        content: topic.content,
        isEditing: true,
        topicId: topic.id
      });
    } else {
      editingTopicRef.current = { isEditing: false };
      openTopicModal({
        title: "",
        content: "",
        isEditing: false
      });
    }
  };

  const handleSaveTopic = async (topicData: { title: string; content: string }) => {
    if (!formData.createdEventId) {
      toast.error("Evento não encontrado. Por favor, crie o evento primeiro.");
      return;
    }

    setSaving(true);
    try {
      // Verificar se é edição ou criação baseado na ref
      const editingState = editingTopicRef.current;
      const isEditing = editingState?.isEditing;
      const topicId = editingState?.topicId;

      if (isEditing && topicId === "default") {
        // Editando o tópico padrão (description do evento)
        await organizerService.updateEvent(formData.createdEventId, {
          description: topicData.content
        });
        setContent(topicData.content);
        toast.success("Conteúdo padrão atualizado com sucesso!");
      } else if (isEditing && topicId) {
        // Editando tópico existente
        const updatedTopic = await organizerService.updateTopic(
          formData.createdEventId,
          topicId,
          {
            title: topicData.title,
            content: topicData.content
          }
        );
        setTopics(prevTopics =>
          prevTopics.map(topic =>
            topic.id === topicId
              ? { ...topic, title: updatedTopic.title, content: updatedTopic.content }
              : topic
          )
        );
        toast.success("Tópico atualizado com sucesso!");
      } else {
        // Criando novo tópico
        const newTopic = await organizerService.createTopic(formData.createdEventId, {
          title: topicData.title,
          content: topicData.content,
          isEnabled: true,
          order: topics.length + 1
        });
        setTopics(prevTopics => [...prevTopics, {
          id: newTopic.id,
          title: newTopic.title,
          content: newTopic.content
        }]);
        toast.success("Tópico criado com sucesso!");
      }

      // Limpar a ref após salvar
      editingTopicRef.current = null;
    } catch (error: any) {
      console.error("Error saving topic:", error);
      const errorMessage = error.response?.data?.message || error.message || "Erro ao salvar tópico";
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDefaultTopic = async (topicData: { title: string; content: string }) => {
    if (!formData.createdEventId) {
      toast.error("Evento não encontrado. Por favor, crie o evento primeiro.");
      return;
    }

    setSaving(true);
    try {
      await organizerService.updateEvent(formData.createdEventId, {
        description: topicData.content
      });
      setContent(topicData.content);
      toast.success("Conteúdo padrão atualizado com sucesso!");
    } catch (error: any) {
      console.error("Error saving default topic:", error);
      const errorMessage = error.response?.data?.message || error.message || "Erro ao salvar conteúdo";
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleEditTopic = (topicId: string) => {
    const topic = topics.find(t => t.id === topicId);
    if (topic) {
      editingTopicRef.current = { topicId: topic.id, isEditing: true };
      setOnModalSave(handleSaveTopic);
      openTopicModal({
        title: topic.title,
        content: topic.content,
        isEditing: true,
        topicId: topic.id
      });
    }
  };

  const handleDeleteTopic = async (topicId: string) => {
    if (!formData.createdEventId) {
      toast.error("Evento não encontrado.");
      return;
    }

    if (!confirm("Tem certeza que deseja excluir este tópico?")) {
      return;
    }

    try {
      await organizerService.deleteTopic(formData.createdEventId, topicId);
      setTopics(prevTopics => prevTopics.filter(topic => topic.id !== topicId));
      toast.success("Tópico excluído com sucesso!");
    } catch (error: any) {
      console.error("Error deleting topic:", error);
      const errorMessage = error.response?.data?.message || error.message || "Erro ao excluir tópico";
      toast.error(errorMessage);
    }
  };

  if (!authChecked || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-11">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="bg-gray-2 flex-1 px-5 pt-[52px]">
      <div className="max-w-[843px] mx-auto flex flex-col gap-9">
        {/* Title Section */}
        <div className="flex gap-3 items-center">
          <button
            onClick={handleBack}
            className="border border-gray-6 rounded-[52px] size-9 flex items-center justify-center hover:bg-gray-3 transition-colors rotate-180 cursor-pointer"
          >
            <ArrowButton isOpen={false} />
          </button>
          <h1 className="text-gray-12 text-[28px] font-bold font-manrope leading-[1.1]">
            Criar tópicos
          </h1>
        </div>

        {/* Main Content Card */}
        <div className="flex flex-col items-start rounded-xl w-full">
          <div className="border border-gray-8 rounded-xl w-full flex flex-col overflow-hidden">
            {/* Header */}
            <div className="bg-gray-1 border-b border-gray-6 flex items-center justify-between px-5 py-2">
              <p className="text-gray-12 text-base font-semibold font-manrope leading-[1.1]">
                Ações
              </p>
              <button
                onClick={() => {
                  setOnModalSave(handleSaveDefaultTopic);
                  openTopicModal({
                    title: "Detalhes do evento",
                    content: content,
                    isEditing: true,
                    topicId: "default"
                  });
                }}
                className="bg-gray-2 border-[1.5px] border-gray-6 rounded-lg p-2 hover:bg-gray-3 transition-colors size-9 flex items-center justify-center cursor-pointer"
              >
                <PencilIcon className="size-5 text-gray-11" />
              </button>
            </div>

            {/* Content */}
            <div className="flex flex-col gap-6 p-5">
              <h2 className="text-gray-12 text-2xl font-bold font-manrope leading-[1.1]">
                Detalhes do evento (Obrigatório)
              </h2>
              <div
                className="text-gray-11 text-base font-family-dm-sans leading-[1.3] prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: content }}
              />
            </div>
          </div>

          {/* Additional Topics */}
          {topics.map((topic) => (
            <div key={topic.id} className="border border-gray-8 rounded-xl w-full flex flex-col overflow-hidden mt-6">
              {/* Topic Header */}
              <div className="bg-gray-1 border-b border-gray-6 flex items-center justify-between px-5 py-2">
                <p className="text-gray-12 text-base font-semibold font-manrope leading-[1.1]">
                  Ações
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEditTopic(topic.id)}
                    className="bg-gray-2 border-[1.5px] border-gray-6 rounded-lg hover:bg-gray-3 transition-colors size-9 flex items-center justify-center cursor-pointer"
                  >
                    <PencilIcon className="size-5 text-gray-11" />
                  </button>
                  <button
                    onClick={() => handleDeleteTopic(topic.id)}
                    className="bg-red-2 border-[1.5px] border-red-6 p-2 rounded-lg hover:bg-red-3 transition-colors size-9 flex items-center justify-center cursor-pointer"
                  >
                    <TrashIcon className="size-5 text-red-11" />
                  </button>
                </div>
              </div>

              {/* Topic Content */}
              <div className="flex flex-col gap-6 p-5">
                <h3 className="text-gray-12 text-xl font-bold font-manrope leading-[1.1]">
                  {topic.title}
                </h3>
                <div
                  className="text-gray-11 text-base font-family-dm-sans leading-[1.3] prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: topic.content }}
                />
              </div>
            </div>
          ))}

          {/* Add Section Button */}
          <div className="flex items-center justify-center py-10 w-full">
            <Button
              variant="outline"
              onClick={() => handleOpenModal()}
              className="border-gray-6 text-gray-12 text-lg font-bold px-11 h-12"
            >
              <Plus className="size-5 mr-2" />
              Adicionar tópico
            </Button>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 items-start justify-end w-full pb-4 mt-10">
            <Button
              variant="outline"
              onClick={() => router.push("/organizer/events/new/preview-event")}
              className="border-gray-6 text-gray-12 text-[20px] font-bold px-11 h-[52px]"
            >
              Prévia
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || loading}
              className="text-[20px] font-bold px-11 h-[52px] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Salvando..." : "Confirmar tópicos"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
