import { Fragment } from "react";
import { Button } from "@/components/Button";
import { EventMap } from "@/components/EventMap";
import { ImageWithInitialFallback } from "@/components/ImageWithInitialFallback";
import { TopicRichContent } from "@/components/TopicRichContent";
import { normalizeTopicHtmlAnchorHrefs } from "@/lib/normalizeTopicHtmlLinks";
import {
  EventPublicInfoCardDesktop,
  EventPublicInfoCardMobile,
} from "@/components/Event/EventPublicInfoCard";
import { TopicsPreviewKitsSection } from "@/components/Event/TopicsPreviewKitsSection";
import type { Event } from "@/interfaces/event";

/**
 * Conteúdo da PRÉ-VISUALIZAÇÃO de tópicos (banner + tópicos + regulamento + kits +
 * mapa). Antes era copy-paste nas 4 preview pages (organizer new/edit, admin
 * edit/review) — e divergia da tela pública do evento (`app/events/[slug]`), com um
 * espaçamento grande entre banner e tópicos (`-mt-20`/`gap-[52px]` + coluna separada).
 *
 * Aqui replicamos EXATAMENTE o layout desktop do cliente: duas colunas
 * (`flex gap-8`) — esquerda `w-3/4` com banner (`mb-10`) e os tópicos empilhados logo
 * abaixo (`my-10` + divisória `h-px bg-gray-6`), direita `w-1/4` com o card de
 * informações. Assim a prévia fica idêntica à tela do participante.
 */

export interface PreviewTopicSection {
  id: string | number;
  title: string;
  content: string;
}

interface PreviewEventLike {
  bannerUrl?: string | null;
  name?: string | null;
  city?: string | null;
  state?: string | null;
  googleMapsLink?: string | null;
  regulationUrl?: string | null;
}

export function EventTopicsPreviewContent({
  event,
  eventTyped,
  topicSections,
  kits,
}: {
  event: PreviewEventLike | null;
  eventTyped: Event | null;
  topicSections: PreviewTopicSection[];
  kits: readonly { description?: unknown; imageUrl?: unknown; name?: unknown }[];
}) {
  return (
    <div className="flex w-full flex-col gap-8 md:flex-row md:items-start">
      {/* Coluna esquerda: banner + tópicos (idêntico à tela do cliente) */}
      <div className="w-full min-w-0 md:w-3/4">
        {/* Banner: mesma altura/margem do cliente (h-400 + mb-10 → 40px até o 1º tópico). */}
        <div className="relative mb-10 h-[400px] w-full overflow-hidden rounded-xl shadow-[0px_8px_16px_0px_rgba(17,17,17,0.5)]">
          <ImageWithInitialFallback
            src={event?.bannerUrl ?? undefined}
            alt={event?.name || "Event banner"}
            name={event?.name || "Evento"}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 75vw, 66vw"
            className="size-full rounded-xl border-0 border-transparent object-cover"
            letterClassName="text-7xl font-bold"
          />
        </div>

        {/* Card de informações no MOBILE, logo abaixo do banner (desktop = coluna direita). */}
        {eventTyped && (
          <div className="mb-10 w-full md:hidden">
            <EventPublicInfoCardMobile event={eventTyped} isPreview />
          </div>
        )}

        {topicSections.map((section, index) => (
          <Fragment key={section.id}>
            <div className={`flex flex-col gap-2 ${index === 0 ? "mb-10" : "my-10"}`}>
              <h1 className="text-2xl font-bold text-gray-12">{section.title}</h1>
              <TopicRichContent
                html={normalizeTopicHtmlAnchorHrefs(section.content)}
                className="topic-rich-html text-gray-11 text-sm prose prose-sm max-w-none"
              />
            </div>
            <div className="h-px w-full bg-gray-6" />
          </Fragment>
        ))}

        {/* Regulamento — mesmo lugar/estilo da tela pública. */}
        {event?.regulationUrl && (
          <>
            <div className="my-10 flex flex-col gap-6">
              <h1 className="text-2xl font-bold text-gray-12">Regulamento</h1>
              <a
                href={event.regulationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-primary-11 underline hover:text-primary-10"
              >
                <Button variant="outline" className="border-gray-6 text-gray-12">
                  Ler regulamento
                </Button>
              </a>
            </div>
            <div className="h-px w-full bg-gray-6" />
          </>
        )}

        {/* Kits (exclusivo da prévia). */}
        <TopicsPreviewKitsSection kits={kits} />

        {/* Mapa */}
        {event?.city && event?.state && (
          <div className="my-10 flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <h1 className="text-2xl font-bold text-gray-12">
                Onde acontecerá o evento
              </h1>
            </div>
            <div className="relative h-[310px] w-full overflow-hidden rounded-xl">
              <EventMap
                city={event.city}
                state={event.state}
                title={event.name ?? undefined}
                googleMapsLink={event.googleMapsLink ?? undefined}
              />
            </div>
          </div>
        )}
      </div>

      {/* Coluna direita: card de informações (desktop). */}
      {eventTyped && (
        <div className="hidden shrink-0 md:block md:w-1/4">
          <EventPublicInfoCardDesktop event={eventTyped} isPreview />
        </div>
      )}
    </div>
  );
}
