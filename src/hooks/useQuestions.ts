import { useQuery, useMutation } from "@tanstack/react-query";
import { organizerService } from "@/services";
import { queryKeys, invalidateQueries } from "@/services/cache/QueryClient";
import toast from "react-hot-toast";

export interface Question {
  id: string;
  question: string;
  type: string;
  required?: boolean;
  options?: string[];
  order?: number;
}

export function useQuestions(eventId: string | null, enabled: boolean = true) {
  const {
    data: questions = [],
    isLoading,
    error,
  } = useQuery<Question[]>({
    queryKey: queryKeys.events.questions(eventId || ""),
    queryFn: async () => {
      if (!eventId) return [];
      const loadedQuestions = await organizerService
        .getQuestions(eventId)
        .catch(() => []);
      return Array.isArray(loadedQuestions) ? loadedQuestions : [];
    },
    enabled: enabled && !!eventId,
  });

  const createMutation = useMutation({
    mutationFn: async (questionData: any) => {
      if (!eventId) throw new Error("Event ID is required");
      return organizerService.createQuestion(eventId, questionData);
    },
    onSuccess: () => {
      invalidateQueries.events.questions(eventId!);
      toast.success("Pergunta criada com sucesso!");
    },
    onError: (error: any) => {
      console.error("Error creating question:", error);
      toast.error(error.response?.data?.message || "Erro ao criar pergunta");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      questionId,
      data,
    }: {
      questionId: string;
      data: any;
    }) => {
      if (!eventId) throw new Error("Event ID is required");
      return organizerService.updateQuestion(eventId, questionId, data);
    },
    onSuccess: () => {
      invalidateQueries.events.questions(eventId!);
      toast.success("Pergunta atualizada com sucesso!");
    },
    onError: (error: any) => {
      console.error("Error updating question:", error);
      toast.error(error.response?.data?.message || "Erro ao atualizar pergunta");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (questionId: string) => {
      if (!eventId) throw new Error("Event ID is required");
      return organizerService.deleteQuestion(eventId, questionId);
    },
    onSuccess: () => {
      invalidateQueries.events.questions(eventId!);
      toast.success("Pergunta deletada com sucesso!");
    },
    onError: (error: any) => {
      console.error("Error deleting question:", error);
      toast.error(error.response?.data?.message || "Erro ao deletar pergunta");
    },
  });

  return {
    questions,
    loading: isLoading,
    error,
    createQuestion: (questionData: any) =>
      createMutation.mutateAsync(questionData),
    updateQuestion: (questionId: string, data: any) =>
      updateMutation.mutateAsync({ questionId, data }),
    deleteQuestion: (questionId: string) =>
      deleteMutation.mutateAsync(questionId),
  };
}
