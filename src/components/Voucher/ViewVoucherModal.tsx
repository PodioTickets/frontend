"use client";

import { useState, useEffect, useLayoutEffect } from "react";
import { useViewVoucherModal } from "@/stores/modalStore";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { organizerService } from "@/services";
import toast from "react-hot-toast";
import { useClipboard } from "@/hooks/useClipboard";
import { buildCouponShareLink } from "@/lib/couponShareLink";
import { formatDateBRT } from "@/utils/datetimeBR";
import { CopyIcon } from "@/components/Icons/CopyIcon";
import { Button } from "@/components/Button";
import { TicketIcon } from "@/components/Icons/TicketIcon";
import { Pagination } from "@/components/Pagination";
import { useTickets } from "@/hooks/useTickets";
import { useTicketCategories } from "@/hooks/useTicketCategories";
import { ArrowButton } from "../ArrowButton";
import { cn } from "@/utils/cn";
import { Loading } from "../Loading";

interface Voucher {
  id: string;
  code: string;
  name: string;
  status: "ACTIVE" | "INACTIVE" | "USED" | "EXPIRED";
  [key: string]: any;
}

interface VoucherGroupInfo {
  name: string;
  status: "ACTIVE" | "INACTIVE" | "USED" | "EXPIRED";
  totalCount: number;
  availableCount: number;
  usedCount: number;
  expiredCount: number;
  inactiveCount: number;
  expiryDate?: string;
  appliesTo?: "all" | Array<string | { id: string }>;
  linkedTicket?: {
    id: string;
    name: string;
    price: number;
    category?: { id: string; name: string };
  };
}

