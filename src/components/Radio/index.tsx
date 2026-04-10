"use client";

import * as React from "react";
import { cn } from "@/utils/cn";

interface RadioProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  className?: string;
}

export function Radio({ className, ...props }: RadioProps) {
  return (
    <label className="relative flex items-center gap-2 cursor-pointer">
      <div
        className={cn(
          "size-6 rounded-md border flex items-center justify-center transition-all duration-200 ease-in-out shrink-0 shadow-xs",
          props.checked
            ? "bg-primary-5 border-primary-11"
            : "bg-transparent border-gray-6",
          props.disabled && "opacity-50 cursor-not-allowed",
          className
        )}
      >
        {props.checked && (
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="9" viewBox="0 0 13 9" fill="none">
            <path fillRule="evenodd" clipRule="evenodd" d="M12.2014 0.154029C12.4477 0.375704 12.4677 0.755078 12.246 1.00138L6.05592 7.87925C5.27629 8.7455 3.95639 8.85347 3.04634 8.12544L0.225205 5.86853C-0.0335521 5.66152 -0.0755049 5.28395 0.131501 5.02519C0.338507 4.76643 0.716082 4.72448 0.974839 4.93148L3.79598 7.18839C4.20963 7.51932 4.80959 7.47024 5.16397 7.07649L11.354 0.198626C11.5757 -0.0476797 11.9551 -0.0676467 12.2014 0.154029Z" fill="#308737" />
          </svg>
        )}
      </div>
      <input
        type="radio"
        {...props}
        className="absolute opacity-0 w-px h-px top-0 left-0 pointer-events-none"
      />
    </label>
  );
}
