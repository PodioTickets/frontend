"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { ChevronRight, Info, X } from "lucide-react";
import { Button } from "@/components/Button";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { cn } from "@/utils/cn";
import { organizerService } from "@/services";
import toast from "react-hot-toast";

type QuillInstance = InstanceType<typeof import("quill").default>;

function stripHtmlEmpty(html: string) {
  if (typeof document === "undefined") return html.trim() === "";
  const div = document.createElement("div");
  div.innerHTML = html;
  return (div.textContent || "").trim().length === 0;
}

function SectionBadge({ n }: { n: number }) {
  return (
    <span
      className="flex size-7 shrink-0 items-center justify-center rounded-full bg-blue-11 text-sm font-bold text-blue-3 font-manrope"
      aria-hidden
    >
      {n}
    </span>
  );
}

function ChannelCheckbox({ checked }: { checked: boolean }) {
  return (
    <span
      className={cn(
        "flex size-6 shrink-0 items-center justify-center rounded-md border transition-colors",
        checked
          ? "border-primary-9 bg-primary-4 text-primary-11"
          : "border-gray-6 bg-gray-1"
      )}
      aria-hidden
    >
      {checked && (
        <svg
          width="14"
          height="11"
          viewBox="0 0 14 11"
          fill="none"
          className="text-primary-11"
          aria-hidden
        >
          <path
            d="M1 5.5L5 9.5L13 1.5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </span>
  );
}

export type NotificationMessageEditorHandle = {
  /** HTML atual do `.ql-editor` (inclui `<a>` do Quill). */
  getHtml: () => string;
};

const NotificationMessageEditor = forwardRef<
  NotificationMessageEditorHandle,
  { onHtmlChange: (html: string) => void }
>(function NotificationMessageEditor({ onHtmlChange }, ref) {
  const hostRef = useRef<HTMLDivElement>(null);
  const quillInstanceRef = useRef<QuillInstance | null>(null);
  const cssLoadedRef = useRef(false);
  const onHtmlChangeRef = useRef(onHtmlChange);
  onHtmlChangeRef.current = onHtmlChange;

  useImperativeHandle(ref, () => ({
    getHtml: () => quillInstanceRef.current?.root.innerHTML ?? "",
  }));

  useEffect(() => {
    if (typeof window === "undefined") return;

    let cancelled = false;

    const run = async () => {
      if (!cssLoadedRef.current) {
        try {
          // @ts-expect-error — CSS side-effect import (no typedefs in package)
          await import("quill/dist/quill.snow.css");
        } catch {
          /* ok */
        }
        cssLoadedRef.current = true;
      }

      const QuillModule = await import("quill");
      const Quill = QuillModule.default;

      await new Promise((r) => setTimeout(r, 0));
      if (cancelled || !hostRef.current) return;

      hostRef.current.innerHTML = "";
      const container = document.createElement("div");
      hostRef.current.appendChild(container);

      const quill = new Quill(container, {
        theme: "snow",
        placeholder: "Escreva uma mensagem ao participante",
        modules: {
          toolbar: [["bold", "link"]],
        },
        formats: ["bold", "link"],
      });

      const pushHtml = () => {
        onHtmlChangeRef.current(quill.root.innerHTML);
      };

      quill.on("text-change", pushHtml);

      quillInstanceRef.current = quill;
      pushHtml();
    };

    run();

    return () => {
      cancelled = true;
      quillInstanceRef.current = null;
      if (hostRef.current) hostRef.current.innerHTML = "";
    };
  }, []);

  return (
    <div
      className={cn(
        "notification-message-quill rounded-lg bg-gray-1 overflow-hidden",
        "[&_.ql-toolbar.ql-snow]:border-gray-6 [&_.ql-toolbar.ql-snow]:bg-gray-2 [&_.ql-toolbar.ql-snow]:rounded-t-lg [&_.ql-toolbar.ql-snow]:px-2 [&_.ql-toolbar.ql-snow]:py-1.5",
        "[&_.ql-container.ql-snow]:border-gray-6 [&_.ql-container.ql-snow]:border-t-0 [&_.ql-container.ql-snow]:rounded-b-lg [&_.ql-container.ql-snow]:min-h-[183px]",
        "[&_.ql-editor]:min-h-[160px] [&_.ql-editor]:text-base [&_.ql-editor]:text-gray-12 [&_.ql-editor]:font-family-dm-sans [&_.ql-editor]:leading-relaxed",
        "[&_.ql-editor.ql-blank::before]:text-gray-11 [&_.ql-editor.ql-blank::before]:not-italic"
      )}
    >
      <div ref={hostRef} />
    </div>
  );
});

export function CreateNotificationDrawer({
  open,
  onOpenChange,
  eventId,
  eventName,
  registrationsCount,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  eventName?: string;
  /** Total de inscrições confirmadas — exibido no banner do drawer para o
   *  organizador saber quantos participantes receberão a mensagem. */
  registrationsCount?: number;
  /** Chamado após criar com sucesso (ex.: recarregar lista). */
  onSuccess?: () => void;
}) {
  const [title, setTitle] = useState("");
  const [messageHtml, setMessageHtml] = useState("");
  const [channelEmail, setChannelEmail] = useState(false);
  const [sending, setSending] = useState(false);
  const messageEditorRef = useRef<NotificationMessageEditorHandle>(null);

  const reset = useCallback(() => {
    setTitle("");
    setMessageHtml("");
    setChannelEmail(false);
  }, []);

  useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  const handleClose = () => {
    if (sending) return;
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    const t = title.trim();
    if (!t) {
      toast.error("Informe o título da mensagem.");
      return;
    }
    const htmlToSend =
      messageEditorRef.current?.getHtml() ?? messageHtml;

    if (stripHtmlEmpty(htmlToSend)) {
      toast.error("Escreva a mensagem.");
      return;
    }
    if (!channelEmail) {
      toast.error("Selecione ao menos o canal E-mail para enviar.");
      return;
    }

    setSending(true);
    try {
      await organizerService.createEventNotification(eventId, {
        title: t,
        messageHtml: htmlToSend,
        channels: ["email"],
      });
      toast.success("Mensagem registrada para envio.");
      onSuccess?.();
      onOpenChange(false);
    } catch (e: any) {
      if (e?.response?.status === 429) {
        toast.error(
          e?.response?.data?.message ||
          "Muitas tentativas. Aguarde um minuto e tente de novo."
        );
      } else {
        toast.error(
          e?.response?.data?.message ||
          "Não foi possível enviar. Tente novamente."
        );
      }
    } finally {
      setSending(false);
    }
  };

  const notificationsHref = `/organizer/events/${eventId}/notifications`;

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      <DrawerContent
        overlayClassName="bg-black/50 supports-backdrop-filter:backdrop-blur-[2px]"
        className={cn(
          "bg-gray-1 flex h-dvh max-h-dvh w-full flex-col gap-0 rounded-none rounded-l-xl border-l border-gray-6 p-0",
          "data-[vaul-drawer-direction=right]:w-full data-[vaul-drawer-direction=right]:max-w-[644px]",
          "data-[vaul-drawer-direction=right]:sm:max-w-[644px]"
        )}
        aria-describedby={undefined}
      >
        <DrawerTitle className="sr-only">Criar nova notificação</DrawerTitle>

        <div className="flex h-[60px] shrink-0 items-center justify-between border-b border-gray-6 px-5">
          <h2 className="text-xl font-semibold text-gray-12 font-family-dm-sans leading-[1.3]">
            Criar nova notificação
          </h2>
          <button
            type="button"
            onClick={handleClose}
            disabled={sending}
            className="flex size-9 items-center justify-center rounded-lg text-gray-12 hover:bg-gray-3 transition-colors disabled:opacity-50"
            aria-label="Fechar"
          >
            <X className="size-5" strokeWidth={2} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-5">
          <nav
            className="mb-6 flex flex-wrap items-center gap-1 text-base text-gray-11 font-family-dm-sans"
            aria-label="Navegação"
          >
            <Link href="/organizer/events" className="hover:text-gray-12">
              Eventos
            </Link>
            <ChevronRight className="size-3.5 shrink-0 opacity-70" />
            <span className="max-w-[200px] truncate text-gray-12" title={eventName}>
              {eventName || "Evento"}
            </span>
            <ChevronRight className="size-3.5 shrink-0 opacity-70" />
            <Link href={notificationsHref} className="hover:text-gray-12">
              Notificações
            </Link>
            <ChevronRight className="size-3.5 shrink-0 opacity-70" />
            <span className="text-gray-12">Nova notificação</span>
          </nav>

          {/* Total de inscritos que receberão a mensagem — vindo da rota
              do evento quando consultada por organizador. */}
          {typeof registrationsCount === "number" && (
            <div className="mb-6 flex items-center justify-between gap-3">
              <span className="text-base text-gray-11 font-family-dm-sans">
                Inscritos que receberão a mensagem: {registrationsCount.toLocaleString("pt-BR")}
              </span>
            </div>
          )}

          {/* 1 — Canais */}
          <section className="mb-8">
            <div className="mb-4 flex items-center gap-2">
              <SectionBadge n={1} />
              <h3 className="text-base font-bold text-gray-12 font-manrope leading-tight">
                Canais de envio
              </h3>
            </div>

            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => setChannelEmail((v) => !v)}
                aria-pressed={channelEmail}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg border px-3 py-4 text-left transition-colors",
                  channelEmail
                    ? "border-primary-9 bg-primary-2/40"
                    : "border-gray-6 bg-gray-1 hover:bg-gray-2/80"
                )}
              >
                <ChannelCheckbox checked={channelEmail} />
                <span className="text-base font-semibold text-gray-12 font-family-dm-sans">
                  E-mail
                </span>
              </button>

              <div
                className="relative flex w-full cursor-not-allowed items-center gap-3 rounded-lg border border-gray-6 bg-gray-2/50 px-3 py-4 opacity-70"
                aria-disabled
              >
                <span className="flex size-6 shrink-0 items-center justify-center rounded-md border border-gray-6 bg-gray-3" />
                <span className="text-base font-semibold text-gray-11 font-family-dm-sans">
                  Whatsapp
                </span>
                <span className="ml-auto rounded-md bg-yellow-4 px-3 py-1 text-xs font-semibold text-yellow-12 font-family-dm-sans">
                  Em breve
                </span>
              </div>
            </div>
          </section>

          {/* 2 — Conteúdo */}
          <section>
            <div className="mb-4 flex items-center gap-2">
              <SectionBadge n={2} />
              <h3 className="text-base font-bold text-gray-12 font-manrope leading-tight">
                Conteúdo da mensagem
              </h3>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-base text-gray-12 font-normal font-family-dm-sans leading-[1.3]">
                  Título (Assunto)
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Título curto e objetivo..."
                  disabled={sending}
                  className="h-12 w-full rounded-lg border border-gray-6 bg-gray-1 px-3 text-base text-gray-12 placeholder:text-gray-11 font-family-dm-sans outline-none focus-visible:border-gray-4 focus-visible:ring-[3px] focus-visible:ring-gray-4/50"
                />
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-base text-gray-12 font-normal font-family-dm-sans leading-[1.3]">
                    Mensagem
                  </label>

                </div>
                {open ? (
                  <NotificationMessageEditor
                    ref={messageEditorRef}
                    onHtmlChange={setMessageHtml}
                  />
                ) : null}
              </div>

              <div className="flex gap-2 text-sm text-gray-11 font-family-dm-sans leading-snug items-center">
                <Info className="size-5 shrink-0 text-gray-11" />
                <p>
                  Importante: Alguns inscritos podem não receber a mensagem.
                </p>
              </div>
            </div>
          </section>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-3 border-t border-gray-6 px-4 py-3">
          <Button
            type="button"
            variant="outline"
            className="h-11 px-5 border-gray-6 font-bold text-gray-12"
            onClick={handleClose}
            disabled={sending}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            className="h-11 px-5 font-bold min-w-[160px]"
            onClick={handleSubmit}
            disabled={sending}
          >
            {sending ? "Enviando…" : "Enviar mensagem"}
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
