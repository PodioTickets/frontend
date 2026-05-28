/** Hugeicons "coin-dollar" (outline). Usado na tab "Financeiro" do evento.
 * Diferente do `DolarIcon` (cor fixa #202020), este usa `currentColor` para
 * acompanhar o estado ativo/inativo da tab. */
export function CoinDollarIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      className={className}
    >
      <circle cx="10" cy="10" r="8.33333" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M11.6666 8.33333C11.6666 7.41286 10.9204 6.66667 9.99992 6.66667C9.07944 6.66667 8.33325 7.41286 8.33325 8.33333C8.33325 9.25381 9.07944 10 9.99992 10"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M9.99992 9.99967C10.9204 9.99967 11.6666 10.7459 11.6666 11.6663C11.6666 12.5868 10.9204 13.333 9.99992 13.333C9.07944 13.333 8.33325 12.5868 8.33325 11.6663"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path d="M10 5.41699V6.66699" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 13.333V14.583" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
