"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { Event } from "@/interfaces/event";
import { formatDateBR, toUtcDate } from "@/utils/datetimeBR";
import { ImageWithInitialFallback } from "@/components/ImageWithInitialFallback";

interface EventCardProps {
  event: Event;
  /** Modo prévia (ex.: tela de editar banner): renderiza o MESMO card, mas sem
   *  navegação (sem `<Link>`) e com imagem nativa, aceitando `data:` URLs do
   *  upload em andamento. Default false → comportamento idêntico ao de produção. */
  preview?: boolean;
}

/**
 * Card de evento (home/busca) — design do Figma (222:5298). A imagem é o BANNER do
 * evento (aspect 312/142, cantos arredondados). Card SEM borda/fundo/sombra:
 * banner arredondado → título → endereço (local, cidade, estado) → data por extenso.
 */
export function EventCard({ event, preview = false }: EventCardProps) {
  // Endereço completo: "Local, Cidade, Estado". `locationName` (escolhido no mapa)
  // pode faltar em eventos legados → cai pra "Cidade, Estado".
  const addressLabel = useMemo(() => {
    return [event.locationName, event.city, event.state]
      .map((part) => (part ?? "").trim())
      .filter(Boolean)
      .join(", ");
  }, [event.locationName, event.city, event.state]);

  // "Acontece no sábado, 25 de julho" — dia da semana + dia + mês por extenso (UTC).
  // Preposição concorda com o gênero do dia: domingo/sábado (m) → "no";
  // segunda a sexta (…-feira, f) → "na".
  const dateLabel = useMemo(() => {
    if (!event.eventDate) return "";
    const d = toUtcDate(event.eventDate);
    if (!d) return "";
    const weekday = d.getUTCDay(); // 0=domingo … 6=sábado
    const prep = weekday === 0 || weekday === 6 ? "no" : "na";
    const formatted = formatDateBR(event.eventDate, {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
    return `Acontece ${prep} ${formatted}`;
  }, [event.eventDate]);

  // Imagem do card = BANNER do evento.
  const eventImg = event.bannerUrl;

  const cardInner = (
    <div className="flex w-full flex-col items-start transition-transform duration-200 hover:scale-[1.01]">
      {/* Banner — proporção do Figma (312/142), cantos arredondados */}
      <div className="relative aspect-[312/142] w-full shrink-0 overflow-hidden rounded-[8px] bg-gray-4">
        <ImageWithInitialFallback
          src={eventImg}
          alt={event.name}
          name={event.name}
          fallbackId={event.id}
          fill
          sizes="(max-width: 768px) 92vw, 320px"
          quality={90}
          className="size-full border-0 object-cover"
          letterClassName="text-5xl"
          // Prévia mostra `data:` URLs (upload em andamento) — next/image rejeita
          // data URLs; `nativeImg` cai num <img> simples.
          nativeImg={preview}
        />
      </div>

      {/* Título + endereço (sem padding lateral, sem borda) */}
      <div className="flex w-full flex-col pt-3 pb-2">
        <p className="[text-box-trim:trim-both] truncate font-manrope text-base font-bold text-[#202020]">
          {event.name}
        </p>
        {/* Endereço numa linha só (trunca): Local, Cidade, Estado. */}
        <p className="[text-box-trim:trim-both] w-full min-w-0 truncate font-family-dm-sans text-sm text-gray-11">
          {addressLabel}
        </p>
      </div>

      {/* Data por extenso (sem ícone) */}
      <span className="[text-box-trim:trim-both] [text-box-edge:cap_alphabetic] font-family-dm-sans font-medium text-sm leading-[1.3] text-gray-11">
        {dateLabel}
      </span>
    </div>
  );

  // Prévia não navega (sem slug real / contexto de edição); produção mantém o Link.
  return preview ? (
    <div className="block">{cardInner}</div>
  ) : (
    <Link href={`/events/${event.slug}`} className="block">
      {cardInner}
    </Link>
  );
}
