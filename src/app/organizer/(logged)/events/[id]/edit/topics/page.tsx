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
  clearTopicsPreviewDraft,
  DEFAULT_TOPIC_SENTINEL,
  isPendingTopicId,
  newPendingTopicId,
  readTopicsPreviewDraft,
  topicIdsInUiOrder,
  writeTopicsPreviewDraft,
  type TopicSectionRow,
} from "@/lib/eventTopicSections";
import { cn } from "@/utils/cn";

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
        const { sections: fromApi, defaultTopicApiId } =
          buildTopicSectionsFromEvent(event);
        const draft = readTopicsPreviewDraft(eventId);

        if (draft && draft.sections.length > 0) {
          const defaultRow = draft.sections.find((s) => !s.allowDelete);
          defaultTopicApiIdRef.current =
            defaultRow && defaultRow.id !== DEFAULT_TOPIC_SENTINEL
              ? defaultRow.id
              : null;
          setSections(draft.sections);
        } else {
          defaultTopicApiIdRef.current = defaultTopicApiId;
          setSections(fromApi);
        }
        setCommittedSectionsJson(JSON.stringify(fromApi));
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

      for (const row of working) {
        if (
          row.id === DEFAULT_TOPIC_SENTINEL ||
          isPendingTopicId(row.id) ||
          !row.allowDelete
        ) {
          continue;
        }
        const was = prevCommitted.find((r) => r.id === row.id);
        if (
          was &&
          was.title === row.title &&
          was.content === row.content
        ) {
          continue;
        }
        await organizerService.updateTopic(eventId, row.id, {
          title: row.title,
          content: row.content,
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
      clearTopicsPreviewDraft();
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

    const titleToSave =
      topicData.title?.trim() ||
      (topicId === "default"
        ? sections.find((s) => !s.allowDelete)?.title
        : undefined) ||
      "Detalhes do evento (Obrigatório)";

    if (isEditing && topicId === "default") {
      setSections((prev) =>
        prev.map((s) =>
          !s.allowDelete
            ? { ...s, title: titleToSave, content: topicData.content }
            : s
        )
      );
      toast.success("Alterações aplicadas. Salve a página para persistir.");
      editingTopicRef.current = null;
      return;
    }

    if (isEditing && topicId) {
      setSections((prev) =>
        prev.map((s) =>
          s.id === topicId
            ? { ...s, title: topicData.title, content: topicData.content }
            : s
        )
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
    <div className="pb-20 max-md:pb-40">
      <div className="mx-auto flex w-full max-w-[843px] flex-col gap-9 max-md:gap-8 md:px-0">
        {/* Mobile — Figma 3445:153973 */}
        <div className="flex h-[52px] items-center gap-2 border-b border-gray-6 bg-gray-2 max-md:-mx-4 max-md:px-4 md:hidden">
          <button
            type="button"
            onClick={handleBack}
            className="flex size-8 shrink-0 items-center justify-center rounded-lg md:border border-gray-6 text-gray-12 transition-colors hover:bg-gray-3 rotate-180"
            aria-label="Voltar"
          >
            <ArrowButton isOpen={false} />
          </button>
          <h1 className="min-w-0 font-manrope text-base font-extrabold leading-[1.1] text-gray-12">
            Tópicos
          </h1>
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <button
            type="button"
            onClick={handleBack}
            className="flex size-9 rotate-180 cursor-pointer items-center justify-center rounded-[52px] border border-gray-6 transition-colors hover:bg-gray-3"
            aria-label="Voltar"
          >
            <ArrowButton isOpen={false} />
          </button>
          <h1 className="font-manrope text-[28px] font-bold leading-[1.1] text-gray-12">
            Editar tópicos
          </h1>
        </div>

        <div className="flex min-w-0 w-full max-w-full flex-col items-stretch px-0 max-md:px-05">
          <SortableTopicsList
            topics={sections}
            onReorder={handleTopicsReorder}
            onEditTopic={handleEditTopic}
          />

          <div className="flex w-full items-center justify-center py-10 max-md:py-10">
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

          <div
            className={cn(
              "mt-10 flex w-full items-start gap-2 pb-4",
              "max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:z-40 max-md:mt-0 max-md:flex-col max-md:gap-3 max-md:border-t max-md:border-gray-6 max-md:bg-gray-1 max-md:p-4 max-md:pb-[max(1rem,env(safe-area-inset-bottom))]",
              "md:justify-end",
            )}
          >
            <Button
              variant="outline"
              disabled={sections.length === 0}
              onClick={() => {
                writeTopicsPreviewDraft({ v: 1, eventId, sections });
                orgNav.push(`/organizer/events/${eventId}/edit/topics/preview`);
              }}
              className="h-[52px] w-full border-gray-6 font-manrope text-base font-bold text-gray-12 max-md:h-12 md:w-auto md:px-11 md:text-[20px] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Prévia
            </Button>
            <Button
              onClick={() => void handleSave()}
              disabled={saving || loading || !isDirty}
              className="h-[52px] w-full font-manrope text-base font-bold max-md:h-12 disabled:cursor-not-allowed disabled:opacity-50 md:w-auto md:px-11 md:text-[20px]"
            >
              {saving
                ? "Salvando..."
                : (
                  <>
                    <span className="md:hidden">Confirmar informações</span>
                    <span className="hidden md:inline">Salvar alterações</span>
                  </>
                )}
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
