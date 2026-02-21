"use client";

import { ReactNode, Suspense } from "react";
import { useParams, usePathname } from "next/navigation";
import { Loading } from "@/components/Loading";
import { EventPageHeader } from "@/components/Organizer/EventPageHeader";
import { EditEventProvider, useEditEvent } from "@/contexts/EditEventContext";
import { CheckIcon } from "@/components/Icons/CheckIcon";
import { OrganizerInfoIcon } from "@/components/Icons/Organizer/InfoIcon";
import { OrganizerTicketIcon } from "@/components/Icons/Organizer/TicketIcon";
import { QuestionIcon } from "@/components/Icons/QuestionIcon";
import { TopicsIcon } from "@/components/Icons/TopicsIcon";
import Link from "next/link";

function EditProgressBar() {
  const pathname = usePathname();
  const params = useParams();
  const eventId = params.id as string;

  const getStepStatus = (step: number): "completed" | "active" | "default" => {
    const isInformationStep =
      pathname.endsWith("/edit") ||
      pathname.includes("/edit/information") ||
      pathname.includes("/edit/banner");

    const isTicketsStep = pathname.includes("/edit/tickets");
    const isTopicsStep = pathname.includes("/edit/topics");
    const isQuestionnaireStep = pathname.includes("/edit/questionnaire");

    let currentStepIndex = -1;

    if (isInformationStep) {
      currentStepIndex = 0;
    } else if (isTicketsStep) {
      currentStepIndex = 1;
    } else if (isTopicsStep) {
      currentStepIndex = 2;
    } else if (isQuestionnaireStep) {
      currentStepIndex = 3;
    }

    if (currentStepIndex === -1) return "default";

    if (step - 1 < currentStepIndex) return "completed";
    if (step - 1 === currentStepIndex) return "active";
    return "default";
  };

  const getCurrentStepIndex = (): number => {
    const isInformationStep =
      pathname.endsWith("/edit") ||
      pathname.includes("/edit/information") ||
      pathname.includes("/edit/banner");

    const isTicketsStep = pathname.includes("/edit/tickets");
    const isTopicsStep = pathname.includes("/edit/topics");
    const isQuestionnaireStep = pathname.includes("/edit/questionnaire");

    if (isInformationStep) return 0;
    if (isTicketsStep) return 1;
    if (isTopicsStep) return 2;
    if (isQuestionnaireStep) return 3;

    return 0;
  };

  const getProgressWidth = (): string => {
    const currentStepIndex = getCurrentStepIndex();
    if (currentStepIndex === 0) return "0%";
    if (currentStepIndex === 1) return "33.33%";
    if (currentStepIndex === 2) return "66.66%";
    if (currentStepIndex === 3) return "100%";
    return "0%";
  };

  const steps = [
    { step: 1, label: "Informações", icon: OrganizerInfoIcon, href: `/organizer/events/${eventId}/edit` },
    { step: 2, label: "Ingressos", icon: OrganizerTicketIcon, href: `/organizer/events/${eventId}/edit/tickets` },
    { step: 3, label: "Tópicos", icon: TopicsIcon, href: `/organizer/events/${eventId}/edit/topics` },
    { step: 4, label: "Questionário", icon: QuestionIcon, href: `/organizer/events/${eventId}/edit/questionnaire` },
  ];

  return (
    <div className="max-w-[487px] mx-auto py-7">
      <div className="relative flex items-center justify-between">
        <div className="absolute h-px top-[24px] left-0 w-full px-8">
          <div className="h-px bg-gray-6 w-full relative">
            <div
              style={{ width: getProgressWidth() }}
              className="absolute h-px top-0 left-0 bg-primary-8 transition-all duration-300"
            />
          </div>
        </div>

        {steps.map(({ step, label, icon: Icon, href }) => {
          const status = getStepStatus(step);
          return (
            <Link
              key={step}
              href={href}
              className="flex flex-col gap-3 items-center relative z-10 cursor-pointer"
            >
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
                      <Icon
                        className={`size-5 ${status === "active" ? "text-white" : "text-gray-12"
                          }`}
                      />
                    )}
                  </div>
                </div>
                <p className="text-gray-12 text-base font-semibold font-manrope leading-[1.1] text-center whitespace-nowrap">
                  {label}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function EditLayoutContent({ children }: { children: ReactNode }) {
  const { event, loading } = useEditEvent();
  const params = useParams();
  const eventId = params.id as string;

  const tabs = [
    { label: "Editar", href: `/organizer/events/${eventId}/edit`, active: true },
    { label: "Pedidos", href: `/organizer/events/${eventId}/registrations` },
    { label: "Dashboard", href: `/organizer/events/${eventId}/dashboard` },
    { label: "Financeiro", href: `/organizer/events/${eventId}/financial` },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-2 flex items-center justify-center">
        <Loading />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-2">
      <EventPageHeader eventName={event?.name} tabs={tabs} />
      <div className="max-w-7xl mx-auto px-4 lg:px-0">
        <EditProgressBar />
        {children}
      </div>
    </div>
  );
}

export default function EditEventLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<Loading />}>
      <EditEventProvider>
        <EditLayoutContent>{children}</EditLayoutContent>
      </EditEventProvider>
    </Suspense>
  );
}
