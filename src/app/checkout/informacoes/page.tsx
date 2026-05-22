"use client";

import CheckoutHeader from "@/components/Checkout/CheckoutHeader";
import { InformationStep } from "@/components/Checkout/InformationStep";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useEvent } from "@/hooks/useEvent";
import { Suspense, useState, useRef, useTransition } from "react";
import { Loading } from "@/components/Loading";
import { useCheckout } from "@/contexts/CheckoutContext";
import { useCheckoutTimer } from "@/contexts/CheckoutTimerContext";
import { useCheckoutReservation } from "@/hooks/useCheckoutReservation";
import { OrderApiError } from "@/interfaces/order";
import { isBrazilianCountry } from "@/validators/Auth.validator";
import toast from "react-hot-toast";
import CheckoutInformacoesLoading from "./loading";

function mapGender(value?: string) {
  if (!value) return undefined;
  const v = value.toLowerCase();
  if (v.startsWith("m")) return "MALE" as const;
  if (v.startsWith("f")) return "FEMALE" as const;
  if (v.includes("prefere") || v.includes("prefer")) return "PREFER_NOT_TO_SAY" as const;
  return "OTHER" as const;
}

function CheckoutInformacoesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const eventId = searchParams.get("eventId");
  const { event, loading: isLoading } = useEvent(eventId ?? "");
  const { participants, raceQuantities } = useCheckout();
  const { orderId, syncFromOrder } = useCheckoutTimer();
  const { patchParticipants } = useCheckoutReservation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);
  // useTransition mantém o botão pendente durante a transição de rota,
  // evitando o "freeze" entre clique e render da próxima página.
  const [isNavigating, startNavigation] = useTransition();

  const handleNext = async () => {
    if (!eventId || isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    if (!orderId) {
      toast.error("Sua reserva expirou. Volte para selecionar os ingressos.");
      router.push(`/checkout/ingressos?eventId=${eventId}`);
      return;
    }

    const totalParticipantsNeeded = Object.values(raceQuantities).reduce(
      (sum, q) => sum + (q > 0 ? q : 0),
      0
    );
    const activeParticipants = participants.slice(0, totalParticipantsNeeded);

    const payload = {
      participants: activeParticipants.map((p) => {
        const participantIsBr = isBrazilianCountry(p.nationality);
        /* Brasileiros: strip de máscara (CPF clean). Estrangeiros: documento
         * cru — passaporte/RNE pode ter letras que não podem ser removidas.
         * Backend usa documentType pra normalizar corretamente
         * (cleanDocumentNumber preserva letras pra PASSPORT). */
        const documentNumber = participantIsBr
          ? (p.cpf || "").replace(/\D/g, "")
          : (p.cpf || "").trim();
        const mapped: {
          name: string;
          documentType: "CPF" | "PASSPORT";
          documentNumber: string;
          email: string;
          birthDate: string;
          phone: string;
          gender?: "MALE" | "FEMALE" | "OTHER" | "PREFER_NOT_TO_SAY";
          emergencyContactName?: string;
          emergencyPhone?: string;
          hasEmergencyContact?: boolean;
          questionAnswers?: Array<{
            questionId: string;
            answer: string | boolean | number;
          }>;
        } = {
          name: p.name,
          documentType: participantIsBr ? "CPF" : "PASSPORT",
          documentNumber,
          email: p.email,
          birthDate: p.birthDate,
          phone: p.phone?.replace(/\D/g, "") || "",
        };
        const gender = mapGender(p.gender);
        if (gender) mapped.gender = gender;
        if (p.emergencyContactName?.trim())
          mapped.emergencyContactName = p.emergencyContactName.trim();
        if (p.emergencyPhone?.trim())
          mapped.emergencyPhone = p.emergencyPhone.replace(/\D/g, "");
        if (p.hasEmergencyContact) mapped.hasEmergencyContact = true;
        if (p.questionAnswers && Object.keys(p.questionAnswers).length > 0) {
          mapped.questionAnswers = Object.entries(p.questionAnswers).map(
            ([questionId, answer]) => ({
              questionId,
              answer: Array.isArray(answer)
                ? JSON.stringify(answer)
                : (answer as string | boolean | number),
            }),
          );
        }
        return mapped;
      }),
    };

    setIsSubmitting(true);
    try {
      const updated = await patchParticipants(orderId, payload);
      syncFromOrder(updated);
      startNavigation(() => {
        router.push(`/checkout/produtos?eventId=${eventId}`);
      });
    } catch (err) {
      if (err instanceof OrderApiError) {
        if (err.code === "ORDER_NOT_PENDING" || err.code === "ORDER_NOT_FOUND") {
          toast.error("Sua reserva expirou.");
          router.push(`/checkout/ingressos?eventId=${eventId}`);
          return;
        }
        if (err.code === "VALIDATION_ERROR" && err.fields?.length) {
          toast.error(err.fields[0].message);
          return;
        }
        toast.error(err.message || "Erro ao salvar informações.");
      } else {
        toast.error("Erro ao salvar informações.");
      }
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    if (eventId) {
      startNavigation(() => {
        router.push(`/checkout/ingressos?eventId=${eventId}`);
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
    return <CheckoutInformacoesLoading />;
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
      <CheckoutHeader activeStep={2} />
      <div className="w-full max-w-[1280px] mx-auto flex flex-col min-h-screen items-start justify-start gap-4 py-4 md:py-11 px-4 bg-gray-2 md:bg-transparent">
        <InformationStep
          event={event}
          onNext={handleNext}
          onBack={handleBack}
          isSubmitting={isSubmitting || isNavigating}
        />
      </div>
    </div>
  );
}

export default function CheckoutInformacoesPage() {
  return (
    <Suspense fallback={<Loading />}>
      <CheckoutInformacoesContent />
    </Suspense>
  );
}
