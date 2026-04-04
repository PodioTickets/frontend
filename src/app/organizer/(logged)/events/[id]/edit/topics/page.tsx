"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { useOrganizerNavigate } from "@/hooks/useOrganizerNavigate";
import { userService, organizerService } from "@/services";
import { Button } from "@/components/Button";
import { ArrowButton } from "@/components/ArrowButton";
import { UnsavedChangesModal } from "@/components/UnsavedChangesModal";
import { useTopicModal } from "@/stores/modalStore";
import { useUnsavedLeaveGuard } from "@/hooks/useUnsavedLeaveGuard";
import { Plus } from "lucide-react";
import toast from "react-hot-toast";
import { Loading } from "@/components/Loading";
import { SortableTopicsList } from "@/components/Topic/SortableTopicsList";
import {
  buildTopicSectionsFromEvent,
  DEFAULT_TOPIC_SENTINEL,
  isPendingTopicId,
  newPendingTopicId,
  topicIdsInUiOrder,
  type TopicSectionRow,
} from "@/lib/eventTopicSections";

export default function EditTopicsPage() {
  const router = useRouter();
  const orgNav = useOrganizerNavigate();
  const params = useParams();
  const eventId = params.id as string;
  const { openTopicModal, setOnModalSave, setOnModalDelete } = useTopicModal();
  const [authChecked, setAuthChecked] = useState(false);
  const [sections, setSections] = useState<TopicSectionRow[]>([]);
  const defaultTopicApiIdRef = useRef<string | null>(null);
  const editingTopicRef = useRef<{ topicId?: string; isEditing: boolean } | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [committedSectionsJson, setCommittedSectionsJson] = useState<string | null>(null);

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

  useEffect(() => {
    const loadTopics = async () => {
      if (!authChecked || !eventId) return;

      setLoading(true);
      try {
        const event = await organizerService.getEventById(eventId);
        const { sections: next, defaultTopicApiId } = buildTopicSectionsFromEvent(event);
        defaultTopicApiIdRef.current = defaultTopicApiId;
        setSections(next);
        setCommittedSectionsJson(JSON.stringify(next));
      } catch (error: any) {
        console.error("Error loading topics:", error);
        toast.error("Erro ao carregar tópicos");
      } finally {
        setLoading(false);
      }
    };

    loadTopics();
  }, [authChecked, eventId]);

  const isDirty = useMemo(
    () =>
      committedSectionsJson !== null &&
      JSON.stringify(sections) !== committedSectionsJson,
    [sections, committedSectionsJson],
  );

  const discardLocalChanges = useCallback(() => {
    if (committedSectionsJson == null) return;
    try {
      setSections(JSON.parse(committedSectionsJson) as TopicSectionRow[]);
    } catch {
      toast.error("Não foi possível restaurar o estado anterior.");
    }
  }, [committedSectionsJson]);

  const {
    leavePromptOpen,
    handleBack,
    confirmLeaveWithoutSaving,
    beginNavigationAfterSave,
    dismissLeavePrompt,
    requestNavigate,
  } = useUnsavedLeaveGuard(isDirty, {
    navigateTarget: `/organizer/events/${eventId}/edit/tickets`,
    onDiscard: discardLocalChanges,
  });

  const persistTopicOrder = async (reordered: TopicSectionRow[]) => {
    if (!eventId || reordered.length === 0) return;
    const mapped = topicIdsInUiOrder(reordered, defaultTopicApiIdRef.current);
    await organizerService.reorderEventTopics(eventId, mapped);
  };

  const handleSave = async (): Promise<boolean> => {
    if (!eventId) {
      toast.error("Evento não encontrado. Por favor, crie o evento primeiro.");
      return false;
    }

    const defaultRow = sections.find((s) => !s.allowDelete);
    if (!defaultRow) {
      toast.error("Tópico obrigatório não encontrado.");
      return false;
    }
    if (!defaultRow.content?.trim()) {
      toast.error("Preencha o tópico obrigatório (detalhes do evento).");
      return false;
    }

    setSaving(true);
    try {
      let working = sections;

      if (defaultRow.id === DEFAULT_TOPIC_SENTINEL) {
        const idx = sections.indexOf(defaultRow);
        const created = await organizerService.createTopic(eventId, {
          title: defaultRow.title,
          content: defaultRow.content,
          isEnabled: true,
          isDefault: true,
          order: idx + 1,
        });
        defaultTopicApiIdRef.current = created.id;
        working = sections.map((s) =>
          s.id === DEFAULT_TOPIC_SENTINEL
            ? {
                id: created.id,
                title: created.title?.trim() || defaultRow.title,
                content: created.content,
                allowDelete: false,
                variant: "default" as const,
              }
            : s
        );
        setSections(working);
      } else {
        await organizerService.updateTopic(eventId, defaultRow.id, {
          title: defaultRow.title,
          content: defaultRow.content,
        });
      }

      for (let i = 0; i < working.length; i++) {
        const row = working[i];
        if (!isPendingTopicId(row.id)) continue;
        const created = await organizerService.createTopic(eventId, {
          title: row.title,
          content: row.content,
          isEnabled: true,
          order: i + 1,
        });
        working = working.map((s) =>
          s.id === row.id
            ? {
                id: created.id,
                title: created.title?.trim() || row.title,
                content: created.content,
                allowDelete: true,
                variant: "topic" as const,
              }
            : s
        );
      }
      setSections(working);

      await persistTopicOrder(working);

      setCommittedSectionsJson(JSON.stringify(working));
      toast.success("Tópicos salvos com sucesso!");
      return true;
    } catch (error: any) {
      console.error("Error saving topics:", error);
      const errorMessage = error.response?.data?.message || error.message || "Erro ao salvar tópicos";
      toast.error(errorMessage);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAndLeave = async () => {
    const ok = await handleSave();
    if (ok) {
      beginNavigationAfterSave();
    }
  };

  const handleOpenModal = (topic?: { id?: string; title: string; content: string }) => {
    setOnModalSave(handleSaveTopic);
    if (topic) {
      const row = topic.id ? sections.find((s) => s.id === topic.id) : undefined;
      editingTopicRef.current = { topicId: topic.id, isEditing: true };
      setOnModalDelete(
        row?.allowDelete && topic.id ? () => handleDeleteTopicConfirmed(topic.id!) : undefined
      );
      openTopicModal({
        title: topic.title,
        content: topic.content,
        isEditing: true,
        topicId: topic.id,
        allowDelete: row?.allowDelete ?? false,
      });
    } else {
      editingTopicRef.current = { isEditing: false };
      setOnModalDelete(undefined);
      openTopicModal({
        title: "",
        content: "",
        isEditing: false,
        allowDelete: false,
      });
    }
  };

  const handleSaveTopic = async (topicData: { title: string; content: string }) => {
    if (!eventId) {
      toast.error("Evento não encontrado. Por favor, crie o evento primeiro.");
      return;
    }

    const editingState = editingTopicRef.current;
    const isEditing = editingState?.isEditing;
    const topicId = editingState?.topicId;

    if (isEditing && topicId && isPendingTopicId(topicId)) {
      setSections((prev) =>
        prev.map((s) =>
          s.id === topicId
            ? { ...s, title: topicData.title, content: topicData.content }
            : s
        )
      );
      toast.success("Tópico atualizado. Salve as alterações para confirmar.");
      editingTopicRef.current = null;
      return;
    }

    if (!isEditing) {
      setSections((prev) => [
        ...prev,
        {
          id: newPendingTopicId(),
          title: topicData.title,
          content: topicData.content,
          allowDelete: true,
          variant: "topic",
        },
      ]);
      toast.success("Tópico adicionado. Salve as alterações para confirmar.");
      editingTopicRef.current = null;
      return;
    }

    setSaving(true);
    try {
      if (isEditing && topicId === "default") {
        const defaultRow = sections.find((s) => !s.allowDelete);
        if (!defaultRow) {
          toast.error("Tópico obrigatório não encontrado.");
          return;
        }
        const titleToSave =
          topicData.title?.trim() ||
          defaultRow.title ||
          "Detalhes do evento (Obrigatório)";

        if (defaultRow.id !== DEFAULT_TOPIC_SENTINEL) {
          const updated = await organizerService.updateTopic(eventId, defaultRow.id, {
            title: titleToSave,
            content: topicData.content,
          });
          defaultTopicApiIdRef.current = updated.id;
          setSections((prev) =>
            prev.map((s) =>
              s.id === defaultRow.id
                ? {
                    ...s,
                    title: updated.title?.trim() || titleToSave,
                    content: updated.content,
                  }
                : s
            )
          );
        } else {
          const idx = sections.findIndex((s) => s.id === DEFAULT_TOPIC_SENTINEL);
          const created = await organizerService.createTopic(eventId, {
            title: titleToSave,
            content: topicData.content,
            isEnabled: true,
            isDefault: true,
            order: idx + 1,
          });
          defaultTopicApiIdRef.current = created.id;
          const next = sections.map((s) =>
            s.id === DEFAULT_TOPIC_SENTINEL
              ? {
                  id: created.id,
                  title: created.title?.trim() || titleToSave,
                  content: created.content,
                  allowDelete: false,
                  variant: "default" as const,
                }
              : s
          );
          setSections(next);
        }
        toast.success("Conteúdo padrão atualizado com sucesso!");
      } else if (isEditing && topicId) {
        const updatedTopic = await organizerService.updateTopic(eventId, topicId, {
          title: topicData.title,
          content: topicData.content,
        });
        setSections((prev) =>
          prev.map((s) =>
            s.id === topicId
              ? { ...s, title: updatedTopic.title, content: updatedTopic.content }
              : s
          )
        );
        toast.success("Tópico atualizado com sucesso!");
      }

      editingTopicRef.current = null;
    } catch (error: any) {
      console.error("Error saving topic:", error);
      const errorMessage = error.response?.data?.message || error.message || "Erro ao salvar tópico";
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleEditTopic = (topicId: string) => {
    const row = sections.find((s) => s.id === topicId);
    if (!row) return;
    setOnModalSave(handleSaveTopic);
    if (row.allowDelete) {
      setOnModalDelete(() => handleDeleteTopicConfirmed(row.id));
    } else {
      setOnModalDelete(undefined);
    }
    if (!row.allowDelete) {
      editingTopicRef.current = { topicId: "default", isEditing: true };
      openTopicModal({
        title: row.title,
        content: row.content,
        isEditing: true,
        topicId: "default",
        allowDelete: false,
      });
    } else {
      editingTopicRef.current = { topicId: row.id, isEditing: true };
      openTopicModal({
        title: row.title,
        content: row.content,
        isEditing: true,
        topicId: row.id,
        allowDelete: true,
      });
    }
  };

  const handleTopicsReorder = (reordered: TopicSectionRow[]) => {
    setSections(reordered);
  };

  const handleDeleteTopicConfirmed = async (topicId: string) => {
    if (!eventId) {
      toast.error("Evento não encontrado.");
      throw new Error("no event");
    }
    if (topicId === DEFAULT_TOPIC_SENTINEL) {
      throw new Error("invalid topic");
    }
    const row = sections.find((s) => s.id === topicId);
    if (!row?.allowDelete) {
      throw new Error("not deletable");
    }

    if (isPendingTopicId(topicId)) {
      setSections((prev) => prev.filter((s) => s.id !== topicId));
      toast.success("Tópico removido.");
      return;
    }

    try {
      await organizerService.deleteTopic(eventId, topicId);
      setSections((prev) => prev.filter((s) => s.id !== topicId));
      toast.success("Tópico deletado com sucesso!");
    } catch (error: any) {
      console.error("Error deleting topic:", error);
      const errorMessage =
        error.response?.data?.message || error.message || "Erro ao deletar tópico";
      toast.error(errorMessage);
      throw error;
    }
  };

  if (!authChecked || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loading />
      </div>
    );
  }

  return (
    <div className="pb-20">
      <div className="w-full max-w-[843px] mx-auto flex flex-col gap-9 px-5 md:px-0">
        <div className="flex gap-3 items-center">
          <button
            onClick={handleBack}
            className="border border-gray-6 rounded-[52px] size-9 flex items-center justify-center hover:bg-gray-3 transition-colors rotate-180 cursor-pointer"
          >
            <ArrowButton isOpen={false} />
          </button>
          <h1 className="text-gray-12 text-[28px] font-bold font-manrope leading-[1.1]">
            Editar tópicos
          </h1>
        </div>

        <div className="flex flex-col items-stretch w-full max-w-full min-w-0">
          <SortableTopicsList
            topics={sections}
            onReorder={handleTopicsReorder}
            onEditTopic={handleEditTopic}
          />

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

          <div className="flex gap-2 items-start justify-end w-full pb-4 mt-10">
            <Button
              variant="outline"
              onClick={() =>
                requestNavigate(`/organizer/events/${eventId}/preview`)
              }
              className="border-gray-6 text-gray-12 text-[20px] font-bold px-11 h-[52px]"
            >
              Prévia
            </Button>
            <Button
              onClick={() => void handleSave()}
              disabled={saving || loading}
              className="text-[20px] font-bold px-11 h-[52px] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Salvando..." : "Salvar alterações"}
            </Button>
          </div>
        </div>
      </div>

      <UnsavedChangesModal
        open={leavePromptOpen}
        onClose={dismissLeavePrompt}
        title="Alterações não salvas"
        description="Você fez alterações nos tópicos. Se sair agora, elas serão perdidas."
        onSaveAndLeave={handleSaveAndLeave}
        onLeaveWithoutSaving={confirmLeaveWithoutSaving}
      />
    </div>
  );
}
