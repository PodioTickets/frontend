import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/utils/cn";
import { ChevronRightIcon } from "lucide-react";

const buttonVariants = cva(
  "cursor-pointer font-manrope inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "bg-[#59E373] text-[#141414] shadow-xs hover:bg-[#59E373]/90 active:bg-[#59E373]/80 hover:text-[#141414]/90 active:text-[#141414]/80",
        destructive:
          "bg-red-11 text-red-2 shadow-xs hover:bg-red-12 focus-visible:ring-red-11 dark:focus-visible:ring-red-11 dark:bg-red-11",
        outline:
          "border border-[#3A3A3A] text-gray-4 bg-transparent hover:bg-[#3A3A3A]/10 active:bg-[#3A3A3A]/20 shadow-xs",
        secondary:
          "bg-gray-12 hover:bg-gray-11 active:bg-gray-10 text-gray-1 hover:text-gray-2 active:text-gray-4 shadow-xs",
        ghost:
          "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-[44px] px-4 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  isLoading = false,
  disabled,
  children,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    isLoading?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <svg
          className="animate-spin size-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      ) : (
        children
      )}
    </Comp>
  );
}

function ButtonIcon() {
  return (
    <Button variant="secondary" size="icon" className="size-8">
      <ChevronRightIcon />
    </Button>
  );
}

export { Button, buttonVariants, ButtonIcon };