interface VoucherGroupData {
  groupName: string;
  vouchers: Voucher[];
  group?: VoucherGroupInfo;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export function ViewVoucherModal() {
  const { isOpen, closeViewVoucherModal, data } = useViewVoucherModal();
  const { copyToClipboard } = useClipboard();
  const [loading, setLoading] = useState(false);
  const [voucherData, setVoucherData] = useState<VoucherGroupData | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [groupInfo, setGroupInfo] = useState<VoucherGroupInfo | null>(null);
  // Mobile = painel full-screen (sem scale/slide); desktop = diálogo centrado.
  // Mesmo par de effects do `CreateVoucherModal`: o `useLayoutEffect` acerta o
  // valor antes da pintura (SSR começa em `true`) e o listener acompanha resize.
  const [isMdUp, setIsMdUp] = useState(true);

  useLayoutEffect(() => {
    setIsMdUp(window.matchMedia("(min-width: 768px)").matches);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const onChange = () => setIsMdUp(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const eventId = data?.eventId;
  const groupName = data?.groupName;
  // Slug repassado pelo opener (EventVouchersView) p/ montar o link público.
  const eventSlug = data?.eventSlug as string | undefined;

  // Buscar tickets e categorias
  const { tickets } = useTickets(eventId, isOpen);
  const { categories } = useTicketCategories(eventId, isOpen);

  // Mapear categorias por ID
  const categoryMap = new Map(categories.map((cat) => [cat.id, cat.name]));

  const groupStatus: "ACTIVE" | "USED" | "EXPIRED" | "INACTIVE" = (() => {
    if (!groupInfo) return "INACTIVE";
    const { availableCount = 0, usedCount = 0, expiredCount = 0, totalCount = 0 } = groupInfo;
    if (availableCount > 0) return "ACTIVE";
    if (totalCount > 0 && usedCount >= totalCount) return "USED";
    if (totalCount > 0 && expiredCount >= totalCount) return "EXPIRED";
    return "INACTIVE";
  })();

  const groupStatusLabel: Record<typeof groupStatus, string> = {
    ACTIVE: "Ativo",
    USED: "Usado",
    EXPIRED: "Expirado",
    INACTIVE: "Inativo",
  };

  const groupStatusClass: Record<typeof groupStatus, string> = {
    ACTIVE: "bg-primary-5 text-primary-12",
    USED: "bg-gray-5 text-gray-12",
    EXPIRED: "bg-red-4 text-red-11",
    INACTIVE: "bg-gray-5 text-gray-12",
  };

  // Encontrar tickets vinculados ao voucher
  const getLinkedTickets = () => {
    if (!groupInfo || !tickets.length) return [];
    if (groupInfo.appliesTo === "all") return tickets;

    if (Array.isArray(groupInfo.appliesTo)) {
      const ticketIds = groupInfo.appliesTo.map((item) =>
        typeof item === "string" ? item : item.id
      );
      return tickets.filter((ticket) => ticketIds.includes(ticket.id));
    }

    return [];
  };

  const linkedTickets = getLinkedTickets();

  const formatPrice = (cents: number) =>
    `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`;

  // Dados do ingresso vinculado: usa linkedTicket da API diretamente
  const linkedTicket = groupInfo?.linkedTicket ?? null;
  const isSpecificTicket = !!linkedTicket;

  useEffect(() => {
    if (isOpen && eventId && groupName) {
      setCurrentPage(1);
      loadVoucherGroup(1);
    }
  }, [isOpen, eventId, groupName]);

  useEffect(() => {
    if (isOpen && eventId && groupName && currentPage > 1) {
      loadVoucherGroup(currentPage);
    }
  }, [currentPage]);

  const loadVoucherGroup = async (page: number = currentPage) => {
    if (!eventId || !groupName) return;

    setLoading(true);
    try {
      const data = await organizerService.getVoucherGroup(eventId, groupName, {
        page,
        limit: 20,
      });
      setVoucherData(data);

      if (data?.group) {
        setGroupInfo(data.group);
      }
    } catch (error: any) {
      console.error("Error loading voucher group:", error);
      toast.error("Erro ao carregar vouchers");
    } finally {
      setLoading(false);
    }
  };

  // Copia o LINK público do evento com o voucher já aplicado (?voucher=CODIGO).
  const handleCopyCode = async (code: string) => {
    await copyToClipboard(buildCouponShareLink(eventSlug, code, "voucher"));
  };

  const handleDownloadCSV = () => {
    if (!voucherData?.vouchers) return;

    const csvContent = [
      ["Código", "Status"],
      ...voucherData.vouchers.map((v) => [v.code, v.status]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `vouchers-${groupName}-${new Date().getTime()}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV baixado com sucesso!");
  };

  // Validade = fim do dia em BRT (instante). Exibir em Brasília → mostra o DIA
  // escolhido; compatível com dados novos e legados (ver toCivilDayBRT).
  const formatDate = (dateString?: string) => {
    if (!dateString) return "Sem validade";
    return formatDateBRT(dateString, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const panelMotion = isMdUp
    ? { initial: { opacity: 0, scale: 0.95, y: 20 }, animate: { opacity: 1, scale: 1, y: 0 }, exit: { opacity: 0, scale: 0.95, y: 20 } }
    : { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/90 z-50"
            onClick={closeViewVoucherModal}
          />

          {/* Modal */}
          <motion.div
            {...panelMotion}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed inset-0 z-50 md:flex md:items-center md:justify-center md:p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={cn(
                // pt-16 (64px = `h-16` da OrganizerMobileNav) reserva o topo no
                // mobile: a nav é `fixed top-0 z-50` e vem DEPOIS dos modais no DOM,
                // então com z-50 empatado ela pinta por cima e engoliria o header.
                // Mesmo padrão do `CreateVoucherModal`.
                "flex flex-col overflow-hidden bg-gray-1 shadow-2xl pt-16 md:pt-0",
                "max-md:h-full max-md:w-full",
                "md:w-full md:max-w-[916px] md:max-h-[90vh] md:rounded-xl md:border md:border-gray-6",
              )}
            >
              {/* Header — em fluxo (shrink-0): só o conteúdo rola. */}
              <div
                className={cn(
                  "flex shrink-0 items-center justify-between border-b border-gray-6",
                  "max-md:h-[52px] max-md:bg-gray-1 max-md:px-4",
                  "md:px-5 md:py-3",
                )}
              >
                <div className="flex min-w-0 flex-1 items-center gap-2 md:contents">
                  <button
                    type="button"
                    onClick={closeViewVoucherModal}
                    className="flex size-8 shrink-0 rotate-180 items-center justify-center rounded-[52px] border-gray-6 transition-colors hover:bg-gray-3 md:hidden md:border"
                    aria-label="Fechar"
                  >
                    <ArrowButton isOpen={false} />
                  </button>
                  <h2
                    className={cn(
                      "truncate leading-[1.3] text-gray-12",
                      "max-md:font-manrope max-md:text-base max-md:font-extrabold",
                      "md:font-family-dm-sans md:text-[20px] md:font-semibold",
                    )}
                  >
                    Lista de vouchers
                  </h2>
                </div>
                <button
                  onClick={closeViewVoucherModal}
                  className="hidden size-9 items-center justify-center rounded-lg p-1 text-gray-11 transition-colors hover:bg-gray-3 hover:text-gray-12 md:flex"
                  aria-label="Fechar"
                >
                  <X className="size-6" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-4 md:p-5">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loading />
                  </div>
                ) : voucherData ? (
                  <div className="flex flex-col gap-8">
                    {/* Top Section - Ticket card + Group info.
                        No mobile empilha: o card tinha `w-[343px] shrink-0`, que
                        sozinho já estoura a viewport de 360px e esmagava a coluna
                        de infos ao lado. */}
                    <div className="flex flex-col gap-4 md:flex-row md:gap-6 md:items-center">
                      {/* Card do ingresso vinculado */}
                      <div className="bg-gray-2 border border-gray-6 rounded-xl flex flex-col w-full md:w-[343px] md:shrink-0">
                        {linkedTicket ? (
                          <>
                            <div className="flex flex-col gap-2 p-4 w-full">
                              <p className="text-gray-11 text-base font-family-dm-sans leading-[1.3] truncate">
                                {linkedTicket.category?.name || "Ingresso avulso"}
                              </p>
                              <div className="flex gap-1.5 items-center">
                                <TicketIcon className="size-5 text-gray-12 shrink-0" />
                                <p className="text-gray-12 text-base font-bold font-manrope leading-[1.1]">
                                  {linkedTicket.name}
                                </p>
                              </div>
                            </div>
                            <div className="border-t border-gray-6 flex items-center px-5 py-4 w-full">
                              <p className="text-gray-12 text-base font-bold font-manrope leading-[1.1]">
                                {formatPrice(linkedTicket.price)}
                              </p>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="flex flex-col gap-2 p-4 w-full">
                              <p className="text-gray-11 text-base font-family-dm-sans leading-[1.3]">
                                Todos os ingressos
                              </p>
                              <div className="flex gap-1.5 items-center">
                                <TicketIcon className="size-5 text-gray-12 shrink-0" />
                                <p className="text-gray-12 text-base font-bold font-manrope leading-[1.1]">
                                  Qualquer ingresso do evento
                                </p>
                              </div>
                            </div>
                            <div className="border-t border-gray-6 flex items-center px-5 py-4 w-full">
                              <p className="text-gray-12 text-base font-bold font-manrope leading-[1.1]">
                                100% cortesia
                              </p>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Informações do grupo */}
                      <div className="flex min-w-0 flex-1 flex-col gap-4">
                        <p className="text-gray-12 text-lg font-semibold font-family-dm-sans leading-[1.3] break-words">
                          {groupInfo?.name || groupName}
                        </p>

                        {/* Tags row 1: totais / disponíveis / usados */}
                        <div className="flex gap-2.5 items-center flex-wrap">
                          <div className="flex gap-1 items-center">
                            <span className="text-gray-12 text-base font-family-dm-sans leading-[1.3]">Totais:</span>
                            <span className="text-gray-12 text-base font-semibold font-manrope leading-[1.1]">
                              {groupInfo?.totalCount || voucherData.pagination.total}
                            </span>
                          </div>
                          <div className="size-1.5 rounded-full bg-gray-11 shrink-0" />
                          <div className="flex gap-1 items-center">
                            <span className="text-gray-12 text-base font-family-dm-sans leading-[1.3]">Disponíveis:</span>
                            <span className="text-gray-12 text-base font-semibold font-manrope leading-[1.1]">
                              {groupInfo?.availableCount ?? voucherData.vouchers.filter((v) => v.status === "ACTIVE").length}
                            </span>
                          </div>
                          <div className="size-1.5 rounded-full bg-gray-11 shrink-0" />
                          <div className="flex gap-1 items-center">
                            <span className="text-gray-12 text-base font-family-dm-sans leading-[1.3]">Usados:</span>
                            <span className="text-gray-12 text-base font-semibold font-manrope leading-[1.1]">
                              {groupInfo?.usedCount || voucherData.vouchers.filter((v) => v.status === "USED").length}
                            </span>
                          </div>
                        </div>

                        {/* Tags row 2: status / validade / benefício */}
                        <div className="flex gap-2.5 items-center flex-wrap">
                          <div className="flex gap-1 items-center">
                            <span className="text-gray-12 text-base font-family-dm-sans leading-[1.3]">Status:</span>
                            <span className={`px-3 py-1.5 rounded-full text-sm font-semibold font-family-dm-sans leading-[1.3] ${groupStatusClass[groupStatus]}`}>
                              {groupStatusLabel[groupStatus]}
                            </span>
                          </div>
                          {groupInfo?.expiryDate && (
                            <>
                              <div className="size-1.5 rounded-full bg-gray-11 shrink-0" />
                              <div className="flex gap-1 items-center">
                                <span className="text-gray-12 text-base font-family-dm-sans leading-[1.3]">Validade:</span>
                                <span className="text-gray-12 text-base font-semibold font-manrope leading-[1.1]">
                                  {formatDate(groupInfo.expiryDate)}
                                </span>
                              </div>
                            </>
                          )}
                          <div className="size-1.5 rounded-full bg-gray-11 shrink-0" />
                          <div className="flex gap-1 items-center">
                            <span className="text-gray-12 text-base font-family-dm-sans leading-[1.3]">Benefício:</span>
                            <span className="text-gray-12 text-base font-semibold font-manrope leading-[1.1]">
                              100% cortesia
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Vouchers Grid */}
                    <div className="flex flex-col gap-5">
                      {/* 1 coluna no mobile → 2 → 3 no desktop. As células tinham
                          `min-w-[245px]` num `grid-cols-3` fixo (~735px mínimos), o
                          que estourava o modal no celular.
                          As bordas são CSS puro: cada célula desenha direita+baixo e o
                          `-mr-px -mb-px` joga as externas pra fora do `overflow-hidden`
                          do pai, que as recorta. Antes eram calculadas em JS com `% 3`
                          — o que passaria a desenhar linhas erradas assim que o número
                          de colunas variasse por breakpoint. */}
                      <div className="border border-gray-6 rounded-xl overflow-hidden">
                        <div className="-mb-px -mr-px grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
                          {voucherData.vouchers.map((voucher, index) => (
                            <div
                              key={voucher.id || index}
                              className="flex min-w-0 items-center border-b border-r border-gray-6 p-4"
                            >
                              <div className="flex min-w-0 flex-1 items-center gap-1">
                                <p
                                  className={cn(
                                    "min-w-0 flex-1 truncate text-sm font-semibold font-family-dm-sans leading-[1.3]",
                                    voucher.status === "USED" || voucher.status === "EXPIRED"
                                      ? "text-gray-9"
                                      : "text-gray-12",
                                  )}
                                  title={voucher.code}
                                >
                                  {voucher.code}
                                </p>
                                {(voucher.status === "ACTIVE" || voucher.status === "INACTIVE") && (
                                  <button
                                    onClick={() => handleCopyCode(voucher.code)}
                                    className="size-7 shrink-0 rounded-lg flex items-center justify-center hover:bg-gray-3 transition-colors cursor-pointer"
                                    title="Copiar link do voucher"
                                  >
                                    <CopyIcon className="size-4 text-gray-11" />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Paginação: componente compartilhado — reticências + scroll
                          horizontal contido. O inline anterior renderizava TODAS as
                          páginas (um grupo de 500 vouchers = 25 botões), o que por si
                          só já estourava a largura no mobile. */}
                      {voucherData.pagination.totalPages > 1 && (
                        <Pagination
                          currentPage={currentPage}
                          totalPages={voucherData.pagination.totalPages}
                          onPageChange={setCurrentPage}
                          disabled={loading}
                          className="md:justify-end"
                        />
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-gray-11">Nenhum voucher encontrado</div>
                  </div>
                )}
              </div>

              {/* Footer — no mobile os botões dividem a largura; `env(safe-area-inset-bottom)`
                  cobre a barra de gestos do iOS. Mesmo padrão do `CreateVoucherModal`. */}
              <div
                className={cn(
                  "flex shrink-0 items-center gap-2 border-t border-gray-6 bg-gray-2",
                  "max-md:p-4 max-md:pb-[max(1rem,env(safe-area-inset-bottom))]",
                  "md:justify-end md:px-4 md:py-3",
                )}
              >
                <Button
                  variant="outline"
                  onClick={closeViewVoucherModal}
                  className="border border-gray-6 text-gray-12 h-11 px-5 max-md:flex-1"
                >
                  Fechar
                </Button>
                <Button
                  variant="default"
                  onClick={handleDownloadCSV}
                  className="h-11 px-5 max-md:flex-1"
                >
                  Baixar CSV
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
