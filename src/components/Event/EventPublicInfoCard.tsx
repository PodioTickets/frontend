"use client";

import Image from "next/image";
import { Phone } from "lucide-react";
import { Button } from "@/components/Button";
import { CalendarIcon } from "@/components/Icons/CalendarIcon";
import { LocationIcon } from "@/components/Icons/LocationIcon";
import { MessageIcon } from "@/components/Icons/MessageIcon";
import { ShareIcon } from "@/components/Icons/ShareIcon";
import { ShareModal } from "@/components/ShareModal";
import type { Event } from "@/interfaces/event";
import { cn } from "@/utils/cn";
import { resolveCheckoutModalityIconSrc } from "@/utils/checkoutModalityDisplay";
import {
  formatBrazilianPhone,
  getEventOrganizer,
  phoneDigitsForTel,
} from "@/utils/organization";
import { useMemo, useState } from "react";

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

function useEventRegistrationUiState(event: Event) {
  return useMemo(() => {
    const registrationOpensAt = event.registrationStartDate
      ? new Date(event.registrationStartDate)
      : null;
    const registrationsNotOpenYet =
      !!registrationOpensAt &&
      !Number.isNaN(registrationOpensAt.getTime()) &&
      Date.now() < registrationOpensAt.getTime();

    const registrationOpensDateText =
      registrationsNotOpenYet && registrationOpensAt
        ? new Intl.DateTimeFormat("pt-BR", {
          day: "numeric",
          month: "long",
          ...(registrationOpensAt.getFullYear() !== new Date().getFullYear()
            ? { year: "numeric" }
            : {}),
        }).format(registrationOpensAt)
        : "";

    const registrationSlotsSoldOut =
      event.hasRegistrationSlotsAvailable === false;

    const eventRealizationAt = event.eventDate
      ? new Date(event.eventDate)
      : null;
    const eventRealizationPassed =
      !!eventRealizationAt &&
      !Number.isNaN(eventRealizationAt.getTime()) &&
      Date.now() >= eventRealizationAt.getTime();

    const registrationEndsAt = event.registrationEndDate
      ? new Date(event.registrationEndDate)
      : null;
    const registrationPeriodEnded =
      !!registrationEndsAt &&
      !Number.isNaN(registrationEndsAt.getTime()) &&
      Date.now() >= registrationEndsAt.getTime();

    const eventSuspendedByOrganizer =
      event.status === "SUSPENDED" || event.isSuspended === true;

    return {
      registrationOpensDateText,
      registrationsNotOpenYet,
      registrationSlotsSoldOut,
      eventRealizationPassed,
      registrationPeriodEnded,
      eventSuspendedByOrganizer,
    };
  }, [event]);
}

function formatDateShort(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date));
}

function formatDateLong(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(date));
}

type EventPublicInfoCardProps = {
  event: Event;
  /** Prévia do organizador: mesmos estados visuais, sem checkout real. */
  isPreview?: boolean;
  onRegisterClick?: (e: React.MouseEvent) => void;
};

