"use client";
import { SearchIcon, X } from "lucide-react";
import { cn } from "@/utils/cn";
import * as React from "react";

interface SearchInputProps extends React.ComponentProps<"input"> {
  onClear?: () => void;
  showClearButton?: boolean;
}

export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  function SearchInput(
    { className, value, onClear, showClearButton = true, ...props },
    ref
  ) {
    const hasValue = value && value.toString().length > 0;

    return (
      <div className="relative w-full">
        <SearchIcon
          className={cn(
            "absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors duration-200 pointer-events-none z-10",
            hasValue ? "text-primary-7" : "text-gray-4"
          )}
        />

        <input
          ref={ref}
          type="text"
          value={value}
          className={cn(
            "flex h-10 w-full min-w-0 rounded-lg md:rounded-md border bg-[#2A2A2A] pl-[44px] pr-10 py-1 text-sm text-gray-4 placeholder:text-gray-4 border-transparent transition-colors duration-200 outline-none",
            "focus-visible:border-primary-10 focus-visible:ring-primary-10 focus-visible:ring-[1px]",
            "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
            hasValue && "border-primary-10",
            className
          )}
          style={{ paddingLeft: "40px" }}
          {...props}
        />

        {hasValue && showClearButton && onClear && (
          <button
            type="button"
            onClick={onClear}
            className="absolute cursor-pointer right-3 top-1/2 -translate-y-1/2 text-gray-11 hover:text-gray-12 transition-colors duration-200 p-0.5 rounded hover:bg-gray-4"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    );
  }
);
