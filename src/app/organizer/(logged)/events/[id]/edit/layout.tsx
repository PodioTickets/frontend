"use client";

import { ReactNode, Suspense } from "react";
import { useParams, usePathname } from "next/navigation";
import { cn } from "@/utils/cn";
import { Loading } from "@/components/Loading";
import { EventPageHeader } from "@/components/Organizer/EventPageHeader";
import { EditEventProvider, useEditEvent } from "@/contexts/EditEventContext";
import { OrganizerInfoIcon } from "@/components/Icons/Organizer/InfoIcon";
import { OrganizerTicketIcon } from "@/components/Icons/Organizer/TicketIcon";
import { QuestionIcon } from "@/components/Icons/QuestionIcon";
import { TopicsIcon } from "@/components/Icons/TopicsIcon";
import { ImageIcon } from "lucide-react";
import Link from "next/link";
import { BannerIcon } from "@/components/Icons/Organizer/BannerIcon";
import { useEventPermissionGuard } from "@/hooks/useEventPermissionGuard";

function EditProgressBar() {
  const pathname = usePathname();
  const params = useParams();
  const eventId = params.id as string;

  const getStepStatus = (step: number): "completed" | "active" | "default" => {
    const isBannerStep = pathname.includes("/edit/banner");
    const isTicketsStep = pathname.includes("/edit/tickets");
    const isTopicsStep = pathname.includes("/edit/topics");
    const isQuestionnaireStep = pathname.includes("/edit/questionnaire");

    const pathNoQuery = pathname.split("?")[0].replace(/\/+$/, "");
    const isInformationStep =
      pathNoQuery.endsWith("/edit") &&
      !isBannerStep &&
      !isTicketsStep &&
      !isTopicsStep &&
      !isQuestionnaireStep;

    let currentStepIndex = -1;

    if (isInformationStep) {
      currentStepIndex = 0;
    } else if (isBannerStep) {
      currentStepIndex = 1;
    } else if (isTicketsStep) {
      currentStepIndex = 2;
    } else if (isTopicsStep) {
      currentStepIndex = 3;
    } else if (isQuestionnaireStep) {
      currentStepIndex = 4;
    }

    if (currentStepIndex === -1) return "default";

    if (step - 1 < currentStepIndex) return "completed";
    if (step - 1 === currentStepIndex) return "active";
    return "default";
  };

  const steps = [
    {
      step: 1,
      label: "Informações",
      icon: OrganizerInfoIcon,
      href: `/organizer/events/${eventId}/edit`,
    },
    {
      step: 2,
      label: "Banner",
      icon: BannerIcon,
      href: `/organizer/events/${eventId}/edit/banner`,
    },
    {
      step: 3,
      label: "Ingressos",
      icon: OrganizerTicketIcon,
      href: `/organizer/events/${eventId}/edit/tickets`,
    },
    {
      step: 4,
      label: "Tópicos",
      icon: TopicsIcon,
      href: `/organizer/events/${eventId}/edit/topics`,
    },
    {
      step: 5,
      label: "Questionário",
      icon: QuestionIcon,
      href: `/organizer/events/${eventId}/edit/questionnaire`,
    },
  ];

  return (
    <div className="max-w-2xl mx-auto py-7 px-2">
      <div className="relative flex items-center justify-between">
        {steps.map(({ step, label, icon: Icon, href }) => {
          const status = getStepStatus(step);
          const isActive = status === "active";
          const isCompleted = status === "completed";

          return (
            <Link
              key={step}
              href={href}
              className="flex flex-col gap-3 items-center relative z-10 cursor-pointer"
            >
              <div className="flex flex-col gap-[12px] items-center relative z-10">
                <div
                  className={`rounded-[52px] size-12 p-1 flex items-center justify-center shrink-0 relative border ${isActive ? "border-[#3e7949]" : "border-transparent"
                    }`}
                >
                  <div
                    className={`rounded-[32px] size-full p-2 flex items-center justify-center ${isActive ? "bg-[#3e7949]" : isCompleted ? "bg-gray-6" : "bg-gray-6"
                      }`}
                  >
                    <Icon
                      className={`size-5 ${isActive ? "text-white" : isCompleted ? "text-gray-12" : "text-gray-12"
                        }`}
                    />
                  </div>
                </div>
                <p className={`text-base font-semibold font-manrope leading-[1.1] text-center whitespace-nowrap text-gray-12`}>
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
  useEventPermissionGuard("edit_event");
  const params = useParams();
  const eventId = params.id as string;
  const pathname = usePathname();
  /** No mobile a navegação entre passos fica na aba «Editar» (`EventMobileTabs` variant pageHeader). */
  const hideEditStepperOnMobile = pathname.includes("/edit");

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-2 flex items-center justify-center">
        <Loading />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-2">
      <EventPageHeader eventName={event?.name} />
      <div className="max-w-7xl mx-auto px-4 lg:px-0">
        <div className={cn(hideEditStepperOnMobile && "hidden md:block")}>
          <EditProgressBar />
        </div>
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
