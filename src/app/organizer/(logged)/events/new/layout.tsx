"use client";

import { CreateEventProvider } from "@/contexts/CreateEventContext";
import { ReactNode, Suspense, useEffect } from "react";
import Link from "next/link";
import { Loading } from "@/components/Loading";
import { useOrganizerPathname } from "@/hooks/useOrganizerPathname";
import { useOrganizerAppSurface } from "@/contexts/OrganizerAppSurfaceContext";
import { organizerExternalHref } from "@/lib/organizerPathPresentation";
import { CheckIcon } from "@/components/Icons/CheckIcon";
import { OrganizerInfoIcon } from "@/components/Icons/Organizer/InfoIcon";
import { OrganizerTicketIcon } from "@/components/Icons/Organizer/TicketIcon";
import { QuestionIcon } from "@/components/Icons/QuestionIcon";
import { TopicsIcon } from "@/components/Icons/TopicsIcon";
import { BannerIcon } from "@/components/Icons/Organizer/BannerIcon";
import { FinancialStepIcon } from "@/components/Icons/Organizer/FinancialStepIcon";
import { saveLastCreateEventWizardPath } from "@/lib/createEventWizardPersistence";

export const dynamic = 'force-dynamic';

function ConditionalProgressBar() {
  const pathname = useOrganizerPathname();
  const hideOnMobile =
    pathname.startsWith("/organizer/events/new/information") ||
    pathname.startsWith("/organizer/events/new/banner");
  return (
    <div className={hideOnMobile ? "hidden md:block" : ""}>
      <ProgressBar />
    </div>
  );
}

function ProgressBar() {
  const pathname = useOrganizerPathname();
  const resolveStepIndex = (): number => {
    if (pathname.startsWith("/organizer/events/new/information")) return 0;
    if (pathname.startsWith("/organizer/events/new/banner")) return 1;
    if (pathname.startsWith("/organizer/events/new/tickets")) return 2;
    if (
      pathname.startsWith("/organizer/events/new/topics") ||
      pathname.startsWith("/organizer/events/new/preview-event") ||
      pathname.startsWith("/organizer/events/new/coupons") ||
      pathname.startsWith("/organizer/events/new/vouchers")
    )
      return 3;
    if (pathname.startsWith("/organizer/events/new/questionnaire")) return 4;
    if (pathname.startsWith("/organizer/events/new/financial")) return 5;
    return -1;
  };

  const getStepStatus = (step: number): "completed" | "active" | "default" => {
    const currentStepIndex = resolveStepIndex();
    if (currentStepIndex === -1) return "default";
    if (step - 1 < currentStepIndex) return "completed";
    if (step - 1 === currentStepIndex) return "active";
    return "default";
  };

  const getProgressWidth = (): string => {
    const currentStepIndex = resolveStepIndex();
    if (currentStepIndex <= 0) return "0%";
    return `${(currentStepIndex / 5) * 100}%`;
  };

  const stepLinkClass =
    "flex flex-col gap-[12px] items-center relative z-10";

  return (
    <div className="border-b border-gray-6 bg-gray-2">
      <div className="max-w-4xl mx-auto px-3 md:px-6 pb-8">
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
              <div
                className={stepLinkClass}
              >
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
              <div
                className={stepLinkClass}
              >
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
                      <BannerIcon
                        className={`size-5 ${status === "active" ? "text-white" : "text-gray-12"
                          }`}
                      />
                    )}
                  </div>
                </div>
                <p className="text-gray-12 text-base font-semibold font-manrope leading-[1.1] text-center whitespace-nowrap">
                  Banner
                </p>
              </div>
            );
          })()}

          {(() => {
            const status = getStepStatus(3);
            return (
              <div
                className={stepLinkClass}
              >
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
            const status = getStepStatus(4);
            return (
              <div
                className={stepLinkClass}
              >
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
            const status = getStepStatus(5);
            return (
              <div
                className={stepLinkClass}
              >
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
            const status = getStepStatus(6);
            return (
              <div
                className={stepLinkClass}
              >
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
                      <FinancialStepIcon
                        className={`size-5 ${status === "active" ? "text-white" : "text-gray-12"
                          }`}
                      />
                    )}
                  </div>
                </div>
                <p className="text-gray-12 text-base font-semibold font-manrope leading-[1.1] text-center whitespace-nowrap">
                  Financeiro
                </p>
              </div>
            );
          })()}

        </div>
      </div>
    </div>
  );
}

function CreateEventLayoutInner({ children }: { children: ReactNode }) {
  const pathname = useOrganizerPathname();

  useEffect(() => {
    if (!pathname.startsWith("/organizer/events/new/")) return;
    if (pathname === "/organizer/events/new") return;
    saveLastCreateEventWizardPath(pathname);
  }, [pathname]);

  const isInformationOrBanner =
    pathname.startsWith("/organizer/events/new/information") ||
    pathname.startsWith("/organizer/events/new/banner");
  const isNewBannerDesktopShell = pathname.startsWith(
    "/organizer/events/new/banner",
  );
  return (
    <div
      className={
        isInformationOrBanner
          ? "min-h-screen bg-gray-2 flex flex-col mt-0 md:mt-6"
          : "min-h-screen bg-gray-2 flex flex-col mt-6"
      }
    >
      {isNewBannerDesktopShell ? (
        <div className="mx-auto flex w-full max-w-7xl flex-col px-4 lg:px-0">
          <ConditionalProgressBar />
          {children}
        </div>
      ) : (
        <>
          <ConditionalProgressBar />
          {children}
        </>
      )}
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
        <CreateEventLayoutInner>{children}</CreateEventLayoutInner>
      </CreateEventProvider>
    </Suspense>
  );
}
