"use client";

import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { CalendarIcon } from "@/components/Icons/CalendarIcon";
import { LocationIcon } from "@/components/Icons/LocationIcon";
import { ArrowLeft, GlobeIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/Button";
import { EventMap } from "@/components/EventMap";
import { useEventBySlug } from "@/hooks/useEvent";
import { ShareIcon } from "@/components/Icons/ShareIcon";
import { ShareModal } from "@/components/ShareModal";
import { ContactOrganizerModal } from "@/components/Event/ContactOrganizerModal";
import { Fragment, useState, useEffect, useMemo, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLoginModal } from "@/stores/modalStore";
import { Loading } from "@/components/Loading";
import {
  getEventOrganizer,
  getEventOrganizationId,
} from "@/utils/organization";
import { cn } from "@/utils/cn";
import { getEnabledTopicsSorted } from "@/lib/eventTopicSections";
import { normalizeTopicHtmlAnchorHrefs } from "@/lib/normalizeTopicHtmlLinks";
import { TopicRichContent } from "@/components/TopicRichContent";
import { InstagramIcon } from "@/components/Icons/InstagramIcon";
import { FacebookIcon } from "@/components/Icons/FacebookIcon";
import { YoutubeIcon } from "@/components/Icons/YoutubeIcon";
import { TiktokIcon } from "@/components/Icons/TiktokIcon";

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
        "relative shrink-0 size-10 rounded-full overflow-hidden bg-primary-10/20 flex items-center justify-center",
        className
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
        <span className="text-primary-11 font-semibold text-sm">{initial}</span>
      )}
    </div>
  );
}

