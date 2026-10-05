"use client";

import { Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Loading } from "@/components/Loading";
import { CheckoutProvider } from "@/contexts/CheckoutContext";
import { AdminTicketSwap } from "@/components/Admin/AdminTicketSwap";

/**
 * Troca de ingresso de uma inscrição (admin). `?userId=` = usuário do drawer de origem,
 * para "Ver nas inscrições" voltar com o drawer aberto. O `CheckoutProvider` só existe
 * porque os cards de ingresso do checkout leem o contexto (sem `?eventId=`, não persiste nada).
 */
export default function AdminRegistrationSwapPage() {
  return (
    <Suspense fallback={<div className="min-h-[60vh] flex items-center justify-center"><Loading /></div>}>
      <CheckoutProvider>
        <SwapRoute />
      </CheckoutProvider>
    </Suspense>
  );
}

function SwapRoute() {
  const params = useParams();
  const searchParams = useSearchParams();
  return <AdminTicketSwap registrationId={params.id as string} userId={searchParams.get("userId")} />;
}
