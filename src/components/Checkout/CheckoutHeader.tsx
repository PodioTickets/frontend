"use client";

import { checkoutHeaderOptions } from "@/constants";
import { cn } from "@/utils/cn";
import { ArrowButton } from "../ArrowButton";
import { Fragment } from "react/jsx-runtime";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export interface CheckoutHeaderProps {
  activeOption: number;
  setActiveOption: (option: number) => void;
}

export default function CheckoutHeader({
  activeOption,
  setActiveOption,
}: CheckoutHeaderProps) {
  const router = useRouter();
  const currentStepLabel = checkoutHeaderOptions.find(
    (opt) => opt.id === activeOption
  )?.label || "Modalidades";

  return (
    <>
      {/* Mobile Header */}
      <div className="md:hidden w-full bg-white border-b border-gray-6">
        <div className="flex items-center justify-center px-4 py-4 relative">
          <button
            onClick={() => router.back()}
            className="absolute left-4 flex items-center justify-center"
          >
            <ArrowLeft className="size-5 text-gray-12" />
          </button>
          <h1 className="text-base font-bold text-gray-12">{currentStepLabel}</h1>
        </div>
      </div>

      {/* Desktop Header */}
      <div className="hidden md:flex w-full items-center justify-center gap-4 py-11 border-b border-gray-6">
        {checkoutHeaderOptions.map((option, index) => (
          <Fragment key={option.id}>
            {index > 0 && <ArrowButton isOpen={false} />}
            <button
              key={option.id}
              className={cn(
                "flex items-center gap-2 rounded-4xl px-4 py-2 transition-all duration-200 ease-in-out cursor-pointer",
                activeOption >= option.id
                  ? "text-primary-2 bg-primary-11"
                  : "text-gray-11 bg-gray-5"
              )}
              onClick={() => setActiveOption(option.id)}
            >
              <span>{option.label}</span>
            </button>
          </Fragment>
        ))}
      </div>
    </>
  );
}

