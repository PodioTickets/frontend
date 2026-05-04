"use client";

import Link from "next/link";
import { ArrowButton } from "@/components/ArrowButton";
import { Loading } from "@/components/Loading";
import { cn } from "@/utils/cn";

interface WizardStepLayoutProps {
  /** Shown in the mobile sticky header */
  title: string;
  /** Override for the desktop h1 when it differs from the mobile label */
  desktopTitle?: string;
  /** Optional subtitle rendered below the desktop h1 */
  description?: string;
  /** When true, also renders description below the mobile header (not only on desktop) */
  showDescriptionOnMobile?: boolean;
  /** Called when back button is clicked. Required unless backHref is provided. */
  onBack?: () => void;
  /** Renders the back button as a <Link> instead of a <button>. Takes precedence over onBack. */
  backHref?: string;
  /** When true, applies sticky top-0 z-20 to the mobile header (for pages without a visible progress bar on mobile). */
  stickyMobileHeader?: boolean;
  children: React.ReactNode;
  /** Content rendered inside the bottom action bar */
  actions: React.ReactNode;
  /**
   * Extra classes for the outermost wrapper.
   * Default fits the new-event wizard (accounts for the 52px progress bar header).
   */
  className?: string;
  /**
   * Tailwind max-width class for the inner content column.
   * Default: "max-w-[843px]"
   */
  maxWidth?: string;
  /**
   * Horizontal gutter of the outer container on mobile ("4" = px-4, "5" = px-5).
   * Must match the px-N in className so the mobile header bleeds correctly.
   * Default: "4"
   */
  gutter?: "4" | "5";
  /** When true, renders a full-height loading spinner instead of children */
  isLoading?: boolean;
}

export function WizardStepLayout({
  title,
  desktopTitle,
  description,
  showDescriptionOnMobile = false,
  onBack,
  backHref,
  stickyMobileHeader = false,
  children,
  actions,
  className,
  maxWidth = "max-w-[843px]",
  gutter = "4",
  isLoading = false,
}: WizardStepLayoutProps) {
  const gutterClass = gutter === "5" ? "max-md:-mx-5 max-md:px-5" : "max-md:-mx-4 max-md:px-4";

  const backButtonContent = (
    <ArrowButton isOpen={false} />
  );

  const mobileBackButton = backHref ? (
    <Link
      href={backHref}
      className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-gray-6 text-gray-12 transition-colors hover:bg-gray-3 rotate-180"
      aria-label="Voltar"
    >
      {backButtonContent}
    </Link>
  ) : (
    <button
      type="button"
      onClick={onBack}
      className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-gray-6 text-gray-12 transition-colors hover:bg-gray-3 rotate-180"
      aria-label="Voltar"
    >
      {backButtonContent}
    </button>
  );

  const desktopBackButton = backHref ? (
    <Link
      href={backHref}
      className="flex size-9 rotate-180 cursor-pointer items-center justify-center rounded-[52px] border border-gray-6 transition-colors hover:bg-gray-3"
      aria-label="Voltar"
    >
      {backButtonContent}
    </Link>
  ) : (
    <button
      type="button"
      onClick={onBack}
      className="flex size-9 rotate-180 cursor-pointer items-center justify-center rounded-[52px] border border-gray-6 transition-colors hover:bg-gray-3"
      aria-label="Voltar"
    >
      {backButtonContent}
    </button>
  );

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loading />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex-1 bg-gray-2 px-4 pb-40 pt-[52px] md:px-5",
        className,
      )}
    >
      <div className={cn("mx-auto flex w-full flex-col gap-9 max-md:gap-8", maxWidth)}>

        {/* Mobile header */}
        <div className={cn(
          "flex h-[52px] items-center gap-2 border-b border-gray-6 bg-gray-2 md:hidden",
          gutterClass,
          stickyMobileHeader && "sticky top-0 z-20",
        )}>
          {mobileBackButton}
          <h1 className="min-w-0 flex-1 truncate font-manrope text-base font-extrabold leading-[1.1] text-gray-12">
            {title}
          </h1>
        </div>

        {/* Desktop header */}
        <div className="hidden flex-col gap-4 md:flex">
          <div className="flex items-center gap-3">
            {desktopBackButton}
            <h1 className="font-manrope text-[28px] font-bold leading-[1.1] text-gray-12">
              {desktopTitle ?? title}
            </h1>
          </div>
          {description && (
            <p className="font-family-dm-sans text-base leading-[1.3] text-gray-11">
              {description}
            </p>
          )}
        </div>

        {/* Description on mobile (only when showDescriptionOnMobile) */}
        {description && showDescriptionOnMobile && (
          <p className="font-family-dm-sans text-base leading-[1.3] text-gray-11 md:hidden">
            {description}
          </p>
        )}

        {/* Page content */}
        {children}

        {/* Bottom action bar — fixed on mobile, inline on desktop */}
        <div
          className={cn(
            "mt-10 flex w-full items-start gap-2 pb-4",
            "max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:z-30",
            "max-md:mt-0 max-md:flex-col max-md:gap-3",
            "max-md:border-t max-md:border-gray-6 max-md:bg-gray-1 max-md:p-4",
            "max-md:pb-[max(1rem,env(safe-area-inset-bottom))]",
            "md:justify-end",
          )}
        >
          {actions}
        </div>

      </div>
    </div>
  );
}
