"use client";

import {
  useViewRegistrationModal,
  usePaymentDetailsModal,
  useModalStore,
} from "@/stores/modalStore";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, Check } from "lucide-react";
import { createPortal } from "react-dom";
import { cn } from "@/utils/cn";
import {
  useState,
  useMemo,
  useEffect,
  useLayoutEffect,
  useCallback,
  useRef,
} from "react";
import toast from "react-hot-toast";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { organizerService } from "@/services";
import { Loading } from "../Loading";
import { DistanceIcon } from "../Icons/DistanceIcon";
import { ArrowButton } from "../ArrowButton";
import {
  isPersonBr,
  documentLabel,
  formatDocumentDisplay,
  formatPersonPhone,
} from "@/utils/documentDisplay";
import { ImageWithInitialFallback } from "../ImageWithInitialFallback";
import { Button } from "../Button";
import { formatAnswer } from "@/utils/questionAnswer";
import { isSemInteresseVariation } from "@/utils/semInteresseVariation";
import { FormField } from "@/components/FormField";
import { SearchSelect } from "@/components/SearchSelect";
import { ResendTicketsModal } from "./ResendTicketsModal";
import { formatCPF, formatPhone as formatPhoneMask } from "@/utils/masks";
import { isValidCPF } from "@/utils/cpf";
import { maskDateBR, brDateToYmd } from "@/utils/dateInput";
import { ticketNameHasDistance } from "@/utils/checkoutModalityDisplay";

/** Rascunho editável dos dados do participante (edição inline do organizador).
 *  Valores CRUS (sem máscara de exibição) — a máscara é aplicada no input. */
interface ParticipantDraft {
  name: string;
  email: string;
  documentNumber: string;
  documentType: string;
  phone: string;
  birthDate: string; // dd/mm/aaaa no input
  gender: string; // masculino | feminino | outro
  country: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
}

/** Produto já normalizado para exibição (map de `rawProducts`). */
interface ModalProduct {
  id?: string;
  productId?: string | null;
  variationId?: string | null;
  productName: string;
  productImage: string | null;
  variationType?: string | null;
  variationName?: string | null;
  price: number | string;
  isIncluded?: boolean;
  variationEdited?: boolean;
}

/** Variação disponível (de `getProductById`) p/ o dropdown de edição. */
interface ProductVariationOption {
  id: string;
  name: string;
  price?: number;
  stock?: number;
  availableStock?: number;
}

/** Resposta de pergunta do organizador (snapshot/relacional). */
interface AnswerItem {
  id?: string;
  question?: { id?: string; question?: string; description?: string } | string;
  answer?: unknown;
}

/** Opções de sexo — mesmos ids gravados no checkout (`InformationStep`). */
const GENDER_OPTIONS: { value: string; label: string }[] = [
  { value: "masculino", label: "Masculino" },
  { value: "feminino", label: "Feminino" },
  { value: "outro", label: "Outro" },
];

/** Badge exibido quando o organizador trocou a variação do produto do
 *  participante (snapshot `variationEdited: true`). */
function VariationEditedBadge() {
  return (
    <span className="inline-flex w-fit items-center gap-1 rounded-full bg-yellow-3 px-2 py-0.5 text-xs font-medium text-yellow-12">
      Variação alterada
    </span>
  );
}

/**
 * Select de variação do produto no modo EDIÇÃO (design do Figma: box full-width
 * "Selecione a opção" + seta). O menu é PORTALADO no `body` com posição `fixed`
 * ancorada no gatilho — assim FLUTUA por cima (absolute) sem ser cortado pelo body
 * do modal com `overflow-y-auto`. Reposiciona no scroll/resize e fecha ao clicar fora.
 */
