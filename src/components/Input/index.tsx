import * as React from "react";

import { cn } from "@/utils/cn";

interface InputProps extends React.ComponentProps<"input"> {
  showCharCount?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, maxLength, value, showCharCount, ...props }, ref) => {
    const innerRef = React.useRef<HTMLInputElement | null>(null);

    const setRefs = React.useCallback(
      (node: HTMLInputElement | null) => {
        innerRef.current = node;
        if (typeof ref === "function") {
          ref(node);
        } else if (ref != null) {
          (ref as React.MutableRefObject<HTMLInputElement | null>).current =
            node;
        }
      },
      [ref],
    );

    React.useLayoutEffect(() => {
      if (type !== "number") return;
      const el = innerRef.current;
      if (!el) return;
      const onWheel = (e: WheelEvent) => {
        e.preventDefault();
      };
      el.addEventListener("wheel", onWheel, { passive: false });
      return () => el.removeEventListener("wheel", onWheel);
    }, [type]);

    const hasCharCount = (maxLength !== undefined && maxLength > 0) || showCharCount;
    const currentLength = typeof value === "string" ? value.length : (value as any)?.toString().length || 0;
    const maxLengthValue = maxLength || 0;
    const hasHiddenClass = className?.split(" ").some(cls => cls === "hidden") || false;
    const responsiveHiddenClasses = className?.split(" ").filter(cls => /^(sm|md|lg|xl|2xl):hidden$/.test(cls)) || [];
    const responsiveShowClasses = className?.split(" ").filter(cls => /^(sm|md|lg|xl|2xl):(block|flex|inline|inline-block|grid)$/.test(cls)) || [];

    if (hasCharCount) {
      // Construir classes de visibilidade para o wrapper acompanhar o input
      const visibilityClasses = [
        hasHiddenClass ? "hidden" : "",
        ...responsiveHiddenClasses,
        ...responsiveShowClasses,
      ].filter(Boolean).join(" ");

      return (
        <div className={cn("relative w-full", visibilityClasses)}>
          <input
            ref={setRefs}
            type={type}
            data-slot="input"
            maxLength={maxLength}
            value={value}
            className={cn(
              "file:text-gray-12 placeholder:text-gray-11 dark:bg-input border-gray-6 flex h-10 w-full min-w-0 rounded-lg border bg-transparent px-3 py-5 md:text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
              "focus-visible:border-gray-4 focus-visible:ring-gray-4/50 focus-visible:ring-[3px]",
              "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
              "pr-16",
              className
            )}
            {...props}
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <span className="text-gray-11 text-base font-family-dm-sans font-normal leading-[1.3]">
              {currentLength}/{maxLengthValue}
            </span>
          </div>
        </div>
      );
    }

    return (
      <input
        ref={setRefs}
        type={type}
        data-slot="input"
        maxLength={maxLength}
        value={value}
        className={cn(
          "file:text-gray-12 placeholder:text-gray-11 dark:bg-input border-gray-6 flex h-10 w-full min-w-0 rounded-md border bg-transparent px-3 py-5 md:text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
          "focus-visible:border-gray-4 focus-visible:ring-gray-4/50 focus-visible:ring-[3px]",
          "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
          className
        )}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";

export { Input };
