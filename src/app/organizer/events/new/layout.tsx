"use client";

import { CreateEventProvider } from "@/contexts/CreateEventContext";
import { ReactNode, Suspense } from "react";
import { Loading } from "@/components/Loading";
import { usePathname } from "next/navigation";
import { InfoIcon } from "@/components/Icons/InfoIcon";
import { TicketIcon } from "@/components/Icons/TicketIcon";
import { HelpIcon } from "@/components/Icons/HelpIcon";
import { CheckCircleIcon } from "@/components/Icons/CheckCircleIcon";
import { CalendarIcon } from "@/components/Icons/CalendarIcon";

function ProgressBar() {
  const pathname = usePathname();

  const getStepStatus = (step: number): "completed" | "active" | "default" => {
    // Banner e Prévia fazem parte da etapa de Informações
    const isInformacoesStep =
      pathname.startsWith("/organizer/events/new/informacoes") ||
      pathname.startsWith("/organizer/events/new/banner") ||
      pathname.startsWith("/organizer/events/new/previa");

    const stepPaths = [
      "/organizer/events/new/informacoes", // ou banner
      "/organizer/events/new/ingressos",
      "/organizer/events/new/evento",
      "/organizer/events/new/questionario",
    ];

    let currentStepIndex = -1;

    if (isInformacoesStep) {
      currentStepIndex = 0;
    } else {
      currentStepIndex = stepPaths.findIndex((path) =>
        pathname.startsWith(path)
      );
    }

    if (currentStepIndex === -1) return "default";

    if (step - 1 < currentStepIndex) return "completed";
    if (step - 1 === currentStepIndex) return "active";
    return "default";
  };

  return (
    <div className="border-b border-gray-6 bg-gray-2">
      <div className="max-w-3xl mx-auto px-5 md:px-[80px] py-8">
        <div className="relative flex items-center justify-evenly">
          {/* Step 1: Informações */}
          {(() => {
            const status = getStepStatus(1);
            return (
              <div className="flex flex-col gap-3 items-center relative z-10 flex-1">
                <div
                  className={`rounded-[52px] size-12 p-1 flex items-center justify-center shrink-0 relative ${
                    status === "completed"
                      ? "border border-[#3e7949]"
                      : status === "active"
                      ? "border border-[#3a3a3a]"
                      : "border border-gray-6"
                  }`}
                >
                  <div
                    className={`rounded-[32px] size-full p-2 flex items-center justify-center ${
                      status === "completed"
                        ? "bg-[#3e7949]"
                        : status === "active"
                        ? "bg-[#3a3a3a]"
                        : "bg-gray-6"
                    }`}
                  >
                    {status === "completed" ? (
                      <CheckCircleIcon className="size-6 text-white" />
                    ) : (
                      <InfoIcon
                        className={`size-6 ${
                          status === "active" ? "text-white" : "text-gray-12"
                        }`}
                      />
                    )}
                  </div>
                </div>
                <p className="text-gray-12 text-base font-semibold font-manrope leading-[1.1] text-center whitespace-nowrap">
                  Informações
                </p>
              </div>
            );
          })()}

          {/* Step 2: Ingressos */}
          {(() => {
            const status = getStepStatus(2);
            return (
              <div className="flex flex-col gap-3 items-center relative z-10 flex-1">
                <div
                  className={`rounded-[52px] size-12 p-1 flex items-center justify-center shrink-0 relative ${
                    status === "completed"
                      ? "border border-[#3e7949]"
                      : status === "active"
                      ? "border border-[#3a3a3a]"
                      : "border border-gray-6"
                  }`}
                >
                  <div
                    className={`rounded-[32px] size-full p-2 flex items-center justify-center ${
                      status === "completed"
                        ? "bg-[#3e7949]"
                        : status === "active"
                        ? "bg-[#3a3a3a]"
                        : "bg-gray-6"
                    }`}
                  >
                    {status === "completed" ? (
                      <CheckCircleIcon className="size-6 text-white" />
                    ) : (
                      <TicketIcon
                        className={`size-6 ${
                          status === "active" ? "text-white" : "text-gray-12"
                        }`}
                      />
                    )}
                  </div>
                </div>
                <p className="text-gray-12 text-base font-semibold font-manrope leading-[1.1] text-center whitespace-nowrap">
                  Ingressos
                </p>
              </div>
            );
          })()}

          {/* Step 3: Evento */}
          {(() => {
            const status = getStepStatus(3);
            return (
              <div className="flex flex-col gap-3 items-center relative z-10 flex-1">
                <div
                  className={`rounded-[52px] size-12 p-1 flex items-center justify-center shrink-0 relative ${
                    status === "completed"
                      ? "border border-[#3e7949]"
                      : status === "active"
                      ? "border border-[#3a3a3a]"
                      : "border border-gray-6"
                  }`}
                >
                  <div
                    className={`rounded-[32px] size-full p-2 flex items-center justify-center ${
                      status === "completed"
                        ? "bg-[#3e7949]"
                        : status === "active"
                        ? "bg-[#3a3a3a]"
                        : "bg-gray-6"
                    }`}
                  >
                    {status === "completed" ? (
                      <CheckCircleIcon className="size-6 text-white" />
                    ) : (
                      <CalendarIcon
                        className={`size-6 ${
                          status === "active" ? "text-white" : "text-gray-12"
                        }`}
                      />
                    )}
                  </div>
                </div>
                <p className="text-gray-12 text-base font-semibold font-manrope leading-[1.1] text-center whitespace-nowrap">
                  Evento
                </p>
              </div>
            );
          })()}

          {/* Step 4: Questionário */}
          {(() => {
            const status = getStepStatus(4);
            return (
              <div className="flex flex-col gap-3 items-center relative z-10 flex-1">
                <div
                  className={`rounded-[52px] size-12 p-1 flex items-center justify-center shrink-0 relative ${
                    status === "completed"
                      ? "border border-[#3e7949]"
                      : status === "active"
                      ? "border border-[#3a3a3a]"
                      : "border border-gray-6"
                  }`}
                >
                  <div
                    className={`rounded-[32px] size-full p-2 flex items-center justify-center ${
                      status === "completed"
                        ? "bg-[#3e7949]"
                        : status === "active"
                        ? "bg-[#3a3a3a]"
                        : "bg-gray-6"
                    }`}
                  >
                    {status === "completed" ? (
                      <CheckCircleIcon className="size-6 text-white" />
                    ) : (
                      <HelpIcon
                        className={`size-6 ${
                          status === "active" ? "text-white" : "text-gray-12"
                        }`}
                      />
                    )}
                  </div>
                </div>
                <p className="text-gray-12 text-base font-semibold font-manrope leading-[1.1] text-center whitespace-nowrap">
                  Questionário
                </p>
              </div>
            );
          })()}

          {/* Connecting Lines */}
          <div
            className={`absolute h-px top-[23px] left-[calc(16.66%+24px)] right-[calc(58.33%+24px)] ${
              getStepStatus(1) === "completed" ? "bg-[#46a758]" : "bg-gray-6"
            }`}
          />
          <div
            className={`absolute h-px top-[23px] left-[calc(41.66%+24px)] right-[calc(33.33%+24px)] ${
              getStepStatus(2) === "completed" ? "bg-[#46a758]" : "bg-gray-6"
            }`}
          />
          <div
            className={`absolute h-px top-[23px] left-[calc(66.66%+24px)] right-[calc(8.33%+24px)] ${
              getStepStatus(3) === "completed" ? "bg-[#46a758]" : "bg-gray-6"
            }`}
          />
        </div>
      </div>
    </div>
  );
}

export default function CreateEventLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <Suspense fallback={<Loading />}>
      <CreateEventProvider>
        <div className="min-h-screen bg-gray-2 flex flex-col">
          <ProgressBar />
          {children}
        </div>
      </CreateEventProvider>
    </Suspense>
  );
}
