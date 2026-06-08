"use client";

import CheckoutHeader from "@/components/Checkout/CheckoutHeader";
import { ModalitiesStep } from "@/components/Checkout/ModalitiesStep";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useEvent } from "@/hooks/useEvent";
import { Suspense, useState, useRef, useEffect, useTransition } from "react";
import { Loading } from "@/components/Loading";
import { useCheckout } from "@/contexts/CheckoutContext";
import { useCheckoutTimer } from "@/contexts/CheckoutTimerContext";
import { useCheckoutReservation } from "@/hooks/useCheckoutReservation";
import { useTickets } from "@/hooks/useTickets";
import { OrderApiError } from "@/interfaces/order";
import {
  getPendingCoupon,
  getPendingCouponKind,
  normalizeCouponCode,
  readCouponParamEntry,
} from "@/hooks/usePendingCoupon";
import { useVoucherLinkValidation } from "@/hooks/useVoucherLinkValidation";
import { InfoIcon } from "@/components/Icons/InfoIcon";
import { trackMetaPixel } from "@/lib/metaPixel";
import toast from "react-hot-toast";
import CheckoutIngressosLoading from "./loading";

function CheckoutIngressosContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const eventId = searchParams.get("eventId");
  const { event, loading: isLoading } = useEvent(eventId ?? "");
  const { raceQuantities, updateRaceQuantity, bindOrder } = useCheckout();
  const { startTimer, syncFromOrder } = useCheckoutTimer();
  const { reserveOrder, patchCoupon } = useCheckoutReservation();
  const [reserving, setReserving] = useState(false);
  const reservingRef = useRef(false);
  // useTransition marca o botão "Selecionar" como pendente DURANTE o RSC
  // fetch da próxima rota — sem isso, há um "freeze" entre `router.push` e a
  // transição visual. Combinado com loading.tsx, o feedback é instantâneo.
  const [isNavigating, startNavigation] = useTransition();
  const { tickets: availableTickets, loading: ticketsLoading } = useTickets(eventId, !!eventId, false, true);

  /* Voucher vindo por LINK (`?voucher=`): valida cedo pra avisar o usuário
   * AQUI — sem isso, um voucher já utilizado/expirado falha em silêncio no
   * patchCoupon do handleNext e a pessoa só descobre no pagamento (sem o
   * desconto). A URL é a fonte de verdade do código (CouponLinkCapture).
   * Exibido como BANNER persistente (não toast): a pessoa chega pela URL do
   * link, então o aviso precisa estar visível quando ela olhar a tela. */
  const pendingEntry = readCouponParamEntry(searchParams);
  const linkVoucherCode =
    pendingEntry?.kind === "voucher" ? normalizeCouponCode(pendingEntry.code) : null;
  const { data: voucherCheck } = useVoucherLinkValidation(eventId, linkVoucherCode);
  const linkVoucherError =
    linkVoucherCode && voucherCheck && !voucherCheck.usable
      ? voucherCheck.message
      : null;

  // Remove from state any ticket that was deleted by the organizer
  useEffect(() => {
    if (ticketsLoading || availableTickets.length === 0) return;
    const validIds = new Set(availableTickets.map((t) => t.id));
    Object.entries(raceQuantities).forEach(([ticketId, qty]) => {
      if (qty > 0 && !validIds.has(ticketId)) {
        updateRaceQuantity(ticketId, 0);
      }
    });
    // raceQuantities intentionally excluded: effect runs only when tickets load/change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableTickets, ticketsLoading]);

  /* Voltar pra página do evento (origem do checkout) — espelha o botão dos
   * demais steps. Sem slug (carregamento/evento legado), cai pra home. */
  const handleBack = () => {
    const slug = (event as { slug?: string } | null)?.slug;
    startNavigation(() => {
      router.push(slug ? `/events/${slug}` : "/");
    });
  };

  const handleNext = async () => {
    if (!eventId || reservingRef.current) return;
    reservingRef.current = true;

    const validIds = new Set(availableTickets.map((t) => t.id));
    const tickets = Object.entries(raceQuantities)
      .filter(([ticketId, quantity]) => quantity > 0 && validIds.has(ticketId))
      .map(([ticketId, quantity]) => ({ ticketId, quantity }));

    if (tickets.length === 0) {
      toast.error("Selecione pelo menos um ingresso para continuar.");
      // Sem o reset, o guard de reentrância fica preso em `true` e os cliques
      // seguintes viram no-op silencioso (o `finally` abaixo não roda neste retorno).
      reservingRef.current = false;
      return;
    }

    setReserving(true);
    try {
      const order = await reserveOrder({ eventId, tickets });
      // Vincula os participantes a este pedido: se for um pedido NOVO (id
      // diferente do anterior), limpa participantes do pedido passado — evita
      // herdar dados de uma inscrição anterior do mesmo evento.
      bindOrder(order.orderId);
      // Fallback quando o timer expirar: volta pro evento.
      const slug = (event as { slug?: string } | null)?.slug;
      const fallbackUrl = slug ? `/events/${slug}` : `/`;
      startTimer(order, fallbackUrl);

      // Meta Pixel — AddToCart: selecionou ingressos e avançou. Disparamos
      // para usuários logados E deslogados (a reserva já existe neste ponto).
      // Dedup por order garante 1 disparo por pedido (F5 / revisita).
      trackMetaPixel(
        event?.tracking?.metaPixelId,
        "AddToCart",
        {
          content_type: "product",
          content_ids: tickets.map((t) => t.ticketId),
          currency: "BRL",
          value: (order.pricing?.total ?? 0) / 100,
          num_items: tickets.reduce((sum, t) => sum + t.quantity, 0),
        },
        { onceKey: `atc:${order.orderId}` },
      );

      // Aplica cupom/voucher vindo do link (?coupon= / ?voucher=). CUPOM falha em
      // silêncio (decisão de produto: código errado pro evento, expirado, etc. não
      // interrompem). VOUCHER inusável avisa o motivo real (já utilizado/expirado)
      // — é 100% OFF, o usuário PRECISA saber que vai pagar cheio. O fluxo segue.
      // A chave (couponCode vs voucherCode) segue o TIPO capturado do link.
      const pending = getPendingCoupon();
      if (pending) {
        const isVoucher = getPendingCouponKind() === "voucher";
        const payload = isVoucher
          ? { voucherCode: pending }
          : { couponCode: pending };
        try {
          const updated = await patchCoupon(order.orderId, payload);
          syncFromOrder(updated);
          // Rejeição NÃO é exceção: o backend devolve 200 + `couponRejected`
          // (código/motivo) mantendo a order válida. Voucher rejeitado precisa
          // ser audível — é 100% OFF, a pessoa vai pagar cheio sem saber.
          if (isVoucher && updated.couponRejected) {
            toast.error(
              updated.couponRejected.reason || "Não foi possível aplicar o voucher.",
              { duration: 6000 },
            );
          }
        } catch (couponErr) {
          if (isVoucher) {
            toast.error(
              couponErr instanceof OrderApiError
                ? couponErr.message
                : "Não foi possível aplicar o voucher.",
              { duration: 6000 },
            );
          }
          /* cupom: silencioso por design */
        }
        // NÃO limpa o pendente: mantém `?coupon=`/`?voucher=` na URL (via
        // CouponLinkCapture) pra o link persistir ao voltar pro /ingressos e
        // trocar de páginas. A reaplicação é idempotente/guardada.
      }

      startNavigation(() => {
        router.push(`/checkout/informacoes?eventId=${eventId}`);
      });
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

  /* Mantém o skeleton da subpágina enquanto o fetch do evento roda — sem isso
   * o `loading.tsx` some quando o RSC chega mas a page client retorna um
   * spinner curto, expondo só o footer do RootLayout (flash visual). */
  if (isLoading) {
    return <CheckoutIngressosLoading />;
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
        <ModalitiesStep event={event} onNext={handleNext} onBack={handleBack} isSubmitting={reserving || isNavigating} />
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
