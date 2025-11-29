import { checkoutHeaderOptions } from "@/constants";
import { cn } from "@/utils/cn";
import { ArrowButton } from "../ArrowButton";
import { Fragment } from "react/jsx-runtime";

export interface CheckoutHeaderProps {
  activeOption: number;
  setActiveOption: (option: number) => void;
}

export default function CheckoutHeader({
  activeOption,
  setActiveOption,
}: CheckoutHeaderProps) {
  return (
    <div className="w-full flex items-center justify-center gap-4 py-11 border-b border-gray-6">
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
  );
}

