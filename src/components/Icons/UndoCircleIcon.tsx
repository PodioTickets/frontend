/** Hugeicons "undo-circle" (seta circular, outline). Para a ação "Reativar evento".
 * viewBox 22 (frame nativo do ícone no Figma); renderiza em 20px via width/height. */
export function UndoCircleIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 22 22"
      fill="none"
      className={className}
    >
      <path
        transform="translate(1.999 1.999)"
        d="M0.75 9C0.75 13.5563 4.44365 17.25 9 17.25C13.5563 17.25 17.25 13.5563 17.25 9C17.25 4.44365 13.5563 0.75 9 0.75C4.44365 0.75 0.75 4.44365 0.75 9Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        transform="translate(15.301 6.125) scale(-1 1)"
        d="M7.5928 3.04167C6.95882 1.9457 5.77385 1.20833 4.41667 1.20833C2.39162 1.20833 0.75 2.84996 0.75 4.875C0.75 6.90004 2.39162 8.54167 4.41667 8.54167C6.12519 8.54167 7.56078 7.37312 7.96782 5.79167M5.79167 3.5L7.5928 3.04167V0.75"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
