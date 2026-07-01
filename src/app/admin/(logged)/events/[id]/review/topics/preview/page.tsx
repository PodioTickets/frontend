"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { userService, organizerService } from "@/services";
import { Button } from "@/components/Button";
import { ArrowButton } from "@/components/ArrowButton";
import { Loading } from "@/components/Loading";
import {
  getEnabledTopicsSorted,
  readTopicsPreviewDraft,
  topicSectionRowsToPreviewSections,
} from "@/lib/eventTopicSections";
import type { Event } from "@/interfaces/event";
import { EventTopicsPreviewContent } from "@/components/Event/EventTopicsPreviewContent";

export const dynamic = "force-dynamic";

export default function ReviewTopicsPreviewPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;
  const [authChecked, setAuthChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [event, setEvent] = useState<Record<string, unknown> | null>(null);
  const [kits, setKits] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    if (!userService.isAuthenticated()) { router.push("/admin/login"); return; }
    const timer = setTimeout(() => setAuthChecked(true), 300);
    return () => clearTimeout(timer);
  }, [router]);

  useEffect(() => {
    const loadEventData = async () => {
      if (!authChecked || !eventId) return;
      setLoading(true);
      try {
        const eventData = await organizerService.getEventById(eventId);
        setEvent(eventData as unknown as Record<string, unknown>);
        try {
          const kitsData = await organizerService.getKits(eventId);
          setKits((kitsData as unknown as Record<string, unknown>[]).filter((kit) => kit.isActive === true));
        } catch { /* ok */ }
      } catch { /* ok */ } finally {
        setLoading(false);
      }
    };
    loadEventData();
  }, [authChecked, eventId]);

  const handleBack = () => router.push(`/admin/events/${eventId}/review/topics`);

  if (!authChecked || loading) {
    return <div className="flex min-h-screen items-center justify-center"><Loading /></div>;
  }

  const topicsDraft = event ? readTopicsPreviewDraft(eventId) : null;
  const topicSections =
    topicsDraft && topicsDraft.sections.length > 0
      ? topicSectionRowsToPreviewSections(topicsDraft.sections)
      : event ? getEnabledTopicsSorted(event as Pick<Event, "topics">) : [];

  const eventName = (event?.name as string) || "Evento";
  const bannerUrl = event?.bannerUrl as string | undefined;
  const city = event?.city as string | undefined;
  const state = event?.state as string | undefined;
  const regulationUrl = event?.regulationUrl as string | undefined;
  const googleMapsLink = event?.googleMapsLink as string | undefined;
  const eventTyped = event as Event | null;

  return (
    <div className="min-h-screen bg-gray-2">
      <div className="mx-auto max-w-7xl px-5 py-[52px] pb-[176px]">
        <div className="flex flex-col items-center gap-9 w-full">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-14 w-full">
            <div className="flex items-center gap-3">
              <button type="button" onClick={handleBack} className="flex size-9 rotate-180 cursor-pointer items-center justify-center rounded-[52px] border border-gray-6 transition-colors hover:bg-gray-3">
                <ArrowButton isOpen={false} />
              </button>
              <h1 className="font-manrope text-xl font-bold text-gray-12 md:text-2xl">Pré-visualização — tópicos</h1>
            </div>
            <Button type="button" variant="outline" className="h-11 shrink-0 border-gray-6 font-manrope font-semibold text-gray-12" onClick={handleBack}>
              Voltar para edição
            </Button>
          </div>

          {/* Conteúdo idêntico à tela pública do evento (banner + tópicos). */}
          <div className="w-full max-w-[1280px]">
            <EventTopicsPreviewContent
              event={{ bannerUrl, name: eventName, city, state, googleMapsLink, regulationUrl }}
              eventTyped={eventTyped}
              topicSections={topicSections}
              kits={kits}
            />
          </div>

          <div className="flex w-full max-w-[1280px] flex-col items-end justify-center px-0 lg:px-8">
            <Button variant="outline" onClick={handleBack} className="h-[52px] border-gray-6 px-11 font-manrope text-xl font-bold text-gray-12">Voltar</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
