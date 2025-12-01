import * as React from "react";

export function MasterCardIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 48 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="48" height="16" rx="2" fill="#000" />
      <circle cx="18" cy="8" r="6" fill="#EB001B" />
      <circle cx="30" cy="8" r="6" fill="#F79E1B" />
      <path
        d="M24 2C22.3431 2 21 3.34315 21 5V11C21 12.6569 22.3431 14 24 14C25.6569 14 27 12.6569 27 11V5C27 3.34315 25.6569 2 24 2Z"
        fill="#FF5F00"
      />
    </svg>
  );
}
