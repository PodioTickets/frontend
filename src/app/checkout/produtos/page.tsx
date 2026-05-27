"use client";

import CheckoutHeader from "@/components/Checkout/CheckoutHeader";
import { SubscriptionStep } from "@/components/Checkout/SubscriptionStep";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useEvent } from "@/hooks/useEvent";
import { Suspense, useState, useRef, useTransition, useEffect } from "react";
import { Loading } from "@/components/Loading";
import { useCheckout } from "@/contexts/CheckoutContext";
import { useCheckoutTimer } from "@/contexts/CheckoutTimerContext";
import { useCheckoutReservation } from "@/hooks/useCheckoutReservation";
import { useCheckoutProductStep } from "@/hooks/useCheckoutProductStep";
import { OrderApiError } from "@/interfaces/order";
import toast from "react-hot-toast";
import CheckoutProdutosLoading from "./loading";

function CheckoutProdutosContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const eventId = searchParams.get("eventId");
  const { event, loading: isLoading } = useEvent(eventId ?? "");
  const { participants } = useCheckout();
  const { orderId, syncFromOrder } = useCheckoutTimer();
  const { patchProducts } = useCheckoutReservation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);
  // useTransition mantém o botão pendente durante a transição de rota,
  // evitando o "freeze" entre clique e render da próxima página.
  const [isNavigating, startNavigation] = useTransition();

  // Backstop de auto-skip: se a etapa de Produtos não tem escolha do usuário
  // (navegação direta por URL, ou Informações ainda indefinido ao sair), persiste
  // as variações auto-selecionadas e segue pro pagamento via `replace` — assim a
  // etapa não fica no histórico e o "voltar" do pagamento cai em Informações.
  const { hasSelectableProducts, autoSelectedProducts } = useCheckoutProductStep(eventId);
  const autoSkipRef = useRef(false);

  useEffect(() => {
    if (hasSelectableProducts !== false || autoSkipRef.current) return;
    if (!eventId || !orderId) return;
    autoSkipRef.current = true;
    (async () => {
      try {
        const updated = await patchProducts(orderId, { products: autoSelectedProducts });
        syncFromOrder(updated);
      } catch {
        // Falha ao persistir produtos auto-selecionados: segue pro pagamento
        // mesmo assim — a tela de pagamento revalida o pedido no servidor.
      } finally {
        router.replace(`/checkout/pagamento?eventId=${eventId}`);
      }
    })();
  }, [hasSelectableProducts, autoSelectedProducts, eventId, orderId, patchProducts, syncFromOrder, router]);

  const handleNext = async () => {
    if (!eventId || isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    if (!orderId) {
      toast.error("Sua reserva expirou. Volte para selecionar os ingressos.");
      router.push(`/checkout/ingressos?eventId=${eventId}`);
      return;
    }

    // Agrega as variações de produto escolhidas por cada participante.
    const products: Array<{
      productId: string;
      variationId?: string;
      quantity: number;
      participantEmail: string;
    }> = [];
    participants.forEach((p) => {
      if (!p.productVariations) return;
      Object.entries(p.productVariations).forEach(([productId, variationId]) => {
        if (!variationId) return;
        products.push({ productId, variationId, quantity: 1, participantEmail: p.email });
      });
    });

    setIsSubmitting(true);
    try {
      const updated = await patchProducts(orderId, { products });
      syncFromOrder(updated);
      startNavigation(() => {
        router.push(`/checkout/pagamento?eventId=${eventId}`);
      });
    } catch (err) {
      if (err instanceof OrderApiError) {
        if (err.code === "ORDER_NOT_PENDING" || err.code === "ORDER_NOT_FOUND") {
          toast.error("Sua reserva expirou.");
          router.push(`/checkout/ingressos?eventId=${eventId}`);
          return;
        }
        toast.error(err.message || "Erro ao salvar produtos.");
      } else {
        toast.error("Erro ao salvar produtos.");
      }
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    if (eventId) {
      startNavigation(() => {
        router.push(`/checkout/informacoes?eventId=${eventId}`);
      });
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
    return <CheckoutProdutosLoading />;
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

  // Etapa sem escolha de produto: o efeito de auto-skip acima já redireciona pro
  // pagamento — exibe o loading no lugar da etapa vazia durante a transição.
  if (hasSelectableProducts === false) {
    return <CheckoutProdutosLoading />;
  }

  return (
    <div className="w-full gap-4">
      <CheckoutHeader activeStep={3} />
      <div className="w-full max-w-[1280px] mx-auto flex flex-col min-h-screen items-start justify-start gap-4 py-4 md:py-11 px-4 bg-gray-2 md:bg-transparent">
        <SubscriptionStep event={event} onNext={handleNext} onBack={handleBack} isSubmitting={isSubmitting || isNavigating} />
      </div>
    </div>
  );
}

export default function CheckoutProdutosPage() {
  return (
    <Suspense fallback={<Loading />}>
      <CheckoutProdutosContent />
    </Suspense>
  );
}
