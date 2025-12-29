"use client";

import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { CheckIcon } from "lucide-react";

import { cn } from "@/utils/cn";

function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer border-gray-6 bg-transparent data-[state=checked]:border-primary-11 data-[state=checked]:bg-primary-5 focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-red-20 dark:aria-invalid:ring-red/40 aria-invalid:border-red-20 size-6 cursor-pointer transition-all duration-200 ease-in-out shrink-0 rounded-md border shadow-xs outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="flex items-center justify-center text-current transition-none"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M15.6013 5.15403C15.8476 5.3757 15.8676 5.75508 15.6459 6.00138L9.45582 12.8792C8.67619 13.7455 7.35629 13.8535 6.44625 13.1254L3.62511 10.8685C3.36635 10.6615 3.3244 10.2839 3.5314 10.0252C3.73841 9.76643 4.11598 9.72448 4.37474 9.93148L7.19588 12.1884C7.60954 12.5193 8.20949 12.4702 8.56387 12.0765L14.7539 5.19863C14.9756 4.95232 15.355 4.93235 15.6013 5.15403Z"
            fill="#308737"
          />
        </svg>
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
