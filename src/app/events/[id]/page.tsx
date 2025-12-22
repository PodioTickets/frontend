"use client";

import { useParams } from "next/navigation";
import Image from "next/image";
import { CalendarIcon } from "@/components/Icons/CalendarIcon";
import { LocationIcon } from "@/components/Icons/LocationIcon";
import { ArrowLeft, Phone } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/Button";
import { EventMap } from "@/components/EventMap";
import { useEvent } from "@/hooks/useEvent";
import { useEvents } from "@/hooks/useEvents";
import { MessageIcon } from "@/components/Icons/MessageIcon";
import { ShareIcon } from "@/components/Icons/ShareIcon";
import { ShareModal } from "@/components/ShareModal";
import { EventCard } from "@/components/Event/Card";
import { Fragment, useState, useMemo } from "react";

export default function EventPage() {
  const params = useParams();
  const eventId = params.id as string;
  const { event, isLoading } = useEvent(eventId);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({});

  // Buscar eventos do mesmo organizador
  const { events: organizerEvents } = useEvents({ limit: 10 });
  const sameOrganizerEvents = useMemo(() => {
    if (!event?.organizerId) return [];
    return organizerEvents.filter(
      (e) => e.organizerId === event.organizerId && e.id !== event.id
    );
  }, [organizerEvents, event]);

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

  if (!event || isLoading) {
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

  return (
    <>
      {/* Mobile Layout */}
      <div className="md:hidden bg-gray-2 min-h-screen pb-24">
        <div
          className="absolute top-0 left-0 w-full max-h-[300px] h-full blur-sm"
          style={{
            backgroundImage: `url(${event?.bannerUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "top",
            backgroundRepeat: "no-repeat",
          }}
        >
          <div className="absolute bottom-0 left-0 w-full h-[50%] bg-linear-to-b from-transparent to-white" />
        </div>
        {/* Hero Image */}
        <div className="relative w-full h-[174px] md:h-[174px] mt-10 shadow-[0_5px_10px_rgba(0,0,0,0.3)]">
          <Image
            src={event.bannerUrl}
            alt={event.name}
            fill
            className="object-cover"
            priority
          />
        </div>

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
                  const icon = modality.template?.icon;
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
              {event.organizer ? (
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-primary-10/20 flex items-center justify-center shrink-0">
                    <span className="text-primary-11 font-semibold text-sm">
                      {event.organizer.name?.charAt(0).toUpperCase() || "O"}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-12">
                      {event.organizer.name}
                    </p>
                  </div>
                </div>
              ) : null}
              <Button
                variant="outline"
                className="w-full text-gray-12 border-gray-6 bg-gray-1"
                onClick={() => {
                  if (event.organizer?.email) {
                    window.location.href = `mailto:${event.organizer.email}?subject=Contato sobre ${event.name}`;
                  }
                }}
              >
                <MessageIcon className="min-w-5 min-h-5" />
                Falar com o organizador
              </Button>
            </div>

            {/* Action Buttons */}
            <Link href={`/checkout?eventId=${event.id}`} className="block mb-3">
              <Button className="w-full bg-[#5CC870] hover:bg-[#4db860]">
                Inscreva-se
              </Button>
            </Link>
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

        {/* Content Cards */}
        <div className="px-4 space-y-4 mt-4">
          {event.topics?.map((topic, index) => {
            const isExpanded = expandedSections[topic.id] || false;
            const shouldTruncate = topic.content.length > 150;
            const displayContent =
              isExpanded || !shouldTruncate
                ? topic.content
                : topic.content.substring(0, 150) + "...";

            return (
              <Fragment key={topic.id}>
                <div
                  key={topic.id}
                  className={`${index === 0 ? "mb-4" : "my-4"}`}
                >
                  <h2 className="text-lg font-bold text-gray-12 mb-3">
                    {topic.title}
                  </h2>
                  <div className="text-sm text-gray-11 mb-3">
                    <p
                      className={
                        !isExpanded && shouldTruncate ? "line-clamp-3" : ""
                      }
                    >
                      {displayContent}
                    </p>
                  </div>
                  {shouldTruncate && (
                    <Button
                      variant="ghost"
                      onClick={() => toggleSection(topic.id)}
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

          {/* Eventos deste organizador */}
          {sameOrganizerEvents.length > 0 && (
            <div className="border border-gray-6 rounded-lg p-4 mt-6">
              <h2 className="text-base font-bold text-gray-12 mb-4">
                Eventos deste organizador
              </h2>
              <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                {sameOrganizerEvents.map((e) => (
                  <div key={e.id} className="min-w-[280px] shrink-0">
                    <EventCard event={e} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Fixed Bottom Bar */}
        <div className="fixed bottom-0 left-0 right-0 bg-gray-2 border-t border-gray-6 shadow-lg px-4 py-4 z-50 md:hidden">
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

            <Link href={`/checkout?eventId=${event.id}`} className="w-full">
              <Button className="w-full bg-[#5CC870] hover:bg-[#4db860">
                Inscreva-se
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Desktop Layout - Original */}
      <div className="hidden md:block">
        <div
          className="absolute top-0 left-0 w-full max-h-[600px] h-full blur-sm"
          style={{
            backgroundImage: `url(${event?.bannerUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "top",
            backgroundRepeat: "no-repeat",
          }}
        >
          <div className="absolute bottom-0 left-0 w-full h-[50%] bg-linear-to-b from-transparent to-white" />
        </div>

        <section className="flex flex-col min-h-screen items-center max-w-[1280px] mx-auto px-4 lg:px-8 pt-20 relative">
          <div className="w-full z-10 relative h-full max-h-[400px] flex flex-col items-center justify-center mt-0 2xl:mt-14 ">
            <div className="w-full h-full flex items-start justify-center gap-8">
              <Image
                src={event.bannerUrl}
                alt={event.name}
                width={100000}
                height={100000}
                className="w-full h-full object-cover shadow-[0_5px_10px_rgba(0,0,0,0.3)] rounded-xl"
              />

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
                        const icon = modality.template?.icon;
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

                    {event.organizer ? (
                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          <div className="shrink-0 w-10 h-10 rounded-full bg-primary-10/20 flex items-center justify-center">
                            <span className="text-primary-11 font-semibold text-sm">
                              {event.organizer.name?.charAt(0).toUpperCase() ||
                                "O"}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-12 truncate">
                              {event.organizer.name}
                            </p>
                            {event.organizer.phone && (
                              <div className="flex items-center gap-1.5 mt-1">
                                <Phone className="size-3.5 text-gray-11 shrink-0" />
                                <a
                                  href={`tel:${event.organizer.phone}`}
                                  className="text-xs text-gray-11 hover:text-primary-11 transition-colors"
                                >
                                  {event.organizer.phone}
                                </a>
                              </div>
                            )}
                          </div>
                        </div>

                        <Button
                          variant="outline"
                          className="w-full text-gray-12 border-gray-6"
                          onClick={() => {
                            if (event.organizer?.email) {
                              window.location.href = `mailto:${event.organizer.email}?subject=Contato sobre ${event.name}`;
                            }
                          }}
                        >
                          <MessageIcon className="min-w-5 min-h-5" />
                          Falar com organizador
                        </Button>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-11">
                        Informações não disponíveis
                      </p>
                    )}
                  </div>

                  <Link href={`/checkout?eventId=${event.id}`}>
                    <Button className="w-full mt-8">Inscrever-se</Button>
                  </Link>
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

          <div className="w-3/4 self-start pr-8 z-10">
            {event.topics?.map((topic, index) => (
              <Fragment key={topic.id}>
                <div
                  className={`flex flex-col gap-2 ${
                    index === 0 ? "mb-10" : "my-10"
                  }`}
                >
                  <h1 className="text-2xl font-bold text-gray-12">
                    {topic.title}
                  </h1>
                  <p className="text-gray-11 text-sm">{topic.content}</p>
                </div>
                <div className="w-full h-px bg-gray-6" />
              </Fragment>
            ))}

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
        </section>
      </div>

      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        eventName={event.name}
        eventUrl={`/events/${event.id}`}
      />
    </>
  );
}
