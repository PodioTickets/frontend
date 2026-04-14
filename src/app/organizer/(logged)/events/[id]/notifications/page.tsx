"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useOrganizerNavigate } from "@/hooks/useOrganizerNavigate";
import { useEventPermissionGuard } from "@/hooks/useEventPermissionGuard";
import { Plus } from "lucide-react";
import toast from "react-hot-toast";
import { userService } from "@/services";
import { organizerService } from "@/services";
import { Button } from "@/components/Button";
import { EventPageHeader } from "@/components/Organizer/EventPageHeader";
import { EventMobileHeader } from "@/components/Organizer/EventMobileHeader";
import { EventNotificationsPanel } from "@/components/Organizer/EventNotificationsPanel";
import { CreateNotificationDrawer } from "@/components/Organizer/CreateNotificationDrawer";
import { Loading } from "@/components/Loading";

export default function EventNotificationsPage() {
  const router = useRouter();
  const orgNav = useOrganizerNavigate();
  const params = useParams();
  const eventId = params.id as string;
  useEventPermissionGuard("notify");
  const [authChecked, setAuthChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<{ name?: string } | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [listRefreshKey, setListRefreshKey] = useState(0);

  useEffect(() => {
    const hasToken = userService.isAuthenticated();
    if (!hasToken) {
      orgNav.push("/organizer/login");
      return;
    }
    const timer = setTimeout(() => setAuthChecked(true), 300);
    return () => clearTimeout(timer);
  }, [router]);

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
        <div className="hidden md:block">
          <EventPageHeader eventName={event?.name} />
        </div>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loading />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-2">
      <div className="hidden md:block">
        <EventPageHeader eventName={event?.name} />
      </div>

      <EventMobileHeader
        eventId={eventId}
        eventName={event?.name}
        activeHref={`/organizer/events/${eventId}/notifications`}
        backHref={`/organizer/events/${eventId}/dashboard`}
        backLinkClassName="rotate-180"
      />

      <div className="max-w-7xl mx-auto px-4 lg:px-0 py-4 md:py-6">
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
          <Button
            type="button"
            className="shrink-0 h-11 px-4 font-bold w-full md:w-auto font-family-dm-sans"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="size-4 shrink-0" />
            Nova notificação
          </Button>
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
