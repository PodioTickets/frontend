export function MoneyDollarIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      className={className}
    >
      <circle cx="10" cy="10" r="8.333" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M11.667 8.333C11.667 7.413 10.92 6.667 10 6.667C9.08 6.667 8.333 7.413 8.333 8.333C8.333 9.254 9.08 10 10 10"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M10 10C10.92 10 11.667 10.746 11.667 11.667C11.667 12.587 10.92 13.333 10 13.333C9.08 13.333 8.333 12.587 8.333 11.667"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path d="M10 5.417V6.667" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M10 13.333V14.583" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
