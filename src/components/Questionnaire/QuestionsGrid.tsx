"use client";

import { Pencil } from "lucide-react";
import { Button } from "@/components/Button";
import { TrashIcon } from "@/components/Icons/TrashIcon";
import { cn } from "@/utils/cn";
import { Plus } from "lucide-react";
import type { Question } from "@/services/organizer/OrganizerService";

interface QuestionsGridProps {
  questions: Question[];
  onCreateQuestion: () => void;
  onEditQuestion: (question: Question) => void;
  onDeleteQuestion: (questionId: string) => void;
}

export function QuestionsGrid({
  questions,
  onCreateQuestion,
  onEditQuestion,
  onDeleteQuestion,
}: QuestionsGridProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="font-manrope text-xl font-bold leading-[1.1] text-gray-12">Perguntas</h2>
        <Button
          onClick={onCreateQuestion}
          variant="default"
          className="font-manrope text-base font-bold leading-[1.1] max-md:h-11"
        >
          <Plus className="size-5" />
          Criar pergunta
        </Button>
      </div>

      {questions.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-gray-6 p-12 max-md:p-8">
          <p className="font-family-dm-sans text-base text-gray-11">
            Nenhuma pergunta criada ainda
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-x-4 md:gap-y-6">
          {questions.map((question, index) => (
            <div
              key={question.id}
              className="flex min-w-0 flex-1 flex-col gap-5 rounded-xl border border-gray-6 bg-gray-2 p-5 md:min-w-[519px] md:gap-6"
            >
              <p className="font-family-dm-sans text-sm font-normal leading-[1.3] text-gray-11 md:text-base">
                Pergunta {index + 1}
              </p>

              <div className="flex flex-col gap-5">
                <h3 className="font-manrope text-base font-bold leading-[1.1] text-gray-12 md:text-xl">
                  {question.question}
                </h3>

                <div className="flex flex-wrap items-center gap-2">
                  {question.isRequired ? (
                    <span
                      className={cn(
                        "rounded-[52px] bg-yellow-3 px-4 py-3 font-medium font-family-dm-sans text-yellow-12 leading-[1.3]",
                        "text-sm md:rounded-[32px] md:text-base",
                      )}
                    >
                      Obrigatório
                    </span>
                  ) : (
                    <span
                      className={cn(
                        "rounded-[52px] bg-gray-4 px-4 py-3 font-medium font-family-dm-sans text-gray-12 leading-[1.3]",
                        "text-sm md:rounded-[32px] md:text-base",
                      )}
                    >
                      Opcional
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-auto flex items-center justify-end">
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    title="Editar"
                    onClick={() => onEditQuestion(question)}
                    className="flex size-9 cursor-pointer items-center justify-center rounded-lg border-[1.5px] border-gray-6 bg-gray-2 transition-colors hover:bg-gray-3"
                  >
                    <Pencil className="size-5 text-gray-11" />
                  </button>
                  <button
                    type="button"
                    title="Deletar"
                    onClick={() => onDeleteQuestion(question.id)}
                    className="hidden size-9 cursor-pointer items-center justify-center rounded-lg border-[1.5px] border-red-6 bg-red-2 transition-colors hover:bg-red-3 md:flex"
                  >
                    <TrashIcon className="size-5 text-red-12" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
