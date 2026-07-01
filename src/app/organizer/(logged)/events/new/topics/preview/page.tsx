"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useOrganizerNavigate } from "@/hooks/useOrganizerNavigate";
import { useAuth } from "@/hooks/useAuth";
import { userService, organizerService } from "@/services";
import { useCreateEvent } from "@/contexts/CreateEventContext";
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

export default function PreviewEventPage() {
  const router = useRouter();
  const orgNav = useOrganizerNavigate();
  const { isAuthenticated } = useAuth();
  const { formData } = useCreateEvent();
  const [authChecked, setAuthChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [event, setEvent] = useState<any>(null);
  const [kits, setKits] = useState<any[]>([]);

  // Verificar autenticação
  useEffect(() => {
    const hasToken = userService.isAuthenticated();
    if (!hasToken) {
      orgNav.push("/organizer/login");
      return;
    }
    const timer = setTimeout(() => {
      setAuthChecked(true);
    }, 300);
    return () => clearTimeout(timer);
  }, [router]);

  // Carregar dados do evento
  useEffect(() => {
    const loadEventData = async () => {
      if (!authChecked || !formData.createdEventId) return;

      setLoading(true);
      try {
        const eventData = await organizerService.getEventById(formData.createdEventId);
        setEvent(eventData);

        // Carregar kits
        try {
          const kitsData = await organizerService.getKits(formData.createdEventId);
          setKits(kitsData.filter((kit: any) => kit.isActive));
        } catch (error) {
          console.error("Error loading kits:", error);
        }
      } catch (error: any) {
        console.error("Error loading event:", error);
      } finally {
        setLoading(false);
      }
    };

    loadEventData();
  }, [authChecked, formData.createdEventId]);

  const handleBack = () => {
    orgNav.push("/organizer/events/new/topics");
  };

  if (!authChecked || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loading />
      </div>
    );
  }

  const previewEventId = formData.createdEventId ?? "";
  const topicsDraft =
    event && previewEventId
      ? readTopicsPreviewDraft(previewEventId)
      : null;
  const topicSections =
    topicsDraft && topicsDraft.sections.length > 0
      ? topicSectionRowsToPreviewSections(topicsDraft.sections)
      : event
        ? getEnabledTopicsSorted(event)
        : [];

  const eventTyped = (event ?? null) as Event | null;

  return (
    <div className="bg-gray-2 min-h-screen">

      {/* Main Content */}
      <div className="max-w-[1440px] mx-auto px-5 md:px-5 py-[52px] pb-[176px]">
        <div className="flex flex-col gap-9 items-center w-full">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-14 w-full">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleBack}
                className="flex size-9 rotate-180 cursor-pointer items-center justify-center rounded-[52px] border border-gray-6 transition-colors hover:bg-gray-3"
              >
                <ArrowButton isOpen={false} />
              </button>
              <div>
                <h1 className="font-manrope text-xl font-bold text-gray-12 md:text-2xl">
                  Pré-visualização — tópicos
                </h1>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              className="h-11 shrink-0 border-gray-6 font-manrope font-semibold text-gray-12"
              onClick={handleBack}
            >
              Voltar para edição
            </Button>
          </div>

          {/* Content — idêntico à tela pública do evento (banner + tópicos). */}
          <EventTopicsPreviewContent
            event={event}
            eventTyped={eventTyped}
            topicSections={topicSections}
            kits={kits}
          />

          {/* Action Button */}
          <div className="flex w-full max-w-[1280px] flex-col items-end justify-center px-0 lg:px-8">
            <Button
              variant="outline"
              onClick={handleBack}
              className="border-gray-6 text-gray-12 text-xl font-bold px-11 h-[52px]"
            >
              Voltar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
