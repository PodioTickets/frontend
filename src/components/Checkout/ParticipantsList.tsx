"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { ChevronDown } from "lucide-react";
import { useCheckout } from "@/contexts/CheckoutContext";
import { cn } from "@/utils/cn";

interface ParticipantCardProps {
  participantIndex: number;
  participant: {
    name: string;
    cpf: string;
    email: string;
    birthDate: string;
    phone: string;
    gender: string;
  };
  ticketName: string;
  ticketPrice: number;
  additionalProducts?: {
    name: string;
    price: number;
    quantity: number;
  }[];
}

function ParticipantCard({
  participantIndex,
  participant,
  ticketName,
  ticketPrice,
  additionalProducts = [],
}: ParticipantCardProps) {
  const formatDate = (date: string) => {
    if (!date) return "";
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(date));
  };

  const maskCPF = (cpf: string) => {
    if (!cpf) return "";
    const cleaned = cpf.replace(/\D/g, "");
    if (cleaned.length !== 11) return cpf;
    return `${cleaned.slice(0, 3)}.***.***-${cleaned.slice(9)}`;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getGenderLabel = (gender: string) => {
    const labels: Record<string, string> = {
      male: "Masculino",
      female: "Feminino",
      other: "Outro",
    };
    return labels[gender] || gender;
  };

  const totalAdditionalProducts = additionalProducts.reduce(
    (sum, product) => sum + product.price * product.quantity,
    0
  );

  return (
    <div className="flex flex-col w-full">
      {/* Content */}
      <div className="flex flex-col gap-5 px-4 py-6">
        <div className="flex flex-col gap-5 grow items-start">
          <p className="font-family-dm-sans font-normal text-base leading-[1.3] text-gray-12">
            Participante {participantIndex + 1}
          </p>
          <p className="font-manrope font-bold text-xl leading-[1.1] text-gray-12">
            {ticketName}
          </p>
          <div className="flex items-end justify-between w-full text-gray-12">
            <p className="font-family-dm-sans font-normal text-base leading-[1.3]">
              Valor do ingresso:
            </p>
            <p className="font-manrope font-bold text-lg leading-[1.1]">
              {formatCurrency(ticketPrice)}
            </p>
          </div>
          {additionalProducts.length > 0 && (
            <div className="flex items-end justify-between w-full text-gray-12">
              <p className="font-family-dm-sans font-normal text-base leading-[1.3]">
                Produtos adicionais ({additionalProducts.length}):
              </p>
              <p className="font-manrope font-bold text-lg leading-[1.1]">
                {formatCurrency(totalAdditionalProducts)}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Profile Section */}
      <div className="border-b border-gray-6 flex items-center justify-between pb-5 pt-0 px-4">
        <div className="border border-gray-6 flex items-center p-3 rounded-xl">
          <div className="flex gap-2 items-center">
            <div className="relative shrink-0 size-10 rounded-full overflow-hidden bg-gray-6">
              {participant.name ? (
                <div className="w-full h-full flex items-center justify-center bg-primary-10/20">
                  <span className="text-primary-11 font-semibold text-sm">
                    {participant.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              ) : (
                <Image
                  src="/images/default-avatar.png"
                  alt="Avatar"
                  fill
                  className="object-cover"
                />
              )}
            </div>
            <div className="flex flex-col gap-3 items-start justify-center">
              <p className="font-family-dm-sans font-semibold text-sm leading-[1.3] text-gray-12">
                {participant.name || "Sem nome"}
              </p>
              <div className="flex gap-2 items-center justify-center">
                {participant.birthDate && (
                  <>
                    <p className="font-family-dm-sans font-normal text-sm leading-[1.3] text-gray-11">
                      {formatDate(participant.birthDate)}
                    </p>
                    <div className="relative shrink-0 size-1 rounded-full bg-gray-11" />
                  </>
                )}
                {participant.gender && (
                  <>
                    <p className="font-family-dm-sans font-normal text-sm leading-[1.3] text-gray-11">
                      {getGenderLabel(participant.gender)}
                    </p>
                    <div className="relative shrink-0 size-1 rounded-full bg-gray-11" />
                  </>
                )}
                {participant.cpf && (
                  <p className="font-family-dm-sans font-normal text-sm leading-[1.3] text-gray-11">
                    {maskCPF(participant.cpf)}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center">
          <ChevronDown className="size-8 text-gray-12 -rotate-90" />
        </div>
      </div>
    </div>
  );
}

interface ParticipantsListProps {
  participantsData: Array<{
    participantIndex: number;
    ticketName: string;
    ticketPrice: number;
    additionalProducts?: Array<{
      name: string;
      price: number;
      quantity: number;
    }>;
  }>;
}

export function ParticipantsList({ participantsData }: ParticipantsListProps) {
  const { participants } = useCheckout();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [scrollbarHeight, setScrollbarHeight] = useState(45);
  const [isDragging, setIsDragging] = useState(false);
  const scrollbarRef = useRef<HTMLDivElement>(null);
  const scrollbarThumbRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const updateScrollbar = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const maxScroll = scrollHeight - clientHeight;
      const progress = maxScroll > 0 ? scrollTop / maxScroll : 0;
      setScrollProgress(progress);

      // Calculate scrollbar height based on visible content
      const visibleRatio = clientHeight / scrollHeight;
      const minHeight = 45;
      const calculatedHeight = Math.max(minHeight, clientHeight * visibleRatio);
      setScrollbarHeight(calculatedHeight);
    };

    container.addEventListener("scroll", updateScrollbar);
    updateScrollbar();

    // Update on resize
    const resizeObserver = new ResizeObserver(updateScrollbar);
    resizeObserver.observe(container);

    return () => {
      container.removeEventListener("scroll", updateScrollbar);
      resizeObserver.disconnect();
    };
  }, [participantsData]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const container = scrollContainerRef.current;
      const scrollbar = scrollbarRef.current;
      if (!container || !scrollbar) return;

      const rect = scrollbar.getBoundingClientRect();
      const clickY = e.clientY - rect.top;
      const scrollbarHeight = rect.height;
      const scrollRatio = Math.max(0, Math.min(1, clickY / scrollbarHeight));

      const { scrollHeight, clientHeight } = container;
      const maxScroll = scrollHeight - clientHeight;
      container.scrollTop = scrollRatio * maxScroll;
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  const handleScrollbarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const container = scrollContainerRef.current;
    const scrollbar = scrollbarRef.current;
    if (!container || !scrollbar) return;

    const rect = scrollbar.getBoundingClientRect();
    const clickY = e.clientY - rect.top;
    const scrollbarHeight = rect.height;
    const scrollRatio = Math.max(0, Math.min(1, clickY / scrollbarHeight));

    const { scrollHeight, clientHeight } = container;
    const maxScroll = scrollHeight - clientHeight;
    container.scrollTop = scrollRatio * maxScroll;
  };

  const handleThumbMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  return (
    <div className="bg-gray-3 flex items-start justify-center relative h-full w-full pr-1">
      <div className="flex flex-col items-start relative shrink-0 w-full h-full">
        <div
          ref={scrollContainerRef}
          className="flex flex-col items-start overflow-y-auto overflow-x-hidden w-full h-full [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        >
          {participantsData.map((data, index) => {
            const participant = participants[data.participantIndex] || {
              name: "",
              cpf: "",
              email: "",
              birthDate: "",
              phone: "",
              gender: "",
            };

            return (
              <ParticipantCard
                key={data.participantIndex}
                participantIndex={data.participantIndex}
                participant={participant}
                ticketName={data.ticketName}
                ticketPrice={data.ticketPrice}
                additionalProducts={data.additionalProducts}
              />
            );
          })}
        </div>
      </div>

      {/* Custom Scrollbar */}
      <div
        ref={scrollbarRef}
        className="h-full relative shrink-0 w-[9px] cursor-pointer"
        onClick={handleScrollbarClick}
      >
        <div className="absolute bg-gray-8 bottom-0 left-0 rounded-[32px] top-0 w-[9px]" />
        <div
          ref={scrollbarThumbRef}
          className="absolute bg-primary-12 rounded-[32px] left-1/2 translate-x-[-50%] w-[9px] cursor-grab active:cursor-grabbing transition-all duration-150 hover:bg-primary-11"
          style={{
            height: `${scrollbarHeight}px`,
            top: `${
              scrollProgress *
              ((scrollContainerRef.current?.clientHeight || 600) -
                scrollbarHeight)
            }px`,
          }}
          onMouseDown={handleThumbMouseDown}
        />
      </div>
    </div>
  );
}
