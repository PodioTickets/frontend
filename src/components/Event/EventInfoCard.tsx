"use client";

import Image from "next/image";
import Link from "next/link";
import { MapPin } from "lucide-react";
import { CalendarIcon } from "@/components/Icons/CalendarIcon";
import { Tooltip } from "@/components/Tooltip";

interface EventInfoCardEvent {
  name?: string;
  slug?: string | null;
  bannerUrl?: string | null;
  city?: string | null;
  state?: string | null;
  eventDate?: string | null;
}

interface EventInfoCardProps {
  event: EventInfoCardEvent;
  /**
   * Quando `true`, esconde "Ver evento" — útil em contextos onde o link
   * iria pra própria página do evento ou onde o organizador quer só os dados.
   */
  hideViewLink?: boolean;
  className?: string;
}

function formatDate(dateString?: string | null): string {
  if (!dateString) return "";
  const datePart = dateString.split("T")[0];
  if (datePart && /^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
    const [year, month, day] = datePart.split("-");
    return `${day}/${month}/${year}`;
  }
  return new Date(dateString).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Card-resumo do evento: imagem 86×70 + nome + (cidade/estado, data) + link "Ver evento".
 * Mobile: 2 linhas (imagem+nome em cima, meta+link embaixo).
 * Desktop: 1 linha (imagem | nome+meta | link à direita).
 *
 * Usado em /user/tickets/[id] e /checkout/sucesso pra mostrar contexto do evento.
 */
export function EventInfoCard({
  event,
  hideViewLink = false,
  className,
}: EventInfoCardProps) {
  const cityState = [event.city, event.state].filter(Boolean).join(", ");
  const formattedDate = formatDate(event.eventDate);
  const showLink = !hideViewLink && !!event.slug;

  return (
    <div
      className={`bg-gray-1 border border-gray-6 rounded-lg p-3 flex flex-col gap-3 md:flex-row md:items-center md:gap-4 ${className ?? ""}`}
    >
      {/* Topo mobile / esquerda desktop: imagem + nome (mobile junta numa row, desktop separa) */}
      <div className="flex gap-3 items-center md:contents">
        {/* Aspect 16:9 — mesmo formato dos banners 1280x720 enviados pelo
            organizador e renderizados na página do evento (object-cover).
            A largura precisa ser explícita TAMBÉM no mobile (aspect-video):
            com `w-auto`, o `w-full` da imagem (100% de pai auto) é indefinido
            por spec — o Safari do iOS resolve como 0 e o banner some. */}
        <div className="h-[70px] w-[45%] md:w-[150px] rounded-lg overflow-hidden shrink-0 relative">
          {event.bannerUrl ? (
            <Image
              src={event.bannerUrl}
              alt={event.name || "Evento"}
              fill
              sizes="150px"
              className="object-cover rounded-lg"
              unoptimized
            />
          ) : null}
        </div>
        <div className="flex flex-col gap-2 flex-1 min-w-0">
          {/* Tooltip click-to-reveal: mostra o nome completo quando truncado em
              3 linhas (mobile/desktop). Click trigger pra cobrir mobile sem hover. */}
          <Tooltip
            content={event.name || ""}
            position="topRight"
            trigger="click"
            usePortal
            className="block min-w-0"
            contentClassName="!w-auto max-w-[calc(100vw-32px)] text-left text-sm text-gray-12 font-family-dm-sans !py-2 !px-3"
          >
            <p className="font-manrope font-bold text-base leading-[1.1] text-gray-12 line-clamp-3 cursor-pointer">
              {event.name || ""}
            </p>
          </Tooltip>
          {/* Meta (location + date) — escondido no mobile (linha separada abaixo), inline no desktop */}
          <div className="hidden md:flex items-center gap-6 flex-wrap">
            {cityState && (
              <div className="flex gap-1 items-center min-w-0">
                <MapPin size={20} strokeWidth={1.5} className="shrink-0 text-gray-12" />
                <p className="font-family-dm-sans font-normal text-sm leading-[1.3] text-gray-12 truncate">
                  {cityState}
                </p>
              </div>
            )}
            {formattedDate && (
              <div className="flex gap-1 items-center">
                <CalendarIcon className="size-5 shrink-0" />
                <p className="font-family-dm-sans font-normal text-sm leading-[1.3] text-gray-12">
                  {formattedDate}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Linha inferior MOBILE: meta + link (mobile only) */}
      <div className="flex items-center justify-between gap-2 md:hidden">
        {cityState && (
          <div className="flex gap-1 items-center min-w-0">
            <MapPin size={20} strokeWidth={1.5} className="shrink-0 text-gray-12" />
            <p className="font-family-dm-sans font-normal text-sm leading-[1.3] text-gray-12 truncate">
              {cityState}
            </p>
          </div>
        )}
        {showLink && (
          <Link
            href={`/events/${event.slug}`}
            className="font-family-dm-sans font-normal text-sm leading-[1.3] text-primary-10 underline whitespace-nowrap ml-auto"
          >
            Ver evento
          </Link>
        )}
      </div>

      {/* Link DESKTOP — à direita, na mesma linha que imagem+meta */}
      {showLink && (
        <Link
          href={`/events/${event.slug}`}
          className="hidden md:inline-block font-family-dm-sans font-normal text-sm leading-[1.3] text-primary-10 underline whitespace-nowrap shrink-0"
        >
          Ver evento
        </Link>
      )}
    </div>
  );
}
