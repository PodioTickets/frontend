"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { X, ChevronLeft, ChevronRight, Search } from "lucide-react";
import type { Question } from "@/interfaces/event";
import { ArrowButton } from "../ArrowButton";

const QUESTION_TYPE_LABELS: Record<string, string> = {
  text: "Texto livre",
  true_false: "Verdadeiro ou falso",
  number: "Número",
  select: "Lista",
  multiple_choice: "Múltipla escolha",
};

export interface QuestionAnswerRow {
  label: string;
  percentage: number;
  count: number;
}

export interface TextAnswerRow {
  id?: string;
  userName: string;
  userEmail?: string;
  userAvatarUrl?: string;
  answer: string;
  answeredAt?: string;
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
  /** Respostas individuais para perguntas de texto livre */
  textAnswerRows?: TextAnswerRow[];
  onPrevious?: () => void;
  onNext?: () => void;
}

const BAR_SEGMENTS = 10;
const TEXT_ANSWERS_PAGE_SIZE = 10;

function PercentageBar({ percentage }: { percentage: number }) {
  const filled = Math.round((percentage / 100) * BAR_SEGMENTS);
  return (
    <div className="flex gap-0.5 items-center h-7">
      {Array.from({ length: BAR_SEGMENTS }).map((_, i) => (
        <div
          key={i}
          className={`h-full w-3 rounded shrink-0 ${i < filled ? "bg-primary-11" : "bg-gray-6"}`}
        />
      ))}
    </div>
  );
}

function UserAvatar({ name, avatarUrl }: { name: string; avatarUrl?: string }) {
  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={avatarUrl} alt={name} className="size-9 rounded-lg object-cover shrink-0" />
    );
  }
  const parts = name.trim().split(" ");
  const initials =
    parts.length >= 2
      ? (parts[0][0] ?? "") + (parts[parts.length - 1][0] ?? "")
      : (parts[0]?.[0] ?? "?");
  return (
    <div className="size-9 rounded-lg bg-gray-5 flex items-center justify-center shrink-0">
      <span className="font-manrope font-bold text-sm text-gray-12 uppercase">{initials}</span>
    </div>
  );
}

function formatAnsweredAt(iso: string) {
  try {
    const d = new Date(iso);
    const date = d.toLocaleDateString("pt-BR");
    const time = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    return { date, time };
  } catch {
    return null;
  }
}

