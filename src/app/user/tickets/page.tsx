"use client";

import { useEffect, useState } from "react";
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
    <div className="min-h-screen bg-[#F9F9F9]">
      <div className="mx-auto max-w-[1440px] pt-6 pb-16 px-5 md:pt-[52px] md:pb-[248px] md:px-20">
        <div className="flex flex-col gap-8">
          {/* Header — mesma estrutura mobile/desktop, só os tamanhos variam.
              Filtro do Figma omitido conforme pedido. */}
          <div className="flex items-center gap-2 md:gap-3">
            <Image
              src="/images/ticket-huge.png"
              alt="Ingressos"
              width={32}
              height={32}
              className="size-6 md:size-8"
              draggable={false}
            />
            <span className="font-manrope font-extrabold text-[#202020] text-xl leading-[22px] md:text-[28px] md:leading-[30.8px]">
              Meus ingressos
            </span>
          </div>

          {/* Content */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <p
                className="font-dm-sans text-[#B4B4B4]"
                style={{ fontSize: 16 }}
              >
                Carregando ingressos...
              </p>
            </div>
          ) : tickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Image
                src="/images/ticket-huge.png"
                alt=""
                width={48}
                height={48}
                className="opacity-25"
                draggable={false}
              />
              <p
                className="font-dm-sans text-[#B4B4B4]"
                style={{ fontSize: 16 }}
              >
                Você ainda não possui ingressos
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-4">
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
              className="mt-6"
            />
          )}
        </div>
      </div>
    </div>
  );
}
