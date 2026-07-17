"use client";

import Image from "next/image";
import Link from "next/link";
import { GlobeIcon } from "lucide-react";
import { Button } from "@/components/Button";
import { CalendarIcon } from "@/components/Icons/CalendarIcon";
import { LocationIcon } from "@/components/Icons/LocationIcon";
import { ShareIcon } from "@/components/Icons/ShareIcon";
import { InstagramIcon } from "@/components/Icons/InstagramIcon";
import { FacebookIcon } from "@/components/Icons/FacebookIcon";
import { YoutubeIcon } from "@/components/Icons/YoutubeIcon";
import { TiktokIcon } from "@/components/Icons/TiktokIcon";
import { ShareModal } from "@/components/ShareModal";
import { RegistrationCountdown } from "@/components/Event/RegistrationCountdown";
import type { Event } from "@/interfaces/event";
import { cn } from "@/utils/cn";
import {
  formatDateTimeBR,
  eventWindowInstant,
  formatEventHappensLabel,
  formatWeekdayDayMonthBR,
} from "@/utils/datetimeBR";
import { getEventOrganizer } from "@/utils/organization";
import { buildGoogleMapsPlaceLink } from "@/utils/googleMapsGeo";
import { useMemo, useState } from "react";

/**
 * Card de informações do evento — FONTE ÚNICA usada tanto na página pública real
 * (`/events/[slug]`) quanto nas PRÉVIAS do organizador/admin (banner, tópicos).
 *
 * Dois modos:
 * - **prévia** (`isPreview`/`mutedPreview`): mesmos estados visuais, porém sem
 *   ações reais (checkout, contato, compartilhar e denunciar desabilitados).
 * - **live** (`live` presente): comportamentos reais injetados pela página —
 *   checkout, contagem regressiva de abertura, contato com o organizador,
 *   compartilhar e denunciar. A página é dona dos modais (Share/Contact); o card
 *   só dispara os callbacks.
 *
 * Mantê-lo como componente único garante que prévia e tela real NUNCA divirjam
 * (datas, endereço, estados de inscrição, layout).
 */

const sanitizeUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
    return url;
  } catch {
    return null;
  }
};

function OrganizerAvatar({
  logoUrl,
  name,
  className,
}: {
  logoUrl?: string;
  name: string;
  className?: string;
}) {
  const initial = name?.charAt(0).toUpperCase() || "O";
  return (
    <div
      className={cn(
        "relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-10/20",
        className,
      )}
    >
      {logoUrl?.trim() ? (
        <Image
          src={logoUrl.trim()}
          alt=""
          width={40}
          height={40}
          className="size-full object-cover"
          unoptimized
        />
      ) : (
        <span className="text-sm font-semibold text-primary-11">{initial}</span>
      )}
    </div>
  );
}

