export function ArrowButton({ isOpen = false, className }: { isOpen?: boolean, className?: string }) {
  return (
    <svg
      width="6"
      height="10"
      viewBox="0 0 6 10"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`transition-transform duration-200 ${className} ${
        isOpen ? "rotate-90" : ""
      }`}
    >
      <path
        d="M1 1L5 5L1 9"
        stroke="currentColor"
        strokeWidth="1.28571"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
