"use client";

import {
  X,
  ChevronRight,
  CreditCard,
  TicketPercent,
  Mail,
  XCircle,
  UserRound,
  FileText,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/utils/cn";
import { useT } from "@/i18n/client";
import { ptBRTranslator } from "@/i18n/translate";
import type eventMessages from "@/i18n/messages/pt-BR/event";

type EventMessageKey = keyof typeof eventMessages;

/**
 * Número de WhatsApp do suporte PodioTicket — apenas dígitos, com DDI
 * (55 + DDD + número, sem "+", espaços ou símbolos), no formato exigido
 * pelo link wa.me. Corresponde a +55 11 94086-8733.
 */
export const PODIO_SUPPORT_WHATSAPP = "5511940868733";

interface ContactSubject {
  id: string;
  icon: LucideIcon;
  /** Chaves do namespace `event` — resolvidas no render (idioma atual). */
  title: EventMessageKey;
  description: EventMessageKey;
}

/** Assuntos que levam ao WhatsApp do suporte PodioTicket. */
const WHATSAPP_SUBJECTS: ContactSubject[] = [
  {
    id: "payment",
    icon: CreditCard,
    title: "subjectPaymentTitle",
    description: "subjectPaymentDescription",
  },
  {
    id: "coupon",
    icon: TicketPercent,
    title: "subjectCouponTitle",
    description: "subjectCouponDescription",
  },
  {
    id: "confirmation-email",
    icon: Mail,
    title: "subjectConfirmationEmailTitle",
    description: "subjectConfirmationEmailDescription",
  },
  {
    id: "refund",
    icon: XCircle,
    title: "subjectRefundTitle",
    description: "subjectRefundDescription",
  },
  {
    id: "account",
    icon: UserRound,
    title: "subjectAccountTitle",
    description: "subjectAccountDescription",
  },
];

/** Assunto que abre o formulário de e-mail para o organizador. */
const OTHER_SUBJECT: ContactSubject = {
  id: "other",
  icon: FileText,
  title: "otherSubject",
  description: "subjectOtherDescription",
};

interface ContactSubjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Nome do evento, usado para pré-preencher a mensagem do WhatsApp. */
  eventName: string;
  /** Disparado ao escolher "Outro assunto" — segue para o modal de e-mail. */
  onOtherSubject: () => void;
}

export function ContactSubjectModal({
  isOpen,
  onClose,
  eventName,
  onOtherSubject,
}: ContactSubjectModalProps) {
  const t = useT("event");
  if (!isOpen) return null;

  // Mensagem vai pro suporte (brasileiro) → sempre pt-BR, qualquer que seja o idioma do site.
  const openWhatsApp = (subjectKey: ContactSubject["title"]) => {
    const ptT = ptBRTranslator("event");
    const message = ptT("whatsappHelpMessage", { name: eventName, subject: ptT(subjectKey) });
    const url = `https://wa.me/${PODIO_SUPPORT_WHATSAPP}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    onClose();
  };

  const renderOption = (subject: ContactSubject, onClick: () => void) => {
    const { icon: Icon } = subject;
    return (
      <button
        key={subject.id}
        type="button"
        onClick={onClick}
        className="flex items-center gap-3 w-full border border-gray-6 rounded-lg p-3 text-left transition-colors hover:bg-gray-2 focus-visible:outline-none focus-visible:border-primary-9"
      >
        <span className="flex items-center justify-center size-10 rounded-lg bg-gray-3 shrink-0">
          <Icon className="size-5 text-gray-12" />
        </span>
        <span className="flex flex-col gap-1 flex-1 min-w-0">
          <span className="font-semibold text-base leading-tight text-gray-12 font-family-dm-sans">
            {t(subject.title)}
          </span>
          <span className="text-sm leading-[1.3] text-gray-11 font-family-dm-sans">
            {t(subject.description)}
          </span>
        </span>
        <ChevronRight className="size-5 text-gray-11 shrink-0" />
      </button>
    );
  };

  const optionsList = (
    <div className="flex flex-col gap-3">
      {WHATSAPP_SUBJECTS.map((s) => renderOption(s, () => openWhatsApp(s.title)))}
      {renderOption(OTHER_SUBJECT, onOtherSubject)}
    </div>
  );

  const closeButton = (
    <button
      type="button"
      onClick={onClose}
      className="flex items-center justify-center size-8 rounded-lg hover:bg-gray-3 transition-colors shrink-0"
      aria-label={t("closeModal")}
    >
      <X className="size-[18px] text-gray-12" />
    </button>
  );

  const title = (size: "base" | "xl") => (
    <h2
      className={cn(
        "font-semibold leading-[1.3] text-gray-12 font-family-dm-sans",
        size === "xl" ? "text-xl" : "text-base"
      )}
    >
      {t("selectSubjectTitle")}
    </h2>
  );

  return (
    <>
      {/* ── MOBILE: bottom sheet ── */}
      <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end">
        <div className="absolute inset-0 bg-black/50" onClick={onClose} />
        <div className="relative bg-gray-1 rounded-tl-[12px] rounded-tr-[12px] max-h-[92dvh] flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-6 shrink-0">
            {title("base")}
            {closeButton}
          </div>
          <div className="overflow-y-auto p-4">{optionsList}</div>
        </div>
      </div>

      {/* ── DESKTOP: centered dialog ── */}
      <div
        className="hidden md:flex fixed inset-0 bg-black/50 items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <div
          className="relative bg-gray-1 rounded-xl border border-gray-6 w-full max-w-[596px] shadow-lg max-h-[90vh] flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-4 py-4 border-b border-gray-6 shrink-0">
            {title("xl")}
            {closeButton}
          </div>
          <div className="overflow-y-auto p-4">{optionsList}</div>
        </div>
      </div>
    </>
  );
}
