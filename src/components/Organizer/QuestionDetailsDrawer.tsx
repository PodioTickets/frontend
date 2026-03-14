"use client";

import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
} from "@/components/ui/drawer";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import type { Question } from "@/interfaces/event";
import { ArrowButton } from "../ArrowButton";

const QUESTION_TYPE_LABELS: Record<string, string> = {
  text: "Texto livre",
  true_false: "Verdadeiro ou falso",
  number: "Número",
  select: "Seleção única",
  multiple_choice: "Múltipla escolha",
};

export interface QuestionAnswerRow {
  label: string;
  percentage: number;
  count: number;
}

interface QuestionDetailsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  question: Question | null;
  /** Index (1-based) and total for "Pergunta X de Y" */
  questionIndex?: number;
  totalQuestions?: number;
  /** Respostas: opção + % + quantidade. Se não informado, usa options da pergunta com dados placeholder. */
  answerRows?: QuestionAnswerRow[];
  /** Taxa de resposta (0-100). Exibe "—" se não informado. */
  responseRate?: number | null;
  /** Total de participantes que responderam. Placeholder se não informado. */
  totalParticipants?: number;
  onPrevious?: () => void;
  onNext?: () => void;
}

const BAR_SEGMENTS = 10;

function PercentageBar({ percentage }: { percentage: number }) {
  const filled = Math.round((percentage / 100) * BAR_SEGMENTS);
  return (
    <div className="flex gap-0.5 items-center h-7">
      {Array.from({ length: BAR_SEGMENTS }).map((_, i) => (
        <div
          key={i}
          className={`h-full w-3 rounded shrink-0 ${i < filled ? "bg-primary-11" : "bg-gray-6"
            }`}
        />
      ))}
    </div>
  );
}

export function QuestionDetailsDrawer({
  isOpen,
  onClose,
  question,
  questionIndex = 1,
  totalQuestions = 1,
  answerRows,
  responseRate,
  totalParticipants = 0,
  onPrevious,
  onNext,
}: QuestionDetailsDrawerProps) {
  const typeLabel = question ? QUESTION_TYPE_LABELS[question.type] ?? question.type : "—";
  const rows: QuestionAnswerRow[] =
    answerRows ??
    (question?.type === "text" || question?.type === "number"
      ? [{ label: "Texto livre", percentage: 100, count: totalParticipants || 0 }]
      : (question?.options ?? []).map((opt, i) => ({
        label: opt,
        percentage: totalQuestions > 0 ? Math.round(100 / (question?.options?.length ?? 1)) : 0,
        count: totalParticipants > 0 ? Math.round((totalParticipants ?? 0) / (question?.options?.length ?? 1)) : 0,
      })));

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()} direction="right">
      <DrawerContent className="bg-gray-1 h-full w-full sm:max-w-[883px] border-l border-gray-6 rounded-l-xl">
        <DrawerHeader className="border-b border-gray-6 px-5 py-3 flex flex-row items-center justify-between shrink-0">
          <p className="font-family-dm-sans font-semibold text-[20px] leading-[1.3] text-gray-12">
            Detalhes das perguntas
          </p>
          <DrawerClose asChild>
            <button
              type="button"
              className="size-9 flex items-center justify-center rounded-lg hover:bg-gray-3 transition-colors cursor-pointer"
              aria-label="Fechar"
            >
              <X className="size-6 text-gray-12" />
            </button>
          </DrawerClose>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto">
          <div className="p-5 flex flex-col gap-6">
            {question && (
              <>
                {/* Top: Pergunta X de Y + nav */}
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between w-full">
                    <p className="font-family-dm-sans font-normal text-base text-gray-11">
                      Pergunta {questionIndex} de {totalQuestions}
                    </p>
                    <div className="flex gap-2 items-center">
                      <button
                        type="button"
                        onClick={onPrevious}
                        disabled={!onPrevious || questionIndex <= 1}
                        className="size-9 flex items-center justify-center rounded-full border border-gray-6 hover:bg-gray-3 disabled:opacity-50 disabled:pointer-events-none cursor-pointer rotate-180"
                        aria-label="Pergunta anterior"
                      >
                        <ArrowButton isOpen={false} />
                      </button>
                      <button
                        type="button"
                        onClick={onNext}
                        disabled={!onNext || questionIndex >= totalQuestions}
                        className="size-9 flex items-center justify-center rounded-full border border-gray-6 hover:bg-gray-3 disabled:opacity-50 disabled:pointer-events-none cursor-pointer "
                        aria-label="Próxima pergunta"
                      ><ArrowButton isOpen={false} />
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-5">
                    <p className="font-manrope font-extrabold text-[20px] leading-[1.1] text-gray-12">
                      P: {question.question}
                    </p>
                    <div className="flex gap-11 flex-wrap">
                      <div className="flex flex-col gap-1">
                        <p className="font-family-dm-sans font-medium text-base text-gray-11">
                          Tipo de pergunta
                        </p>
                        <p className="font-family-dm-sans font-semibold text-[18px] leading-[1.3] text-gray-12">
                          {typeLabel}
                        </p>
                      </div>
                      <div className="flex flex-col gap-1">
                        <p className="font-family-dm-sans font-medium text-base text-gray-11">
                          Qt de participantes
                        </p>
                        <p className="font-family-dm-sans font-semibold text-[18px] leading-[1.3] text-gray-12">
                          {totalParticipants.toLocaleString("pt-BR")}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Table: Respostas | % das Escolhas | QT participante */}
                <div className="bg-gray-2 border-[1.5px] border-gray-6 rounded-lg overflow-hidden">
                  <div className="grid grid-cols-[44px_1fr_209px_137px] border-b border-gray-6 bg-gray-3 h-11 items-center">
                    <div className="border-r border-gray-6" />
                    <div className="px-4 py-3">
                      <p className="font-medium text-sm leading-[1.3] text-gray-12">
                        Respostas
                      </p>
                    </div>
                    <div className="px-4 py-3 flex items-center justify-center">
                      <p className="font-medium text-sm leading-[1.3] text-gray-12">
                        % das Escolhas
                      </p>
                    </div>
                    <div className="px-4 py-3 flex items-center justify-center border-l border-gray-6">
                      <p className="font-medium text-sm leading-[1.3] text-gray-12">
                        QT participante
                      </p>
                    </div>
                  </div>
                  {rows.map((row, index) => (
                    <div
                      key={index}
                      className="grid grid-cols-[44px_1fr_209px_137px] border-b border-gray-6 last:border-b-0 items-center h-11"
                    >
                      <div className="h-full flex items-center justify-center border-r border-gray-6 px-4">
                        <p className="font-semibold text-sm leading-[1.3] text-gray-12">
                          {index + 1}
                        </p>
                      </div>
                      <div className="min-w-0 px-3 py-4">
                        <p className="font-medium text-sm leading-[1.3] text-gray-12 truncate">
                          {row.label}
                        </p>
                      </div>
                      <div className="flex gap-2 h-full items-center justify-end px-4 py-2">
                        <p className="font-semibold text-sm leading-[1.3] text-gray-12 shrink-0">
                          {row.percentage}%
                        </p>
                        <PercentageBar percentage={row.percentage} />
                      </div>
                      <div className="h-full flex items-center justify-center px-4">
                        <p className="font-semibold text-sm leading-[1.3] text-gray-12">
                          {row.count.toLocaleString("pt-BR")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
