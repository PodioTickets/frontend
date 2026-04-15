"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useOrganizerNavigate } from "@/hooks/useOrganizerNavigate";
import { useAuth } from "@/hooks/useAuth";
import { userService, organizerService } from "@/services";
import { useCreateEvent } from "@/contexts/CreateEventContext";
import { Button } from "@/components/Button";
import { ArrowButton } from "@/components/ArrowButton";
import { EventMap } from "@/components/EventMap";
import { ImageWithInitialFallback } from "@/components/ImageWithInitialFallback";
import { Download } from "lucide-react";
import { Loading } from "@/components/Loading";
import {
  getEnabledTopicsSorted,
  readTopicsPreviewDraft,
  topicSectionRowsToPreviewSections,
} from "@/lib/eventTopicSections";
import { normalizeTopicHtmlAnchorHrefs } from "@/lib/normalizeTopicHtmlLinks";
import type { Event } from "@/interfaces/event";
import {
  EventPublicInfoCardDesktop,
  EventPublicInfoCardMobile,
} from "@/components/Event/EventPublicInfoCard";

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

          {/* Content */}
          <div className="flex w-full flex-col items-start gap-[52px] px-0 lg:px-0">
            <div className="flex w-full flex-col gap-8 md:flex-row md:items-start">
              <div className="w-full min-w-0 md:flex-1">
                <div className="relative h-[404px] w-full overflow-hidden rounded-2xl shadow-[0px_8px_16px_0px_rgba(17,17,17,0.5)] md:h-[400px]">
                  <ImageWithInitialFallback
                    src={event?.bannerUrl}
                    alt={event?.name || "Event banner"}
                    name={event?.name || "Evento"}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 75vw, 66vw"
                    className="size-full rounded-2xl border-transparent border-0"
                    letterClassName="text-7xl font-bold"
                  />
                </div>
              </div>
              {eventTyped && (
                <div className="hidden w-full shrink-0 md:block md:w-1/4">
                  <EventPublicInfoCardDesktop
                    event={eventTyped}
                    isPreview
                  />
                </div>
              )}
            </div>
            {eventTyped && (
              <div className="w-full md:hidden">
                <EventPublicInfoCardMobile event={eventTyped} isPreview />
              </div>
            )}

            <div className="flex w-3/4 flex-col items-start rounded-xl -mt-20">
              {topicSections.map((section, index) => (
                <div
                  key={section.id}
                  className={`border-b border-gray-8 w-full ${index === 0 ? "pb-10" : "py-10"}`}
                >
                  <div className="flex flex-col gap-6 items-start">
                    <h2 className="text-gray-12 text-2xl font-bold font-manrope leading-[1.1]">
                      {section.title}
                    </h2>
                    <div
                      className="topic-rich-html text-gray-11 text-base font-family-dm-sans leading-[1.3] prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{
                        __html: normalizeTopicHtmlAnchorHrefs(section.content),
                      }}
                    />

                  </div>
                </div>
              ))}

              {/* Kits */}
              {kits.length > 0 && (
                <div className="border-b border-gray-8 py-10 w-full">
                  <div className="flex flex-col gap-6 items-start">
                    <h2 className="text-gray-12 text-2xl font-bold font-manrope leading-[1.1]">
                      Kits
                    </h2>
                    <div
                      className="text-gray-11 text-base font-family-dm-sans leading-[1.3] prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{
                        __html: kits.map((kit) => kit.description || "").filter(Boolean).join(" ") || "Informações sobre os kits do evento."
                      }}
                    />
                    {kits[0] && (
                      <div className="flex items-start w-full">
                        <div className="aspect-192/184 border border-gray-6 rounded-lg relative w-[192px] overflow-hidden">
                          <ImageWithInitialFallback
                            src={kits[0].imageUrl}
                            alt={kits[0].name}
                            name={kits[0].name}
                            fill
                            sizes="192px"
                            className="size-full rounded-lg border-transparent border-0"
                            letterClassName="text-3xl font-semibold"
                          />
                        </div>
                      </div>
                    )}

                  </div>
                </div>
              )}

              {/* Mapa */}
              {event?.city && event?.state && (
                <div className="flex flex-col gap-6 items-start py-10 w-full">
                  <h2 className="text-gray-12 text-2xl font-bold font-manrope leading-[1.1]">
                    Onde acontecerá o evento
                  </h2>
                  <div className="h-[310px] relative rounded-xl w-full overflow-hidden">
                    <div className="w-full h-full rounded-xl">
                      <EventMap city={event.city} state={event.state} title={event.name} />
                    </div>
                  </div>
                  <Button disabled variant="outline" className="border-gray-6 text-gray-12 text-base font-bold px-11 h-12">
                    <p className="text-gray-12 text-base font-bold font-manrope leading-[1.1]">
                      Ver no mapa
                    </p>
                  </Button>
                </div>
              )}
            </div>
          </div>

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
