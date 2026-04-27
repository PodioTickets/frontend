"use client";

import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { CalendarIcon } from "@/components/Icons/CalendarIcon";
import { LocationIcon } from "@/components/Icons/LocationIcon";
import { ArrowLeft, Phone, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/Button";
import { EventMap } from "@/components/EventMap";
import { useEventBySlug } from "@/hooks/useEvent";
import { MessageIcon } from "@/components/Icons/MessageIcon";
import { ShareIcon } from "@/components/Icons/ShareIcon";
import { ShareModal } from "@/components/ShareModal";
import { Fragment, useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLoginModal } from "@/stores/modalStore";
import { Loading } from "@/components/Loading";
import {
  formatBrazilianPhone,
  getEventOrganizer,
  phoneDigitsForTel,
} from "@/utils/organization";
import { cn } from "@/utils/cn";
import { resolveCheckoutModalityIconSrc } from "@/utils/checkoutModalityDisplay";
import { getEnabledTopicsSorted } from "@/lib/eventTopicSections";
import { normalizeTopicHtmlAnchorHrefs } from "@/lib/normalizeTopicHtmlLinks";

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
  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({});
  const [showFixedButton, setShowFixedButton] = useState(false);

  // Resetar estado da imagem quando o evento mudar
  useEffect(() => {
    if (event?.id) {
      // Resetar estado de erro quando mudar de evento
      setImageError(false);
    }
  }, [event?.id, event?.bannerUrl]);

  const handleCheckoutClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!event) return;

    if (!isAuthenticated) {
      openLoginModal();
      return;
    }
    router.push(`/checkout/ingressos?eventId=${event.id}`);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(date));
  };

  const formatDateLong = (date: Date) => {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(new Date(date));
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  // Controlar visibilidade do botão fixado ao scrollar
  useEffect(() => {
    const handleScroll = () => {
      // Mostrar botão quando scrollar mais de 200px
      const scrollPosition =
        window.scrollY || document.documentElement.scrollTop;
      setShowFixedButton(scrollPosition > 200);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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

  return (
    <>
      {/* Mobile Layout */}
      <div className="md:hidden bg-gray-2 min-h-screen pb-24">
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
            <div className="relative w-full h-[174px] md:h-[174px] mt-10 z-10 rounded-xl overflow-hidden bg-gray-3">
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
        <div className="px-4">
          <div className="rounded-2xl mt-10 relative z-10 px-4 pt-6 pb-4 shadow-[0_5px_10px_rgba(0,0,0,0.3)]">
            <h1 className="text-xl font-bold text-gray-12 mb-4">
              {event.name}
            </h1>

            <div className="flex flex-col gap-3 mb-4">
              <div className="flex items-center gap-2 text-gray-11">
                <LocationIcon className="size-5 text-gray-11" />
                <span className="text-sm">
                  {event.location || `${event.city}, ${event.state}`}
                </span>
              </div>
              <div className="flex items-center gap-2 text-gray-11">
                <CalendarIcon className="size-5 text-gray-11" />
                <span className="text-sm">
                  {formatDate(new Date(event.eventDate))}
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

            {/* Organizer Section */}
            <div className="bg-gray-3 border border-gray-6 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-11 mb-3">Organizador</p>
              {(() => {
                const organizer = getEventOrganizer(event);
                if (!organizer) return null;

                return (
                  <>
                    <div className="flex items-start gap-3 mb-3">
                      <OrganizerAvatar logoUrl={organizer.logoUrl} name={organizer.name} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-12">
                          {organizer.name}
                        </p>
                        {organizer.phone && (
                          <div className="flex items-center gap-1.5 mt-1">
                            <Phone className="size-3.5 text-gray-11 shrink-0" />
                            <a
                              href={`tel:${phoneDigitsForTel(organizer.phone) || organizer.phone.replace(/\D/g, "")}`}
                              className="text-xs text-gray-11 hover:text-primary-11 transition-colors"
                            >
                              {formatBrazilianPhone(organizer.phone)}
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      className="w-full text-gray-12 border-gray-6 bg-gray-1"
                      onClick={() => {
                        if (organizer.email) {
                          window.location.href = `mailto:${organizer.email}?subject=Contato sobre ${event.name}`;
                        }
                      }}
                    >
                      <MessageIcon className="min-w-5 min-h-5" />
                      Falar com o organizador
                    </Button>
                  </>
                );
              })()}
            </div>

            {/* Action Buttons */}
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

        <div className="px-4 flex flex-col items-center justify-center gap-2 mt-8">
          <Button
            variant="outline"
            className="w-1/2 text-gray-12 border-gray-6 bg-gray-1 mb-2"
            onClick={() => setIsShareModalOpen(true)}
          >
            <ShareIcon className="size-5" />
            Compartilhar
          </Button>
          <button className="text-sm text-gray-11 font-semibold underline w-full text-center">
            Denunciar evento
          </button>
        </div>



        {/* Apenas tópicos habilitados (sem descrição do evento). */}
        <div className="px-4 space-y-4">
          {topicSections.map((section, index) => {
            const isExpanded = expandedSections[section.id] || false;
            const hasHTML = section.content.includes("<");
            const textLength = hasHTML
              ? section.content.replace(/<[^>]*>/g, "").length
              : section.content.length;
            const shouldTruncate = textLength > 150;

            return (
              <Fragment key={section.id}>
                <div
                  className={`${index === 0 ? "mb-4" : "my-4"}`}
                >
                  <h2 className="text-lg font-bold text-gray-12 mb-3">
                    {section.title}
                  </h2>
                  <div
                    className={`topic-rich-html text-sm text-gray-11 mb-3 prose prose-sm max-w-none ${!isExpanded && shouldTruncate ? "line-clamp-3" : ""}`}
                    dangerouslySetInnerHTML={{
                      __html: normalizeTopicHtmlAnchorHrefs(section.content),
                    }}
                  />
                  {shouldTruncate && (
                    <Button
                      variant="ghost"
                      onClick={() => toggleSection(section.id)}
                      className="underline text-gray-11 font-bold px-0"
                    >
                      {isExpanded ? "Mostrar menos" : "Mostrar mais"}
                    </Button>
                  )}
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
            <div className="flex flex-col w-full gap-2">
              <h1 className="text-gray-12 font-extrabold">{event.name}</h1>

              <div className="flex items-center w-full justify-between gap-2 text-gray-11">
                <div className="flex items-center gap-1">
                  <CalendarIcon className="size-5" />
                  <span className="text-sm">
                    {formatDate(new Date(event.eventDate))}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <LocationIcon className="size-5" />
                  <span className="text-sm">
                    {event.location || `${event.city}, ${event.state}`}
                  </span>
                </div>
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
          <div
            className="absolute top-0 left-0 w-full max-h-[600px] h-full blur-sm scale-105"
            style={{
              backgroundImage: `url(${event?.bannerUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "top",
              backgroundRepeat: "no-repeat",
            }}
          >
            <div className="absolute bottom-0 left-0 w-full h-[40%] bg-linear-to-b from-transparent to-white" />
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
                        <h1 className="flex items-center gap-2 text-gray-12 font-medium">
                          <LocationIcon className="size-5" />{" "}
                          <span className="text-sm">
                            {event.city}, {event.state}
                          </span>
                        </h1>
                        <h1 className="flex items-center gap-2 text-sm text-gray-12 font-medium">
                          <CalendarIcon className="size-5" />{" "}
                          <span>{formatDateLong(new Date(event.eventDate))}</span>
                        </h1>
                        {event.modalities
                          ?.filter((modality) => modality.isActive)
                          .map((modality) => {
                            const icon = resolveCheckoutModalityIconSrc(
                              modality.template?.icon,
                            );
                            const label = modality.template?.label;
                            if (!icon || !label) return null;
                            return (
                              <h1
                                key={modality.id}
                                className="flex items-center gap-2 text-sm text-gray-12 font-medium"
                              >
                                <Image
                                  src={icon}
                                  alt={label}
                                  width={20}
                                  height={20}
                                  draggable={false}
                                />
                                <span className="text-sm">{label}</span>
                              </h1>
                            );
                          })}
                      </div>

                      <div className="bg-gray-3 border border-gray-6 rounded-xl p-3 mt-6">
                        <p className="text-sm font-medium text-gray-11 mb-3">
                          Organizador
                        </p>

                        {(() => {
                          const organizer = getEventOrganizer(event);
                          if (!organizer) return null;

                          return (
                            <div className="space-y-3">
                              <div className="flex items-start gap-3">
                                <OrganizerAvatar logoUrl={organizer.logoUrl} name={organizer.name} />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-gray-12 truncate">
                                    {organizer.name}
                                  </p>
                                  {organizer.phone && (
                                    <div className="flex items-center gap-1.5 mt-1">
                                      <Phone className="size-3.5 text-gray-11 shrink-0" />
                                      <a
                                        href={`tel:${phoneDigitsForTel(organizer.phone) || organizer.phone.replace(/\D/g, "")}`}
                                        className="text-xs text-gray-11 hover:text-primary-11 transition-colors"
                                      >
                                        {formatBrazilianPhone(organizer.phone)}
                                      </a>
                                    </div>
                                  )}
                                </div>
                              </div>

                              <Button
                                variant="outline"
                                className="w-full text-gray-12 border-gray-6"
                                onClick={() => {
                                  if (organizer.email) {
                                    window.location.href = `mailto:${organizer.email}?subject=Contato sobre ${event.name}`;
                                  }
                                }}
                              >
                                <MessageIcon className="min-w-5 min-h-5" />
                                Falar com organizador
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
                    <div
                      className="topic-rich-html text-gray-11 text-sm prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{
                        __html: normalizeTopicHtmlAnchorHrefs(section.content),
                      }}
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
                    <h1 className="flex items-center gap-2 text-gray-12 font-medium">
                      <LocationIcon className="size-5" />{" "}
                      <span className="text-sm">
                        {event.city}, {event.state}
                      </span>
                    </h1>
                    <h1 className="flex items-center gap-2 text-sm text-gray-12 font-medium">
                      <CalendarIcon className="size-5" />{" "}
                      <span>{formatDateLong(new Date(event.eventDate))}</span>
                    </h1>
                    {event.modalities
                      ?.filter((modality) => modality.isActive)
                      .map((modality) => {
                        const icon = resolveCheckoutModalityIconSrc(
                          modality.template?.icon,
                        );
                        const label = modality.template?.label;
                        if (!icon || !label) return null;
                        return (
                          <h1
                            key={modality.id}
                            className="flex items-center gap-2 text-sm text-gray-12 font-medium"
                          >
                            <Image
                              src={icon}
                              alt={label}
                              width={20}
                              height={20}
                              draggable={false}
                            />
                            <span className="text-sm">{label}</span>
                          </h1>
                        );
                      })}
                  </div>

                  <div className="bg-gray-3 border border-gray-6 rounded-xl p-3 mt-6">
                    <p className="text-sm font-medium text-gray-11 mb-3">
                      Organizador
                    </p>

                    {(() => {
                      const organizer = getEventOrganizer(event);
                      if (!organizer) return null;

                      return (
                        <div className="space-y-3">
                          <div className="flex items-start gap-3">
                            <OrganizerAvatar logoUrl={organizer.logoUrl} name={organizer.name} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-12 truncate">
                                {organizer.name}
                              </p>
                              {organizer.phone && (
                                <div className="flex items-center gap-1.5 mt-1">
                                  <Phone className="size-3.5 text-gray-11 shrink-0" />
                                  <a
                                    href={`tel:${phoneDigitsForTel(organizer.phone) || organizer.phone.replace(/\D/g, "")}`}
                                    className="text-xs text-gray-11 hover:text-primary-11 transition-colors"
                                  >
                                    {formatBrazilianPhone(organizer.phone)}
                                  </a>
                                </div>
                              )}
                            </div>
                          </div>

                          <Button
                            variant="outline"
                            className="w-full text-gray-12 border-gray-6"
                            onClick={() => {
                              if (organizer.email) {
                                window.location.href = `mailto:${organizer.email}?subject=Contato sobre ${event.name}`;
                              }
                            }}
                          >
                            <MessageIcon className="min-w-5 min-h-5" />
                            Falar com organizador
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
    </>
  );
}
