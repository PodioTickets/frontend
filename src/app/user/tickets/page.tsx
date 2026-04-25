"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useMyTickets } from "@/hooks/useMyTickets";
import { TicketCard } from "@/components/Ticket/Card";
import { Button } from "@/components/Button";
import Image from "next/image";
import { Pagination } from "@/components/Pagination";

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
        ) : tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <p className="text-lg text-gray-11">
              Você ainda não possui ingressos
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 auto-rows-max">
            {tickets.map((ticket) => (
              <TicketCard key={ticket.id} ticket={ticket} />
            ))}
          </div>
        )}

        <Pagination currentPage={pagination.page} onPageChange={setPage} totalPages={pagination.totalPages} className="mt-10" />
      </div>
    </div>
  );
}
