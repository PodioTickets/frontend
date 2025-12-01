import * as React from "react";

export function EloIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 48 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="48" height="16" rx="2" fill="#FFD700" />
      <text x="24" y="11" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#000">
        ELO
      </text>
    </svg>
  );
}
