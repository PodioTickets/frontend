"use client";

import CheckoutHeader from "@/components/Checkout/CheckoutHeader";
import { ModalitiesStep } from "@/components/Checkout/ModalitiesStep";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useEvent } from "@/hooks/useEvent";
import { Suspense, useState, useRef } from "react";
import { Loading } from "@/components/Loading";
import { useCheckout } from "@/contexts/CheckoutContext";
import { useCheckoutTimer } from "@/contexts/CheckoutTimerContext";
import { useCheckoutReservation } from "@/hooks/useCheckoutReservation";
import { useTickets } from "@/hooks/useTickets";
import { organizerService } from "@/services";
import { OrderApiError } from "@/interfaces/order";
import toast from "react-hot-toast";

function CheckoutIngressosContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const eventId = searchParams.get("eventId");
  const { event, loading: isLoading } = useEvent(eventId ?? "");
  const { tickets: ticketCatalog } = useTickets(eventId, !!eventId);
  const { raceQuantities } = useCheckout();
  const { startTimer } = useCheckoutTimer();
  const { reserveOrder } = useCheckoutReservation();
  const [reserving, setReserving] = useState(false);
  const reservingRef = useRef(false);

  const handleNext = async () => {
    if (!eventId || reservingRef.current) return;
    reservingRef.current = true;

    // Monta { ticketId, batchId, quantity } — backend exige batchId como UUID.
    // O endpoint de listagem pode não retornar o id do lote; se faltar, busca o ingresso completo.
    const tickets: Array<{
      ticketId: string;
      batchId: string;
      quantity: number;
    }> = [];
    for (const [ticketId, quantity] of Object.entries(raceQuantities)) {
      if (!quantity || quantity <= 0) continue;
      const catalogTicket = ticketCatalog.find((t) => t.id === ticketId);

      let batchId = catalogTicket?.batches?.find((b) => b.id)?.id;

      if (!batchId) {
        // Fallback: busca o ingresso completo para obter o id do lote ativo
        try {
          const fullTicket = await organizerService.getTicketById(ticketId);
          batchId = fullTicket?.batches?.[0]?.id;
        } catch {
          // ignora — vai cair no erro abaixo
        }
      }

      if (!batchId) {
        toast.error("Lote indisponível para um dos ingressos selecionados.");
        reservingRef.current = false;
        return;
      }
      tickets.push({ ticketId, batchId, quantity });
    }

    if (tickets.length === 0) {
      toast.error("Selecione pelo menos um ingresso para continuar.");
      return;
    }

    setReserving(true);
    try {
      const order = await reserveOrder({ eventId, tickets });
      // Fallback quando o timer expirar: volta pro evento.
      const slug = (event as { slug?: string } | null)?.slug;
      const fallbackUrl = slug ? `/events/${slug}` : `/`;
      startTimer(order, fallbackUrl);
      router.push(`/checkout/informacoes?eventId=${eventId}`);
    } catch (err) {
      if (err instanceof OrderApiError) {
        if (err.code === "BATCH_SOLD_OUT") {
          toast.error("Lote esgotado. Escolha outro ingresso.");
        } else if (err.code === "TOO_MANY_PENDING_ORDERS") {
          toast.error(
            "Você já tem reservas em andamento. Finalize uma antes de começar outra.",
          );
        } else if (err.code === "RATE_LIMIT_EXCEEDED") {
          toast.error("Muitas tentativas. Aguarde um minuto e tente de novo.");
        } else {
          toast.error(err.message || "Não foi possível reservar os ingressos.");
        }
      } else {
        toast.error("Não foi possível reservar os ingressos. Tente novamente.");
      }
    } finally {
      reservingRef.current = false;
      setReserving(false);
    }
  };

  if (!eventId) {
    return (
      <div className="w-full max-w-[1280px] mx-auto flex flex-col items-center justify-center min-h-screen gap-4">
        <h1 className="text-2xl font-bold">Evento não especificado</h1>
        <p className="text-gray-11 mb-6">
          Por favor, selecione um evento para continuar com o checkout.
        </p>
        <Link
          href="/"
          className="text-primary-10 hover:text-primary-7 transition-colors"
        >
          Voltar para a página inicial
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return <Loading />;
  }

  if (!event) {
    return (
      <div className="w-full max-w-[1280px] mx-auto flex flex-col items-center justify-center min-h-screen gap-4">
        <h1 className="text-2xl font-bold">Evento não encontrado</h1>
        <p className="text-gray-11 mb-6">
          O evento que você está procurando não existe ou foi removido.
        </p>
        <Link
          href="/"
          className="text-primary-10 hover:text-primary-7 transition-colors"
        >
          Voltar para a página inicial
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full gap-4">
      <CheckoutHeader activeStep={1} />
      <div className="w-full max-w-[1280px] mx-auto flex flex-col min-h-screen items-start justify-start gap-4 py-4 md:py-11 px-4 bg-gray-2 md:bg-transparent">
        <ModalitiesStep event={event} onNext={handleNext} isSubmitting={reserving} />
      </div>
    </div>
  );
}

export default function CheckoutIngressosPage() {
  return (
    <Suspense fallback={<Loading />}>
      <CheckoutIngressosContent />
    </Suspense>
  );
}
