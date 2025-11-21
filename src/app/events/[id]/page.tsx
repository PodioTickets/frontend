"use client";

import { useParams } from "next/navigation";
import { useMemo } from "react";
import { mockEvents } from "@/constants/events";
import Image from "next/image";
import { CalendarIcon } from "@/components/Icons/CalendarIcon";
import { LocationIcon } from "@/components/Icons/LocationIcon";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/Button";
import { ShopIcon } from "@/components/Icons/ShopIcon";
import { CardIcon } from "@/components/Icons/CardIcon";
import { modalitiesColumns, ModalityOption } from "@/constants";
import { EventMap } from "@/components/EventMap";

export default function EventPage() {
  const params = useParams();
  const eventId = params.id as string;

  const event = useMemo(() => {
    return mockEvents.find((e) => e.id === eventId);
  }, [eventId]);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(date);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
    }).format(price);
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "inscricoes-abertas":
        return "Inscrições abertas";
      case "inscricoes-encerradas":
        return "Inscrições encerradas";
      case "evento-encerrado":
        return "Evento encerrado";
      default:
        return "Inscrições abertas";
    }
  };

  if (!event) {
    return (
      <section className="flex flex-col min-h-screen items-center max-w-[1760px] mx-auto lg:px-8 py-20">
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
    <section className="flex flex-col min-h-screen items-center max-w-[1760px] mx-auto p-20 pt-20`">
      <div
        className="absolute top-0 left-0 w-full max-h-[500px] h-full blur-sm"
        style={{
          backgroundImage: `url(${event.image})`,
          backgroundSize: "cover",
          backgroundPosition: "top",
          backgroundRepeat: "no-repeat",
        }}
      >
        <div className="absolute bottom-0 left-0 w-full h-[50%] bg-linear-to-b from-transparent to-white" />
      </div>
      <div className="w-full z-10 relative h-full max-h-[400px] flex flex-col items-center justify-center">
        <div className="w-full h-full flex items-start justify-center gap-4">
          <Image
            src={event.image}
            alt={event.title}
            width={100000}
            height={100000}
            className="w-2/3 h-full object-cover shadow-[0_5px_10px_rgba(0,0,0,0.3)] rounded-xl"
          />

          <div className="rounded-xl overflow-hidden bg-gray-2 p-5 shadow-[0_5px_10px_rgba(0,0,0,0.3)] h-full w-1/3">
            <h1 className="text-lg font-bold mb-4">{event.title}</h1>
            <h1 className="flex items-center gap-2 text-gray-12 font-medium">
              <LocationIcon className="size-5" />{" "}
              <span className="text-sm">
                {event.location.city}, {event.location.state}
              </span>
            </h1>
            <h1 className="flex items-center gap-2 text-sm text-gray-12 font-medium mt-4">
              <CalendarIcon className="size-5" />{" "}
              <span>{formatDate(event.date)}</span>
            </h1>

            <Button className="w-full mt-10">
              <ShopIcon className="size-5" />
              Inscrever-se
            </Button>
            <Button
              className="bg-blue-5 text-blue-12 border border-blue-7 hover:bg-blue-6 hover:text-blue-12 rounded-4xl w-full mt-4"
              variant="ghost"
            >
              <CardIcon className="size-5" /> Em ate 4x sem juros
            </Button>
          </div>
        </div>
      </div>

      <div className="w-2/3 self-start mt-10">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold text-gray-12">
            Detalhes do evento
          </h1>
          <p className="text-gray-11 text-sm">{event.description}</p>
        </div>

        <div className="w-full h-px bg-gray-6 my-10" />

        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold text-gray-12">Modalidades</h1>
          <div className="flex flex-wrap gap-2">
            {event.modalities.map((modality) => (
              <div
                key={modality}
                className="bg-gray-2 p-2 rounded-xl flex items-center gap-2"
              >
                <Image
                  src={
                    modalitiesColumns
                      .flat()
                      .find((m: ModalityOption) => m.id === modality)?.icon ||
                    ""
                  }
                  alt={
                    modalitiesColumns
                      .flat()
                      .find((m: ModalityOption) => m.id === modality)?.label ||
                    ""
                  }
                  width={36}
                  height={36}
                  className="mr-2 shrink-0"
                  loading="lazy"
                  decoding="async"
                />

                <span className="text-gray-11 text-normal">
                  {modalitiesColumns
                    .flat()
                    .find((m: ModalityOption) => m.id === modality)?.label ||
                    ""}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-4 mt-10">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-bold text-gray-12">Local no mapa</h1>
            <p className="text-gray-11 text-sm">
              {event.location.city}, {event.location.state}
            </p>
          </div>
          <EventMap
            city={event.location.city}
            state={event.location.state}
            title={event.title}
          />
        </div>

        <div className="w-full h-px bg-gray-6 my-10" />

        <div className="flex flex-col gap-4 mt-10">
          <h1 className="text-2xl font-bold text-gray-12">Percurso</h1>
          <p className="text-gray-11 text-sm">
            🛣️ Percurso de 5 km sobre terreno 100% asfalto, com altimetria leve.
            Largada e chegada acontecem no mesmo ponto (ATI – Parque do Ingá). O
            trajeto será totalmente sinalizado e contará com uma equipe de
            apoio.
          </p>
        </div>

        <div className="w-full h-px bg-gray-6 my-10" />

        <div className="flex flex-col gap-4 mt-10">
          <h1 className="text-2xl font-bold text-gray-12">Premiação</h1>
          <p className="text-gray-11 text-sm">
            🏆 Todos os participantes que concluírem a prova recebem medalha de
            participação.  🏅 Premiação GERAL (Masculino e Feminino | Tempo
            Bruto): 🥇 1º lugar – Troféu + R$ 800,00 🥈 2º lugar – Troféu + R$
            600,00 🥉 3º lugar – Troféu + R$ 500,00 4º lugar – Troféu + R$
            300,00 5º lugar – Troféu + R$ 200,00  🏅 Premiação por Faixas
            Etárias (Masculino e Feminino | Tempo Líquido): Troféus para os 5
            primeiros colocados nas seguintes categorias: 15-19, 20-24, 25-29,
            30-34, 35-39, 40-44, 45-49, 50-54, 55-59, 60-64, 65-69, 70+,
            Categoria Especial ACD. <br /> <br /> ❗ Não haverá dupla premiação.
          </p>
        </div>
      </div>
    </section>
  );
}

