"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useOrganizerNavigate } from "@/hooks/useOrganizerNavigate";
import { organizerService } from "@/services";
import { useWizardAuth } from "@/hooks/useWizardAuth";
import { useCreateEvent } from "@/contexts/CreateEventContext";
import { Button } from "@/components/Button";
import { useTopicModal } from "@/stores/modalStore";
import { Plus } from "lucide-react";
import toast from "react-hot-toast";
import { SortableTopicsList } from "@/components/Topic/SortableTopicsList";
import {
  buildTopicSectionsFromEvent,
  clearTopicsPreviewDraft,
  DEFAULT_TOPIC_SENTINEL,
  isPendingTopicId,
  newPendingTopicId,
  topicIdsInUiOrder,
  writeTopicsPreviewDraft,
  type TopicSectionRow,
} from "@/lib/eventTopicSections";
import { WizardStepLayout } from "@/components/Organizer/WizardStepLayout";

export default function TopicosPage() {
  const orgNav = useOrganizerNavigate();
  const { authChecked } = useWizardAuth();
  const { formData } = useCreateEvent();
  const { openTopicModal, setOnModalSave, setOnModalDelete } = useTopicModal();
  const [sections, setSections] = useState<TopicSectionRow[]>([]);
  const defaultTopicApiIdRef = useRef<string | null>(null);
  const editingTopicRef = useRef<{ topicId?: string; isEditing: boolean } | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [committedSectionsJson, setCommittedSectionsJson] = useState<string | null>(null);

  const isDirty = useMemo(
    () =>
      committedSectionsJson !== null &&
      JSON.stringify(sections) !== committedSectionsJson,
    [sections, committedSectionsJson],
  );

  useEffect(() => {
    const loadTopics = async () => {
      if (!authChecked || !formData.createdEventId) return;
      setLoading(true);
      try {
        const event = await organizerService.getEventById(formData.createdEventId);
        const { sections: next, defaultTopicApiId } = buildTopicSectionsFromEvent(event);
        defaultTopicApiIdRef.current = defaultTopicApiId;
        setSections(next);
        setCommittedSectionsJson(JSON.stringify(next));
      } catch (error: any) {
        toast.error("Erro ao carregar tópicos");
      } finally {
        setLoading(false);
      }
    };
    loadTopics();
  }, [authChecked, formData.createdEventId]);

  const handleBack = () => orgNav.push("/organizer/events/new/tickets");

  const persistTopicOrder = async (reordered: TopicSectionRow[]) => {
    if (!formData.createdEventId || reordered.length === 0) return;
    const mapped = topicIdsInUiOrder(reordered, defaultTopicApiIdRef.current);
    await organizerService.reorderEventTopics(formData.createdEventId, mapped);
  };

  const handleSave = async () => {
    if (!formData.createdEventId) {
      toast.error("Evento não encontrado. Por favor, crie o evento primeiro.");
      return;
    }

    const defaultRow = sections.find((s) => !s.allowDelete);
    if (!defaultRow) {
      toast.error("Tópico obrigatório não encontrado.");
      return;
    }
    if (!defaultRow.content?.trim()) {
      toast.error("Preencha o tópico obrigatório (detalhes do evento).");
      return;
    }

    if (!isDirty) {
      orgNav.push("/organizer/events/new/questionnaire");
      return;
    }

    setSaving(true);
    try {
      let working = sections;
      let prevCommitted: TopicSectionRow[] = [];
      try {
        prevCommitted = committedSectionsJson
          ? (JSON.parse(committedSectionsJson) as TopicSectionRow[])
          : [];
      } catch {
        prevCommitted = [];
      }

      if (defaultRow.id === DEFAULT_TOPIC_SENTINEL) {
        const idx = sections.indexOf(defaultRow);
        const created = await organizerService.createTopic(formData.createdEventId, {
          title: defaultRow.title,
          content: defaultRow.content,
          isEnabled: true,
          isDefault: true,
          order: idx + 1,
        });
        defaultTopicApiIdRef.current = created.id;
        working = sections.map((s) =>
          s.id === DEFAULT_TOPIC_SENTINEL
            ? { id: created.id, title: created.title?.trim() || defaultRow.title, content: created.content, allowDelete: false, variant: "default" as const }
            : s
        );
        setSections(working);
      } else {
        await organizerService.updateTopic(formData.createdEventId, defaultRow.id, {
          title: defaultRow.title,
          content: defaultRow.content,
        });
      }

      for (const row of working) {
        if (row.id === DEFAULT_TOPIC_SENTINEL || isPendingTopicId(row.id) || !row.allowDelete) continue;
        const was = prevCommitted.find((r) => r.id === row.id);
        if (was && was.title === row.title && was.content === row.content) continue;
        await organizerService.updateTopic(formData.createdEventId, row.id, {
          title: row.title,
          content: row.content,
        });
      }

      for (let i = 0; i < working.length; i++) {
        const row = working[i];
        if (!isPendingTopicId(row.id)) continue;
        const created = await organizerService.createTopic(formData.createdEventId, {
          title: row.title,
          content: row.content,
          isEnabled: true,
          order: i + 1,
        });
        working = working.map((s) =>
          s.id === row.id
            ? { id: created.id, title: created.title?.trim() || row.title, content: created.content, allowDelete: true, variant: "topic" as const }
            : s
        );
      }
      setSections(working);

      await persistTopicOrder(working);
      setCommittedSectionsJson(JSON.stringify(working));
      clearTopicsPreviewDraft();
      toast.success("Tópicos salvos com sucesso!");
      orgNav.push("/organizer/events/new/questionnaire");
    } catch (error: any) {
      toast.error(error.response?.data?.message || error.message || "Erro ao salvar tópicos");
    } finally {
      setSaving(false);
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
      openTopicModal({ title: "", content: "", isEditing: false, allowDelete: false });
    }
  };

  const handleSaveTopic = async (topicData: { title: string; content: string }) => {
    if (!formData.createdEventId) {
      toast.error("Evento não encontrado. Por favor, crie o evento primeiro.");
      return;
    }

    const editingState = editingTopicRef.current;
    const isEditing = editingState?.isEditing;
    const topicId = editingState?.topicId;

    if (isEditing && topicId && isPendingTopicId(topicId)) {
      setSections((prev) =>
        prev.map((s) => s.id === topicId ? { ...s, ...topicData } : s)
      );
      toast.success("Tópico atualizado. Salve as alterações para confirmar.");
      editingTopicRef.current = null;
      return;
    }

    if (!isEditing) {
      setSections((prev) => [
        ...prev,
        { id: newPendingTopicId(), title: topicData.title, content: topicData.content, allowDelete: true, variant: "topic" },
      ]);
      toast.success("Tópico adicionado. Salve as alterações para confirmar.");
      editingTopicRef.current = null;
      return;
    }

    const titleToSave =
      topicData.title?.trim() ||
      (topicId === "default" ? sections.find((s) => !s.allowDelete)?.title : undefined) ||
      "Detalhes do evento (Obrigatório)";

    if (isEditing && topicId === "default") {
      setSections((prev) =>
        prev.map((s) => !s.allowDelete ? { ...s, title: titleToSave, content: topicData.content } : s)
      );
      toast.success("Alterações aplicadas. Salve a página para persistir.");
      editingTopicRef.current = null;
      return;
    }

    if (isEditing && topicId) {
      setSections((prev) =>
        prev.map((s) => s.id === topicId ? { ...s, ...topicData } : s)
      );
      toast.success("Alterações aplicadas. Salve a página para persistir.");
      editingTopicRef.current = null;
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
    editingTopicRef.current = {
      topicId: row.allowDelete ? row.id : "default",
      isEditing: true,
    };
    openTopicModal({
      title: row.title,
      content: row.content,
      isEditing: true,
      topicId: row.allowDelete ? row.id : "default",
      allowDelete: row.allowDelete,
    });
  };

  const handleTopicsReorder = (reordered: TopicSectionRow[]) => setSections(reordered);

  const handleDeleteTopicConfirmed = async (topicId: string) => {
    if (!formData.createdEventId) {
      toast.error("Evento não encontrado.");
      throw new Error("no event");
    }
    if (topicId === DEFAULT_TOPIC_SENTINEL) throw new Error("invalid topic");
    const row = sections.find((s) => s.id === topicId);
    if (!row?.allowDelete) throw new Error("not deletable");

    if (isPendingTopicId(topicId)) {
      setSections((prev) => prev.filter((s) => s.id !== topicId));
      toast.success("Tópico removido.");
      return;
    }

    try {
      await organizerService.deleteTopic(formData.createdEventId, topicId);
      setSections((prev) => prev.filter((s) => s.id !== topicId));
      toast.success("Tópico deletado com sucesso!");
    } catch (error: any) {
      toast.error(error.response?.data?.message || error.message || "Erro ao deletar tópico");
      throw error;
    }
  };

  return (
    <WizardStepLayout
      title="Tópicos"
      description="Adicione e organize seções de conteúdo que aparecem na página do evento."
      showDescriptionOnMobile
      onBack={handleBack}
      className="pt-0 md:pt-[52px]"
      isLoading={!authChecked || loading}
      actions={
        <>
          <Button
            variant="outline"
            onClick={() => {
              const id = formData.createdEventId;
              if (id) writeTopicsPreviewDraft({ v: 1, eventId: id, sections });
              orgNav.push("/organizer/events/new/topics/preview");
            }}
            className="h-[52px] w-full border-gray-6 font-manrope text-base font-bold text-gray-12 max-md:h-12 md:w-auto md:px-11 md:text-[20px]"
          >
            Prévia
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || loading || !sections.find((s) => !s.allowDelete)?.content?.trim()}
            className="h-[52px] w-full font-manrope text-base font-bold max-md:h-12 disabled:cursor-not-allowed disabled:opacity-50 md:w-auto md:px-11 md:text-[20px]"
          >
            {saving ? "Salvando..." : (
              <>
                <span className="md:hidden">Confirmar informações</span>
                <span className="hidden md:inline">Confirmar tópicos</span>
              </>
            )}
          </Button>
        </>
      }
    >
      <div className="flex min-w-0 w-full max-w-full flex-col items-stretch px-4 md:px-0">
        <SortableTopicsList
          topics={sections}
          onReorder={handleTopicsReorder}
          onEditTopic={handleEditTopic}
        />

        <div className="flex w-full items-center justify-center py-10">
          <Button
            variant="outline"
            onClick={() => handleOpenModal()}
            className="h-12 w-full max-w-full gap-2 border-gray-6 font-manrope text-base font-bold text-gray-12 md:w-auto md:px-11 md:text-lg"
          >
            <Plus className="size-5 shrink-0" />
            <span className="md:hidden">Adicione mais um tópico</span>
            <span className="hidden md:inline">Adicionar tópico</span>
          </Button>
        </div>
      </div>
    </WizardStepLayout>
  );
}
