import * as React from "react";

export function PixIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" fill="#32BCAD" />
      <path
        d="M7 7h10v10H7V7z"
        fill="white"
      />
      <path
        d="M9 9h6v6H9V9z"
        fill="#32BCAD"
      />
      <path
        d="M11 11h2v2h-2v-2z"
        fill="white"
      />
    </svg>
  );
}
