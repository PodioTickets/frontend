"use client";

import { useParams } from "next/navigation";
import Image from "next/image";
import { CalendarIcon } from "@/components/Icons/CalendarIcon";
import { LocationIcon } from "@/components/Icons/LocationIcon";
import { ArrowLeft, Mail, Phone, MessageCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/Button";
import { ShopIcon } from "@/components/Icons/ShopIcon";
import { EventMap } from "@/components/EventMap";
import { useEvent } from "@/hooks/useEvent";
import { MessageIcon } from "@/components/Icons/MessageIcon";
import { modalitiesColumns } from "@/constants";
import { ShareIcon } from "@/components/Icons/ShareIcon";
import { ShareModal } from "@/components/ShareModal";
import { useState } from "react";

export default function EventPage() {
  const params = useParams();
  const eventId = params.id as string;
  const { event, isLoading } = useEvent(eventId);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(new Date(date));
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
    <section className="flex flex-col min-h-screen items-center max-w-[1760px] mx-auto p-20 pt-20 relative">
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
      <div className="w-full z-10 relative h-full max-h-[400px] flex flex-col items-center justify-center mt-0 2xl:mt-14">
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
                  <span>{formatDate(new Date(event.eventDate))}</span>
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
                          {event.organizer.name?.charAt(0).toUpperCase() || "O"}
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

      <div className="w-3/4 self-start mt-10 2xl:mt-20 pr-8 z-10">
        <div className="flex flex-col gap-2 p-4 rounded-xl border border-gray-6">
          <h1 className="text-2xl font-bold text-gray-12">
            Detalhes do evento
          </h1>
          <p className="text-gray-11 text-sm">{event.description}</p>
        </div>

        {event.topics?.map((topic) => (
          <div
            key={topic.id}
            className="flex flex-col gap-2 p-4 mt-6 rounded-xl border border-gray-6"
          >
            <h1 className="text-2xl font-bold text-gray-12">{topic.title}</h1>
            <p className="text-gray-11 text-sm">{topic.content}</p>
          </div>
        ))}

        <div className="flex flex-col gap-4 mt-6  p-4 rounded-xl border border-gray-6">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-bold text-gray-12">
              Onde acontecerá o evento
            </h1>
          </div>
          <EventMap city={event.city} state={event.state} title={event.name} />
        </div>
      </div>

      {/* Share Modal */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        eventName={event.name}
        eventUrl={`/events/${event.id}`}
      />
    </section>
  );
}
