"use client";

import type { ReactNode } from "react";
import { ImageWithInitialFallback } from "@/components/ImageWithInitialFallback";
import { cn } from "@/utils/cn";

interface EventCardContentProps {
  /** Nome do evento (título + base do fallback do banner). */
  name: string;
  /** URL do banner do evento. */
  bannerUrl?: string | null;
  /** ID estável para o fallback de imagem (letra inicial). */
  fallbackId: string;
  /** "Local, Cidade, Estado" (ou "Cidade, Estado"). */
  addressLabel?: string;
  /** "Acontece no sábado, 25 de julho". */
  dateLabel?: string;
  /** `<img>` nativo p/ data: URLs (prévia de upload em andamento). */
  nativeImg?: boolean;
  /**
   * Arredondamento do banner:
   * - "all" (default): banner isolado com todos os cantos (card da home/busca).
   * - "none": banner sem arredondar; o container pai (card de ingresso) clipa.
   */
  bannerRounded?: "all" | "none";
  /** Overlay posicionado sobre o banner (ex.: tag "Inscrição feita por"). */
  bannerOverlay?: ReactNode;
  /** Linhas extras abaixo da data (ex.: "X pessoas"). */
  children?: ReactNode;
}

/**
 * Núcleo VISUAL compartilhado dos cards de evento: banner + título + endereço +
 * data por extenso. Reutilizado pelo `EventCard` (home/busca) e pelo `TicketCard`
 * ("Meus ingressos"), que apenas envolvem/estendem este conteúdo (link, aba de
 * status, botão, etc.). Sem borda/fundo — o wrapper decide.
 */
export function EventCardContent({
  name,
  bannerUrl,
  fallbackId,
  addressLabel,
  dateLabel,
  nativeImg,
  bannerRounded = "all",
  bannerOverlay,
  children,
}: EventCardContentProps) {
  return (
    <>
      {/* Banner — proporção do Figma (312/142) */}
      <div
        className={cn(
          "relative aspect-[312/142] w-full shrink-0 overflow-hidden bg-transparent",
          bannerRounded === "all" && "rounded-[8px]",
        )}
      >
        <ImageWithInitialFallback
          src={bannerUrl ?? null}
          alt={name}
          name={name}
          fallbackId={fallbackId}
          fill
          sizes="(max-width: 768px) 92vw, 320px"
          quality={90}
          className="size-full bg-transparent border-0 border-transparent object-cover rounded-[8px]"
          letterClassName="text-5xl"
          nativeImg={nativeImg}
        />
        {bannerOverlay}
      </div>

      {/* Título + endereço + data (+ linhas extras). O padding fica no wrapper
          EXTERNO; a borda-esquerda vai no INTERNO (só a altura dos textos), pra
          não passar pela área do padding em cima/embaixo. */}
      <div className="w-full pt-2 pb-2">
        <div className="flex w-full flex-col gap-1 border-l border-gray-6 pl-2">
          <p className="[text-box-trim:trim-both] truncate font-manrope text-base font-bold text-[#202020]">
            {name}
          </p>
          {addressLabel ? (
            <p className="[text-box-trim:trim-both] w-full min-w-0 truncate font-family-dm-sans text-sm text-[#646464]">
              {addressLabel}
            </p>
          ) : null}
          {dateLabel ? (
            <p className="[text-box-trim:trim-both] font-family-dm-sans text-sm font-medium text-[#646464]">
              {dateLabel}
            </p>
          ) : null}
          {children}
        </div>
      </div>
    </>
  );
}
