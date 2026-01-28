"use client";

import { CreateEventProvider } from "@/contexts/CreateEventContext";
import { ReactNode, Suspense } from "react";
import { Loading } from "@/components/Loading";
import { usePathname } from "next/navigation";
import { CheckIcon } from "@/components/Icons/CheckIcon";
import { OrganizerInfoIcon } from "@/components/Icons/Organizer/InfoIcon";
import { OrganizerTicketIcon } from "@/components/Icons/Organizer/TicketIcon";
import { QuestionIcon } from "@/components/Icons/QuestionIcon";
import { TopicsIcon } from "@/components/Icons/TopicsIcon";
import { RevisionIcon } from "@/components/Icons/RevisionIcon";

export const dynamic = 'force-dynamic';

function ProgressBar() {
  const pathname = usePathname();

  const getStepStatus = (step: number): "completed" | "active" | "default" => {
    const isInformationStep =
      pathname.startsWith("/organizer/events/new/information") ||
      pathname.startsWith("/organizer/events/new/banner") ||
      (pathname.startsWith("/organizer/events/new/preview") && 
       !pathname.startsWith("/organizer/events/new/preview-event"));

    const isTopicsStep =
      pathname.startsWith("/organizer/events/new/topics") ||
      pathname.startsWith("/organizer/events/new/preview-event");

    const stepPaths = [
      "/organizer/events/new/information",
      "/organizer/events/new/tickets",
      "/organizer/events/new/topics",
      "/organizer/events/new/questionnaire",
    ];

    let currentStepIndex = -1;

    if (isInformationStep) {
      currentStepIndex = 0;
    } else if (isTopicsStep) {
      currentStepIndex = 2;
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

  const getCurrentStepIndex = (): number => {
    const isInformationStep =
      pathname.startsWith("/organizer/events/new/information") ||
      pathname.startsWith("/organizer/events/new/banner") ||
      (pathname.startsWith("/organizer/events/new/preview") && 
       !pathname.startsWith("/organizer/events/new/preview-event"));

    const isTopicsStep =
      pathname.startsWith("/organizer/events/new/topics") ||
      pathname.startsWith("/organizer/events/new/preview-event");

    const stepPaths = [
      "/organizer/events/new/information",
      "/organizer/events/new/tickets",
      "/organizer/events/new/topics",
      "/organizer/events/new/questionnaire",
    ];

    if (isInformationStep) {
      return 0;
    } else if (isTopicsStep) {
      return 2;
    }

    const index = stepPaths.findIndex((path) =>
      pathname.startsWith(path)
    );

    return index !== -1 ? index : 0;
  };

  const getProgressWidth = (): string => {
    const currentStepIndex = getCurrentStepIndex();
    console.log(currentStepIndex);
    if (currentStepIndex === 0) {
      return "0%";
    } else if (currentStepIndex === 1) {
      return "25%";
    } else if (currentStepIndex === 2) {
      return "50%";
    } else if (currentStepIndex === 3) {
      return "75%";
    } else if (currentStepIndex === 4) {
      return "100%";
    }

    return "0%";
  };

  return (
    <div className="border-b border-gray-6 bg-gray-2">
      <div className="max-w-3xl mx-auto px-5 md:px-[80px] pb-8">
        <div className="relative flex items-center justify-between">
          <div className="absolute h-px top-[24px] left-0 w-full px-8">
            <div className="h-px bg-gray-6 w-full relative">
              <div
                style={{ width: getProgressWidth() }}
                className="absolute h-px top-0 left-0 bg-[#46a758] transition-all duration-300"
              />
            </div>
          </div>
          {(() => {
            const status = getStepStatus(1);
            return (
              <div className="flex flex-col gap-[12px] items-center relative z-10">
                <div
                  className={`rounded-[52px] size-12 p-1 flex items-center justify-center shrink-0 relative ${status === "completed"
                    ? "border border-[#3e7949]"
                    : status === "active"
                      ? "border border-[#3a3a3a]"
                      : ""
                    }`}
                >
                  <div
                    className={`rounded-[32px] size-full p-2 flex items-center justify-center ${status === "completed"
                      ? "bg-[#3e7949]"
                      : status === "active"
                        ? "bg-[#3a3a3a]"
                        : "bg-gray-6"
                      }`}
                  >
                    {status === "completed" ? (
                      <CheckIcon className="size-5 text-white" />
                    ) : (
                      <OrganizerInfoIcon
                        className={`size-5 ${status === "active" ? "text-white" : "text-gray-12"
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

          {(() => {
            const status = getStepStatus(2);
            return (
              <div className="flex flex-col gap-[12px] items-center relative z-10">
                <div
                  className={`rounded-[52px] size-12 p-1 flex items-center justify-center shrink-0 relative ${status === "completed"
                    ? "border border-[#3e7949]"
                    : status === "active"
                      ? "border border-[#3a3a3a]"
                      : ""
                    }`}
                >
                  <div
                    className={`rounded-[32px] size-full p-2 flex items-center justify-center ${status === "completed"
                      ? "bg-[#3e7949]"
                      : status === "active"
                        ? "bg-[#3a3a3a]"
                        : "bg-gray-6"
                      }`}
                  >
                    {status === "completed" ? (
                      <CheckIcon className="size-5 text-white" />
                    ) : (
                      <OrganizerTicketIcon
                        className={`size-5 ${status === "active" ? "text-white" : "text-gray-12"
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

          {(() => {
            const status = getStepStatus(3);
            return (
              <div className="flex flex-col gap-[12px] items-center relative z-10">
                <div
                  className={`rounded-[52px] size-12 p-1 flex items-center justify-center shrink-0 relative ${status === "completed"
                    ? "border border-[#3e7949]"
                    : status === "active"
                      ? "border border-[#3a3a3a]"
                      : ""
                    }`}
                >
                  <div
                    className={`rounded-[32px] size-full p-2 flex items-center justify-center ${status === "completed"
                      ? "bg-[#3e7949]"
                      : status === "active"
                        ? "bg-[#3a3a3a]"
                        : "bg-gray-6"
                      }`}
                  >
                    {status === "completed" ? (
                      <CheckIcon className="size-5 text-white" />
                    ) : (
                      <TopicsIcon
                        className={`size-5 ${status === "active" ? "text-white" : "text-gray-12"
                          }`}
                      />
                    )}
                  </div>
                </div>
                <p className="text-gray-12 text-base font-semibold font-manrope leading-[1.1] text-center whitespace-nowrap">
                  Tópicos
                </p>
              </div>
            );
          })()}

          {(() => {
            const status = getStepStatus(4);
            return (
              <div className="flex flex-col gap-[12px] items-center relative z-10">
                <div
                  className={`rounded-[52px] size-12 p-1 flex items-center justify-center shrink-0 relative ${status === "completed"
                    ? "border border-[#3e7949]"
                    : status === "active"
                      ? "border border-[#3a3a3a]"
                      : ""
                    }`}
                >
                  <div
                    className={`rounded-[32px] size-full p-2 flex items-center justify-center ${status === "completed"
                      ? "bg-[#3e7949]"
                      : status === "active"
                        ? "bg-[#3a3a3a]"
                        : "bg-gray-6"
                      }`}
                  >
                    {status === "completed" ? (
                      <CheckIcon className="size-5 text-white" />
                    ) : (
                      <QuestionIcon
                        className={`size-5 ${status === "active" ? "text-white" : "text-gray-12"
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

          {(() => {
            const status = getStepStatus(5);
            return (
              <div className="flex flex-col gap-[12px] items-center relative z-10">
                <div
                  className={`rounded-[52px] size-12 p-1 flex items-center justify-center shrink-0 relative ${status === "completed"
                    ? "border border-[#3e7949]"
                    : status === "active"
                      ? "border border-[#3a3a3a]"
                      : ""
                    }`}
                >
                  <div
                    className={`rounded-[32px] size-full p-2 flex items-center justify-center ${status === "completed"
                      ? "bg-[#3e7949]"
                      : status === "active"
                        ? "bg-[#3a3a3a]"
                        : "bg-gray-6"
                      }`}
                  >
                    {status === "completed" ? (
                      <CheckIcon className="size-5 text-white" />
                    ) : (
                      <RevisionIcon
                        className={`size-5 ${status === "active" ? "text-white" : "text-gray-12"
                          }`}
                      />
                    )}
                  </div>
                </div>
                <p className="text-gray-12 text-base font-semibold font-manrope leading-[1.1] text-center whitespace-nowrap">
                  Revisão
                </p>
              </div>
            );
          })()}
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
