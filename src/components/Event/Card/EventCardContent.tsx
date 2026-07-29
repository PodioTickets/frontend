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
  /**
   * Cor (Tailwind) da linha de data. Default `"text-primary-11"` (verde,
   * home/busca). A tela de detalhes do ingresso passa `"text-gray-12"`.
   */
  dateClassName?: string;
  /** `<img>` nativo p/ data: URLs (prévia de upload em andamento). */
  nativeImg?: boolean;
  /**
   * Arredondamento do banner:
   * - "all" (default): banner isolado com todos os cantos (card da home/busca).
   * - "none": banner sem arredondar; o container pai (card de ingresso) clipa.
   */
  bannerRounded?: "all" | "none";
  /**
   * Largura do banner (Tailwind). Default `"w-full"` — banner ocupa a largura toda
   * (cards de home/busca). O `TicketCard` ("Meus ingressos") passa `"w-1/2"` (banner
   * compacto). Mantém os dois cards divergindo sem duplicar o núcleo.
   */
  bannerWidthClassName?: string;
  /**
   * Cor inicial do gradiente do divisor à esquerda dos textos. Default
   * `"from-gray-6"` (home/busca); o `TicketCard` passa `"from-primary-7"`.
   */
  dividerFromClassName?: string;
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
  dateClassName = "text-primary-11",
  nativeImg,
  bannerRounded = "all",
  bannerWidthClassName = "w-full",
  dividerFromClassName = "from-primary-7",
  bannerOverlay,
  children,
}: EventCardContentProps) {
  return (
    <>
      {/* Banner — proporção padrão do evento (1660×930 ≈ 16:9).
          `group` + `overflow-hidden`: o zoom acontece SÓ na imagem (via
          imgClassName), contido dentro da moldura fixa. */}
      <div
        className={cn(
          "group relative aspect-1660/930 shrink-0 overflow-hidden bg-transparent",
          bannerWidthClassName,
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
          imgClassName="transition-transform duration-300 group-hover:scale-[1.03]"
          letterClassName="text-5xl"
          nativeImg={nativeImg}
        />
        {bannerOverlay}
      </div>

      {/* Título + endereço + data (+ linhas extras). O padding fica no wrapper
          EXTERNO; a borda-esquerda vai no INTERNO (só a altura dos textos), pra
          não passar pela área do padding em cima/embaixo. */}
      <div className="min-w-0 w-full pt-2 pb-2 flex items-center">
        <div className={cn("shrink-0 self-stretch w-0.5 rounded-full bg-linear-to-b to-transparent", dividerFromClassName)} />
        <div className="flex min-w-0 w-full flex-col gap-1 pl-2">
          <p className="[text-box-trim:trim-both] truncate font-manrope text-base font-bold text-[#202020]">
            {name}
          </p>
          {addressLabel ? (
            <p className="[text-box-trim:trim-both] w-full min-w-0 truncate font-family-dm-sans text-sm text-[#646464]">
              {addressLabel}
            </p>
          ) : null}
          {dateLabel ? (
            <p className={cn("[text-box-trim:trim-both] font-family-dm-sans text-sm font-bold", dateClassName)}>
              {dateLabel}
            </p>
          ) : null}
          {children}
        </div>
      </div>
    </>
  );
}
