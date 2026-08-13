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
  // "Denunciar evento" (desabilitado) e "Compartilhar" vêm do próprio card
  // (EventPublicInfoCard → ShareAndReport), já apagados via mutedPreview.
  return (
    <>
      {/* Full-bleed INDEPENDENTE do padding: `w-screen` + `mx-[calc(50%-50vw)]`
          faz o margin-box bater exatamente com a largura do pai (o `50%` cancela
          o padding, seja px-5, px-4, etc.) e sangra simétrico até as bordas da
          tela. Vale igual nas 4 preview pages (criar + admin) sem depender do
          valor do padding. O conteúdo interno mantém o `px-4` do cliente. */}
      <div className="relative mx-[calc(50%-50vw)] w-screen overflow-hidden md:hidden">
        {/* Fundo borrado do banner (idêntico ao cliente). */}
        {event?.bannerUrl && event.bannerUrl.trim() !== "" && (
          <div
            className="absolute left-0 top-0 h-full max-h-[300px] w-full blur-sm"
            style={{
              backgroundImage: `url(${event.bannerUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "top",
              backgroundRepeat: "no-repeat",
            }}
          >
            <div className="absolute bottom-0 left-0 h-[50%] w-full bg-linear-to-b from-transparent to-white" />
          </div>
        )}

        {/* Hero — formato padrão do banner (1660×930). */}
        <div className="relative z-10 mx-4 mt-4 aspect-1660/930 overflow-hidden rounded-xl">
          <ImageWithInitialFallback
            src={event?.bannerUrl ?? undefined}
            alt={event?.name || "Event banner"}
            name={event?.name || "Evento"}
            fill
            sizes="100vw"
            className="size-full rounded-xl border-0 object-cover"
            letterClassName="text-6xl font-bold"
          />
        </div>

        {/* Card de informações (mesmo formato do cliente, apagado na prévia). */}
        {eventTyped && (
          <EventPublicInfoCardMobile event={eventTyped} isPreview mutedPreview />
        )}

        {/* Tópicos — títulos `h2 text-lg` e espaçamento do cliente (mb-4/my-4). */}
        <div className="mt-10 space-y-4 px-4">
          {topicSections.map((section, index) => (
            <Fragment key={section.id}>
              <div className={index === 0 ? "mb-4" : "my-4"}>
                <h2 className="mb-3 text-lg font-bold text-gray-12">
                  {section.title}
                </h2>
                <TopicRichContent
                  html={normalizeTopicHtmlAnchorHrefs(section.content)}
                  className="topic-rich-html prose prose-sm mb-3 max-w-none text-sm text-gray-11"
                />
              </div>
              <div className="h-px w-full bg-gray-6" />
            </Fragment>
          ))}

          {/* Regulamento — mesmo botão da tela pública (mobile). */}
          {event?.regulationUrl && (
            <>
              <div className="my-4 flex flex-col gap-3">
                <h2 className="text-lg font-bold text-gray-12">Regulamento</h2>
                <a
                  href={event.regulationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
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

          {/* Mapa — `h2 text-base`, igual ao cliente (mobile). */}
          {event?.city && event?.state && (
            <div className="my-4">
              <h2 className="mb-3 text-base font-bold text-gray-12">
                Onde acontecerá o evento
              </h2>
              <div className="overflow-hidden rounded-lg">
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
      </div>

      {/* ===================== DESKTOP ===================== */}
      {/* Duas colunas, idêntico ao cliente: esquerda banner + tópicos, direita card. */}
      <div className="hidden w-full gap-8 md:flex md:flex-row md:items-start">
        {/* Coluna esquerda: banner + tópicos. */}
        <div className="w-full min-w-0 md:w-3/4">
          {/* Banner: formato padrão (1660×930), espelha a página pública do evento. */}
          <div className="relative mb-10 aspect-1660/930 w-full overflow-hidden rounded-xl shadow-[0px_8px_16px_0px_rgba(17,17,17,0.5)]">
            <ImageWithInitialFallback
              src={event?.bannerUrl ?? undefined}
              alt={event?.name || "Event banner"}
              name={event?.name || "Evento"}
              fill
              sizes="(max-width: 1200px) 75vw, 66vw"
              className="size-full rounded-xl border-0 border-transparent object-cover"
              letterClassName="text-7xl font-bold"
            />
          </div>

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

          {/* Regulamento — mesmo lugar/estilo da tela pública (desktop). */}
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

        {/* Coluna direita: card apagado (prévia). */}
        {eventTyped && (
          <div className="hidden shrink-0 md:block md:w-1/4">
            <EventPublicInfoCardDesktop event={eventTyped} isPreview mutedPreview />
          </div>
        )}
      </div>
    </>
  );
}
