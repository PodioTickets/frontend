export function FinancialStepIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      className={className}
    >
      {/* Cédula — bulk background */}
      <rect
        x="2"
        y="5"
        width="20"
        height="14"
        rx="3"
        fill="currentColor"
        fillOpacity="0.4"
      />
      {/* Haste vertical */}
      <path
        d="M12 7V8.5M12 15.5V17"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* Corpo do cifrão */}
      <path
        d="M14 10C14 9.17 13.1 8.5 12 8.5C10.9 8.5 10 9.17 10 10C10 10.83 10.9 11.5 12 11.5C13.1 11.5 14 12.17 14 13C14 13.83 13.1 14.5 12 14.5C10.9 14.5 10 13.83 10 13"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
