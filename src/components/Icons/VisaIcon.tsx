import * as React from "react";

export function VisaIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 48 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="48" height="16" rx="2" fill="#1A1F71" />
      <path
        d="M18.5 6.5C18.5 5.5 19 4.5 20.5 4.5C22 4.5 22.5 5.5 22.5 6.5C22.5 7.5 22 8.5 20.5 8.5C19 8.5 18.5 7.5 18.5 6.5Z"
        fill="white"
      />
      <path
        d="M25.5 4.5H23.5L25.5 9.5H27.5L25.5 4.5Z"
        fill="white"
      />
      <path
        d="M30.5 4.5L28.5 4.5L26.5 7.5L24.5 4.5H22.5L25.5 9.5H27.5L30.5 4.5Z"
        fill="white"
      />
    </svg>
  );
}
