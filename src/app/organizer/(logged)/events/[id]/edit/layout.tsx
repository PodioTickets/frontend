"use client";

import { ReactNode, Suspense, useEffect } from "react";
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
import { FinancialStepIcon } from "@/components/Icons/Organizer/FinancialStepIcon";
import { useEventPermissionGuard } from "@/hooks/useEventPermissionGuard";
import { useOrganizerPermissions } from "@/contexts/OrganizerPermissionsContext";
import { EventMobileHeader } from "@/components/Organizer/EventMobileHeader";
import { isTicketsCheckoutPreviewPath } from "@/lib/ticketsCheckoutPreviewRoute";

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

    const isFinancialStep = pathname.includes("/edit/financial");
    if (isFinancialStep) {
      currentStepIndex = 5;
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
    {
      step: 6,
      label: "Pagamento",
      icon: FinancialStepIcon,
      href: `/organizer/events/${eventId}/edit/financial`,
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
  useEventPermissionGuard(["edit_event", "view_event"]);
  const { hasPermission } = useOrganizerPermissions();
  const params = useParams();
  const eventId = params.id as string;
  const pathname = usePathname();

  const readOnly = !hasPermission("edit_event") && hasPermission("view_event");

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  /** No mobile a navegação entre passos fica na aba «Editar» (`EventMobileTabs` variant pageHeader). */
  const hideEditStepperOnMobile = pathname.includes("/edit");

  /* Sub-telas de formulário de ingresso (`/edit/tickets/create` e `/edit/tickets/<id>`)
   * renderizam o `TicketForm`, que JÁ traz header próprio no mobile (barra de 52px com
   * voltar + "Editar ingresso"). Sem isto o mobile fica com DOIS headers empilhados: o do
   * evento (nome + abas Dashboard/Inscrições/…) e o do formulário.
   *
   * `/edit/tickets` (lista) NÃO entra: é um passo do wizard e precisa da faixa. Só o
   * mobile é afetado — `EventMobileHeader` é `md:hidden`, e no desktop o header do
   * evento convive bem com o título da página. */
  const ticketFormSegment = /\/edit\/tickets\/([^/]+)$/.exec(
    pathname.split("?")[0].replace(/\/+$/, ""),
  )?.[1];
  const isTicketFormScreen = !!ticketFormSegment && ticketFormSegment !== "preview";

  /* A prévia reproduz a tela do participante: sem header do evento (desktop e
   * mobile) e sem stepper de etapas — só o conteúdo. A própria página traz o
   * header de voltar. */
  const isTicketsCheckoutPreview = isTicketsCheckoutPreviewPath(pathname);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-2 flex items-center justify-center">
        <Loading />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-2">
      {!isTicketsCheckoutPreview && (
        <div className="hidden md:block">
          <EventPageHeader eventName={event?.name} eventSlug={event?.slug} />
        </div>
      )}
      {!isTicketFormScreen && !isTicketsCheckoutPreview && (
        <EventMobileHeader
          eventId={eventId}
          eventName={event?.name}
          activeHref={pathname}
          backHref={`/organizer/events`}
        />
      )}
      <div className="max-w-7xl mx-auto px-4 lg:px-6 2xl:px-0">
        {!isTicketsCheckoutPreview && (
          <div className={cn(hideEditStepperOnMobile && "hidden md:block")}>
            <EditProgressBar />
          </div>
        )}
        <div className={cn(readOnly && "pointer-events-none select-none opacity-70 [&_[data-nav]]:pointer-events-auto [&_[data-nav]]:cursor-pointer [&_[data-nav]]:select-auto")}>
          {children}
        </div>
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