export default function EventPage() {
  const params = useParams();
  const router = useRouter();
  const eventSlug = params.slug as string;
  const { event, loading: isLoading, error } = useEventBySlug(eventSlug);

  const topicSections = useMemo(() => {
    if (!event) return [];
    return getEnabledTopicsSorted(event);
  }, [event]);
  const { isAuthenticated } = useAuth();
  const { openLoginModal } = useLoginModal();
  const [imageError, setImageError] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [showFixedButton, setShowFixedButton] = useState(false);
  const topButtonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = topButtonRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setShowFixedButton(!entry.isIntersecting),
      { threshold: 0 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [event?.id]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [eventSlug]);

  // Resetar estado da imagem quando o evento mudar
  useEffect(() => {
    if (event?.id) {
      setImageError(false);
    }
  }, [event?.id, event?.bannerUrl]);

  const handleCheckoutClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!event) return;
    router.push(`/checkout/ingressos?eventId=${event.id}`);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(date));
  };

  // Mostrar loading enquanto está carregando (incluindo quando ainda não tem dados)
  if (isLoading || (event === undefined && !error)) {
    return <Loading />;
  }

  // Só mostrar "não encontrado" quando terminou de carregar e realmente não tem evento
  if (!isLoading && !event) {
    return (
      <section className="flex flex-col min-h-screen items-center max-w-[1280px] mx-auto lg:px-8 py-20">
        <div className="flex flex-col items-center justify-center">
          <h1 className="text-2xl font-bold mb-4">Evento não encontrado</h1>
          <p className="text-gray-11 mb-6">
            O evento que você está procurando não existe.
          </p>
          <Link
            href="/"
            className="flex items-center gap-2 text-primary-10 hover:text-primary-7 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para a página inicial
          </Link>
        </div>
      </section>
    );
  }

  if (!event) {
    return null;
  }

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

  const mapsUrl = event.googleMapsLink?.trim() ?? ""

  return (
    <>
      {/* Mobile Layout */}
      <div className="md:hidden bg-gray-2 min-h-screen pb-24 px-4">
        {event.bannerUrl && event.bannerUrl.trim() !== "" && !imageError && (
          <div
            className="absolute top-0 left-0 w-full max-h-[300px] h-full blur-sm"
            style={{
              backgroundImage: `url(${event.bannerUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "top",
              backgroundRepeat: "no-repeat",
            }}
          >
            <div className="absolute bottom-0 left-0 w-full h-[50%] bg-linear-to-b from-transparent to-white" />
          </div>
        )}
        {/* Hero Image */}
        {(() => {
          const hasBannerUrl = event.bannerUrl && event.bannerUrl.trim() !== "";
          const shouldShowImage = hasBannerUrl && !imageError;

          return shouldShowImage ? (
            <div className="relative w-full h-[174px] md:h-[174px] mt-4 z-10 rounded-xl overflow-hidden">
              <Image
                src={event.bannerUrl}
                alt={event.name}
                fill
                className="object-cover rounded-xl border-0"
                style={{ position: 'absolute' }}
                onError={(e) => {
                  setImageError(true);
                }}
                onLoad={() => {
                  setImageError(false);
                }}
                priority
                unoptimized
              />
            </div>
          ) : (
            <div className="relative w-full h-[174px] md:h-[174px] mt-10 rounded-xl overflow-hidden bg-gray-3 flex items-center justify-center">
              <Image
                src="/banners/placeholder.png"
                alt="Placeholder"
                fill
                className="object-cover"
                priority
              />
            </div>
          );
        })()}

        {/* Main Event Card */}
        <div className="">
          <div className="rounded-2xl mt-4 relative z-10 px-4 pt-6 pb-4 shadow-[0_5px_10px_rgba(0,0,0,0.3)]">
            <h1 className="text-xl font-bold text-gray-12 mb-4">
              {event.name}
            </h1>

            <div className="flex flex-col gap-3 mb-4">

              <div className="flex items-center gap-2 text-gray-12">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M13.3335 1.66699V4.16699" stroke="#202020" strokeWidth="1" strokeLinecap="round" />
                  <path d="M6.6665 1.66699V4.16699" stroke="#202020" strokeWidth="1" strokeLinecap="round" />
                  <path d="M2.5 6.91699C2.5 4.70786 4.29086 2.91699 6.5 2.91699H13.5C15.7091 2.91699 17.5 4.70785 17.5 6.91699V14.3337C17.5 16.5428 15.7091 18.3337 13.5 18.3337H6.5C4.29086 18.3337 2.5 16.5428 2.5 14.3337V6.91699Z" stroke="#202020" strokeWidth="1" />
                  <path d="M2.5 7.5H17.5" stroke="#202020" strokeWidth="1" strokeLinecap="round" />
                </svg>

                <span className="text-sm">
                  Acontece em {formatDate(new Date(event.eventDate))}
                </span>
              </div>
              <div className="flex items-center gap-2 text-gray-12">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M6.6665 1.66699V4.16699" stroke="#202020" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M13.3335 1.66699V4.16699" stroke="#202020" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M2.5 6.91699C2.5 4.70786 4.29086 2.91699 6.5 2.91699H13.5C15.7091 2.91699 17.5 4.70785 17.5 6.91699V14.3337C17.5 16.5428 15.7091 18.3337 13.5 18.3337H6.5C4.29086 18.3337 2.5 16.5428 2.5 14.3337V6.91699Z" stroke="#202020" strokeWidth="1" />
                  <path d="M7.5 12.4997L8.83616 13.5686C9.25403 13.9029 9.86103 13.849 10.2134 13.4462L12.5 10.833" stroke="#202020" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M2.5 7.5H17.5" stroke="#202020" stroke-width="1" strokeLinecap="round" />
                </svg>

                <span className="text-sm">
                  Inscrições até {formatDate(new Date(event.registrationEndDate))}
                </span>
              </div>
              <div className="flex items-center gap-2 text-gray-12">
                <LocationIcon className="size-5 text-gray-12 shrink-0" />
                <Link href={mapsUrl} target="_blank" rel="noopener noreferrer" className="text-sm underline">
                  {[`${event.city} - ${event.state}`, event.neighborhood, event.location].filter(Boolean).join(", ")}{event.zipCode && <span className="whitespace-nowrap">, {event.zipCode}</span>}
                </Link>
              </div>
            </div>

            <div className="bg-gray-3 border border-gray-6 rounded-lg p-4 mb-4">
              {(() => {
                const organizer = getEventOrganizer(event);
                if (!organizer) return null;


                const socialLinks = [
                  { url: event.instagram, icon: InstagramIcon },
                  { url: event.facebook, icon: FacebookIcon },
                  { url: event.youtube, icon: YoutubeIcon },
                  { url: event.tiktok, icon: TiktokIcon },
                  { url: event.website, icon: GlobeIcon },
                ]


                return (
                  <>
                    <div className="flex items-center gap-3 mb-3">
                      <OrganizerAvatar logoUrl={organizer.logoUrl} name={organizer.name} />
                      <div className="flex-1 min-w-0 flex flex-col gap-1">
                        <p className="text-sm font-semibold text-gray-12">
                          {organizer.name}
                        </p>
                        <div className="flex items-center gap-1">
                          {socialLinks.map(({ url, icon: Icon }, index) => {
                            if (!url) return null

                            return (
                              <Link
                                key={index}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="border border-gray-6 size-8 rounded-full text-gray-12 flex items-center justify-center"
                              >
                                <Icon className="size-4" />
                              </Link>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      className="w-full text-gray-12 border-gray-6"
                      onClick={() => setIsContactModalOpen(true)}
                    >
                      Falar com o organizador
                    </Button>
                  </>
                );
              })()}
            </div>

            <div ref={topButtonRef} className="h-px w-full" aria-hidden />
            <div>
              {eventRealizationPassed ? (
                <>
                  <Button
                    className="w-full mb-3 bg-gray-4 text-gray-10 border-0 disabled:opacity-100 disabled:cursor-not-allowed"
                    disabled
                    variant="outline"
                  >
                    Evento realizado
                  </Button>
                  <p className="text-sm text-gray-11 text-center mt-2">
                    Este evento já foi realizado.
                  </p>
                </>
              ) : registrationPeriodEnded ? (
                <>
                  <Button className="w-full mb-3 bg-gray-4 text-gray-10 border-0 disabled:opacity-100 disabled:cursor-not-allowed" disabled variant="outline">
                    Inscrições encerradas!
                  </Button>
                  <p className="text-sm text-gray-11 text-center mt-2">
                    O prazo de inscrições para este evento foi encerrado.
                  </p>
                </>
              ) : eventSuspendedByOrganizer ? (
                <>
                  <Button
                    className="w-full mb-3 bg-gray-4 text-gray-10 border-0 disabled:opacity-100 disabled:cursor-not-allowed"
                    disabled
                    variant="outline"
                  >
                    Inscreva-se
                  </Button>
                  <p className="text-sm text-gray-11 text-center mt-2">
                    As inscrições para este evento não estão disponíveis no momento.
                  </p>
                </>
              ) : registrationSlotsSoldOut ? (
                <>
                  <Button
                    className="w-full mb-3 bg-gray-4 text-gray-10 border-0 disabled:opacity-100 disabled:cursor-not-allowed"
                    disabled
                    variant="outline"
                  >
                    Esgotado
                  </Button>
                  <p className="text-sm text-gray-11 text-center mt-2">
                    Este evento não possui mais vagas disponíveis.
                  </p>
                </>
              ) : registrationsNotOpenYet ? (
                <>
                  <Button
                    className="w-full mb-3 bg-gray-4 text-gray-10 border-0 disabled:opacity-100 disabled:cursor-not-allowed"
                    disabled
                    variant="outline"
                  >
                    Em breve!
                  </Button>
                  <p className="text-sm text-gray-11 text-center mt-2">
                    Inscrições abrem em {registrationOpensDateText}
                  </p>
                </>
              ) : (
                <Button onClick={handleCheckoutClick} className="w-full mb-3">
                  Inscreva-se
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="px-4 flex flex-col items-center justify-center gap-2 mt-8">
          <Button
            variant="outline"
            className="w-1/2 text-gray-12 border-gray-6 bg-gray-1 mb-2"
            onClick={() => setIsShareModalOpen(true)}
          >
            <ShareIcon className="size-5" />
            Compartilhar
          </Button>
        </div>



        {/* Apenas tópicos habilitados (sem descrição do evento). */}
        <div className="px-4 space-y-4 mt-10">
          {topicSections.map((section, index) => {
            return (
              <Fragment key={section.id}>
                <div
                  className={`${index === 0 ? "mb-4" : "my-4"}`}
                >
                  <h2 className="text-lg font-bold text-gray-12 mb-3">
                    {section.title}
                  </h2>
                  <TopicRichContent
                    html={normalizeTopicHtmlAnchorHrefs(section.content)}
                    className="topic-rich-html text-sm text-gray-11 mb-3 prose prose-sm max-w-none"
                  />

                </div>
                <div className="w-full h-px bg-gray-6" />
              </Fragment>
            );
          })}

          {/* Regulamento - exibido como tópico quando houver regulationUrl */}
          {event.regulationUrl && (
            <>
              <div className="my-4">
                <h2 className="text-lg font-bold text-gray-12 mb-3">
                  Regulamento
                </h2>
                <a
                  href={event.regulationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary-11 font-medium underline hover:text-primary-10"
                >
                  Acessar regulamento
                </a>
              </div>
              <div className="w-full h-px bg-gray-6" />
            </>
          )}

          {/* Onde acontecerá o evento */}
          <div className="my-4">
            <h2 className="text-base font-bold text-gray-12 mb-3">
              Onde acontecerá o evento
            </h2>
            <div className="rounded-lg overflow-hidden mb-3">
              <EventMap
                city={event.city}
                state={event.state}
                title={event.name}
              />
            </div>
            <Button
              variant="ghost"
              className="underline text-gray-11 font-bold px-0"
            >
              Ver no mapa
            </Button>
          </div>

          {/* Strava */}
          {event.stravaRouteId && (
            <div className="border border-gray-6 rounded-lg p-4">
              <h2 className="text-base font-bold text-gray-12 mb-3">Strava</h2>
              <div className="w-full h-[300px] rounded-lg overflow-hidden border border-gray-6 mb-3">
                <iframe
                  height="100%"
                  width="100%"
                  frameBorder="0"
                  scrolling="no"
                  src={`https://www.strava.com/routes/${event.stravaRouteId}/embed`}
                  title={`Rota do ${event.name} no Strava`}
                  className="w-full h-full"
                  allowFullScreen
                />
              </div>
            </div>
          )}
        </div>

        <div
          className={`fixed bottom-0 left-0 right-0 bg-gray-2 border-t border-gray-6 shadow-lg px-4 py-4 z-50 md:hidden transition-all duration-300 ease-in-out ${showFixedButton
            ? "translate-y-0 opacity-100"
            : "translate-y-full opacity-0 pointer-events-none"
            }`}
        >
          <div className="flex flex-col gap-4 max-w-[1280px] mx-auto">
            <h1 className="font-semibold font-family-manrope truncate">{event.name}</h1>
            <div className="flex w-full justify-between gap-1">
              <div className="flex items-center gap-1 text-gray-12">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
                  <path d="M13.3335 1.66699V4.16699" stroke="#202020" strokeWidth="1" strokeLinecap="round" />
                  <path d="M6.6665 1.66699V4.16699" stroke="#202020" strokeWidth="1" strokeLinecap="round" />
                  <path d="M2.5 6.91699C2.5 4.70786 4.29086 2.91699 6.5 2.91699H13.5C15.7091 2.91699 17.5 4.70785 17.5 6.91699V14.3337C17.5 16.5428 15.7091 18.3337 13.5 18.3337H6.5C4.29086 18.3337 2.5 16.5428 2.5 14.3337V6.91699Z" stroke="#202020" strokeWidth="1" />
                  <path d="M2.5 7.5H17.5" stroke="#202020" strokeWidth="1" strokeLinecap="round" />
                </svg>
                <span className="text-xs">Acontece em {formatDate(new Date(event.eventDate))}</span>
              </div>
              <div className="flex items-center gap-1 text-gray-12">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
                  <path d="M6.6665 1.66699V4.16699" stroke="#202020" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M13.3335 1.66699V4.16699" stroke="#202020" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M2.5 6.91699C2.5 4.70786 4.29086 2.91699 6.5 2.91699H13.5C15.7091 2.91699 17.5 4.70785 17.5 6.91699V14.3337C17.5 16.5428 15.7091 18.3337 13.5 18.3337H6.5C4.29086 18.3337 2.5 16.5428 2.5 14.3337V6.91699Z" stroke="#202020" strokeWidth="1" />
                  <path d="M7.5 12.4997L8.83616 13.5686C9.25403 13.9029 9.86103 13.849 10.2134 13.4462L12.5 10.833" stroke="#202020" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M2.5 7.5H17.5" stroke="#202020" strokeWidth="1" strokeLinecap="round" />
                </svg>
                <span className="text-xs">Inscrições até {formatDate(new Date(event.registrationEndDate))}</span>
              </div>
            </div>

            {eventRealizationPassed ? (
              <>
                <Button
                  className="w-full bg-gray-4 text-gray-10 border-0 disabled:opacity-100 disabled:cursor-not-allowed"
                  disabled
                  variant="outline"
                >
                  Evento realizado
                </Button>
                <p className="text-sm text-gray-11 text-center mt-2">
                  Este evento já foi realizado.
                </p>
              </>
            ) : registrationPeriodEnded ? (
              <>
                <Button className="w-full bg-gray-4 text-gray-10 border-0 disabled:opacity-100 disabled:cursor-not-allowed" disabled variant="outline">
                  Inscrições encerradas!
                </Button>
                <p className="text-sm text-gray-11 text-center mt-2">
                  O prazo de inscrições para este evento foi encerrado.
                </p>
              </>
            ) : eventSuspendedByOrganizer ? (
              <>
                <Button
                  className="w-full bg-gray-4 text-gray-10 border-0 disabled:opacity-100 disabled:cursor-not-allowed"
                  disabled
                  variant="outline"
                >
                  Inscreva-se
                </Button>
                <p className="text-sm text-gray-11 text-center mt-2">
                  As inscrições para este evento não estão disponíveis no momento.
                </p>
              </>
            ) : registrationSlotsSoldOut ? (
              <>
                <Button
                  className="w-full bg-gray-4 text-gray-10 border-0 disabled:opacity-100 disabled:cursor-not-allowed"
                  disabled
                  variant="outline"
                >
                  Esgotado
                </Button>
                <p className="text-sm text-gray-11 text-center mt-2">
                  Este evento não possui mais vagas disponíveis.
                </p>
              </>
            ) : registrationsNotOpenYet ? (
              <>
                <Button
                  className="w-full bg-gray-4 text-gray-10 border-0 disabled:opacity-100 disabled:cursor-not-allowed"
                  disabled
                  variant="outline"
                >
                  Em breve!
                </Button>
                <p className="text-sm text-gray-11 text-center mt-2">
                  Inscrições abrem em {registrationOpensDateText}
                </p>
              </>
            ) : (
              <Button onClick={handleCheckoutClick} className="w-full">
                Inscreva-se
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Desktop Layout - Original */}
      <div className="hidden md:block">
        {event.bannerUrl && event.bannerUrl.trim() !== "" && !imageError && (
          <div className="absolute top-0 left-0 w-full max-h-[600px] h-full overflow-hidden">
            <div
              className="w-full h-full blur-sm scale-105"
              style={{
                backgroundImage: `url(${event?.bannerUrl})`,
                backgroundSize: "cover",
                backgroundPosition: "top",
                backgroundRepeat: "no-repeat",
              }}
            />
            <div className="absolute bottom-0 left-0 w-full h-[40%] bg-linear-to-b from-transparent to-gray-2" />
          </div>
        )}

        <section className="flex flex-col min-h-screen items-center max-w-[1280px] mx-auto px-4 lg:px-8 pt-20 relative">
          {/* Banner Image Section - Only when image exists */}
          {(() => {
            const hasBannerUrl = event.bannerUrl && event.bannerUrl.trim() !== "";
            const shouldShowImage = hasBannerUrl && !imageError;

            if (!shouldShowImage) {
              return null;
            }

            return (
              <div className="w-full z-10 relative flex flex-col items-center justify-center mt-0 2xl:mt-14">
                <div className="w-full flex items-start justify-center gap-8">
                  <div className="relative w-full h-[400px]">
                    <Image
                      src={event.bannerUrl}
                      alt={event.name}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 75vw, 66vw"
                      style={{ position: 'absolute' }}
                      onError={(e) => {
                        setImageError(true);
                      }}
                      onLoad={() => {
                        setImageError(false);
                      }}
                      className="object-cover rounded-xl"
                      priority
                      unoptimized
                    />
                  </div>

                  <div className="min-w-1/4 w-1/4">
                    <div className="rounded-xl overflow-hidden bg-gray-2 p-5 shadow-[0_5px_10px_rgba(0,0,0,0.3)] h-full">
                      <h1 className="text-lg font-bold mb-4">{event.name}</h1>
                      <div className="flex flex-col gap-4">
                        <h1 className="flex items-center gap-2 text-sm text-gray-12 font-medium">
                          <CalendarIcon className="size-5" />{" "}
                          <span>Acontece em {formatDate(new Date(event.eventDate))}</span>
                        </h1>
                        {event.registrationEndDate && (
                          <div className="flex items-center gap-2 text-sm text-gray-12 font-medium">
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
                              <path d="M6.6665 1.66699V4.16699" stroke="#202020" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
                              <path d="M13.3335 1.66699V4.16699" stroke="#202020" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
                              <path d="M2.5 6.91699C2.5 4.70786 4.29086 2.91699 6.5 2.91699H13.5C15.7091 2.91699 17.5 4.70785 17.5 6.91699V14.3337C17.5 16.5428 15.7091 18.3337 13.5 18.3337H6.5C4.29086 18.3337 2.5 16.5428 2.5 14.3337V6.91699Z" stroke="#202020" strokeWidth="1" />
                              <path d="M7.5 12.4997L8.83616 13.5686C9.25403 13.9029 9.86103 13.849 10.2134 13.4462L12.5 10.833" stroke="#202020" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
                              <path d="M2.5 7.5H17.5" stroke="#202020" strokeWidth="1" strokeLinecap="round" />
                            </svg>
                            <span>Inscrições até {formatDate(new Date(event.registrationEndDate))}</span>
                          </div>
                        )}
                        <h1 className="flex items-center gap-2 text-gray-12 font-medium">
                          <LocationIcon className="size-5 shrink-0" />{" "}
                          <Link href={mapsUrl} target="_blank" rel="noopener noreferrer" className="text-sm underline">
                            {[`${event.city} - ${event.state}`, event.neighborhood, event.location].filter(Boolean).join(", ")}{event.zipCode && <span className="whitespace-nowrap">, {event.zipCode}</span>}
                          </Link>
                        </h1>
                      </div>

                      <div className="bg-gray-3 border border-gray-6 rounded-xl p-3 mt-6">
                        <p className="text-sm font-medium text-gray-11 mb-3">
                          Organizador
                        </p>

                        {(() => {
                          const organizer = getEventOrganizer(event);
                          if (!organizer) return null;

                          const socialLinks = [
                            { url: event.instagram, icon: InstagramIcon },
                            { url: event.facebook, icon: FacebookIcon },
                            { url: event.youtube, icon: YoutubeIcon },
                            { url: event.tiktok, icon: TiktokIcon },
                            { url: event.website, icon: GlobeIcon },
                          ]


                          return (
                            <div className="space-y-3">
                              <div className="flex items-center gap-3">
                                <OrganizerAvatar logoUrl={organizer.logoUrl} name={organizer.name} />
                                <div className="flex-1 min-w-0 flex flex-col gap-1">
                                  <p className="text-sm font-semibold text-gray-12 truncate">
                                    {organizer.name}
                                  </p>
                                  <div className="flex items-center gap-1">
                                    {socialLinks.map(({ url, icon: Icon }, index) => {
                                      if (!url) return null

                                      return (
                                        <Link
                                          key={index}
                                          href={url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="border border-gray-6 size-8 rounded-full text-gray-12 flex items-center justify-center"
                                        >
                                          <Icon className="size-4" />
                                        </Link>
                                      )
                                    })}
                                  </div>
                                </div>
                              </div>

                              <Button
                                variant="outline"
                                className="w-full text-gray-12 border-gray-6"
                                onClick={() => setIsContactModalOpen(true)}
                              >
                                Falar com o organizador
                              </Button>
                            </div>
                          );
                        })()}
                        {!getEventOrganizer(event) && (
                          <p className="text-xs text-gray-11">
                            Informações não disponíveis
                          </p>
                        )}
                      </div>

                      {eventRealizationPassed ? (
                        <>
                          <Button
                            className="w-full mt-8 bg-gray-4 text-gray-10 border-0 disabled:opacity-100 disabled:cursor-not-allowed"
                            disabled
                            variant="outline"
                          >
                            Evento realizado
                          </Button>
                          <p className="text-sm text-gray-11 text-center mt-2">
                            Este evento já foi realizado.
                          </p>
                        </>
                      ) : registrationPeriodEnded ? (
                        <>
                          <Button className="w-full mt-8 bg-gray-4 text-gray-10 border-0 disabled:opacity-100 disabled:cursor-not-allowed" disabled variant="outline">
                            Inscrições encerradas!
                          </Button>
                          <p className="text-sm text-gray-11 text-center mt-2">
                            O prazo de inscrições para este evento foi encerrado.
                          </p>
                        </>
                      ) : eventSuspendedByOrganizer ? (
                        <>
                          <Button
                            className="w-full mt-8 bg-gray-4 text-gray-10 border-0 disabled:opacity-100 disabled:cursor-not-allowed"
                            disabled
                            variant="outline"
                          >
                            Inscreva-se
                          </Button>
                          <p className="text-sm text-gray-11 text-center mt-2">
                            As inscrições para este evento não estão disponíveis no momento.
                          </p>
                        </>
                      ) : registrationSlotsSoldOut ? (
                        <>
                          <Button
                            className="w-full mt-8 bg-gray-4 text-gray-10 border-0 disabled:opacity-100 disabled:cursor-not-allowed"
                            disabled
                            variant="outline"
                          >
                            Esgotado!
                          </Button>
                          <p className="text-sm text-gray-11 text-center mt-2">
                            Este evento não possui mais vagas disponíveis.
                          </p>
                        </>
                      ) : registrationsNotOpenYet ? (
                        <>
                          <Button
                            className="w-full mt-8 bg-gray-4 text-gray-10 border-0 disabled:opacity-100 disabled:cursor-not-allowed"
                            disabled
                            variant="outline"
                          >
                            Em breve!
                          </Button>
                          <p className="text-sm text-gray-11 text-center mt-2">
                            Inscrições abrem em {registrationOpensDateText}
                          </p>
                        </>
                      ) : (
                        <Button onClick={handleCheckoutClick} className="w-full mt-8">
                          Inscreva-se
                        </Button>
                      )}
                    </div>
                    <div className="flex flex-col items-center justify-center gap-4">
                      <Button
                        variant="outline"
                        className="mt-8 text-gray-11 border-gray-6"
                        onClick={() => setIsShareModalOpen(true)}
                      >
                        <ShareIcon className="size-5" />
                        Compartilhar
                      </Button>

                      <h1 className="underline font-semibold text-gray-11 text-sm cursor-pointer">
                        Denunciar evento
                      </h1>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Content Layout - Different when no image */}
          <div
            className={`w-full z-10 flex items-start gap-8 ${event.bannerUrl && event.bannerUrl.trim() !== "" && !imageError ? "mt-0 2xl:mt-0" : "mt-0 2xl:mt-14"
              }`}
          >
            {/* Topics Section */}
            <div
              className={`${event.bannerUrl && event.bannerUrl.trim() !== "" && !imageError ? "-mt-14 w-3/4 pr-8" : "flex-1 pr-8"
                }`}
            >
              {topicSections.map((section, index) => (
                <Fragment key={section.id}>
                  <div
                    className={`flex flex-col gap-2 ${index === 0 ? "mb-10" : "my-10"}`}
                  >
                    <h1 className="text-2xl font-bold text-gray-12">
                      {section.title}
                    </h1>
                    <TopicRichContent
                      html={normalizeTopicHtmlAnchorHrefs(section.content)}
                      className="topic-rich-html text-gray-11 text-sm prose prose-sm max-w-none"
                    />
                  </div>
                  <div className="w-full h-px bg-gray-6" />
                </Fragment>
              ))}

              {/* Regulamento - exibido como tópico quando houver regulationUrl */}
              {event.regulationUrl && (
                <>
                  <div className="flex flex-col gap-6 my-10">
                    <h1 className="text-2xl font-bold text-gray-12">
                      Regulamento
                    </h1>
                    <a
                      href={event.regulationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary-11 font-medium underline hover:text-primary-10"
                    >
                      <Button variant="outline" className="text-gray-12 border-gray-6">
                        Ler regulamento
                      </Button>
                    </a>
                  </div>
                  <div className="w-full h-px bg-gray-6" />
                </>
              )}

              <div className="flex flex-col gap-4 my-10">
                <div className="flex flex-col gap-2">
                  <h1 className="text-2xl font-bold text-gray-12">
                    Onde acontecerá o evento
                  </h1>
                </div>
                <EventMap
                  city={event.city}
                  state={event.state}
                  title={event.name}
                />
              </div>

              {event.stravaRouteId && (
                <>
                  <div className="w-full h-px bg-gray-6" />
                  <div className="flex flex-col gap-4 mt-10">
                    <div className="flex flex-col gap-2">
                      <h1 className="text-2xl font-bold text-gray-12">
                        Rota no Strava
                      </h1>
                    </div>
                    <div className="w-full h-[400px] rounded-xl overflow-hidden border border-gray-6 shadow-lg relative bg-gray-2">
                      <iframe
                        height="100%"
                        width="100%"
                        frameBorder="0"
                        scrolling="no"
                        src={`https://www.strava.com/routes/${event.stravaRouteId}/embed`}
                        title={`Rota do ${event.name} no Strava`}
                        className="w-full h-full"
                        allowFullScreen
                      />
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Info Card Section - Only shown when no image */}
            {(!event.bannerUrl || event.bannerUrl.trim() === "" || imageError) && (
              <div className="min-w-1/4 w-1/4 shrink-0">
                <div className="rounded-xl overflow-hidden bg-gray-2 p-5 shadow-[0_5px_10px_rgba(0,0,0,0.3)] sticky top-24">
                  <h1 className="text-lg font-bold mb-4">{event.name}</h1>
                  <div className="flex flex-col gap-4">
                    <h1 className="flex items-center gap-2 text-sm text-gray-12 font-medium">
                      <CalendarIcon className="size-5" />{" "}
                      <span>Acontece em {formatDate(new Date(event.eventDate))}</span>
                    </h1>
                    {event.registrationEndDate && (
                      <div className="flex items-center gap-2 text-sm text-gray-12 font-medium">
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
                          <path d="M6.6665 1.66699V4.16699" stroke="#202020" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M13.3335 1.66699V4.16699" stroke="#202020" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M2.5 6.91699C2.5 4.70786 4.29086 2.91699 6.5 2.91699H13.5C15.7091 2.91699 17.5 4.70785 17.5 6.91699V14.3337C17.5 16.5428 15.7091 18.3337 13.5 18.3337H6.5C4.29086 18.3337 2.5 16.5428 2.5 14.3337V6.91699Z" stroke="#202020" strokeWidth="1" />
                          <path d="M7.5 12.4997L8.83616 13.5686C9.25403 13.9029 9.86103 13.849 10.2134 13.4462L12.5 10.833" stroke="#202020" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M2.5 7.5H17.5" stroke="#202020" strokeWidth="1" strokeLinecap="round" />
                        </svg>
                        <span>Inscrições até {formatDate(new Date(event.registrationEndDate))}</span>
                      </div>
                    )}
                    <h1 className="flex items-center gap-2 text-gray-12 font-medium">
                      <LocationIcon className="size-5 shrink-0" />{" "}
                      <Link href={mapsUrl} target="_blank" rel="noopener noreferrer" className="text-sm underline">
                        {[`${event.city} - ${event.state}`, event.neighborhood, event.location].filter(Boolean).join(", ")}{event.zipCode && <span className="whitespace-nowrap">, {event.zipCode}</span>}
                      </Link>
                    </h1>
                  </div>

                  <div className="bg-gray-3 border border-gray-6 rounded-xl p-3 mt-6">
                    <p className="text-sm font-medium text-gray-11 mb-3">
                      Organizador
                    </p>

                    {(() => {
                      const organizer = getEventOrganizer(event);
                      if (!organizer) return null;

                      const socialLinks = [
                        { url: event.instagram, icon: InstagramIcon },
                        { url: event.facebook, icon: FacebookIcon },
                        { url: event.youtube, icon: YoutubeIcon },
                        { url: event.tiktok, icon: TiktokIcon },
                        { url: event.website, icon: GlobeIcon },
                      ];

                      return (
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <OrganizerAvatar logoUrl={organizer.logoUrl} name={organizer.name} />
                            <div className="flex-1 min-w-0 flex flex-col gap-1">
                              <p className="text-sm font-semibold text-gray-12 truncate">
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
                                      className="border border-gray-6 size-8 rounded-full text-gray-12 flex items-center justify-center"
                                    >
                                      <Icon className="size-4" />
                                    </Link>
                                  );
                                })}
                              </div>
                            </div>
                          </div>

                          <Button
                            variant="outline"
                            className="w-full text-gray-12 border-gray-6"
                            onClick={() => setIsContactModalOpen(true)}
                          >
                            Falar com o organizador
                          </Button>
                        </div>
                      );
                    })()}
                  </div>

                  {eventRealizationPassed ? (
                    <>
                      <Button
                        className="w-full mt-8 bg-gray-4 text-gray-10 border-0 disabled:opacity-100 disabled:cursor-not-allowed"
                        disabled
                        variant="outline"
                      >
                        Evento realizado
                      </Button>
                      <p className="text-sm text-gray-11 text-center mt-2">
                        Este evento já foi realizado.
                      </p>
                    </>
                  ) : registrationPeriodEnded ? (
                    <>
                      <Button className="w-full mt-8 bg-gray-4 text-gray-10 border-0 disabled:opacity-100 disabled:cursor-not-allowed" disabled variant="outline">
                        Inscrições encerradas!
                      </Button>
                      <p className="text-sm text-gray-11 text-center mt-2">
                        O prazo de inscrições para este evento foi encerrado.
                      </p>
                    </>
                  ) : eventSuspendedByOrganizer ? (
                    <>
                      <Button
                        className="w-full mt-8 bg-gray-4 text-gray-10 border-0 disabled:opacity-100 disabled:cursor-not-allowed"
                        disabled
                        variant="outline"
                      >
                        Inscreva-se
                      </Button>
                      <p className="text-sm text-gray-11 text-center mt-2">
                        As inscrições para este evento não estão disponíveis no momento.
                      </p>
                    </>
                  ) : registrationSlotsSoldOut ? (
                    <>
                      <Button
                        className="w-full mt-8 bg-gray-4 text-gray-10 border-0 disabled:opacity-100 disabled:cursor-not-allowed"
                        disabled
                        variant="outline"
                      >
                        Esgotado
                      </Button>
                      <p className="text-sm text-gray-11 text-center mt-2">
                        Este evento não possui mais vagas disponíveis.
                      </p>
                    </>
                  ) : registrationsNotOpenYet ? (
                    <>
                      <Button
                        className="w-full mt-8 bg-gray-4 text-gray-10 border-0 disabled:opacity-100 disabled:cursor-not-allowed"
                        disabled
                        variant="outline"
                      >
                        Em breve!
                      </Button>
                      <p className="text-sm text-gray-11 text-center mt-2">
                        Inscrições abrem em {registrationOpensDateText}
                      </p>
                    </>
                  ) : (
                    <Button onClick={handleCheckoutClick} className="w-full mt-8">
                      Inscreva-se
                    </Button>
                  )}
                </div>
                <div className="flex flex-col items-center justify-center gap-4">
                  <Button
                    variant="outline"
                    className="mt-8 text-gray-11 border-gray-6"
                    onClick={() => setIsShareModalOpen(true)}
                  >
                    <ShareIcon className="size-5" />
                    Compartilhar
                  </Button>

                  <h1 className="underline font-semibold text-gray-11 text-sm cursor-pointer">
                    Denunciar evento
                  </h1>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        eventName={event.name}
        eventUrl={`/events/${event.slug}`}
      />
      <ContactOrganizerModal
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
        organizerEmail={getEventOrganizer(event)?.email ?? ""}
        eventName={event.name}
        organizationId={getEventOrganizationId(event) ?? undefined}
        eventId={event.id}
      />
    </>
  );
}
