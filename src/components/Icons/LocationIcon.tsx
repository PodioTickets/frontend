export function LocationIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="32"
      height="32"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      stroke="currentColor"
    >
      <ellipse
        cx="16"
        cy="14.6665"
        rx="4"
        ry="4"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M28 14.5184C28 21.064 20.5 29.3332 16 29.3332C11.5 29.3332 4 21.064 4 14.5184C4 7.97276 9.37258 2.6665 16 2.6665C22.6274 2.6665 28 7.97276 28 14.5184Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}
