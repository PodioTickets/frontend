"use client";

import { checkoutHeaderOptions } from "@/constants";
import { cn } from "@/utils/cn";
import { ArrowButton } from "../ArrowButton";
import { Fragment } from "react/jsx-runtime";
import { ArrowLeft } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckoutTimer } from "./CheckoutTimer";
import { useCheckoutProductStep } from "@/hooks/useCheckoutProductStep";

export interface CheckoutHeaderProps {
  activeStep: number;
}

export default function CheckoutHeader({
  activeStep,
}: CheckoutHeaderProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventId = searchParams.get("eventId");

  // Esconde a etapa de Produtos quando nenhum ingresso selecionado tem produto
  // que exija escolha do usuário. `null` (carregando/indefinido) mantém a tab.
  const { hasSelectableProducts } = useCheckoutProductStep(eventId);
  const visibleOptions =
    hasSelectableProducts === false
      ? checkoutHeaderOptions.filter((opt) => opt.path !== "produtos")
      : checkoutHeaderOptions;

  const currentStepLabel = checkoutHeaderOptions.find(
    (opt) => opt.id === activeStep
  )?.label || "Ingressos";

  // "Voltar" navega para a etapa visível anterior — assim pula Produtos
  // automaticamente quando ela está oculta (ex.: Pagamento → Informações).
  const handleBack = () => {
    if (!eventId) return;
    const currentIndex = visibleOptions.findIndex((opt) => opt.id === activeStep);
    const previous = currentIndex > 0 ? visibleOptions[currentIndex - 1] : null;
    if (previous) {
      router.push(`/checkout/${previous.path}?eventId=${eventId}`);
    }
  };

  return (
    <>
      {/* Mobile Header */}
      <div className="md:hidden w-full bg-white border-b border-gray-6">
        <div className="flex items-center justify-center px-4 py-4 relative">
          {activeStep > 1 && (
            <button
              onClick={handleBack}
              className="absolute left-4 flex items-center justify-center"
            >
              <ArrowLeft className="size-5 text-gray-12" />
            </button>
          )}
          <h1 className="text-base font-bold text-gray-12">{currentStepLabel}</h1>
          {activeStep > 1 && (
            <div className="absolute right-4">
              <CheckoutTimer compact />
            </div>
          )}
        </div>
      </div>

      {/* Desktop Header */}
      <div className="hidden md:flex w-full items-center justify-between max-w-7xl mx-auto gap-4 py-11 border-b border-gray-6">
        <div className="flex items-center gap-4">
          {visibleOptions.map((option, index) => (
            <Fragment key={option.id}>
              {index > 0 && <ArrowButton isOpen={false} />}
              <button
                key={option.id}
                className={cn(
                  "flex items-center gap-2 rounded-4xl px-4 py-2 transition-all duration-200 ease-in-out",
                  activeStep >= option.id
                    ? "text-primary-2 bg-primary-11"
                    : "text-gray-11 bg-gray-5"
                )}
              >
                <span>{option.label}</span>
              </button>
            </Fragment>
          ))}
        </div>
        {activeStep > 1 && <CheckoutTimer className="ml-2" />}
      </div>
    </>
  );
}

