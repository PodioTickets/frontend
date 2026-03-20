"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { cn } from "@/utils/cn";
import type {
  EventNotificationRow,
  NotificationChannel,
} from "@/components/Organizer/eventNotificationConstants";
import {
  CHANNEL_META,
  STATUS_META,
} from "@/components/Organizer/eventNotificationConstants";
import { ArrowButton } from "../ArrowButton";
import { organizerService } from "@/services";
import toast from "react-hot-toast";

export function NotificationDetailsDrawer({
  open,
  onOpenChange,
  eventId,
  eventName,
  notificationId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  eventName?: string;
  notificationId: string | null;
}) {
  const notificationsHref = `/organizer/events/${eventId}/notifications`;
  const [notification, setNotification] = useState<EventNotificationRow | null>(
    null
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !notificationId) {
      setNotification(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setNotification(null);

    (async () => {
      try {
        const detail = await organizerService.getEventNotification(
          eventId,
          notificationId
        );
        if (cancelled) return;
        setNotification(detail as EventNotificationRow);
      } catch (e: any) {
        if (cancelled) return;
        toast.error(
          e?.response?.data?.message ||
            e?.message ||
            "Não foi possível carregar os detalhes."
        );
        onOpenChange(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, notificationId, eventId]);

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
        <DrawerTitle className="sr-only">Detalhes do envio</DrawerTitle>

        <div className="flex h-[60px] shrink-0 items-center justify-between border-b border-gray-6 px-5">
          <h2 className="text-xl font-semibold text-gray-12 font-family-dm-sans leading-[1.3]">
            Detalhes do envio
          </h2>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="flex size-9 items-center justify-center rounded-lg text-gray-12 hover:bg-gray-3 transition-colors"
            aria-label="Fechar"
          >
            <X className="size-5" strokeWidth={2} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-8 pt-5">
          <nav
            className="mb-6 flex flex-wrap items-center gap-2 text-sm text-gray-11 font-family-dm-sans"
            aria-label="Navegação"
          >
            <Link href="/organizer/events" className="hover:text-gray-12">
              Eventos
            </Link>
            <ArrowButton isOpen={false} />
            <span
              className="max-w-[200px] truncate text-gray-11"
              title={eventName}
            >
              {eventName || "Evento"}
            </span>
            <ArrowButton isOpen={false} />
            <Link href={notificationsHref} className="hover:text-gray-12">
              Notificações
            </Link>
            <ArrowButton isOpen={false} />
            <span className="text-gray-12">Detalhes do envio</span>
          </nav>

          {loading ? (
            <p className="text-sm text-gray-11 font-family-dm-sans py-8">
              Carregando…
            </p>
          ) : notification ? (
            <>
              <div className="mb-6 flex flex-wrap items-center gap-2">
                <span className="text-base text-gray-12 font-family-dm-sans">
                  Status:
                </span>
                <span
                  className={cn(
                    "inline-flex rounded px-3 py-1 text-sm font-normal font-family-dm-sans",
                    STATUS_META[notification.status].className
                  )}
                >
                  {STATUS_META[notification.status].label}
                </span>
              </div>

              <div className="mb-6">
                <p className="text-sm text-gray-11 font-family-dm-sans mb-2">
                  Canais selecionados
                </p>
                <div className="flex flex-wrap gap-2">
                  {notification.channels.length === 0 ? (
                    <span className="text-sm text-gray-11 font-family-dm-sans">
                      —
                    </span>
                  ) : (
                    notification.channels.map((ch: NotificationChannel) => {
                      const meta = CHANNEL_META[ch];
                      if (!meta) {
                        return (
                          <span
                            key={ch}
                            className="inline-flex rounded-md border border-gray-6 px-2.5 py-1.5 text-sm text-gray-12 font-family-dm-sans"
                          >
                            {ch}
                          </span>
                        );
                      }
                      const { label, Icon } = meta;
                      return (
                        <span
                          key={ch}
                          className="inline-flex items-center gap-2 rounded-md bg-blue-3 px-2.5 py-1.5 text-sm font-medium text-blue-12 font-family-dm-sans"
                        >
                          <Icon className="size-5 shrink-0 text-blue-12" />
                          {label}
                        </span>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="h-px w-full bg-gray-6 mb-6" />

              <div className="flex flex-col gap-6">
                <div>
                  <p className="text-xs text-gray-11 font-family-dm-sans mb-1.5">
                    Título
                  </p>
                  <p className="text-base font-bold text-gray-12 font-family-dm-sans leading-snug">
                    {notification.title}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-11 font-family-dm-sans mb-1.5">
                    Mensagem
                  </p>
                  <div
                    className={cn(
                      "rounded-lg border border-gray-6 bg-gray-1 px-3 py-3 min-h-[83px]",
                      "text-sm text-gray-12 font-family-dm-sans leading-relaxed",
                      "prose prose-sm max-w-none",
                      "[&_p]:my-1 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0",
                      "[&_a]:text-primary-11 [&_a]:underline [&_a]:break-all",
                      "[&_strong]:font-bold"
                    )}
                    dangerouslySetInnerHTML={{
                      __html: notification.messageHtml || "<p>—</p>",
                    }}
                  />
                </div>
              </div>
            </>
          ) : null}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
