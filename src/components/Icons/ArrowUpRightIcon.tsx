/**
 * Seta diagonal ↗ (Huge Icons — "arrows/outline/arrow-up"), mesmo glifo do
 * `ArrowUpIcon`, porém com `stroke="currentColor"` para herdar a cor do contexto
 * (ex.: texto de um botão). Usado nos CTAs da landing.
 */
export function ArrowUpRightIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 12 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M10.65 0.799805L0.75 10.6998"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3.69922 0.75L10.6492 0.799L10.6992 7.75"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
