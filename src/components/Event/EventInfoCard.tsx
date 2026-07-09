"use client";

import Image from "next/image";
import Link from "next/link";
import { MapPin } from "lucide-react";
import { CalendarIcon } from "@/components/Icons/CalendarIcon";
import { Tooltip } from "@/components/Tooltip";
import { cn } from "@/utils/cn";

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
        {/* Formato padrão do banner (1660×930) — mesmo do que o organizador
            envia e do hero da página do evento (object-cover).
            A largura precisa ser explícita TAMBÉM no mobile (aspect-ratio):
            com `w-auto`, o `w-full` da imagem (100% de pai auto) é indefinido
            por spec — o Safari do iOS resolve como 0 e o banner some. */}
        <div className="aspect-1660/930 w-[45%] md:w-[150px] rounded-lg overflow-hidden shrink-0 relative">
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
        <div className="min-w-0 w-full pt-2 pb-2 flex items-center">
          <div className="flex min-w-0 w-full flex-col gap-1 pl-2">
            <p className="[text-box-trim:trim-both] truncate font-manrope text-base font-bold text-[#202020]">
              {event.name || ""}
            </p>
            {cityState ? (
              <p className="[text-box-trim:trim-both] w-full min-w-0 truncate font-family-dm-sans text-sm text-[#646464]">
                {cityState}
              </p>
            ) : null}
            {formattedDate ? (
              <p className="[text-box-trim:trim-both] font-family-dm-sans text-sm font-medium text-[#646464]">
                {formattedDate}
              </p>
            ) : null}
          </div>
        </div>
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
