"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useMyTickets } from "@/hooks/useMyTickets";
import { TicketCard } from "@/components/Ticket/Card";
import { Button } from "@/components/Button";
import Image from "next/image";

export default function UserTicketsPage() {
  const { isAuthenticated } = useAuth();
  const [page, setPage] = useState(1);

  const { tickets, pagination, loading, refetch } = useMyTickets(
    { page, limit: 20, status: "CONFIRMED" },
    isAuthenticated
  );

  useEffect(() => {
    if (isAuthenticated) {
      refetch();
    }
  }, [isAuthenticated, refetch]);

  const sortedTickets = useMemo(() => {
    return [...tickets].sort((a, b) => {
      const dateA = new Date(a.createdAt || a.purchaseDate || 0).getTime();
      const dateB = new Date(b.createdAt || b.purchaseDate || 0).getTime();
      return dateB - dateA;
    });
  }, [tickets]);

  return (
    <div className="min-h-screen bg-gray-2">
      <div className="mx-auto max-w-[1280px] px-20 pt-13 pb-20">
        {/* Header */}
        <div className="mb-6 flex items-center gap-4">
          <Image
            src="/images/search_image.png"
            alt="Ingressos"
            width={40}
            height={40}
            draggable={false}
          />
          <h1 className="text-[28px] font-extrabold text-gray-12 font-manrope">
            Meus ingressos
          </h1>
        </div>

        {/* Tickets Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <p className="text-gray-11">Carregando ingressos...</p>
          </div>
        ) : sortedTickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <p className="text-lg text-gray-11">
              Você ainda não possui ingressos
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 auto-rows-max">
            {sortedTickets.map((ticket) => (
              <TicketCard key={ticket.id} ticket={ticket} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-2">
            <Button
              variant="outline"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page === 1}
            >
              Anterior
            </Button>
            <span className="text-sm text-gray-11">
              Página {page} de {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              onClick={() => setPage((prev) => Math.min(pagination.totalPages, prev + 1))}
              disabled={page === pagination.totalPages}
            >
              Próxima
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
