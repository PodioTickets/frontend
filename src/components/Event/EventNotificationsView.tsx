"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Plus } from "lucide-react";
import toast from "react-hot-toast";
import { userService, organizerService } from "@/services";
import { Button } from "@/components/Button";
import { EventNotificationsPanel } from "@/components/Organizer/EventNotificationsPanel";
import { CreateNotificationDrawer } from "@/components/Organizer/CreateNotificationDrawer";
import { Loading } from "@/components/Loading";

/**
 * Central de Comunicação (notificações do evento), compartilhada entre admin e
 * organizer. Antes duplicada byte a byte. Header via `renderHeader(event)`;
 * redirect de não-autenticado via `onUnauthenticated`. A permissão é checada na
 * página do organizer.
 *
 * `canManage` (default `true`) controla o envio de mensagens: quem só tem
 * `view_event` enxerga a lista (só leitura), mas o botão de criar fica oculto
 * até ter a permissão `notify`. O admin não passa a prop → tudo habilitado.
 */
export function EventNotificationsView({
  eventId,
  onUnauthenticated,
  renderHeader,
  canManage = true,
}: {
  eventId: string;
  onUnauthenticated: () => void;
  renderHeader: (event: { name?: string; slug?: string } | null) => ReactNode;
  canManage?: boolean;
}) {
  const [authChecked, setAuthChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<{ name?: string; slug?: string } | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [listRefreshKey, setListRefreshKey] = useState(0);

  useEffect(() => {
    const hasToken = userService.isAuthenticated();
    if (!hasToken) {
      onUnauthenticated();
      return;
    }
    const timer = setTimeout(() => setAuthChecked(true), 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!authChecked || !eventId) return;

    const load = async () => {
      setLoading(true);
      try {
        const eventData = await organizerService.getEventById(eventId);
        setEvent(eventData);
      } catch {
        toast.error("Erro ao carregar evento");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [authChecked, eventId]);

  if (!authChecked || loading) {
    return (
      <div className="min-h-screen bg-gray-2">
        {renderHeader(event)}
        <div className="flex items-center justify-center min-h-[400px]">
          <Loading />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-2">
      {renderHeader(event)}

      <div className="max-w-7xl mx-auto px-4 lg:px-6 2xl:px-0 py-4 md:py-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between mb-4 md:mb-6">
          <div>
            <h1 className="text-gray-12 font-extrabold font-manrope leading-[1.1] text-base md:text-[28px] md:font-bold">
              Central de Comunicação
            </h1>
            <p className="mt-2 md:mt-1 text-gray-11 font-family-dm-sans text-base leading-[1.3] max-w-[720px]">
              Comunique-se com os participantes do evento via E-mail ou Whatsapp
              no celular.
            </p>
          </div>
          {canManage && (
            <Button
              type="button"
              className="shrink-0 h-11 px-4 font-bold w-full md:w-auto font-family-dm-sans"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="size-4 shrink-0" />
              Nova notificação
            </Button>
          )}
        </div>

        <EventNotificationsPanel
          eventId={eventId}
          eventName={event?.name}
          refreshKey={listRefreshKey}
        />
      </div>

      <CreateNotificationDrawer
        open={createOpen}
        onOpenChange={setCreateOpen}
        eventId={eventId}
        eventName={event?.name}
        onSuccess={() => setListRefreshKey((k) => k + 1)}
      />
    </div>
  );
}
