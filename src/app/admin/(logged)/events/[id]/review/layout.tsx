"use client";

import { ReactNode, Suspense } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { cn } from "@/utils/cn";
import { Loading } from "@/components/Loading";
import { EditEventProvider, useEditEvent } from "@/contexts/EditEventContext";
import { OrganizerInfoIcon } from "@/components/Icons/Organizer/InfoIcon";
import { OrganizerTicketIcon } from "@/components/Icons/Organizer/TicketIcon";
import { QuestionIcon } from "@/components/Icons/QuestionIcon";
import { TopicsIcon } from "@/components/Icons/TopicsIcon";
import { BannerIcon } from "@/components/Icons/Organizer/BannerIcon";
import { FinancialStepIcon } from "@/components/Icons/Organizer/FinancialStepIcon";
import { ArrowButton } from "@/components/ArrowButton";
import { isTicketsCheckoutPreviewPath } from "@/lib/ticketsCheckoutPreviewRoute";

const STEPS = [
  { step: 1, label: "Informações", segment: "information", icon: OrganizerInfoIcon },
  { step: 2, label: "Banner", segment: "banner", icon: BannerIcon },
  { step: 3, label: "Ingressos", segment: "tickets", icon: OrganizerTicketIcon },
  { step: 4, label: "Tópicos", segment: "topics", icon: TopicsIcon },
  { step: 5, label: "Questionário", segment: "questionnaire", icon: QuestionIcon },
  { step: 6, label: "Pagamento", segment: "financial", icon: FinancialStepIcon },
];

function ReviewProgressBar({ eventId }: { eventId: string }) {
  const pathname = usePathname();

  const currentIndex = STEPS.findIndex((s) => pathname.includes(`/review/${s.segment}`));
  const safeIndex = currentIndex === -1 ? 0 : currentIndex;

  const getStatus = (i: number): "completed" | "active" | "default" => {
    if (i < safeIndex) return "completed";
    if (i === safeIndex) return "active";
    return "default";
  };

  return (
    <div className="max-w-2xl mx-auto py-7 px-2">
      <div className="relative flex items-center justify-between">
        {STEPS.map(({ step, label, segment, icon: Icon }, i) => {
          const status = getStatus(i);
          const isActive = status === "active";

          return (
            <Link
              key={step}
              href={`/admin/events/${eventId}/review/${segment}`}
              className="flex flex-col gap-3 items-center relative z-10 cursor-pointer"
            >
              <div className="flex flex-col gap-[12px] items-center relative z-10">
                <div className={cn("rounded-[52px] size-12 p-1 flex items-center justify-center shrink-0 relative border", isActive ? "border-[#3e7949]" : "border-transparent")}>
                  <div className={cn("rounded-[32px] size-full p-2 flex items-center justify-center", isActive ? "bg-[#3e7949]" : "bg-gray-6")}>
                    <Icon className={cn("size-5", isActive ? "text-white" : "text-gray-12")} />
                  </div>
                </div>
                <p className="text-base font-semibold font-manrope leading-[1.1] text-center whitespace-nowrap text-gray-12">
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

function ReviewLayoutContent({ children }: { children: ReactNode }) {
  const { loading } = useEditEvent();
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;
  const pathname = usePathname();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-2 flex items-center justify-center">
        <Loading />
      </div>
    );
  }

  const isSubPage = STEPS.every((s) => !pathname.endsWith(`/review/${s.segment}`)) &&
    STEPS.some((s) => pathname.includes(`/review/${s.segment}/`));

  /* A prévia reproduz a tela do participante: sem a barra de auditoria — só o
   * conteúdo (a página traz o próprio header de voltar). O stepper já cai no
   * `isSubPage`. */
  const isTicketsCheckoutPreview = isTicketsCheckoutPreviewPath(pathname);

  return (
    <div className="min-h-screen bg-gray-2">
      {/* Back bar */}
      {!isTicketsCheckoutPreview && (
        <div className="">
          <div className="flex h-[52px] items-center gap-2 px-4 md:px-6 max-w-7xl mx-auto">
            <button
              type="button"
              onClick={() => router.push("/admin/auditoria-evento")}
              className="flex items-center gap-2 text-sm font-medium text-gray-11 hover:text-gray-12 transition-colors"
              aria-label="Voltar à auditoria"
            >
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full border border-gray-6 text-gray-11 transition-colors hover:bg-gray-3 rotate-180">
                <ArrowButton className="size-3" />
              </div>
              Voltar para auditoria
            </button>
          </div>
        </div>
      )}

      {/* Progress bar — hidden on sub-pages (ticket create/edit, previews) */}
      {!isSubPage && (
        <div className="max-w-7xl mx-auto px-4 lg:px-6 2xl:px-0">
          <ReviewProgressBar eventId={eventId} />
        </div>
      )}

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 lg:px-6 2xl:px-0">
        {children}
      </div>
    </div>
  );
}

export default function ReviewEventLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<Loading />}>
      <EditEventProvider>
        <ReviewLayoutContent>{children}</ReviewLayoutContent>
      </EditEventProvider>
    </Suspense>
  );
}