/** Ícone de calendário com "check" — espelha o usado em "Inscrições até" na página pública. */
function CalendarCheckIcon({ className }: { className?: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M6.6665 1.66699V4.16699" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13.3335 1.66699V4.16699" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2.5 6.91699C2.5 4.70786 4.29086 2.91699 6.5 2.91699H13.5C15.7091 2.91699 17.5 4.70785 17.5 6.91699V14.3337C17.5 16.5428 15.7091 18.3337 13.5 18.3337H6.5C4.29086 18.3337 2.5 16.5428 2.5 14.3337V6.91699Z" stroke="currentColor" strokeWidth="1" />
      <path d="M7.5 12.4997L8.83616 13.5686C9.25403 13.9029 9.86103 13.849 10.2134 13.4462L12.5 10.833" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2.5 7.5H17.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}

function useEventRegistrationUiState(event: Event) {
  return useMemo(() => {
    // `registrationOpensAt` (wall-clock UTC) é só pro DISPLAY (mostra a hora digitada).
    // A comparação com o tempo real usa o INSTANTE em BRT (+3h) — senão abre/fecha 3h cedo.
    const registrationOpensAt = event.registrationStartDate
      ? new Date(event.registrationStartDate)
      : null;
    const registrationOpensInstant = eventWindowInstant(event.registrationStartDate);
    const registrationsNotOpenYet =
      !!registrationOpensInstant &&
      Date.now() < registrationOpensInstant.getTime();

    const registrationOpensDateText =
      registrationsNotOpenYet && registrationOpensAt
        ? formatDateTimeBR(registrationOpensAt, {
          day: "numeric",
          month: "long",
          ...(registrationOpensAt.getUTCFullYear() !== new Date().getUTCFullYear()
            ? { year: "numeric" }
            : {}),
        })
        : "";

    const registrationSlotsSoldOut =
      event.hasRegistrationSlotsAvailable === false;

    // "Evento realizado" só UM DIA depois da data do evento (não no instante de
    // início) — mesma regra da página /events/[slug]. Durante o dia do evento e as
    // 24h seguintes, NÃO é marcado como realizado (cai em "Inscrições encerradas").
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;
    const eventRealizationInstant = eventWindowInstant(event.eventDate);
    const eventRealizationPassed =
      !!eventRealizationInstant &&
      Date.now() >= eventRealizationInstant.getTime() + ONE_DAY_MS;

    const registrationEndsInstant = eventWindowInstant(event.registrationEndDate);
    const registrationPeriodEnded =
      !!registrationEndsInstant &&
      Date.now() >= registrationEndsInstant.getTime();

    const eventSuspendedByOrganizer =
      event.status === "SUSPENDED" || event.isSuspended === true;

    return {
      registrationOpensInstant,
      registrationOpensDateText,
      registrationsNotOpenYet,
      registrationSlotsSoldOut,
      eventRealizationPassed,
      registrationPeriodEnded,
      eventSuspendedByOrganizer,
    };
  }, [event]);
}

/**
 * Comportamentos VIVOS injetados pela página pública real (`/events/[slug]`).
 * Quando ausente, o card fica em modo PRÉVIA (ações desabilitadas).
 */
export type EventPublicInfoCardLive = {
  /** Abre o fluxo "Falar com o organizador". */
  onContactClick: () => void;
  /** Abre o modal de compartilhar (a página é dona do `ShareModal`). */
  onShareClick: () => void;
  /** URL do "Denunciar evento" (WhatsApp do suporte). */
  reportUrl: string;
  /** Instante real (BRT) de abertura das inscrições — alvo da contagem regressiva. */
  registrationOpensInstant: Date | null;
  /** Texto de fallback quando a contagem não se aplica. */
  registrationOpensDateText: string;
  /** Chamado quando a contagem chega a zero (revalida o evento). */
  onRegistrationCountdownExpire: () => void;
  /** Âncora do IntersectionObserver da barra fixa mobile (só no card mobile). */
  registerAnchorRef?: React.Ref<HTMLDivElement>;
};

type EventPublicInfoCardProps = {
  event: Event;
  /** Prévia do organizador: mesmos estados visuais, sem checkout real. */
  isPreview?: boolean;
  /**
   * Prévia "apagada": o card inteiro ganha aspecto cinza/desabilitado (como um
   * placeholder de pré-visualização) e vira não-selecionável — EXCETO o título do
   * evento, que fica normal e selecionável. Usado na prévia de tópicos, onde o
   * card lateral é só contexto e o foco é o conteúdo à esquerda.
   */
  mutedPreview?: boolean;
  onRegisterClick?: (e: React.MouseEvent) => void;
  /** Presente = modo LIVE (página pública real). Ausente = prévia. */
  live?: EventPublicInfoCardLive;
  /** Override do wrapper externo (ex.: `px-0` quando o container já provê padding). */
  outerClassName?: string;
  /** Override do elemento-card (ex.: ajustar a margem superior). */
  cardClassName?: string;
};

function RegistrationCtaBlock({
  event,
  isPreview,
  onRegisterClick,
  live,
  desktopSpacing,
}: EventPublicInfoCardProps & { desktopSpacing: boolean }) {
  const {
    registrationOpensDateText,
    registrationsNotOpenYet,
    registrationSlotsSoldOut,
    eventRealizationPassed,
    registrationPeriodEnded,
    eventSuspendedByOrganizer,
  } = useEventRegistrationUiState(event);

  const mt = desktopSpacing ? "mt-8" : "mb-3";
  const disabledBtn = cn(
    "w-full bg-gray-4 text-gray-10 border-0 disabled:opacity-100 disabled:cursor-not-allowed",
    mt,
  );

  if (eventRealizationPassed) {
    return (
      <>
        <Button className={disabledBtn} disabled variant="outline">
          Evento realizado
        </Button>
        <p className="mt-2 text-center text-sm text-gray-11">
          Este evento já foi realizado.
        </p>
      </>
    );
  }
  if (registrationPeriodEnded) {
    return (
      <>
        <Button className={disabledBtn} disabled variant="outline">
          Inscrições encerradas!
        </Button>
        <p className="mt-2 text-center text-sm text-gray-11">
          O prazo de inscrições para este evento foi encerrado.
        </p>
      </>
    );
  }
  if (eventSuspendedByOrganizer) {
    return (
      <>
        <Button className={disabledBtn} disabled variant="outline">
          Inscreva-se
        </Button>
        <p className="mt-2 text-center text-sm text-gray-11">
          As inscrições para este evento não estão disponíveis no momento.
        </p>
      </>
    );
  }
  if (registrationSlotsSoldOut) {
    return (
      <>
        <Button className={disabledBtn} disabled variant="outline">
          Esgotado
        </Button>
        <p className="mt-2 text-center text-sm text-gray-11">
          Este evento não possui mais vagas disponíveis.
        </p>
      </>
    );
  }
  if (registrationsNotOpenYet) {
    return (
      <>
        <Button className={disabledBtn} disabled variant="outline">
          Em breve!
        </Button>
        <p className="mt-2 text-center text-sm text-gray-11">
          {live ? (
            <>
              Inscrições abrem em <br />{" "}
              <RegistrationCountdown
                targetDate={live.registrationOpensInstant}
                fallbackText={live.registrationOpensDateText}
                onExpire={live.onRegistrationCountdownExpire}
                className="font-semibold"
              />
            </>
          ) : (
            <>Inscrições abrem em {registrationOpensDateText}</>
          )}
        </p>
      </>
    );
  }

  if (isPreview) {
    return (
      <Button
        className={cn("w-full", mt)}
        disabled
        variant="default"
        type="button"
      >
        Inscreva-se
      </Button>
    );
  }

  return (
    <Button
      type="button"
      onClick={onRegisterClick}
      className={cn("w-full", mt)}
    >
      Inscreva-se
    </Button>
  );
}

/** Linhas de data + endereço — espelha a página pública do evento. */
function EventMetaRows({ event, mobile }: { event: Event; mobile?: boolean }) {
  // Clique no endereço mostra o NOME do local (não as coordenadas). Sem
  // `locationName` (legado) cai no `googleMapsLink` por coordenadas.
  const mapsUrl =
    sanitizeUrl(
      buildGoogleMapsPlaceLink({
        locationName: event.locationName,
        city: event.city,
        state: event.state,
        fallback: event.googleMapsLink?.trim() || "",
      }),
    ) ?? "";
  // MESMO formato do card da tela pública do evento (`addressLabel` em
  // /events/[slug]): "Local, Cidade, UF" — sem bairro/endereço/CEP. `locationName`
  // ausente (evento legado) cai em "Cidade, UF".
  const addressText =
    [event.locationName, event.city, event.state]
      .map((v) => v?.trim())
      .filter(Boolean)
      .join(", ");
  const textColor = mobile ? "text-gray-12" : "text-gray-12";

  return (
    <div className={cn("flex flex-col", mobile ? "mb-4 gap-3" : "gap-4")}>
      <div className={cn("flex items-center gap-2 text-sm font-medium", textColor)}>
        <CalendarIcon className="size-5 shrink-0" />
        <span>{formatEventHappensLabel(event.eventDate)}</span>
      </div>
      {event.registrationEndDate && (
        <div className={cn("flex items-center gap-2 text-sm font-medium", textColor)}>
          <CalendarCheckIcon className="size-5 shrink-0 text-gray-12" />
          <span>
            Inscrições até {formatWeekdayDayMonthBR(event.registrationEndDate)}
          </span>
        </div>
      )}
      <div className={cn("flex items-center gap-2 font-medium", textColor)}>
        <LocationIcon className="size-5 shrink-0" />
        {mapsUrl ? (
          <Link
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm underline"
          >
            {addressText}
          </Link>
        ) : (
          <span className="text-sm">{addressText}</span>
        )}
      </div>
    </div>
  );
}

function OrganizerBlock({
  event,
  mobile,
  live,
}: {
  event: Event;
  mobile?: boolean;
  live?: EventPublicInfoCardLive;
}) {
  const organizer = getEventOrganizer(event);
  const boxClass = mobile
    ? "mb-4 rounded-lg border border-gray-6 bg-gray-3 p-4"
    : "mt-6 rounded-xl border border-gray-6 bg-gray-3 p-3";

  // Redes sociais — espelha a página pública (substitui o telefone, que não é público).
  const socialLinks = [
    { url: sanitizeUrl(event.instagram), icon: InstagramIcon },
    { url: sanitizeUrl(event.facebook), icon: FacebookIcon },
    { url: sanitizeUrl(event.youtube), icon: YoutubeIcon },
    { url: sanitizeUrl(event.tiktok), icon: TiktokIcon },
    { url: sanitizeUrl(event.website), icon: GlobeIcon },
  ];

  return (
    <div className={boxClass}>
      <p className="mb-3 text-sm font-medium text-gray-11">Organizador</p>
      {organizer ? (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            {/* Nome FANTASIA (getEventOrganizer prioriza tradeName). */}
            <OrganizerAvatar logoUrl={organizer.logoUrl} name={organizer.name} />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <p className="truncate text-sm font-semibold text-gray-12">
                {organizer.name}
              </p>
              <div className="flex items-center gap-1">
                {socialLinks.map(({ url, icon: Icon }, index) => {
                  if (!url) return null;
                  return (
                    <Link
                      key={index}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex size-8 items-center justify-center rounded-full border border-gray-6 text-gray-12"
                    >
                      <Icon className="size-4" />
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
          {/* Live: abre o fluxo de contato; prévia: desabilitado. */}
          <Button
            variant="outline"
            disabled={!live}
            onClick={live?.onContactClick}
            className={cn(
              "w-full border-gray-6 text-gray-12",
              mobile && "bg-gray-1",
            )}
            type="button"
          >
            Falar com o organizador
          </Button>
        </div>
      ) : (
        <p className="text-xs text-gray-11">Informações não disponíveis</p>
      )}
    </div>
  );
}

function ShareAndReport({
  mobile,
  onShare,
  live,
}: {
  mobile?: boolean;
  onShare: () => void;
  live?: EventPublicInfoCardLive;
}) {
  // "Denunciar evento": live vira link real (WhatsApp); prévia é span desabilitado.
  const reportNode = live ? (
    <a
      href={live.reportUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="cursor-pointer text-sm font-semibold text-gray-11 underline transition-colors hover:text-gray-12"
    >
      Denunciar evento
    </a>
  ) : (
    <span className="cursor-not-allowed text-sm font-semibold text-gray-11 underline">
      Denunciar evento
    </span>
  );

  if (mobile) {
    // "Compartilhar" + "Denunciar evento". Em prévia ambos ficam apagados
    // (o card inteiro fica cinza via mutedPreview) e o compartilhar desabilitado.
    return (
      <div className="mt-8 flex flex-col items-center justify-center gap-2 px-4">
        <Button
          variant="outline"
          type="button"
          disabled={!live}
          className="mb-2 w-1/2 border-gray-6 bg-gray-1 text-gray-12"
          onClick={onShare}
        >
          <ShareIcon className="size-5" />
          Compartilhar
        </Button>
        {reportNode}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <Button
        variant="outline"
        type="button"
        disabled={!live}
        className="mt-8 border-gray-6 text-gray-11"
        onClick={onShare}
      >
        <ShareIcon className="size-5" />
        Compartilhar
      </Button>
      {reportNode}
    </div>
  );
}

export function EventPublicInfoCardMobile(props: EventPublicInfoCardProps) {
  const { event, isPreview, mutedPreview, onRegisterClick, live, outerClassName, cardClassName } = props;
  const [shareOpen, setShareOpen] = useState(false);
  const eventUrl = event.slug ? `/events/${event.slug}` : "";
  const mutedBody = mutedPreview ? "pointer-events-none select-none opacity-50" : "";
  // Live: a página é dona do ShareModal; prévia: modal interno (nunca abre pois
  // o botão fica desabilitado, mas mantido para não alterar o comportamento).
  const onShare = live ? live.onShareClick : () => setShareOpen(true);

  return (
    <>
      <div className={cn("px-4", outerClassName)}>
        <div className={cn("relative z-10 mt-10 rounded-2xl px-4 pb-4 pt-6 shadow-[0px_2px_6px_0px_rgba(17,17,17,0.15)]", mutedPreview && "select-none", cardClassName)}>
          <h1 className={cn("mb-4 text-xl font-bold text-gray-12", mutedPreview && "select-text")}>{event.name}</h1>
          <div className={mutedBody}>
            <EventMetaRows event={event} mobile />
            <OrganizerBlock event={event} mobile live={live} />
            {/* Âncora do IntersectionObserver da barra fixa mobile (só live). */}
            {live?.registerAnchorRef && (
              <div ref={live.registerAnchorRef} className="h-px w-full" aria-hidden />
            )}
            <RegistrationCtaBlock
              event={event}
              isPreview={isPreview}
              onRegisterClick={onRegisterClick}
              live={live}
              desktopSpacing={false}
            />
          </div>
        </div>
      </div>
      <div className={mutedBody}>
        <ShareAndReport mobile onShare={onShare} live={live} />
      </div>
      {!live && (
        <ShareModal
          isOpen={shareOpen}
          onClose={() => setShareOpen(false)}
          eventName={event.name}
          eventUrl={eventUrl}
        />
      )}
    </>
  );
}

export function EventPublicInfoCardDesktop(props: EventPublicInfoCardProps) {
  const { event, isPreview, mutedPreview, onRegisterClick, live, outerClassName, cardClassName } = props;
  const [shareOpen, setShareOpen] = useState(false);
  const eventUrl = event.slug ? `/events/${event.slug}` : "";
  // Aspecto "apagado" aplicado a tudo MENOS o título (que fica nítido e selecionável).
  const mutedBody = mutedPreview ? "pointer-events-none select-none opacity-50" : "";
  const onShare = live ? live.onShareClick : () => setShareOpen(true);

  return (
    <div className={cn("w-full", outerClassName)}>
      <div className={cn("h-full overflow-hidden rounded-xl bg-gray-2 p-5 shadow-[0px_2px_6px_0px_rgba(17,17,17,0.15)]", mutedPreview && "select-none", cardClassName)}>
        <h1 className={cn("mb-4 text-lg font-bold", mutedPreview && "select-text text-gray-12")}>{event.name}</h1>
        <div className={mutedBody}>
          <EventMetaRows event={event} />
          <OrganizerBlock event={event} live={live} />
          <RegistrationCtaBlock
            event={event}
            isPreview={isPreview}
            onRegisterClick={onRegisterClick}
            live={live}
            desktopSpacing
          />
        </div>
      </div>
      <div className={mutedBody}>
        <ShareAndReport onShare={onShare} live={live} />
      </div>
      {!live && (
        <ShareModal
          isOpen={shareOpen}
          onClose={() => setShareOpen(false)}
          eventName={event.name}
          eventUrl={eventUrl}
        />
      )}
    </div>
  );
}
