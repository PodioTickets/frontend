"use client";

import { useParams, useRouter } from "next/navigation";
import { Loading } from "@/components/Loading";
import { AdminEventHeader } from "@/components/Admin/AdminEventHeader";
import { RegistrationsView } from "@/components/Registrations/RegistrationsView";
import { useEventRegistrations } from "@/hooks/useEventRegistrations";

export default function EventRegistrationsPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;

  // Admin carrega as stats agregadas do evento (loadAggregateStats).
  const { loading, pageError, loadInitialData, registrations, viewProps } =
    useEventRegistrations({
      eventId,
      onUnauthenticated: () => router.push("/admin/login"),
      loadAggregateStats: true,
    });

  // Full-page loading só na carga inicial (ainda sem dados). Refetch (filtros, data etc.) mostra loading só na lista.
  if (pageError) {
    return (
      <div className="min-h-screen bg-gray-2 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-11 text-lg mb-4">{pageError}</p>
          <button
            onClick={() => void loadInitialData()}
            className="px-4 py-2 rounded-lg bg-primary-11 text-primary-2 font-semibold"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  if (loading && registrations.length === 0) {
    return (
      <div className="min-h-screen bg-gray-2 flex items-center justify-center">
        <Loading />
      </div>
    );
  }

  return (
    <RegistrationsView
      header={
        <AdminEventHeader
          eventId={eventId}
          eventName={viewProps.event?.name}
          eventSlug={viewProps.event?.slug}
        />
      }
      {...viewProps}
    />
  );
}