function VariationFloatingDropdown({
  currentName,
  currentId,
  variations,
  loading,
  saving,
  open,
  onToggle,
  onClose,
  onSelect,
}: {
  currentName: string | null;
  currentId: string;
  variations: ProductVariationOption[];
  loading: boolean;
  saving: boolean;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  onSelect: (variationId: string) => void;
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);

  const reposition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    // Menu alinhado sob o box (mesma largura/esquerda do gatilho).
    const width = r.width;
    const left = r.left;
    // Estima a altura p/ decidir abrir p/ baixo ou p/ cima (evita sair da viewport).
    const estH = Math.min(260, Math.max(48, variations.length * 44 + 8));
    const spaceBelow = window.innerHeight - r.bottom;
    const top =
      spaceBelow < estH + 8 && r.top > estH + 8 ? r.top - estH - 4 : r.bottom + 4;
    setPos({ top, left, width });
  }, [variations.length]);

  useEffect(() => {
    if (!open) return;
    reposition();
    const handler = () => reposition();
    // capture=true p/ pegar o scroll do container interno do modal também.
    window.addEventListener("scroll", handler, true);
    window.addEventListener("resize", handler);
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      onClose();
    };
    document.addEventListener("mousedown", onDown);
    return () => {
      window.removeEventListener("scroll", handler, true);
      window.removeEventListener("resize", handler);
      document.removeEventListener("mousedown", onDown);
    };
  }, [open, reposition, onClose]);

  const isSoldOut = (v: ProductVariationOption) => {
    const stock = v.stock ?? 0;
    if (stock <= 0) return false; // ilimitado
    if (v.availableStock == null) return false;
    return v.availableStock <= 0;
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={onToggle}
        disabled={saving}
        className={cn(
          "w-full min-w-[147px] h-9 flex items-center justify-between gap-2 px-3 rounded-lg border bg-gray-1 transition-colors",
          saving
            ? "opacity-60 cursor-wait border-gray-7"
            : "cursor-pointer border-gray-7 hover:border-gray-8",
        )}
      >
        <span
          className={cn(
            "font-family-dm-sans font-normal text-sm truncate",
            currentName ? "text-gray-12" : "text-gray-11",
          )}
        >
          {saving ? "Salvando..." : currentName || "Selecione a opção"}
        </span>
        <ArrowButton isOpen={open} className="size-3 text-gray-12 shrink-0" />
      </button>
      {open &&
        pos &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: "fixed",
              top: pos.top,
              left: pos.left,
              width: pos.width,
              zIndex: 9999,
            }}
            className="bg-gray-1 border border-gray-6 rounded-lg shadow-lg overflow-hidden max-h-[260px] overflow-y-auto"
          >
            {loading ? (
              <div className="px-3 py-3 font-family-dm-sans text-sm text-gray-11">
                Carregando…
              </div>
            ) : variations.length === 0 ? (
              <div className="px-3 py-3 font-family-dm-sans text-sm text-gray-11">
                Nenhuma variação disponível
              </div>
            ) : (
              variations.map((v, i) => {
                const isCurrent = v.id === currentId;
                const out = !isCurrent && isSoldOut(v);
                return (
                  <button
                    key={v.id}
                    type="button"
                    disabled={saving || out}
                    onClick={() => onSelect(v.id)}
                    className={cn(
                      "flex items-center gap-2 w-full px-3 py-3 text-left transition-colors",
                      out ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-3 cursor-pointer",
                      i < variations.length - 1 && "border-b border-gray-6",
                      isCurrent && "bg-gray-3",
                    )}
                  >
                    <Check
                      className={cn(
                        "size-4 shrink-0",
                        isCurrent ? "text-primary-11 opacity-100" : "opacity-0",
                      )}
                    />
                    <span className="font-family-dm-sans font-medium text-base text-gray-12 truncate">
                      {v.name}
                    </span>
                    {out && (
                      <span className="ml-auto font-family-dm-sans text-xs text-gray-10 shrink-0">
                        Esgotado
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>,
          document.body,
        )}
    </>
  );
}


export function ViewRegistrationModal() {
  const { isOpen, closeViewRegistrationModal, data } = useViewRegistrationModal();
  const { openPaymentDetailsModal } = usePaymentDetailsModal();
  const [loadingRegistration, setLoadingRegistration] = useState(false);
  const [registrationData, setRegistrationData] = useState<any>(null);
  const [isDownloadingTicket, setIsDownloadingTicket] = useState(false);

  // Reenvio do e-mail (mesmo fluxo do modal de pedido — ResendTicketsModal).
  const [showResendModal, setShowResendModal] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);

  // Edição inline da seção "Informações do participante" (organizador).
  const [editingParticipant, setEditingParticipant] = useState(false);
  const [savingParticipant, setSavingParticipant] = useState(false);
  const [participantDraft, setParticipantDraft] = useState<ParticipantDraft | null>(null);
  const [participantErrors, setParticipantErrors] = useState<Record<string, string>>({});

  // Edição inline das respostas das perguntas (organizador).
  const [editingAnswers, setEditingAnswers] = useState(false);
  const [savingAnswers, setSavingAnswers] = useState(false);
  const [answersDraft, setAnswersDraft] = useState<Record<string, string> | null>(null);

  // Edição da variação dos produtos (organizador). No modo edição cada card mostra
  // o select box (Figma); o menu é um dropdown FLUTUANTE portalado (não corta no
  // scroll). `editingProducts` = modo edição ligado; `openVariationPid` = card com o
  // menu aberto; `savingProductId` = card salvando.
  const [editingProducts, setEditingProducts] = useState(false);
  const [openVariationPid, setOpenVariationPid] = useState<string | null>(null);
  const [savingProductId, setSavingProductId] = useState<string | null>(null);
  const [productVariations, setProductVariations] = useState<
    Record<string, ProductVariationOption[]>
  >({});
  const [loadingVariations, setLoadingVariations] = useState(false);

  /* Split de superfície: mobile usa Drawer (vaul) full-screen rolável; desktop
   * mantém o modal centralizado original. Mesmo padrão do
   * `FiscalExportFormatModal` e dos demais drawers do módulo financeiro.
   *
   * O split precisa ser em JS (não `md:hidden`): um Drawer apenas escondido por
   * CSS ainda montaria seu Dialog/scroll-lock e travaria a rolagem no desktop.
   * `mounted` + `useLayoutEffect` evitam o flash do layout errado no 1º paint. */
  const [isMdUp, setIsMdUp] = useState(true);
  const [mounted, setMounted] = useState(false);

  useLayoutEffect(() => {
    setMounted(true);
    setIsMdUp(window.matchMedia("(min-width: 768px)").matches);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const onChange = () => setIsMdUp(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const registrationId = useMemo(() => {
    return data?.registrationId || data?.registration?.id || null;
  }, [data]);

  const eventName = (data?.eventName as string) || "Evento";

  const showBackToPaymentDetails = Boolean(
    data?.returnToPaymentDetails &&
    data?.paymentDetailsModalData?.registrationId
  );

  const handleBackToPaymentDetails = useCallback(() => {
    const snapshot = useModalStore.getState().data;
    const payload = snapshot?.paymentDetailsModalData as
      | {
        registrationId?: string;
        eventId?: string;
        eventName?: string;
      }
      | undefined;
    closeViewRegistrationModal();
    if (payload?.registrationId) {
      openPaymentDetailsModal({
        registrationId: payload.registrationId,
        eventId: payload.eventId ?? (snapshot?.eventId as string | undefined),
        eventName:
          payload.eventName ??
          (snapshot?.eventName as string | undefined) ??
          "Evento",
      });
    }
  }, [closeViewRegistrationModal, openPaymentDetailsModal]);

  /* Baixa o PDF do ingresso. O backend gera o arquivo a partir do snapshot
   * imutável da inscrição (QR Code + dados do participante/produtos) e aplica o
   * mesmo controle de acesso da visualização. Disparado por ID — não depende do
   * payload já carregado, mas o gate visual garante que só aparece com dados. */
  const handleDownloadTicket = useCallback(async () => {
    if (!registrationId || isDownloadingTicket) return;
    setIsDownloadingTicket(true);
    try {
      const { blob, filename } =
        await organizerService.downloadRegistrationTicketPdf(registrationId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Erro ao baixar o ingresso. Tente novamente.");
    } finally {
      setIsDownloadingTicket(false);
    }
  }, [registrationId, isDownloadingTicket]);

  /* Reenvia o e-mail do pedido (ingressos + comprovante) p/ o endereço informado,
   * como se fosse o comprador. Mesmo endpoint/fluxo do modal de pedido. */
  const handleResendEmail = useCallback(
    async (email: string) => {
      if (!registrationId || resendingEmail) return;
      setResendingEmail(true);
      try {
        // ticketOnly=true: envia SOMENTE este ingresso (sem comprovante nem os
        // demais ingressos do pedido) — diferente do modal de pedido.
        await organizerService.resendRegistrationEmail(registrationId, email, true);
        toast.success("Ingresso reenviado para o e-mail informado.");
        setShowResendModal(false);
      } catch {
        toast.error("Erro ao reenviar o ingresso. Tente novamente.");
      } finally {
        setResendingEmail(false);
      }
    },
    [registrationId, resendingEmail],
  );

  useEffect(() => {
    if (!isOpen || !registrationId) {
      setRegistrationData(null);
      return;
    }

    // Evitar buscar novamente se já temos os dados para este ID
    if (registrationData?.id === registrationId && !loadingRegistration) {
      return;
    }

    const fetchRegistration = async () => {
      try {
        setLoadingRegistration(true);
        const fullData = await organizerService.getRegistrationById(registrationId);
        setRegistrationData(fullData);
      } catch (error) {
        console.error("Erro ao buscar detalhes da registration:", error);
        setRegistrationData(null);
      } finally {
        setLoadingRegistration(false);
      }
    };

    fetchRegistration();
  }, [isOpen, registrationId]);

  // Sai do modo de edição ao fechar o modal ou trocar de inscrição (evita
  // rascunho vazando entre inscrições diferentes).
  useEffect(() => {
    setEditingParticipant(false);
    setParticipantDraft(null);
    setParticipantErrors({});
    setEditingAnswers(false);
    setAnswersDraft(null);
    setEditingProducts(false);
    setOpenVariationPid(null);
    setSavingProductId(null);
    setProductVariations({});
    setShowResendModal(false);
  }, [isOpen, registrationId]);

  /* DESKTOP apenas. Quando aberto SOBRE um vaul Drawer (fluxo financeiro), o vaul
   * deixa `document.body { pointer-events: none }`. O modal do desktop é portalado
   * no ROOT (fora do drawer), então reabilitamos o body enquanto ele está aberto —
   * ele cobre a tela toda, nada indevido fica clicável atrás — e restauramos ao
   * fechar. No mobile isso não é mais necessário: o Drawer é um Dialog próprio e o
   * vaul/Radix gerenciam pointer-events e scroll lock corretamente. */
  useEffect(() => {
    if (!isOpen || !isMdUp) return;
    const prev = document.body.style.pointerEvents;
    document.body.style.pointerEvents = "auto";
    return () => {
      document.body.style.pointerEvents = prev;
    };
  }, [isOpen, isMdUp]);

  /* Isolamento de scroll (DESKTOP) — POR QUÊ.
   * Este modal abre SOBRE dois vaul Drawers aninhados (parcelados → detalhes →
   * ver ingressos). Cada Drawer usa o Dialog do Radix, cujo Overlay embrulha o
   * app em `react-remove-scroll`, que registra um listener GLOBAL de
   * `touchmove`/`wheel` no `document` e dá `preventDefault()` em qualquer rolagem
   * FORA do conteúdo do drawer. Como este modal é portalado no ROOT (fora dos
   * drawers), a rolagem interna dele é cancelada.
   *
   * COMO. Guard no `document` na fase de CAPTURA (roda antes do listener de bubble
   * do react-remove-scroll): para eventos cujo alvo esteja DENTRO do modal,
   * `stopImmediatePropagation()` impede que o lock global os veja. Não damos
   * `preventDefault`, então o scroll nativo do container interno segue.
   *
   * LIMITE CONHECIDO: no MOBILE isso não bastava (rolagem seguia travada) — daí o
   * mobile ter migrado pro Drawer, que resolve na raiz: um Dialog próprio empilha
   * seu lock e o `react-remove-scroll` só deixa o ÚLTIMO lock da pilha agir
   * (`lockStack`), neutralizando os drawers de baixo e liberando o conteúdo. Este
   * guard fica só pro desktop, onde a rolagem por `wheel` funciona hoje. */
  const scrollRegionRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!isOpen || !isMdUp) return;
    const allowScrollInsideModal = (event: Event) => {
      const region = scrollRegionRef.current;
      const target = event.target as Node | null;
      if (region && target && region.contains(target)) {
        event.stopImmediatePropagation();
      }
    };
    const opts = { capture: true, passive: false } as const;
    document.addEventListener("touchmove", allowScrollInsideModal, opts);
    document.addEventListener("wheel", allowScrollInsideModal, opts);
    return () => {
      document.removeEventListener("touchmove", allowScrollInsideModal, opts);
      document.removeEventListener("wheel", allowScrollInsideModal, opts);
    };
  }, [isOpen, isMdUp]);

  const currentRegistration = registrationData;

  const getGenderLabel = (gender?: string) => {
    if (!gender) return "";
    const labels: Record<string, string> = {
      male: "Masculino",
      female: "Feminino",
      other: "Outro",
      masculino: "Masculino",
      feminino: "Feminino",
      outro: "Outro",
    };
    return labels[gender.toLowerCase()] || gender;
  };

  // Evita o flash do layout de desktop antes do 1º paint decidir o breakpoint.
  if (!mounted) {
    return null;
  }

  // Se não houver registration, não renderizar nada
  if (!currentRegistration && !loadingRegistration) {
    return null;
  }

  // Mostrar loading enquanto busca os dados
  if (loadingRegistration && !currentRegistration) {
    // Mobile: dentro do próprio Drawer, pra não abrir um overlay solto sobre ele.
    if (!isMdUp) {
      return (
        <Drawer
          open={isOpen}
          onOpenChange={(open) => {
            if (!open) closeViewRegistrationModal();
          }}
          direction="right"
          disablePreventScroll={false}
        >
          <DrawerContent
            data-vaul-no-drag
            className="bg-gray-2 h-full w-full border-l border-gray-6"
          >
            <DrawerTitle className="sr-only">Detalhes do ingresso</DrawerTitle>
            <div className="flex flex-1 items-center justify-center">
              <Loading />
            </div>
          </DrawerContent>
        </Drawer>
      );
    }

    return (
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
              onClick={closeViewRegistrationModal}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              onClick={(e) => e.stopPropagation()}
              className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
            >
              <div className="bg-gray-1 rounded-lg shadow-2xl w-full max-w-[1095px] mx-4 relative overflow-hidden pointer-events-auto p-20">
                <div className="flex items-center justify-center">
                  <Loading />
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    );
  }

  // Se não tiver dados ainda, não renderizar
  if (!currentRegistration) {
    return null;
  }

  /* Novo endpoint (`registrations-get-by-id.md`): os dados vêm do
   * `receiptSnapshot` congelado, com o participante em `participant` (string
   * única `name`, `documentNumber`/`documentType`/`country`, `birthDate`).
   * Mantemos fallback pro shape LEGADO (findOneLive — inscrições sem snapshot):
   * `user`/`buyer` (first/last/fullName), `modalities`, `kitItems`,
   * `emergencyContact`. Chaves nulas/vazias são removidas pelo backend, então
   * todo acesso é opcional. */
  const snapshotParticipant = currentRegistration?.participant ?? null;
  const user = currentRegistration?.user || currentRegistration?.buyer || null;

  const ticketName = currentRegistration?.ticket?.name || currentRegistration?.modalities?.[0]?.modality?.name || "—";
  const categoryName = currentRegistration?.ticket?.category?.name || currentRegistration?.modalities?.[0]?.modality?.category?.name || "Ingresso avulso";
  const participantName =
    snapshotParticipant?.name ||
    (user
      ? `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.fullName
      : "") ||
    "—";
  const participantEmail = snapshotParticipant?.email || user?.email || "—";
  const participantCPFRaw = snapshotParticipant?.documentNumber || user?.documentNumber || null;
  const participantDocumentType = snapshotParticipant?.documentType || user?.documentType || null;

  /* Nacionalidade do participante pra exibir documento/telefone i18n. Quando o
   * backend não envia `country`/`documentType`, a heurística cai pro shape do
   * doc (11 dígitos = CPF) com segurança. */
  const participantCountry = snapshotParticipant?.country ?? user?.country ?? user?.nationality ?? null;
  const participantIsBr = isPersonBr({
    country: participantCountry,
    documentType: participantDocumentType,
    document: participantCPFRaw,
  });

  // Documento exibido CRU (sem máscara/formatação) — só o label muda por país.
  // Telefone recebe a máscara via util i18n (libphonenumber por país).
  const formatPhone = (phone?: string | null) =>
    formatPersonPhone(phone, participantCountry);

  /* birthDate: o snapshot manda date-only "YYYY-MM-DD". `new Date(date-only)` é
   * interpretado como UTC meia-noite → em BRT (UTC-3) volta pro dia anterior.
   * Por isso parseamos YMD manualmente; só caímos no `new Date` pra ISO completo
   * (legado `user.dateOfBirth`). */
  const rawBirthDate = snapshotParticipant?.birthDate || user?.dateOfBirth || null;
  const participantBirthDate = (() => {
    if (!rawBirthDate) return "—";
    const ymd = String(rawBirthDate).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (ymd) return `${ymd[3]}/${ymd[2]}/${ymd[1]}`;
    try {
      const date = new Date(rawBirthDate);
      if (isNaN(date.getTime())) return "—";
      const day = date.getDate().toString().padStart(2, "0");
      const month = (date.getMonth() + 1).toString().padStart(2, "0");
      return `${day}/${month}/${date.getFullYear()}`;
    } catch {
      return "—";
    }
  })();
  const rawGender = (snapshotParticipant?.gender || user?.gender || "") as string;
  const participantGender = getGenderLabel(rawGender);
  const participantPhone = snapshotParticipant?.phone || user?.phone || null;
  const emergencyName = (currentRegistration.emergencyContact?.name || "") as string;
  const emergencyRawPhone = (currentRegistration.emergencyContact?.phone || "") as string;
  const emergencyPhone = emergencyName || emergencyRawPhone
    ? [emergencyName, emergencyRawPhone ? formatPhone(emergencyRawPhone) : ""].filter(Boolean).join(" - ")
    : null;

  /* Distância: o snapshot manda `distance` ("14") + `distanceUnit` ("KM")
   * separados → juntamos. Legado pode vir embutido ("5 KM") ou em metros nas
   * `modalities`. */
  const ticketDistance = (() => {
    const ticket = currentRegistration?.ticket;
    const dist = ticket?.distance;
    if (dist != null && String(dist).trim() !== "") {
      const distanceStr = String(dist).trim();
      // Legado já vinha com a unidade embutida (ex.: "5 KM") — não duplica.
      if (/[a-zA-Z]/.test(distanceStr)) return distanceStr;
      const unit = ticket?.distanceUnit || "Km";
      return `${distanceStr} ${unit}`;
    }
    const modalityDist = currentRegistration?.modalities?.[0]?.modality?.distance;
    if (modalityDist != null) {
      return `${(parseFloat(String(modalityDist)) / 1000).toFixed(1)} Km`;
    }
    return "—";
  })();

  // Obter perguntas e produtos reais
  const questions = currentRegistration?.questionAnswers || [];

  // Produtos podem vir de:
  // 1. registration.products (nova estrutura com product e variation)
  // 2. kitItems (produtos adicionais - estrutura antiga)
  // 3. includedProducts (produtos incluídos no ticket)
  const registrationProducts = currentRegistration?.products || [];
  const kitItems = currentRegistration?.kitItems || [];
  const includedProducts = currentRegistration?.ticket?.includedProducts || [];

  // Mapear registration.products para o formato esperado. O snapshot novo traz
  // os campos NO TOPO do item (`name`, `images[]` + `primaryImageIndex`,
  // `selectedVariation`, `unitPrice`); o legado (findOneLive) aninha em
  // `item.product`/`item.variation`. Detectamos pelo shape e tratamos ambos.
  const mappedRegistrationProducts = registrationProducts.map((item: any) => {
    const isSnapshot =
      item?.name !== undefined ||
      item?.images !== undefined ||
      item?.selectedVariation !== undefined;

    if (isSnapshot) {
      const images = Array.isArray(item.images) ? item.images : [];
      const image = images[item.primaryImageIndex ?? 0] ?? images[0];
      const unitPrice = item.unitPrice ?? item.basePrice ?? 0;
      // Incluso no ingresso → mostra só "Incluído". Caso o snapshot não traga o
      // flag, cai no proxy `unitPrice === 0` (incluso é cobrado 0).
      const isIncluded = item.isIncludedInTicket ?? unitPrice === 0;
      // Preço da variação selecionada é o TOTAL absoluto cobrado (ex.: 5555 =
      // R$55,55). Sem preço específico (>0), usa o unitPrice/base.
      const variationPrice = item.selectedVariation?.price;
      const price =
        variationPrice != null && variationPrice > 0 ? variationPrice : unitPrice;
      return {
        id: item.id,
        // productId p/ a edição de variação (o `id` do snapshot é o productId).
        productId: item.id,
        variationId: item.selectedVariation?.id || null,
        productName: item.name || "Produto",
        productImage: image || null,
        variationType: item.variationType || null,
        variationName: item.selectedVariation?.name || null,
        price: isIncluded ? 0 : price,
        quantity: item.quantity || 1,
        isIncluded,
        // Backend sinaliza quando o organizador trocou a variação do participante.
        variationEdited: item.variationEdited === true,
      };
    }

    // Legado (findOneLive)
    return {
      id: item.id,
      productId: item.product?.id || item.productId || null,
      variationId: item.variation?.id || item.variationId || null,
      productName: item.product?.name || "Produto",
      productImage: item.product?.image || null,
      variationType: item.product?.variationType || null,
      variationName: item.variation?.name || item.variationName || null,
      price: item.unitPrice || item.totalPrice || 0,
      quantity: item.quantity || 1,
      isIncluded: item.unitPrice === 0 && item.totalPrice === 0,
      variationEdited: item.variationEdited === true,
    };
  });

  // Mapear includedProducts para o formato esperado
  const mappedIncludedProducts = includedProducts.map((product: any) => {
    // selectedVariation já é o objeto { id, name, price }, não um ID
    const selectedVariation = product.selectedVariation ?? null;

    return {
      id: product.id,
      productName: product.name,
      productImage: product.image || null,
      variationType: product.variationType || null,
      variationName: selectedVariation?.name || null,
      price: product.basePrice || 0,
      isIncluded: true
    };
  });

  // Mapear kitItems para o formato esperado
  const mappedKitItems = kitItems.map((item: any) => {
    return {
      id: item.id,
      productName: item.kitItem?.name || item.name || "Produto",
      productImage: item.kitItem?.image || item.image || null,
      variationType: item.kitItem?.variationType || null,
      variationName: item.selectedSize || item.size || null,
      price: item.kitItem?.price || item.price || 0,
      isIncluded: false
    };
  });

  // Priorizar: registration.products > kitItems > includedProducts
  const rawProducts = mappedRegistrationProducts.length > 0
    ? mappedRegistrationProducts
    : kitItems.length > 0
      ? mappedKitItems
      : mappedIncludedProducts;

  // Variação "Sem interesse" = opt-out do kit: o participante recusou o produto.
  // Não deve aparecer na listagem de produtos da inscrição.
  const products = rawProducts.filter(
    (product: any) =>
      !(product.variationName && isSemInteresseVariation({ name: product.variationName })),
  );

  // Formatar telefone

  /* Rodapé: ações do modal (baixar ingresso + reenviar por e-mail). Definido uma
   * vez e reutilizado nos rodapés mobile e desktop. O reenvio abre o
   * `ResendTicketsModal` (mesmo do modal de pedido). */
  const footerActions = (
    <div className="flex items-center gap-2 w-full md:w-auto">
      <Button
        type="button"
        variant={"outline"}
        onClick={handleDownloadTicket}
        disabled={isDownloadingTicket}
        className="flex flex-1 md:flex-none border-gray-6 text-gray-12 items-center justify-center gap-2 px-5 py-2.5 font-family-dm-sans disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
      >
        {isDownloadingTicket ? "Gerando ingresso..." : "Baixar ingresso"}
      </Button>
      <Button
        type="button"
        variant={"outline"}
        onClick={() => setShowResendModal(true)}
        className="flex flex-1 md:flex-none border-gray-6 text-gray-12 items-center justify-center gap-2 px-5 py-2.5 font-family-dm-sans cursor-pointer"
      >
        Reenviar ingresso
      </Button>
    </div>
  );

  // ── Edição inline da seção "Informações do participante" (organizador) ─────
  const startEditingParticipant = () => {
    setParticipantErrors({});
    setParticipantDraft({
      name: participantName === "—" ? "" : participantName,
      email: participantEmail === "—" ? "" : participantEmail,
      documentNumber: participantIsBr
        ? formatCPF(participantCPFRaw || "")
        : participantCPFRaw || "",
      documentType: participantDocumentType || (participantIsBr ? "CPF" : "PASSPORT"),
      phone: participantIsBr ? formatPhoneMask(participantPhone || "") : participantPhone || "",
      birthDate: participantBirthDate === "—" ? "" : participantBirthDate,
      gender: rawGender ? rawGender.toLowerCase() : "",
      country: participantCountry || "",
      emergencyContactName: emergencyName,
      emergencyContactPhone: participantIsBr
        ? formatPhoneMask(emergencyRawPhone)
        : emergencyRawPhone,
    });
    setEditingParticipant(true);
  };

  const cancelEditingParticipant = () => {
    setEditingParticipant(false);
    setParticipantDraft(null);
    setParticipantErrors({});
  };

  const setDraftField = (field: keyof ParticipantDraft, value: string) => {
    setParticipantDraft((prev) => (prev ? { ...prev, [field]: value } : prev));
    setParticipantErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const handleSaveParticipant = async () => {
    if (!participantDraft || !registrationId) return;
    const d = participantDraft;
    const errors: Record<string, string> = {};

    if (!d.name.trim()) errors.name = "Informe o nome";
    if (d.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email.trim()))
      errors.email = "E-mail inválido";
    if (participantIsBr && d.documentNumber.trim() && !isValidCPF(d.documentNumber))
      errors.documentNumber = "CPF inválido";
    if (d.birthDate.trim() && !brDateToYmd(d.birthDate))
      errors.birthDate = "Data inválida (dd/mm/aaaa)";

    if (Object.keys(errors).length > 0) {
      setParticipantErrors(errors);
      return;
    }

    // BR: envia só dígitos (o display re-mascara). Estrangeiro: valor cru.
    const cleanPhone = (v: string) => (participantIsBr ? v.replace(/\D/g, "") : v.trim());

    setSavingParticipant(true);
    try {
      const updated = await organizerService.updateRegistrationParticipant(registrationId, {
        name: d.name.trim(),
        email: d.email.trim(),
        documentType: d.documentType,
        documentNumber: d.documentNumber.trim(),
        phone: cleanPhone(d.phone),
        birthDate: brDateToYmd(d.birthDate),
        gender: d.gender,
        country: d.country,
        emergencyContactName: d.emergencyContactName.trim(),
        emergencyContactPhone: cleanPhone(d.emergencyContactPhone),
      });
      setRegistrationData(updated);
      setEditingParticipant(false);
      setParticipantDraft(null);
      toast.success("Dados do participante atualizados");
    } catch (error) {
      const msg =
        (error as { response?: { data?: { message?: string | string[] } } })?.response
          ?.data?.message || "Erro ao salvar. Tente novamente.";
      toast.error(Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setSavingParticipant(false);
    }
  };

  // ── Edição inline das respostas das perguntas (organizador) ────────────────
  const qKey = (q: AnswerItem): string | undefined =>
    typeof q.question === "string" ? undefined : q.question?.id;

  const startEditingAnswers = () => {
    const draft: Record<string, string> = {};
    for (const q of questions as AnswerItem[]) {
      const qid = qKey(q);
      if (qid) draft[qid] = formatAnswer(q.answer);
    }
    setAnswersDraft(draft);
    setEditingAnswers(true);
  };

  const cancelEditingAnswers = () => {
    setEditingAnswers(false);
    setAnswersDraft(null);
  };

  const handleSaveAnswers = async () => {
    if (!answersDraft || !registrationId) return;
    const answers = Object.entries(answersDraft).map(([questionId, answer]) => ({
      questionId,
      answer,
    }));
    if (!answers.length) {
      setEditingAnswers(false);
      return;
    }
    setSavingAnswers(true);
    try {
      const updated = await organizerService.updateRegistrationAnswers(registrationId, answers);
      setRegistrationData(updated);
      setEditingAnswers(false);
      setAnswersDraft(null);
      toast.success("Respostas atualizadas");
    } catch (error) {
      const msg =
        (error as { response?: { data?: { message?: string | string[] } } })?.response
          ?.data?.message || "Erro ao salvar. Tente novamente.";
      toast.error(Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setSavingAnswers(false);
    }
  };

  // ── Edição da variação dos produtos (organizador) ──────────────────────────
  // No modo edição os cards mostram o select box (Figma) com dropdown FLUTUANTE
  // portalado (não corta no scroll). As variações não vêm no payload → prefetch ao
  // entrar em edição (uma vez por produto).
  const startEditingProducts = () => {
    setEditingProducts(true);
    const toFetch = (products as ModalProduct[])
      .map((p) => p.productId)
      .filter((pid): pid is string => !!pid && !productVariations[pid]);
    if (toFetch.length === 0) return;
    setLoadingVariations(true);
    void Promise.all(
      toFetch.map(async (pid) => {
        try {
          const prod = await organizerService.getProductById(pid);
          return [pid, (prod?.variations ?? []) as ProductVariationOption[]] as const;
        } catch {
          return [pid, [] as ProductVariationOption[]] as const;
        }
      }),
    )
      .then((results) => {
        setProductVariations((prev) => {
          const next = { ...prev };
          for (const [pid, vars] of results) next[pid] = vars;
          return next;
        });
      })
      .finally(() => setLoadingVariations(false));
  };

  const exitEditingProducts = () => {
    setEditingProducts(false);
    setOpenVariationPid(null);
  };

  const toggleVariationList = async (pid: string) => {
    if (openVariationPid === pid) {
      setOpenVariationPid(null);
      return;
    }
    setOpenVariationPid(pid);
    if (productVariations[pid]) return;
    setLoadingVariations(true);
    try {
      const prod = await organizerService.getProductById(pid);
      setProductVariations((prev) => ({
        ...prev,
        [pid]: (prod?.variations ?? []) as ProductVariationOption[],
      }));
    } catch {
      setProductVariations((prev) => ({ ...prev, [pid]: [] }));
    } finally {
      setLoadingVariations(false);
    }
  };

  const handlePickVariation = async (
    pid: string,
    variationId: string,
    currentVariationId: string,
  ) => {
    if (!registrationId || savingProductId) return;
    if (variationId === currentVariationId) {
      setOpenVariationPid(null);
      return;
    }
    setSavingProductId(pid);
    try {
      const updated =
        await organizerService.updateRegistrationProductVariationAsOrganizer(
          registrationId,
          pid,
          variationId,
        );
      setRegistrationData(updated);
      setOpenVariationPid(null);
      toast.success("Variação atualizada");
    } catch (error) {
      const msg =
        (error as { response?: { data?: { message?: string | string[] } } })?.response
          ?.data?.message || "Erro ao salvar. Tente novamente.";
      toast.error(Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setSavingProductId(null);
    }
  };

  // Campo somente-leitura (label em cima, valor embaixo) — grid do participante/perguntas.
  const infoField = (label: string, value: string) => (
    <div key={label} className="flex flex-col gap-1.5 py-2">
      <p className="font-family-dm-sans font-normal text-base text-gray-11">{label}</p>
      <p className="font-family-dm-sans font-medium text-base text-gray-12 break-words">
        {value || "—"}
      </p>
    </div>
  );

  const divider = <div className="w-full h-px bg-gray-6" />;

  // ── Seções (coluna única, compartilhadas entre desktop e mobile) ───────────
  const participantSection = (
    <section className="flex flex-col gap-4">
      <h3 className="font-manrope font-bold text-xl text-gray-12">
        Informações do participante
      </h3>
      {editingParticipant && participantDraft ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-3">
            <FormField
              label="Nome"
              value={participantDraft.name}
              onChange={(v) => setDraftField("name", v)}
              error={participantErrors.name}
            />
            <FormField
              label="Data de nascimento"
              value={participantDraft.birthDate}
              onChange={(v) => setDraftField("birthDate", maskDateBR(v))}
              placeholder="dd/mm/aaaa"
              inputMode="numeric"
              error={participantErrors.birthDate}
            />
            <div className="flex flex-col gap-2">
              <label className="font-family-dm-sans text-base text-gray-12">Sexo</label>
              <SearchSelect
                value={participantDraft.gender}
                onChange={(o) => setDraftField("gender", o.value)}
                options={GENDER_OPTIONS}
                placeholder="Selecione"
              />
            </div>
            <FormField
              label={documentLabel(participantIsBr)}
              value={participantDraft.documentNumber}
              onChange={(v) =>
                setDraftField("documentNumber", participantIsBr ? formatCPF(v) : v)
              }
              inputMode={participantIsBr ? "numeric" : "text"}
              error={participantErrors.documentNumber}
            />
            <FormField
              label="Email"
              value={participantDraft.email}
              onChange={(v) => setDraftField("email", v)}
              inputMode="email"
              error={participantErrors.email}
            />
            <FormField
              label="Telefone"
              value={participantDraft.phone}
              onChange={(v) =>
                setDraftField("phone", participantIsBr ? formatPhoneMask(v) : v)
              }
              inputMode="tel"
            />
            <FormField
              label="Telefone de emergência"
              value={participantDraft.emergencyContactPhone}
              onChange={(v) =>
                setDraftField(
                  "emergencyContactPhone",
                  participantIsBr ? formatPhoneMask(v) : v,
                )
              }
              inputMode="tel"
            />
            <FormField
              label="Nome do contato de emergência"
              value={participantDraft.emergencyContactName}
              onChange={(v) => setDraftField("emergencyContactName", v)}
            />
          </div>
          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={cancelEditingParticipant}
              disabled={savingParticipant}
              className="border-gray-6 text-gray-12 font-manrope font-bold"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSaveParticipant}
              isLoading={savingParticipant}
              className="font-manrope font-bold"
            >
              Salvar
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-1">
            {infoField("Nome", participantName)}
            {infoField("Data de nascimento", participantBirthDate)}
            {infoField("Sexo", participantGender)}
            {infoField(
              documentLabel(participantIsBr),
              formatDocumentDisplay(participantCPFRaw, participantIsBr) || "—",
            )}
            {infoField("Email", participantEmail)}
            {infoField("Telefone", formatPhone(participantPhone) || "—")}
            {emergencyPhone ? infoField("Telefone de emergência", emergencyPhone) : null}
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={startEditingParticipant}
              className="font-family-dm-sans font-medium text-base text-gray-11 underline hover:text-gray-12 transition-colors cursor-pointer"
            >
              Editar
            </button>
          </div>
        </>
      )}
    </section>
  );

  const ingressoSection = (
    <section className="flex flex-col gap-5">
      <h3 className="font-manrope font-bold text-xl text-gray-12">Ingresso</h3>
      <div className="flex flex-col gap-0">
        <p className="font-family-dm-sans text-base text-gray-11">{categoryName}</p>
        <p className="font-family-dm-sans font-medium text-xl text-gray-12">{ticketName}</p>
        {/* Se o nome do ingresso já traz a distância (ex.: "3KM"), NÃO repete o
            bloco de distância — mesma regra do card de ingresso do checkout. */}
        {ticketDistance !== "—" && !ticketNameHasDistance(ticketName) && (
          <div className="flex items-center gap-2">
            <DistanceIcon className="size-5 text-gray-12" />
            <p className="font-family-dm-sans font-medium text-lg text-gray-12">
              {ticketDistance}
            </p>
          </div>
        )}
      </div>
    </section>
  );

  const hasEditableProduct = (products as ModalProduct[]).some((p) => !!p.productId);
  const produtosSection =
    products.length > 0 ? (
      <section className="flex flex-col gap-5">
        <h3 className="font-manrope font-bold text-xl text-gray-12">Produtos</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
          {(products as ModalProduct[]).map((product, index) => {
            const pid = product.productId || "";
            // Só variações reais (oculta "Sem interesse").
            const vars = (productVariations[pid] ?? []).filter(
              (v) => !isSemInteresseVariation({ name: v.name }),
            );
            const inEdit = editingProducts && !!pid;
            return (
              <div
                key={product.id || index}
                className="border border-gray-6 rounded-[12px] p-4 flex flex-col gap-2"
              >
                {product.variationEdited && <VariationEditedBadge />}
                <div className="flex gap-3 items-stretch">
                  <div className="size-[100px] rounded-lg border border-gray-6 shrink-0 overflow-hidden bg-gray-4">
                    <ImageWithInitialFallback
                      src={product.productImage}
                      alt={product.productName}
                      name={product.productName}
                      sizes="100px"
                      fill
                      className="object-cover w-full h-full border-0"
                    />
                  </div>
                  <div className="flex-1 flex flex-col justify-between min-w-0 min-h-[100px] py-1 gap-2">
                    <p className="font-family-dm-sans font-semibold text-base text-gray-12 line-clamp-3">
                      {product.productName}
                    </p>
                    {inEdit ? (
                      // Modo edição (Figma): select box full-width "Selecione a opção".
                      <VariationFloatingDropdown
                        currentName={product.variationName ?? null}
                        currentId={product.variationId || ""}
                        variations={vars}
                        loading={loadingVariations && vars.length === 0}
                        saving={savingProductId === pid}
                        open={openVariationPid === pid}
                        onToggle={() => toggleVariationList(pid)}
                        onClose={() => setOpenVariationPid(null)}
                        onSelect={(vid) =>
                          handlePickVariation(pid, vid, product.variationId || "")
                        }
                      />
                    ) : (
                      // Leitura: "Tamanho: XL" (Figma 6310).
                      <div className="flex justify-end w-full min-w-0">
                        {product.variationName ? (
                          <div className="flex gap-1 items-center min-w-0">
                            <span className="font-family-dm-sans text-base text-gray-12 whitespace-nowrap shrink-0">
                              {product.variationType || "Variação"}:
                            </span>
                            <span className="font-manrope font-semibold text-base text-gray-12 truncate">
                              {product.variationName}
                            </span>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {hasEditableProduct && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={editingProducts ? exitEditingProducts : startEditingProducts}
              className="font-family-dm-sans font-medium text-base text-gray-11 underline hover:text-gray-12 transition-colors cursor-pointer"
            >
              {editingProducts ? "Concluir" : "Editar"}
            </button>
          </div>
        )}
      </section>
    ) : null;

  const perguntasSection = (
    <section className="flex flex-col gap-4">
      <h3 className="font-manrope font-bold text-xl text-gray-12">
        Perguntas do Organizador
      </h3>
      {questions.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
            {(questions as AnswerItem[]).map((q, index) => {
              const qid = qKey(q);
              const label =
                (typeof q.question === "string" ? q.question : q.question?.question) ||
                `Pergunta ${index + 1}`;
              // Editando + pergunta com id → a RESPOSTA vira input.
              if (editingAnswers && answersDraft && qid) {
                return (
                  <FormField
                    key={qid}
                    label={label}
                    value={answersDraft[qid] ?? ""}
                    onChange={(v) =>
                      setAnswersDraft((prev) => (prev ? { ...prev, [qid]: v } : prev))
                    }
                  />
                );
              }
              return (
                <div key={q.id || qid || index} className="flex flex-col gap-1.5 py-2">
                  <p className="font-family-dm-sans font-normal text-base text-gray-11 break-words">
                    {label}
                  </p>
                  <p className="font-family-dm-sans font-medium text-base text-gray-12 break-words">
                    {formatAnswer(q.answer)}
                  </p>
                </div>
              );
            })}
          </div>
          {editingAnswers ? (
            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={cancelEditingAnswers}
                disabled={savingAnswers}
                className="border-gray-6 text-gray-12 font-manrope font-bold"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleSaveAnswers}
                isLoading={savingAnswers}
                className="font-manrope font-bold"
              >
                Salvar
              </Button>
            </div>
          ) : (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={startEditingAnswers}
                className="font-family-dm-sans font-medium text-base text-gray-11 underline hover:text-gray-12 transition-colors cursor-pointer"
              >
                Editar
              </button>
            </div>
          )}
        </>
      ) : (
        <p className="font-family-dm-sans font-normal text-base text-gray-11">
          Nenhuma pergunta respondida
        </p>
      )}
    </section>
  );

  // Conteúdo em coluna única — mesmo corpo no desktop e no mobile.
  const content = (
    <div className="flex flex-col gap-6 md:gap-8">
      {participantSection}
      {divider}
      {ingressoSection}
      {produtosSection && divider}
      {produtosSection}
      {divider}
      {perguntasSection}
    </div>
  );

  /* MOBILE: Drawer (vaul) full-screen — abre SOBRE os drawers do fluxo financeiro
   * (parcelados → detalhes → ver ingressos). Rola nativamente porque o Drawer é um
   * Dialog próprio: seu lock entra por último na pilha do `react-remove-scroll`, que
   * só deixa o ÚLTIMO lock agir — os drawers de baixo viram no-op e este conteúdo
   * passa a ser a região liberada. Substitui o guard manual de `touchmove`, que não
   * dava conta. Altura vem do Drawer (viewport visível), dispensando o `100dvh`.
   *
   * `direction="right"` + `data-vaul-no-drag`: mesma combinação dos demais drawers
   * do módulo financeiro — em right-drawers o vaul trata TODO swipe vertical como
   * arrasto, então sem `data-vaul-no-drag` a rolagem do corpo continuaria travada.
   * `disablePreventScroll={false}` desliga o lock iOS do vaul (a prop é invertida:
   * o default `true` o mantém ATIVO), igual aos drawers que envolvem este fluxo. */
  if (!isMdUp) {
    return (
      <>
      <Drawer
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) closeViewRegistrationModal();
        }}
        direction="right"
        disablePreventScroll={false}
      >
        <DrawerContent
          data-vaul-no-drag
          className="bg-gray-2 h-full w-full border-l border-gray-6"
        >
          <DrawerTitle className="sr-only">Detalhes do ingresso</DrawerTitle>
          <div className="flex flex-col h-full min-h-0 w-full overflow-hidden">
            <div className="bg-gray-1 border-b border-gray-6 shrink-0">
              <div className="flex items-center gap-1 h-[52px] px-4">
                <button
                  type="button"
                  onClick={
                    showBackToPaymentDetails
                      ? handleBackToPaymentDetails
                      : closeViewRegistrationModal
                  }
                  className="size-8 flex items-center justify-center shrink-0 rounded-lg hover:bg-gray-3 transition-colors -rotate-180"
                  aria-label={
                    showBackToPaymentDetails
                      ? "Voltar para detalhes de pagamento"
                      : "Voltar"
                  }
                >
                  <ArrowButton isOpen={false} />
                </button>
                <p className="font-manrope font-extrabold text-base leading-[1.1] text-gray-12 truncate flex-1 min-w-0">
                  {eventName}
                </p>
                <button
                  type="button"
                  onClick={closeViewRegistrationModal}
                  className="size-8 flex items-center justify-center shrink-0 rounded-lg hover:bg-gray-3 transition-colors"
                  aria-label="Fechar"
                >
                  <X className="size-5 text-gray-11" />
                </button>
              </div>
            </div>

            <div
              className="flex-1 overflow-y-auto min-h-0 px-4 py-4 overscroll-contain"
              style={{ WebkitOverflowScrolling: "touch" }}
            >
              {content}
            </div>

            {/* Footer: baixar ingresso + reenviar por e-mail */}
            <div className="shrink-0 border-t border-gray-6 bg-gray-1 px-4 py-3">
              {footerActions}
            </div>
          </div>
        </DrawerContent>
      </Drawer>

        {/* Reenvio por e-mail — overlay próprio (z-70), mesmo do modal de pedido. */}
        <ResendTicketsModal
          isOpen={showResendModal}
          onClose={() => setShowResendModal(false)}
          onConfirm={handleResendEmail}
          loading={resendingEmail}
          ticketCount={1}
          title="Reenviar ingresso"
          description="Envie novamente o ingresso para o e-mail cadastrado na inscrição."
          confirmLabel="Reenviar ingresso"
        />
      </>
    );
  }

  /* DESKTOP: modal centralizado original (framer-motion sobre o drawer). */
  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              // z acima do drawer (z-50, evita flash na transição) + pointerEvents:auto
              // pra vencer o `pointer-events:none` que o vaul aplica no body.
              className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50"
              style={{ pointerEvents: "auto" }}
              onClick={closeViewRegistrationModal}
            />
            <motion.div
              ref={scrollRegionRef}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              onClick={(e) => e.stopPropagation()}
              // pointer-events auto (como no `md:pointer-events-auto` original): o
              // wrapper cobre o overlay, então clicar fora do card NÃO fecha o modal.
              className="fixed inset-0 z-[61] flex items-center justify-center pointer-events-auto"
            >
              <div className="flex flex-col bg-gray-1 rounded-xl shadow-2xl w-full max-w-[820px] mx-4 max-h-[88vh] relative overflow-hidden pointer-events-auto">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-gray-6 gap-2 shrink-0">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {showBackToPaymentDetails ? (
                      <button
                        type="button"
                        onClick={handleBackToPaymentDetails}
                        className="size-8 shrink-0 flex items-center justify-center rounded-lg hover:bg-gray-3 transition-colors cursor-pointer"
                        aria-label="Voltar para detalhes de pagamento"
                      >
                        <ChevronLeft className="size-5 text-gray-11" />
                      </button>
                    ) : null}
                    <h2 className="font-family-dm-sans font-semibold text-[20px] leading-[1.3] text-gray-12 truncate min-w-0">
                      Detalhes do ingresso
                    </h2>
                  </div>
                  <button
                    onClick={closeViewRegistrationModal}
                    className="size-8 shrink-0 flex items-center justify-center rounded-lg hover:bg-gray-3 transition-colors cursor-pointer"
                    aria-label="Fechar"
                  >
                    <X className="size-5 text-gray-11" />
                  </button>
                </div>

                {/* Content — coluna única rolável */}
                <div className="flex-1 min-h-0 overflow-y-auto p-5">{content}</div>

                {/* Footer: baixar ingresso + reenviar por e-mail */}
                <div className="flex items-center justify-start gap-2 px-5 py-3 border-t border-gray-6">
                  {footerActions}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Reenvio por e-mail — overlay próprio (z-70), mesmo do modal de pedido. */}
      <ResendTicketsModal
        isOpen={showResendModal}
        onClose={() => setShowResendModal(false)}
        onConfirm={handleResendEmail}
        loading={resendingEmail}
        ticketCount={1}
        title="Reenviar ingresso"
        description="Envie novamente o ingresso para o e-mail cadastrado na inscrição."
        confirmLabel="Reenviar ingresso"
      />
    </>
  );
}