export function QuestionDetailsDrawer({
  isOpen,
  onClose,
  question,
  questionIndex = 1,
  totalQuestions = 1,
  answerRows,
  totalParticipants = 0,
  textAnswerRows,
  onPrevious,
  onNext,
}: QuestionDetailsDrawerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Reset search/page when question changes
  useEffect(() => {
    setSearchQuery("");
    setCurrentPage(1);
  }, [question?.id]);

  const typeLabel = question ? QUESTION_TYPE_LABELS[question.type] ?? question.type : "—";
  const isTextQuestion = question?.type === "text" || question?.type === "number";

  const rows: QuestionAnswerRow[] =
    answerRows ??
    (isTextQuestion
      ? [{ label: "Texto livre", percentage: 100, count: totalParticipants || 0 }]
      : (question?.options ?? []).map((opt) => ({
          label: opt,
          percentage: totalQuestions > 0 ? Math.round(100 / (question?.options?.length ?? 1)) : 0,
          count:
            totalParticipants > 0
              ? Math.round((totalParticipants ?? 0) / (question?.options?.length ?? 1))
              : 0,
        })));

  // Text answers filtering + pagination
  const filteredTextAnswers = useMemo(() => {
    if (!textAnswerRows) return [];
    const q = searchQuery.toLowerCase();
    if (!q) return textAnswerRows;
    return textAnswerRows.filter(
      (r) =>
        r.userName.toLowerCase().includes(q) ||
        (r.userEmail?.toLowerCase().includes(q) ?? false) ||
        r.answer.toLowerCase().includes(q)
    );
  }, [textAnswerRows, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredTextAnswers.length / TEXT_ANSWERS_PAGE_SIZE));
  const pagedAnswers = filteredTextAnswers.slice(
    (currentPage - 1) * TEXT_ANSWERS_PAGE_SIZE,
    currentPage * TEXT_ANSWERS_PAGE_SIZE
  );

  const pageNumbers = useMemo(() => {
    const pages: (number | "...")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push("...");
      for (
        let i = Math.max(2, currentPage - 1);
        i <= Math.min(totalPages - 1, currentPage + 1);
        i++
      ) {
        pages.push(i);
      }
      if (currentPage < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  }, [totalPages, currentPage]);

  const handleExportCsv = () => {
    if (!textAnswerRows?.length || !question) return;
    const headers = ["Nome", "Email", "Resposta", "Data"];
    const csvRows = textAnswerRows.map((r) => [
      r.userName,
      r.userEmail ?? "",
      `"${r.answer.replace(/"/g, '""')}"`,
      r.answeredAt ?? "",
    ]);
    const csv = [headers, ...csvRows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `respostas-${question.id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()} direction="right">
      <DrawerContent className="bg-gray-1 h-full w-full sm:max-w-[883px] border-l border-gray-6 rounded-l-xl">
        <DrawerTitle className="sr-only">Detalhes das perguntas</DrawerTitle>
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
                        className="size-9 flex items-center justify-center rounded-full border border-gray-6 hover:bg-gray-3 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                        aria-label="Próxima pergunta"
                      >
                        <ArrowButton isOpen={false} />
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

                {/* Content: texto livre vs opções */}
                {isTextQuestion && textAnswerRows !== undefined ? (
                  /* ── Texto livre: lista de respostas individuais ── */
                  <div className="flex flex-col gap-4">
                    {/* Cabeçalho da seção */}
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-manrope font-extrabold text-[18px] leading-[1.1] text-gray-12">
                        Respostas de todos os usuários
                      </p>
                      <button
                        type="button"
                        onClick={handleExportCsv}
                        className="h-9 px-4 bg-[#59E373] rounded-lg font-manrope font-bold text-sm text-[#141A15] hover:bg-[#4fd066] transition-colors shrink-0"
                      >
                        Exportar CSV
                      </button>
                    </div>

                    {/* Busca */}
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                        <Search className="size-4 text-gray-11" />
                      </div>
                      <input
                        type="text"
                        placeholder="Palavras-chaves, nome..."
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          setCurrentPage(1);
                        }}
                        className="w-full h-10 pl-9 pr-3 border border-gray-6 rounded-lg bg-gray-1 text-sm text-gray-12 font-family-dm-sans placeholder:text-gray-10 focus:outline-none focus:border-primary-10 focus:ring-1 focus:ring-primary-10/20 transition-all"
                      />
                    </div>

                    {/* Cards de resposta */}
                    <div className="flex flex-col gap-3">
                      {pagedAnswers.length === 0 ? (
                        <p className="text-sm text-gray-11 font-family-dm-sans text-center py-8">
                          Nenhuma resposta encontrada.
                        </p>
                      ) : (
                        pagedAnswers.map((row, i) => {
                          const dt = row.answeredAt ? formatAnsweredAt(row.answeredAt) : null;
                          return (
                            <div
                              key={row.id ?? i}
                              className="bg-gray-2 border border-gray-6 rounded-lg p-4 flex flex-col gap-3"
                            >
                              {/* Info do usuário + data */}
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2 min-w-0">
                                  <UserAvatar name={row.userName} avatarUrl={row.userAvatarUrl} />
                                  <div className="flex flex-col min-w-0">
                                    <p className="font-family-dm-sans font-semibold text-sm leading-[1.3] text-gray-12 truncate">
                                      {row.userName}
                                    </p>
                                    {row.userEmail && (
                                      <p className="font-family-dm-sans font-normal text-sm leading-[1.3] text-gray-11 truncate">
                                        {row.userEmail}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                {dt && (
                                  <p className="font-inter font-semibold text-sm leading-[1.3] text-gray-11 shrink-0 whitespace-nowrap">
                                    {dt.date} · {dt.time}
                                  </p>
                                )}
                              </div>
                              {/* Texto da resposta */}
                              <p className="font-inter font-medium text-sm leading-[1.5] text-gray-12">
                                {row.answer}
                              </p>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Paginação */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          disabled={currentPage <= 1}
                          className="size-9 flex items-center justify-center rounded-lg border border-gray-6 hover:bg-gray-3 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                          aria-label="Página anterior"
                        >
                          <ChevronLeft className="size-4 text-gray-12" />
                        </button>
                        {pageNumbers.map((p, i) =>
                          p === "..." ? (
                            <span
                              key={`ellipsis-${i}`}
                              className="size-9 flex items-center justify-center text-sm text-gray-11"
                            >
                              ...
                            </span>
                          ) : (
                            <button
                              key={p}
                              type="button"
                              onClick={() => setCurrentPage(p as number)}
                              className={`size-9 flex items-center justify-center rounded-lg text-sm font-semibold transition-colors ${
                                currentPage === p
                                  ? "bg-primary-11 text-white"
                                  : "border border-gray-6 text-gray-12 hover:bg-gray-3"
                              }`}
                            >
                              {p}
                            </button>
                          )
                        )}
                        <button
                          type="button"
                          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                          disabled={currentPage >= totalPages}
                          className="size-9 flex items-center justify-center rounded-lg border border-gray-6 hover:bg-gray-3 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                          aria-label="Próxima página"
                        >
                          <ChevronRight className="size-4 text-gray-12" />
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  /* ── Perguntas de opção: tabela ── */
                  <div className="bg-gray-2 border-[1.5px] border-gray-6 rounded-lg overflow-hidden">
                    <div className="grid grid-cols-[44px_1fr_209px_137px] border-b border-gray-6 bg-gray-3 h-11 items-center">
                      <div className="border-r border-gray-6" />
                      <div className="px-4 py-3">
                        <p className="font-medium text-sm leading-[1.3] text-gray-12">Respostas</p>
                      </div>
                      <div className="px-4 py-3 flex items-center justify-center">
                        <p className="font-medium text-sm leading-[1.3] text-gray-12">% das Escolhas</p>
                      </div>
                      <div className="px-4 py-3 flex items-center justify-center border-l border-gray-6">
                        <p className="font-medium text-sm leading-[1.3] text-gray-12">QT participante</p>
                      </div>
                    </div>
                    {rows.map((row, index) => (
                      <div
                        key={index}
                        className="grid grid-cols-[44px_1fr_209px_137px] border-b border-gray-6 last:border-b-0 items-center h-11"
                      >
                        <div className="h-full flex items-center justify-center border-r border-gray-6 px-4">
                          <p className="font-semibold text-sm leading-[1.3] text-gray-12">{index + 1}</p>
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
                )}
              </>
            )}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