function RegistrationCtaBlock({
  event,
  isPreview,
  onRegisterClick,
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
          {desktopSpacing ? "Esgotado!" : "Esgotado"}
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
          Inscrições abrem em {registrationOpensDateText}
        </p>
      </>
    );
  }

  if (isPreview) {
    return (
      <>
        <Button
          className={cn("w-full", mt)}
          disabled
          variant="default"
          type="button"
        >
          Inscreva-se
        </Button>
      </>
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

function ModalitiesList({ event }: { event: Event }) {
  return (
    <>
      {event.modalities
        ?.filter((modality) => modality.isActive)
        .map((modality) => {
          const icon = resolveCheckoutModalityIconSrc(
            modality.template?.icon,
          );
          const label = modality.template?.label;
          if (!icon || !label) return null;
          return (
            <div
              key={modality.id}
              className="flex items-center gap-2 text-sm font-medium text-gray-12"
            >
              <Image
                src={icon}
                alt={label}
                width={20}
                height={20}
                draggable={false}
              />
              <span className="text-sm">{label}</span>
            </div>
          );
        })}
    </>
  );
}

function OrganizerBlock({
  event,
  mobile,
}: {
  event: Event;
  mobile?: boolean;
}) {
  const organizer = getEventOrganizer(event);
  const boxClass = mobile
    ? "mb-4 rounded-lg border border-gray-6 bg-gray-3 p-4"
    : "mt-6 rounded-xl border border-gray-6 bg-gray-3 p-3";

  return (
    <div className={boxClass}>
      <p
        className={cn(
          "mb-3 text-sm font-medium text-gray-11",
          mobile && "text-gray-11",
        )}
      >
        Organizador
      </p>
      {organizer ? (
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <OrganizerAvatar logoUrl={organizer.logoUrl} name={organizer.name} />
            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  "truncate text-sm font-semibold text-gray-12",
                  mobile && "text-gray-12",
                )}
              >
                {organizer.name}
              </p>
              {organizer.phone && (
                <div className="mt-1 flex items-center gap-1.5">
                  <Phone className="size-3.5 shrink-0 text-gray-11" />
                  <a
                    href={`tel:${phoneDigitsForTel(organizer.phone) || organizer.phone.replace(/\D/g, "")}`}
                    className="text-xs text-gray-11 transition-colors hover:text-primary-11"
                  >
                    {formatBrazilianPhone(organizer.phone)}
                  </a>
                </div>
              )}
            </div>
          </div>
          <Button
            variant="outline"
            disabled
            className={cn(
              "w-full border-gray-6 text-gray-12",
              mobile && "bg-gray-1",
            )}
            type="button"
            onClick={() => {
              if (organizer.email) {
                window.location.href = `mailto:${organizer.email}?subject=Contato sobre ${event.name}`;
              }
            }}
          >
            <MessageIcon className="min-h-5 min-w-5" />
            {mobile ? "Falar com o organizador" : "Falar com organizador"}
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
}: {
  mobile?: boolean;
  onShare: () => void;
}) {
  if (mobile) {
    return (
      <div className="mt-8 flex flex-col items-center justify-center gap-2 px-4">
        <Button
          variant="outline"
          type="button"
          disabled
          className="mb-2 w-1/2 border-gray-6 bg-gray-1 text-gray-12"
          onClick={onShare}
        >
          <ShareIcon className="size-5" />
          Compartilhar
        </Button>
        <button
          type="button"
          disabled
          className="w-full text-center text-sm font-semibold text-gray-11 underline cursor-not-allowed"
        >
          Denunciar evento
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <Button
        variant="outline"
        type="button"
        disabled
        className="mt-8 border-gray-6 text-gray-11"
        onClick={onShare}
      >
        <ShareIcon className="size-5" />
        Compartilhar
      </Button>
      <span className="cursor-not-allowed text-sm font-semibold text-gray-11 underline">
        Denunciar evento
      </span>
    </div>
  );
}

export function EventPublicInfoCardMobile(props: EventPublicInfoCardProps) {
  const { event, isPreview, onRegisterClick } = props;
  const [shareOpen, setShareOpen] = useState(false);
  const eventUrl = event.slug ? `/events/${event.slug}` : "";

  return (
    <>
      <div className="px-4">
        <div className="relative z-10 mt-10 rounded-2xl px-4 pb-4 pt-6 shadow-[0_5px_10px_rgba(0,0,0,0.3)]">
          <h1 className="mb-4 text-xl font-bold text-gray-12">{event.name}</h1>
          <div className="mb-4 flex flex-col gap-3">
            <div className="flex items-center gap-2 text-gray-11">
              <LocationIcon className="size-5 text-gray-11" />
              <span className="text-sm">
                {event.location || `${event.city}, ${event.state}`}
              </span>
            </div>
            <div className="flex items-center gap-2 text-gray-11">
              <CalendarIcon className="size-5 text-gray-11" />
              <span className="text-sm">
                {formatDateShort(new Date(event.eventDate))}
              </span>
            </div>
            {event.modalities
              ?.filter((m) => m.isActive)
              .map((modality) => {
                const icon = resolveCheckoutModalityIconSrc(
                  modality.template?.icon,
                );
                const label = modality.template?.label;
                if (!icon || !label) return null;
                return (
                  <div
                    key={modality.id}
                    className="flex items-center gap-2 text-gray-11"
                  >
                    <Image
                      src={icon}
                      alt={label}
                      width={20}
                      height={20}
                      draggable={false}
                    />
                    <span className="text-sm">{label}</span>
                  </div>
                );
              })}
          </div>
          <OrganizerBlock event={event} mobile />
          <RegistrationCtaBlock
            event={event}
            isPreview={isPreview}
            onRegisterClick={onRegisterClick}
            desktopSpacing={false}
          />
        </div>
      </div>
      <ShareAndReport mobile onShare={() => setShareOpen(true)} />
      <ShareModal
        isOpen={shareOpen}
        onClose={() => setShareOpen(false)}
        eventName={event.name}
        eventUrl={eventUrl}
      />
    </>
  );
}

export function EventPublicInfoCardDesktop(props: EventPublicInfoCardProps) {
  const { event, isPreview, onRegisterClick } = props;
  const [shareOpen, setShareOpen] = useState(false);
  const eventUrl = event.slug ? `/events/${event.slug}` : "";

  return (
    <div className="w-full">
      <div className="h-full overflow-hidden rounded-xl bg-gray-2 p-5 shadow-[0_5px_10px_rgba(0,0,0,0.3)]">
        <h1 className="mb-4 text-lg font-bold">{event.name}</h1>
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2 font-medium text-gray-12">
            <LocationIcon className="size-5" />
            <span className="text-sm">
              {event.city}, {event.state}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm font-medium text-gray-12">
            <CalendarIcon className="size-5" />
            <span>{formatDateLong(new Date(event.eventDate))}</span>
          </div>
          <ModalitiesList event={event} />
        </div>
        <OrganizerBlock event={event} />
        <RegistrationCtaBlock
          event={event}
          isPreview={isPreview}
          onRegisterClick={onRegisterClick}
          desktopSpacing
        />
      </div>
      <ShareAndReport onShare={() => setShareOpen(true)} />
      <ShareModal
        isOpen={shareOpen}
        onClose={() => setShareOpen(false)}
        eventName={event.name}
        eventUrl={eventUrl}
      />
    </div>
  );
}
