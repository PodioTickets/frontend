"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { userService, organizerService } from "@/services";
import { Button } from "@/components/Button";
import { ArrowButton } from "@/components/ArrowButton";
import { EventMap } from "@/components/EventMap";
import { ImageWithInitialFallback } from "@/components/ImageWithInitialFallback";
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

export default function EditFlowEventPreviewPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;
  const [authChecked, setAuthChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [event, setEvent] = useState<Record<string, unknown> | null>(null);
  const [kits, setKits] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    const hasToken = userService.isAuthenticated();
    if (!hasToken) {
      router.push("/admin/login");
      return;
    }
    const timer = setTimeout(() => {
      setAuthChecked(true);
    }, 300);
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
          setKits(
            (kitsData as unknown as Record<string, unknown>[]).filter(
              (kit) => kit.isActive === true,
            ),
          );
        } catch (error) {
          console.error("Error loading kits:", error);
        }
      } catch (error: unknown) {
        console.error("Error loading event:", error);
      } finally {
        setLoading(false);
      }
    };

    loadEventData();
  }, [authChecked, eventId]);

  const handleBack = () => {
    router.push(`/admin/events/${eventId}/edit/topics`);
  };

  if (!authChecked || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loading />
      </div>
    );
  }

  const topicsDraft = event ? readTopicsPreviewDraft(eventId) : null;
  const topicSections =
    topicsDraft && topicsDraft.sections.length > 0
      ? topicSectionRowsToPreviewSections(topicsDraft.sections)
      : event
        ? getEnabledTopicsSorted(event as Pick<Event, "topics">)
        : [];

  const eventName = (event?.name as string) || "Evento";
  const bannerUrl = event?.bannerUrl as string | undefined;
  const city = event?.city as string | undefined;
  const state = event?.state as string | undefined;
  const eventTyped = event as Event | null;

  return (
    <div className="min-h-screen bg-gray-2">
      <div className="mx-auto max-w-7xl px-5 py-[52px] pb-[176px]">
        <div className="flex flex-col items-center gap-9 w-full">
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

          <div className="flex w-full max-w-[1280px] flex-col items-start gap-[52px] px-0 lg:px-0">
            <div className="flex w-full flex-col gap-8 md:flex-row md:items-start">
              <div className="w-full min-w-0 md:flex-1">
                <div className="relative h-[404px] w-full overflow-hidden rounded-2xl shadow-[0px_8px_16px_0px_rgba(17,17,17,0.5)] md:h-[400px]">
                  <ImageWithInitialFallback
                    src={bannerUrl}
                    alt={eventName}
                    name={eventName}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 75vw, 66vw"
                    className="size-full rounded-2xl border-transparent border-0"
                    letterClassName="text-7xl font-bold"
                  />
                </div>
              </div>
              {eventTyped && (
                <div className="hidden w-full shrink-0 md:block md:w-[25%]">
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
                  className={`w-full border-b border-gray-8 ${index === 0 ? "pb-10" : "py-10"}`}
                >
                  <div className="flex flex-col items-start gap-6">
                    <h2 className="font-manrope text-2xl font-bold leading-[1.1] text-gray-12">
                      {section.title}
                    </h2>
                    <div
                      className="topic-rich-html max-w-none font-family-dm-sans text-base leading-[1.3] text-gray-11 prose prose-sm"
                      dangerouslySetInnerHTML={{
                        __html: normalizeTopicHtmlAnchorHrefs(section.content),
                      }}
                    />
                  </div>
                </div>
              ))}

              {kits.length > 0 && (
                <div className="w-full border-b border-gray-8 py-10">
                  <div className="flex flex-col items-start gap-6">
                    <h2 className="font-manrope text-2xl font-bold leading-[1.1] text-gray-12">
                      Kits
                    </h2>
                    <div
                      className="max-w-none font-family-dm-sans text-base leading-[1.3] text-gray-11 prose prose-sm"
                      dangerouslySetInnerHTML={{
                        __html:
                          kits
                            .map((kit) => String(kit.description || ""))
                            .filter(Boolean)
                            .join(" ") ||
                          "Informações sobre os kits do evento.",
                      }}
                    />
                    {kits[0] && (
                      <div className="flex w-full items-start">
                        <div className="relative aspect-192/184 w-[192px] overflow-hidden rounded-lg border border-gray-6">
                          <ImageWithInitialFallback
                            src={kits[0].imageUrl as string | undefined}
                            alt={String(kits[0].name ?? "")}
                            name={String(kits[0].name ?? "")}
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

              {city && state && (
                <div className="flex w-full flex-col items-start gap-6 py-10">
                  <h2 className="font-manrope text-2xl font-bold leading-[1.1] text-gray-12">
                    Onde acontecerá o evento
                  </h2>
                  <div className="relative h-[310px] w-full overflow-hidden rounded-xl">
                    <div className="h-full w-full rounded-xl">
                      <EventMap city={city} state={state} title={eventName} />
                    </div>
                  </div>
                  <Button
                    disabled
                    variant="outline"
                    className="h-12 border-gray-6 px-11 font-manrope text-base font-bold text-gray-12"
                  >
                    Ver no mapa
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="flex w-full max-w-[1280px] flex-col items-end justify-center px-0 lg:px-8">
            <Button
              variant="outline"
              onClick={handleBack}
              className="h-[52px] border-gray-6 px-11 font-manrope text-xl font-bold text-gray-12"
            >
              Voltar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
