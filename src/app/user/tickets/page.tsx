"use client";

import { useEffect } from "react";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useMyTickets } from "@/hooks/useMyTickets";
import { TicketCard } from "@/components/Ticket/Card";
import { Pagination } from "@/components/Pagination";
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

  return (
    <div className="min-h-screen bg-gray-2">
      <div className="mx-auto max-w-[1280px] px-5 md:px-10 xl:px-20 pt-13 pb-20">
        {/* Header */}
        <div className="mb-8 flex items-center gap-3">
          <Image
            src="/images/ticket-huge.png"
            alt="Ingressos"
            width={36}
            height={36}
            draggable={false}
          />
          <h1 className="text-[28px] font-extrabold text-gray-12 font-manrope leading-none">
            Meus ingressos
          </h1>
        </div>

        {/* Tickets Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <p className="text-gray-11">Carregando ingressos...</p>
          </div>
        ) : tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Image
              src="/images/ticket-huge.png"
              alt=""
              width={56}
              height={56}
              className="opacity-30"
              draggable={false}
            />
            <p className="text-base text-gray-11 font-dm-sans">
              Você ainda não possui ingressos
            </p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-4">
            {tickets.map((ticket) => (
              <TicketCard key={ticket.id} ticket={ticket} />
            ))}
          </div>
        )}

        {pagination.totalPages > 1 && (
          <Pagination
            currentPage={pagination.page}
            onPageChange={setPage}
            totalPages={pagination.totalPages}
            className="mt-10"
          />
        )}
      </div>
    </div>
  );
}
